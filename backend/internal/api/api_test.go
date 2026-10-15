package api

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"slices"
	"strings"
	"sync"
	"testing"

	"golang.org/x/crypto/bcrypt"

	"github.com/apinantianhaow/techxstudio-app/backend/internal/auth"
	"github.com/apinantianhaow/techxstudio-app/backend/internal/mail"
	"github.com/apinantianhaow/techxstudio-app/backend/internal/models"
	"github.com/apinantianhaow/techxstudio-app/backend/internal/supabase"
)

const testUserID = "11111111-1111-1111-1111-111111111111"

// restCall is one request the API made to the fake PostgREST server.
type restCall struct {
	Method string
	Table  string // table name, or the full path for non-PostgREST calls (storage)
	Query  url.Values
	Body   string
	Header http.Header
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
		Header: r.Header,
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
	baseURL string // the fake Supabase project URL
	handler http.Handler
	rest    *fakeRest
	tokens  *auth.Tokens
	mail    *fakeMailer
	google  *fakeGoogle
}

func newEnv(t *testing.T, respond func(c restCall) (int, string)) *testEnv {
	t.Helper()
	rest := &fakeRest{respond: respond}
	srv := httptest.NewServer(rest)
	t.Cleanup(srv.Close)

	tokens := auth.NewTokens("test-secret")
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	mailer, google := &fakeMailer{}, &fakeGoogle{ids: map[string]*auth.GoogleIdentity{}}
	s := NewServer(supabase.New(srv.URL, "service-key"), tokens, google, mailer, logger, "http://localhost:3000")
	return &testEnv{baseURL: srv.URL, handler: s.Handler(), rest: rest, tokens: tokens, mail: mailer, google: google}
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
	h := NewServer(supabase.New("", ""), auth.NewTokens("x"), auth.NewGoogleVerifier(""), mail.Log{Logger: logger}, logger, "").Handler()

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
		{"PUT", "/api/cart", "Please log in"},
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
	challenges := newChallengeTable()
	env := newEnv(t, func(c restCall) (int, string) {
		if status, body, ok := challenges.handle(c); ok {
			return status, body
		}
		switch {
		case c.Method == "GET" && strings.Contains(c.Query.Get("select"), "password_hash"):
			row, _ := json.Marshal(map[string]any{"id": testUserID, "email": "a@b.co", "full_name": "Ann", "password_hash": storedHash})
			return 200, "[" + string(row) + "]"
		case c.Method == "GET" && c.Query.Get("id") == "eq."+testUserID:
			return 200, `[{"id":"` + testUserID + `","email":"a@b.co","full_name":"Ann"}]`
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
	// Sign-up doesn't hand out a token: it emails a code first.
	if status != 201 || body["otp_required"] != true || body["token"] != nil || body["email"] != "a•••@b.co" {
		t.Fatalf("signup: got %d %v", status, body)
	}
	if bcrypt.CompareHashAndPassword([]byte(storedHash), []byte("secret1")) != nil {
		t.Fatal("stored password_hash is not a bcrypt hash of the password")
	}
	signupChallenge := body["challenge_id"].(string)
	msg := env.mail.last(t)
	if msg.To != "a@b.co" || !strings.Contains(msg.HTML, env.mail.lastCode(t)) {
		t.Fatalf("code email: %+v", msg)
	}
	if challenges.rows[signupChallenge]["code_hash"] == env.mail.lastCode(t) {
		t.Fatal("the code itself must not be stored")
	}

	status, body = call(t, env.handler, "POST", "/api/auth/login/verify", "", map[string]string{"challenge_id": signupChallenge, "code": "000000"})
	wantError(t, status, body, 400, "Incorrect code. 4 attempts left.")
	status, body = call(t, env.handler, "POST", "/api/auth/login/verify", "", map[string]string{"challenge_id": signupChallenge, "code": env.mail.lastCode(t)})
	if status != 200 || body["token"] == nil {
		t.Fatalf("verify: got %d %v", status, body)
	}
	claims, err := env.tokens.Verify(body["token"].(string))
	if err != nil || claims.ID != testUserID || *claims.FullName != "Ann" {
		t.Fatalf("token: %v %+v", err, claims)
	}
	status, body = call(t, env.handler, "POST", "/api/auth/login/verify", "", map[string]string{"challenge_id": signupChallenge, "code": env.mail.lastCode(t)})
	wantError(t, status, body, 400, "This code has expired. Request a new one or sign in again.")

	// Login: password first, then a new code.
	status, body = call(t, env.handler, "POST", "/api/auth/login", "", map[string]string{"email": "a@b.co", "password": "wrong"})
	wantError(t, status, body, 401, "Invalid email or password")
	status, body = call(t, env.handler, "POST", "/api/auth/login", "", map[string]string{"email": "a@b.co", "password": "secret1"})
	if status != 200 || body["otp_required"] != true || body["token"] != nil || body["challenge_id"] == signupChallenge {
		t.Fatalf("login: got %d %v", status, body)
	}
	status, body = call(t, env.handler, "POST", "/api/auth/login/verify", "", map[string]string{"challenge_id": body["challenge_id"].(string), "code": env.mail.lastCode(t)})
	if status != 200 || body["token"] == nil {
		t.Fatalf("login verify: got %d %v", status, body)
	}
	if _, leaked := body["user"].(map[string]any)["password_hash"]; leaked {
		t.Fatal("login response leaks password_hash")
	}
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

const (
	productA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
	productB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
)

// rpcArgs decodes the named arguments of the only call to the SQL function fn.
func rpcArgs(t *testing.T, env *testEnv, fn string) map[string]any {
	t.Helper()
	calls := env.rest.find("POST", "rpc/"+fn)
	if len(calls) != 1 {
		t.Fatalf("want 1 call to %s, got %d (all calls: %v)", fn, len(calls), env.rest.calls)
	}
	var args map[string]any
	if err := json.Unmarshal([]byte(calls[0].Body), &args); err != nil {
		t.Fatalf("%s args: %v", fn, err)
	}
	return args
}

func TestCreateOrder(t *testing.T) {
	env := newEnv(t, func(c restCall) (int, string) {
		switch c.Method + " " + c.Table {
		case "POST rpc/create_order":
			return 200, `"o1"`
		case "GET orders":
			return 200, `[{"id":"o1","user_id":"` + testUserID + `","status":"confirmed","total_amount":2400,"discount_amount":100,
				"order_items":[{"id":"oi1","product_name":"iPhone 16","quantity":2,"price":1250}]}]`
		}
		return 500, `{"message":"unexpected"}`
	})

	status, body := call(t, env.handler, "POST", "/api/orders", env.token(t), map[string]any{
		"shipping_address": "  Bangkok ", "coupon_code": " flat100 ", "payment_method": "cod",
		"items": []map[string]any{
			{"product_id": productA, "option_label": "128GB", "color_name": "Black", "quantity": 2, "price": 1},
			{"product_id": productB, "quantity": 1},
		},
	})
	order, _ := body["order"].(map[string]any)
	if status != 201 || order["id"] != "o1" || len(order["order_items"].([]any)) != 1 {
		t.Fatalf("got %d %v", status, body)
	}

	args := rpcArgs(t, env, "create_order")
	var items []cartLineArg
	raw, _ := json.Marshal(args["p_items"])
	json.Unmarshal(raw, &items)
	wantItems := []cartLineArg{
		{ProductID: productA, OptionLabel: "128GB", ColorName: "Black", Quantity: 2},
		{ProductID: productB, Quantity: 1},
	}
	if args["p_user_id"] != testUserID || !slices.Equal(items, wantItems) || strings.Contains(string(raw), "price") ||
		args["p_coupon_code"] != "FLAT100" || args["p_shipping_address"] != "Bangkok" || args["p_payment_method"] != "cod" {
		t.Fatalf("create_order args: %v (items %s)", args, raw)
	}
	if q := env.rest.find("GET", "orders")[0].Query; q.Get("id") != "eq.o1" {
		t.Fatalf("reload query: %v", q)
	}
	// Prices, the coupon and the cart are the database's job (one transaction).
	for _, table := range []string{"orders", "order_items", "coupons", "cart_items"} {
		for _, method := range []string{"POST", "PATCH", "DELETE"} {
			if calls := env.rest.find(method, table); len(calls) > 0 {
				t.Fatalf("unexpected %s %s outside create_order: %v", method, table, calls)
			}
		}
	}
}

func TestCreateOrderValidation(t *testing.T) {
	env := newEnv(t, nil)
	line := func(quantity any) map[string]any {
		return map[string]any{"product_id": productA, "option_label": "", "color_name": "", "quantity": quantity}
	}
	tooMany := make([]map[string]any, 51)
	for i := range tooMany {
		tooMany[i] = line(1)
	}
	for _, tc := range []struct {
		body    map[string]any
		message string
	}{
		{map[string]any{"shipping_address": " ", "items": []any{line(1)}}, "Please enter a shipping address"},
		{map[string]any{"shipping_address": "BKK", "payment_method": "free", "items": []any{line(1)}}, "Please choose a payment method"},
		{map[string]any{"shipping_address": "BKK", "items": []any{}}, "Cart is empty"},
		{map[string]any{"shipping_address": "BKK", "items": []any{line(0)}}, "Quantity must be a whole number from 1 to 99"},
		{map[string]any{"shipping_address": "BKK", "items": []any{line(1.5)}}, "Quantity must be a whole number from 1 to 99"},
		{map[string]any{"shipping_address": "BKK", "items": []any{line(100)}}, "Quantity must be a whole number from 1 to 99"},
		{map[string]any{"shipping_address": "BKK", "items": []any{map[string]any{"product_id": "p1", "quantity": 1}}}, "Invalid product ID"},
		{map[string]any{"shipping_address": "BKK", "items": []any{line(1), line(2)}}, "Each product option can only be listed once"},
		{map[string]any{"shipping_address": "BKK", "items": tooMany}, "A cart can hold at most 50 items"},
	} {
		status, body := call(t, env.handler, "POST", "/api/orders", env.token(t), tc.body)
		wantError(t, status, body, 400, tc.message)
	}
	if len(env.rest.calls) != 0 {
		t.Fatalf("invalid orders reached the database: %v", env.rest.calls)
	}
}

func TestCreateOrderErrors(t *testing.T) {
	var reply string
	env := newEnv(t, func(c restCall) (int, string) { return 400, reply })
	order := map[string]any{"shipping_address": "BKK", "items": []any{map[string]any{"product_id": productA, "quantity": 1}}}

	for _, tc := range []struct {
		reply, message string
		status         int
	}{
		{`{"code":"P0001","message":"Some items are no longer available. Please review your cart."}`, "Some items are no longer available. Please review your cart.", 400},
		{`{"code":"P0001","message":"Coupon has expired"}`, "Coupon has expired", 400},
		{`{"code":"TXMIN","message":"Subtotal is below the coupon minimum","details":"2000.00"}`, "Minimum purchase ฿2,000", 400},
		{`{"code":"23503","message":"insert or update violates foreign key constraint"}`, "Unable to create order", 500},
	} {
		reply = tc.reply
		status, body := call(t, env.handler, "POST", "/api/orders", env.token(t), order)
		wantError(t, status, body, tc.status, tc.message)
	}
}

func TestCartUsesTheDatabasePrices(t *testing.T) {
	var created bool
	env := newEnv(t, func(c restCall) (int, string) {
		switch c.Table {
		case "rpc/get_cart":
			return 200, `[{"id":"c1","product_id":"` + productA + `","name":"iPhone 16","slug":"iphone-16","option_label":"128GB","color_name":"Black","quantity":1,"price":33155,"image_url":""}]`
		case "rpc/replace_cart":
			return 200, `{"items":[],"skipped":1}`
		case "rpc/add_cart_item":
			if created {
				return 200, `{"item":{"id":"c2","price":4990},"created":true}`
			}
			return 200, `{"item":{"id":"c2","price":4990},"created":false}`
		}
		return 500, `{"message":"unexpected"}`
	})
	tok := env.token(t)

	status, body := call(t, env.handler, "GET", "/api/cart", tok, nil)
	items, _ := body["items"].([]any)
	if status != 200 || len(items) != 1 || items[0].(map[string]any)["price"] != 33155.0 {
		t.Fatalf("GET: got %d %v", status, body)
	}
	if args := rpcArgs(t, env, "get_cart"); args["p_user_id"] != testUserID {
		t.Fatalf("get_cart args: %v", args)
	}

	// PUT forwards the lines without any client price; repeated lines are the database's to merge.
	status, body = call(t, env.handler, "PUT", "/api/cart", tok, map[string]any{"items": []any{
		map[string]any{"product_id": productA, "option_label": "128GB", "color_name": "Black", "quantity": 2, "price": 1},
		map[string]any{"product_id": productA, "option_label": "128GB", "color_name": "Black", "quantity": 1},
	}})
	if status != 200 || body["skipped"] != 1.0 {
		t.Fatalf("PUT: got %d %v", status, body)
	}
	lines, _ := json.Marshal(rpcArgs(t, env, "replace_cart")["p_items"])
	if strings.Contains(string(lines), "price") || strings.Count(string(lines), productA) != 2 {
		t.Fatalf("replace_cart lines: %s", lines)
	}

	status, body = call(t, env.handler, "PUT", "/api/cart", tok, map[string]any{})
	wantError(t, status, body, 400, "Please send the cart items")
	status, body = call(t, env.handler, "PUT", "/api/cart", tok, map[string]any{"items": []any{map[string]any{"product_id": productA, "quantity": 100}}})
	wantError(t, status, body, 400, "Quantity must be a whole number from 1 to 99")

	// POST ignores price and image_url and answers 201 only for a new line.
	status, body = call(t, env.handler, "POST", "/api/cart", tok, map[string]any{
		"product_id": productB, "quantity": 2, "price": 1, "image_url": "/cheap.png",
	})
	if status != 200 || body["item"].(map[string]any)["price"] != 4990.0 {
		t.Fatalf("POST bump: got %d %v", status, body)
	}
	args := rpcArgs(t, env, "add_cart_item")
	if len(args) != 5 || args["p_product_id"] != productB || args["p_quantity"] != 2.0 || args["p_option_label"] != "" {
		t.Fatalf("add_cart_item args: %v", args)
	}
	created = true
	if status, _ := call(t, env.handler, "POST", "/api/cart", tok, map[string]any{"product_id": productB}); status != 201 {
		t.Fatalf("POST new line: got %d", status)
	}
}

func TestAddToCartUnavailable(t *testing.T) {
	env := newEnv(t, func(c restCall) (int, string) {
		return 400, `{"code":"P0001","message":"This item is no longer available"}`
	})
	status, body := call(t, env.handler, "POST", "/api/cart", env.token(t), map[string]any{"product_id": productA, "option_label": "9TB"})
	wantError(t, status, body, 400, "This item is no longer available")
}

func TestCouponDiscount(t *testing.T) {
	maxDiscount := 5000.0
	for _, tc := range []struct {
		coupon      models.Coupon
		total, want float64
	}{
		{models.Coupon{DiscountAmount: 500}, 300, 300}, // never more than the order
		{models.Coupon{DiscountAmount: 500}, 2000, 500},
		{models.Coupon{DiscountAmount: 500}, 0, 500}, // total unknown (coupon preview)
		{models.Coupon{DiscountPercent: 10, MaxDiscount: &maxDiscount}, 54188, 5000},
		{models.Coupon{DiscountPercent: 10}, 33155, 3316},
	} {
		if got := couponDiscount(tc.coupon, tc.total); got != tc.want {
			t.Errorf("couponDiscount(%+v, %v) = %v, want %v", tc.coupon, tc.total, got, tc.want)
		}
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
	status, body := call(t, env.handler, "POST", "/api/wishlist", env.token(t), map[string]string{"product_id": productA})
	wantError(t, status, body, 409, "Product already in wishlist")
}

func TestWishlistNeedsAProductID(t *testing.T) {
	env := newEnv(t, nil)
	status, body := call(t, env.handler, "POST", "/api/wishlist", env.token(t), map[string]string{"product_id": "p1"})
	wantError(t, status, body, 400, "Please specify a product")
	status, body = call(t, env.handler, "DELETE", "/api/wishlist?product_id=1%20or%201=1", env.token(t), nil)
	wantError(t, status, body, 400, "Please specify a product")
	if len(env.rest.calls) != 0 {
		t.Fatalf("invalid ids reached the database: %v", env.rest.calls)
	}
}

func TestEmailsAreCaseInsensitive(t *testing.T) {
	env := newEnv(t, func(c restCall) (int, string) {
		if c.Method == "POST" && c.Table == "users" {
			return 201, `[{"id":"` + testUserID + `","email":"ann@example.com","full_name":"Ann"}]`
		}
		return 200, "[]"
	})

	call(t, env.handler, "POST", "/api/auth/signup", "", map[string]string{"email": " Ann@Example.COM ", "password": "secret1", "full_name": "Ann"})
	if q := env.rest.find("GET", "users")[0].Query.Get("email"); q != "eq.ann@example.com" {
		t.Fatalf("signup looked up %q", q)
	}
	var row map[string]any
	json.Unmarshal([]byte(env.rest.find("POST", "users")[0].Body), &row)
	if row["email"] != "ann@example.com" {
		t.Fatalf("signup stored %v", row["email"])
	}

	status, body := call(t, env.handler, "POST", "/api/auth/login", "", map[string]string{"email": "ANN@example.com", "password": "secret1"})
	wantError(t, status, body, 401, "Invalid email or password")
	logins := env.rest.find("GET", "users")
	if q := logins[len(logins)-1].Query.Get("email"); q != "eq.ann@example.com" {
		t.Fatalf("login looked up %q", q)
	}
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
