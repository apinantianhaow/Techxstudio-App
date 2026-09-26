package api

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"

	"golang.org/x/crypto/bcrypt"

	"github.com/apinantianhaow/techxstudio-app/backend/internal/auth"
	"github.com/apinantianhaow/techxstudio-app/backend/internal/supabase"
)

const testUserID = "11111111-1111-1111-1111-111111111111"

// restCall is one request the API made to the fake PostgREST server.
type restCall struct {
	Method string
	Table  string
	Query  url.Values
	Body   string
}

// fakeRest stands in for Supabase's PostgREST endpoint.
type fakeRest struct {
	mu    sync.Mutex
	calls []restCall
	// respond returns the status and raw JSON body for a request.
	respond func(c restCall) (int, string)
}

func (f *fakeRest) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	body, _ := io.ReadAll(r.Body)
	c := restCall{
		Method: r.Method,
		Table:  strings.TrimPrefix(r.URL.Path, "/rest/v1/"),
		Query:  r.URL.Query(),
		Body:   string(body),
	}
	f.mu.Lock()
	f.calls = append(f.calls, c)
	f.mu.Unlock()

	status, resp := http.StatusOK, "[]"
	if f.respond != nil {
		status, resp = f.respond(c)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	io.WriteString(w, resp)
}

func (f *fakeRest) find(method, table string) []restCall {
	f.mu.Lock()
	defer f.mu.Unlock()
	var out []restCall
	for _, c := range f.calls {
		if c.Method == method && c.Table == table {
			out = append(out, c)
		}
	}
	return out
}

type testEnv struct {
	handler http.Handler
	rest    *fakeRest
	tokens  *auth.Tokens
}

func newEnv(t *testing.T, respond func(c restCall) (int, string)) *testEnv {
	t.Helper()
	rest := &fakeRest{respond: respond}
	srv := httptest.NewServer(rest)
	t.Cleanup(srv.Close)

	tokens := auth.NewTokens("test-secret")
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	s := NewServer(supabase.New(srv.URL, "service-key"), tokens, logger, "http://localhost:3000")
	return &testEnv{handler: s.Handler(), rest: rest, tokens: tokens}
}

func (e *testEnv) token(t *testing.T) string {
	t.Helper()
	tok, err := e.tokens.Sign(testUserID, "me@example.com", nil)
	if err != nil {
		t.Fatal(err)
	}
	return tok
}

// call sends a request to the API and decodes the JSON response.
func call(t *testing.T, h http.Handler, method, path, token string, body any) (int, map[string]any) {
	t.Helper()
	var reader io.Reader
	switch b := body.(type) {
	case nil:
	case string:
		reader = strings.NewReader(b)
	default:
		buf, _ := json.Marshal(b)
		reader = bytes.NewReader(buf)
	}
	req := httptest.NewRequest(method, path, reader)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	var out map[string]any
	if strings.HasPrefix(rec.Header().Get("Content-Type"), "application/json") {
		if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
			t.Fatalf("%s %s: invalid JSON %q", method, path, rec.Body.String())
		}
	}
	return rec.Code, out
}

func wantError(t *testing.T, gotStatus int, got map[string]any, status int, message string) {
	t.Helper()
	if gotStatus != status || got["error"] != message {
		t.Fatalf("got %d %v, want %d {error: %q}", gotStatus, got, status, message)
	}
}

func TestCuratedFallsBackToMockWithoutSupabase(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	h := NewServer(supabase.New("", ""), auth.NewTokens("x"), logger, "").Handler()

	status, body := call(t, h, "GET", "/api/products/curated/flash_sale", "", nil)
	products, _ := body["products"].([]any)
	if status != 200 || len(products) != 4 || products[0].(map[string]any)["id"] != "mock-fs-1" {
		t.Fatalf("got %d %v", status, body)
	}

	status, body = call(t, h, "GET", "/api/products/curated/bogus", "", nil)
	wantError(t, status, body, 400, "Invalid curated list")

	if status, _ := call(t, h, "GET", "/api/products/other/thing", "", nil); status != 404 {
		t.Fatalf("unknown sub-resource: got %d, want 404", status)
	}
}

func TestProtectedRoutesRequireToken(t *testing.T) {
	env := newEnv(t, nil)
	for _, tc := range []struct{ method, path, message string }{
		{"GET", "/api/cart", "Please log in"},
		{"POST", "/api/orders", "Please log in"},
		{"GET", "/api/wishlist", "Please log in"},
		{"GET", "/api/auth/me", "Unauthorized"},
	} {
		status, body := call(t, env.handler, tc.method, tc.path, "", nil)
		wantError(t, status, body, 401, tc.message)
		status, body = call(t, env.handler, tc.method, tc.path, "not-a-jwt", nil)
		wantError(t, status, body, 401, tc.message)
	}
	if len(env.rest.calls) != 0 {
		t.Fatalf("unauthenticated requests reached the database: %v", env.rest.calls)
	}
}

func TestSecurityHeadersAndPreflight(t *testing.T) {
	env := newEnv(t, nil)
	req := httptest.NewRequest("OPTIONS", "/api/cart", nil)
	rec := httptest.NewRecorder()
	env.handler.ServeHTTP(rec, req)
	if rec.Code != 204 || rec.Header().Get("Access-Control-Allow-Origin") != "http://localhost:3000" ||
		rec.Header().Get("X-Frame-Options") != "DENY" {
		t.Fatalf("got %d %v", rec.Code, rec.Header())
	}
}

func TestSignupValidation(t *testing.T) {
	env := newEnv(t, nil)
	cases := []struct {
		body    any
		message string
	}{
		{`{not json`, "Invalid request body"},
		{map[string]string{"email": "nope", "password": "secret1", "full_name": "A"}, "Invalid email address"},
		{map[string]string{"email": "a@b.co", "password": "123", "full_name": "A"}, "Password must be at least 6 characters"},
		{map[string]string{"email": "a@b.co", "password": "123456", "full_name": ""}, "Please enter your name"},
	}
	for _, tc := range cases {
		status, body := call(t, env.handler, "POST", "/api/auth/signup", "", tc.body)
		wantError(t, status, body, 400, tc.message)
	}
}

func TestSignupThenLogin(t *testing.T) {
	var storedHash string
	env := newEnv(t, func(c restCall) (int, string) {
		switch {
		case c.Method == "GET" && strings.Contains(c.Query.Get("select"), "password_hash"):
			row, _ := json.Marshal(map[string]any{"id": testUserID, "email": "a@b.co", "full_name": "Ann", "password_hash": storedHash})
			return 200, "[" + string(row) + "]"
		case c.Method == "GET":
			return 200, "[]" // email not taken
		case c.Method == "POST":
			var in map[string]string
			json.Unmarshal([]byte(c.Body), &in)
			storedHash = in["password_hash"]
			return 201, `[{"id":"` + testUserID + `","email":"a@b.co","full_name":"Ann","phone":null,"avatar_url":null,"created_at":"2026-01-01T00:00:00+00:00"}]`
		}
		return 500, `{"message":"unexpected"}`
	})

	status, body := call(t, env.handler, "POST", "/api/auth/signup", "", map[string]string{
		"email": "a@b.co", "password": "secret1", "full_name": "Ann",
	})
	if status != 201 {
		t.Fatalf("signup: got %d %v", status, body)
	}
	if bcrypt.CompareHashAndPassword([]byte(storedHash), []byte("secret1")) != nil {
		t.Fatal("stored password_hash is not a bcrypt hash of the password")
	}
	claims, err := env.tokens.Verify(body["token"].(string))
	if err != nil || claims.ID != testUserID || *claims.FullName != "Ann" {
		t.Fatalf("signup token: %v %+v", err, claims)
	}
	if user := body["user"].(map[string]any); user["email"] != "a@b.co" || user["password_hash"] != nil {
		t.Fatalf("signup user: %v", user)
	}

	status, body = call(t, env.handler, "POST", "/api/auth/login", "", map[string]string{"email": "a@b.co", "password": "secret1"})
	if status != 200 || body["token"] == nil {
		t.Fatalf("login: got %d %v", status, body)
	}
	if _, leaked := body["user"].(map[string]any)["password_hash"]; leaked {
		t.Fatal("login response leaks password_hash")
	}

	status, body = call(t, env.handler, "POST", "/api/auth/login", "", map[string]string{"email": "a@b.co", "password": "wrong"})
	wantError(t, status, body, 401, "Invalid email or password")
}

func TestListProductsBuildsQueryAndSortsRelations(t *testing.T) {
	env := newEnv(t, func(c restCall) (int, string) {
		return 200, `[{"id":"p1","name":"iPhone","sale_percent":5,"original_price":100,
			"product_colors":[{"id":"c2","sort_order":2},{"id":"c1","sort_order":1}],
			"product_options":[{"id":"o2","sort_order":9},{"id":"o1","sort_order":0}]}]`
	})

	status, body := call(t, env.handler, "GET", "/api/products?category=phone", "", nil)
	if status != 200 {
		t.Fatalf("got %d %v", status, body)
	}
	q := env.rest.find("GET", "products")[0].Query
	if q.Get("select") != "*,product_colors(id,name,hex,image_url,sort_order),product_options(id,label,price,sort_order)" ||
		q.Get("is_active") != "eq.true" || q.Get("order") != "created_at.desc" || q.Get("category") != "eq.phone" {
		t.Fatalf("unexpected query: %v", q)
	}
	p := body["products"].([]any)[0].(map[string]any)
	if p["product_colors"].([]any)[0].(map[string]any)["id"] != "c1" || p["product_options"].([]any)[0].(map[string]any)["id"] != "o1" {
		t.Fatalf("relations not sorted: %v", p)
	}

	call(t, env.handler, "GET", "/api/products?category=all", "", nil)
	if q := env.rest.find("GET", "products")[1].Query; q.Has("category") {
		t.Fatalf("category=all should not filter: %v", q)
	}
}

func TestSearchQuotesUserInput(t *testing.T) {
	env := newEnv(t, nil)

	if status, body := call(t, env.handler, "GET", "/api/products/search?q=a", "", nil); status != 200 || len(body["products"].([]any)) != 0 {
		t.Fatalf("short query: got %d %v", status, body)
	}
	if len(env.rest.calls) != 0 {
		t.Fatal("short query should not hit the database")
	}

	call(t, env.handler, "GET", "/api/products/search?q="+url.QueryEscape(` pro,max) `), "", nil)
	want := `(name.ilike."%pro,max)%",description.ilike."%pro,max)%",category.ilike."%pro,max)%")`
	if got := env.rest.find("GET", "products")[0].Query.Get("or"); got != want {
		t.Fatalf("or filter:\n got %s\nwant %s", got, want)
	}
}

func TestValidateCoupon(t *testing.T) {
	coupon := `{"id":"k1","code":"SAVE10","discount_percent":10,"discount_amount":0,"min_purchase":1000,"max_discount":500,"max_uses":null,"current_uses":0,"expires_at":null,"is_active":true}`
	env := newEnv(t, func(c restCall) (int, string) { return 200, "[" + coupon + "]" })

	status, body := call(t, env.handler, "POST", "/api/coupons/validate", "", map[string]any{"code": "save10", "total": 20000})
	if status != 200 || body["calculated_discount"] != 500.0 || body["valid"] != true {
		t.Fatalf("got %d %v", status, body)
	}
	if code := env.rest.find("GET", "coupons")[0].Query.Get("code"); code != "eq.SAVE10" {
		t.Fatalf("code should be upper-cased, got %s", code)
	}

	status, body = call(t, env.handler, "POST", "/api/coupons/validate", "", map[string]any{"code": "SAVE10", "total": 500})
	wantError(t, status, body, 400, "Minimum purchase ฿1,000")

	coupon = `{"id":"k1","code":"OLD","discount_percent":10,"expires_at":"2020-01-01T00:00:00+00:00","is_active":true}`
	status, body = call(t, env.handler, "POST", "/api/coupons/validate", "", map[string]any{"code": "OLD"})
	wantError(t, status, body, 400, "Coupon has expired")
}

func TestCreateOrder(t *testing.T) {
	env := newEnv(t, func(c restCall) (int, string) {
		switch c.Method + " " + c.Table {
		case "GET cart_items":
			return 200, `[{"id":"ci1","product_id":"p1","quantity":2,"price":1000,"option_label":"128GB","color_name":"Black","image_url":null},
				{"id":"ci2","product_id":"p2","quantity":1,"price":500,"option_label":"","color_name":"","image_url":"/x.png"}]`
		case "GET coupons":
			return 200, `[{"id":"k1","code":"FLAT100","discount_percent":0,"discount_amount":100,"current_uses":3,"is_active":true}]`
		case "POST orders":
			return 201, `[{"id":"o1","user_id":"` + testUserID + `","status":"confirmed","total_amount":2400,"discount_amount":100}]`
		case "GET products":
			return 200, `[{"id":"p1","name":"iPhone 16"}]`
		}
		return 201, "[]"
	})

	status, body := call(t, env.handler, "POST", "/api/orders", env.token(t), map[string]any{
		"shipping_address": "Bangkok", "coupon_code": "FLAT100",
	})
	if status != 201 || body["order"].(map[string]any)["id"] != "o1" {
		t.Fatalf("got %d %v", status, body)
	}

	var order map[string]any
	json.Unmarshal([]byte(env.rest.find("POST", "orders")[0].Body), &order)
	if order["total_amount"] != 2400.0 || order["discount_amount"] != 100.0 || order["payment_method"] != "credit_card" || order["user_id"] != testUserID {
		t.Fatalf("order insert: %v", order)
	}

	var items []map[string]any
	json.Unmarshal([]byte(env.rest.find("POST", "order_items")[0].Body), &items)
	if len(items) != 2 || items[0]["product_name"] != "iPhone 16" || items[1]["product_name"] != "Unknown Product" || items[0]["order_id"] != "o1" {
		t.Fatalf("order items: %v", items)
	}

	if patch := env.rest.find("PATCH", "coupons"); len(patch) != 1 || patch[0].Body != `{"current_uses":4}` {
		t.Fatalf("coupon use not recorded: %v", patch)
	}
	if del := env.rest.find("DELETE", "cart_items"); len(del) != 1 || del[0].Query.Get("user_id") != "eq."+testUserID {
		t.Fatalf("cart not cleared: %v", del)
	}
}

func TestCreateOrderWithEmptyCart(t *testing.T) {
	env := newEnv(t, nil)
	status, body := call(t, env.handler, "POST", "/api/orders", env.token(t), map[string]any{"shipping_address": "Bangkok"})
	wantError(t, status, body, 400, "Cart is empty")
}

func TestCancelOrderRules(t *testing.T) {
	env := newEnv(t, func(c restCall) (int, string) { return 200, `[{"id":"o1","status":"shipped"}]` })
	tok := env.token(t)

	status, body := call(t, env.handler, "PATCH", "/api/orders/o1", tok, map[string]string{"status": "delivered"})
	wantError(t, status, body, 400, "Only cancellation is allowed")

	status, body = call(t, env.handler, "PATCH", "/api/orders/o1", tok, map[string]string{"status": "cancelled"})
	wantError(t, status, body, 400, "Only confirmed orders can be cancelled")
}

func TestWishlistDuplicate(t *testing.T) {
	env := newEnv(t, func(c restCall) (int, string) {
		return 409, `{"code":"23505","message":"duplicate key value violates unique constraint"}`
	})
	status, body := call(t, env.handler, "POST", "/api/wishlist", env.token(t), map[string]string{"product_id": "p1"})
	wantError(t, status, body, 409, "Product already in wishlist")
}

func TestCreateReviewRecalculatesRating(t *testing.T) {
	env := newEnv(t, func(c restCall) (int, string) {
		switch {
		case c.Method == "GET" && c.Query.Get("select") == "id":
			return 200, "[]" // not reviewed yet
		case c.Method == "POST":
			return 201, `[{"id":"r1","rating":4,"title":null,"comment":"good","created_at":"2026-01-01T00:00:00+00:00"}]`
		case c.Method == "GET" && c.Query.Get("select") == "rating":
			return 200, `[{"rating":4},{"rating":5},{"rating":5}]`
		}
		return 204, ""
	})
	tok := env.token(t)

	status, body := call(t, env.handler, "POST", "/api/products/p1/reviews", tok, map[string]any{"rating": 4.5})
	wantError(t, status, body, 400, "Rating must be a whole number from 1 to 5")

	status, body = call(t, env.handler, "POST", "/api/products/p1/reviews", tok, map[string]any{"rating": 4, "comment": "good"})
	if status != 201 || body["review"].(map[string]any)["id"] != "r1" {
		t.Fatalf("got %d %v", status, body)
	}
	patch := env.rest.find("PATCH", "products")
	if len(patch) != 1 || patch[0].Body != `{"rating":4.7,"reviews_count":3}` || patch[0].Query.Get("id") != "eq.p1" {
		t.Fatalf("rating update: %v", patch)
	}
}

func TestFormatNumber(t *testing.T) {
	for in, want := range map[float64]string{0: "0", 999: "999", 1000: "1,000", 1500.5: "1,500.5", 1234567: "1,234,567"} {
		if got := formatNumber(in); got != want {
			t.Errorf("formatNumber(%v) = %q, want %q", in, got, want)
		}
	}
}
