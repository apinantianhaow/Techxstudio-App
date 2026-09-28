package api

import (
	"encoding/json"
	"strings"
	"testing"

	"golang.org/x/crypto/bcrypt"
)

const testProductID = "a1b2c3d4-e5f6-7890-abcd-ef1234567801"

// withRole answers the requireAdmin role lookup with role, and hands every
// other request to next.
func withRole(role string, next func(c restCall) (int, string)) func(c restCall) (int, string) {
	return func(c restCall) (int, string) {
		if c.Method == "GET" && c.Table == "users" && c.Query.Get("select") == "role" {
			return 200, `[{"role":"` + role + `"}]`
		}
		if next == nil {
			return 200, "[]"
		}
		return next(c)
	}
}

var adminRoutes = []struct{ method, path string }{
	{"GET", "/api/admin/me"},
	{"GET", "/api/admin/products"},
	{"POST", "/api/admin/products"},
	{"GET", "/api/admin/products/" + testProductID},
	{"PUT", "/api/admin/products/" + testProductID},
	{"PATCH", "/api/admin/products/" + testProductID},
	{"DELETE", "/api/admin/products/" + testProductID},
	{"GET", "/api/admin/coupons"},
	{"POST", "/api/admin/coupons"},
	{"PUT", "/api/admin/coupons/" + testProductID},
	{"DELETE", "/api/admin/coupons/" + testProductID},
	{"GET", "/api/admin/orders"},
	{"PATCH", "/api/admin/orders/" + testProductID},
}

func TestAdminRoutesRequireToken(t *testing.T) {
	env := newEnv(t, nil)
	for _, route := range adminRoutes {
		status, body := call(t, env.handler, route.method, route.path, "", `{}`)
		wantError(t, status, body, 401, "Unauthorized")
	}
	if len(env.rest.calls) != 0 {
		t.Fatalf("unauthenticated requests reached the database: %v", env.rest.calls)
	}
}

func TestAdminRoutesRejectCustomers(t *testing.T) {
	env := newEnv(t, withRole("customer", nil))
	tok := env.token(t)
	for _, route := range adminRoutes {
		status, body := call(t, env.handler, route.method, route.path, tok, `{}`)
		wantError(t, status, body, 403, "Admin access required")
	}
	for _, c := range env.rest.calls {
		if c.Method != "GET" || c.Table != "users" || c.Query.Get("id") != "eq."+testUserID {
			t.Fatalf("customer request went past the role check: %+v", c)
		}
	}
}

func TestAdminLoginOnlyForAdmins(t *testing.T) {
	hash, _ := bcrypt.GenerateFromPassword([]byte("secret1"), bcrypt.MinCost)
	role := "customer"
	challenges := newChallengeTable()
	env := newEnv(t, func(c restCall) (int, string) {
		if status, body, ok := challenges.handle(c); ok {
			return status, body
		}
		if c.Query.Get("select") == "role" {
			return 200, `[{"role":"` + role + `"}]`
		}
		return 200, `[{"id":"` + testUserID + `","email":"a@b.co","full_name":"Ann","password_hash":"` + string(hash) + `"}]`
	})
	creds := map[string]string{"email": "a@b.co", "password": "secret1"}

	status, body := call(t, env.handler, "POST", "/api/admin/login", "", map[string]string{"email": "a@b.co", "password": "wrong"})
	wantError(t, status, body, 401, "Invalid email or password")

	status, body = call(t, env.handler, "POST", "/api/admin/login", "", creds)
	wantError(t, status, body, 403, "This account does not have admin access")

	if len(env.mail.sent) != 0 {
		t.Fatal("non-admins must not get a code")
	}

	// A customer's store sign-in code can't be redeemed on the admin endpoint.
	status, body = call(t, env.handler, "POST", "/api/auth/login", "", creds)
	status, body = call(t, env.handler, "POST", "/api/admin/login/verify", "", map[string]string{"challenge_id": body["challenge_id"].(string), "code": env.mail.lastCode(t)})
	wantError(t, status, body, 403, "This account does not have admin access")

	role = "admin"
	status, body = call(t, env.handler, "POST", "/api/admin/login", "", creds)
	if status != 200 || body["otp_required"] != true || body["token"] != nil {
		t.Fatalf("admin login step 1: got %d %v", status, body)
	}
	status, body = call(t, env.handler, "POST", "/api/admin/login/verify", "", map[string]string{"challenge_id": body["challenge_id"].(string), "code": env.mail.lastCode(t)})
	if status != 200 || body["token"] == nil {
		t.Fatalf("admin login step 2: got %d %v", status, body)
	}
	if _, leaked := body["user"].(map[string]any)["password_hash"]; leaked {
		t.Fatal("admin login response leaks password_hash")
	}
}

func validProduct() map[string]any {
	return map[string]any{
		"name":           "  iPhone 17 ",
		"slug":           "iPhone-17",
		"category":       "phone",
		"description":    "",
		"badge":          "NEW",
		"sale_percent":   5,
		"original_price": 32900,
		"curated_lists":  []string{"popular", "flash_sale", "popular"},
		"product_colors": []map[string]any{
			{"name": "Black", "hex": "#1c1c1e", "image_url": "/images/iphone17-black.png"},
			{"name": "White", "hex": "#F5F5F0", "image_url": ""},
		},
		"product_options": []map[string]any{{"label": "128GB", "price": 32900}, {"label": "256GB", "price": 36900}},
		"product_specs":   []map[string]any{{"spec_key": "Chip", "spec_value": "A19"}},
	}
}

func TestAdminProductValidation(t *testing.T) {
	env := newEnv(t, withRole("admin", nil))
	tok := env.token(t)

	cases := []struct {
		edit    func(p map[string]any)
		message string
	}{
		{func(p map[string]any) { p["name"] = " " }, "Name is required"},
		{func(p map[string]any) { p["slug"] = "iphone 17" }, "Slug may only contain a-z, 0-9 and single dashes (max 100)"},
		{func(p map[string]any) { p["category"] = "laptop" }, "Category must be phone, tablet or accessory"},
		{func(p map[string]any) { p["badge"] = "BEST" }, "Badge must be NEW, HOT or SALE"},
		{func(p map[string]any) { p["sale_percent"] = 100 }, "Sale percent must be a whole number from 0 to 99"},
		{func(p map[string]any) { delete(p, "original_price") }, "Price must be greater than 0 and at most 99,999,999"},
		{func(p map[string]any) { p["curated_lists"] = []string{"homepage"} }, "Unknown curated list: homepage"},
		{func(p map[string]any) { p["product_colors"] = []map[string]any{{"name": "Red", "hex": "red"}} }, "Color codes must look like #1D1D1F"},
		{func(p map[string]any) {
			p["product_colors"] = []map[string]any{{"name": "Red", "hex": "#FF0000"}, {"name": "red", "hex": "#EE0000"}}
		}, "Color names must be unique"},
		{func(p map[string]any) { p["product_options"] = []map[string]any{{"label": "128GB", "price": 0}} }, "Option prices must be greater than 0 and at most 99,999,999"},
		{func(p map[string]any) { p["product_specs"] = []map[string]any{{"spec_key": "Chip", "spec_value": " "}} }, "Each spec needs a value (max 500 characters)"},
	}
	for _, tc := range cases {
		p := validProduct()
		tc.edit(p)
		status, body := call(t, env.handler, "POST", "/api/admin/products", tok, p)
		wantError(t, status, body, 400, tc.message)
	}
	if rpc := env.rest.find("POST", "rpc/admin_save_product"); len(rpc) != 0 {
		t.Fatalf("invalid products reached the database: %v", rpc)
	}
}

func TestAdminCreateProduct(t *testing.T) {
	env := newEnv(t, withRole("admin", func(c restCall) (int, string) {
		switch c.Method + " " + c.Table {
		case "POST rpc/admin_save_product":
			return 200, `"` + testProductID + `"`
		case "GET products":
			return 200, `[{"id":"` + testProductID + `","name":"iPhone 17",
				"product_colors":[{"id":"c2","sort_order":2},{"id":"c1","sort_order":1}]}]`
		}
		return 500, `{"message":"unexpected"}`
	}))

	status, body := call(t, env.handler, "POST", "/api/admin/products", env.token(t), validProduct())
	if status != 201 {
		t.Fatalf("got %d %v", status, body)
	}
	product := body["product"].(map[string]any)
	if product["id"] != testProductID || product["product_colors"].([]any)[0].(map[string]any)["id"] != "c1" {
		t.Fatalf("response product: %v", product)
	}

	var args struct {
		ID      *string          `json:"p_id"`
		Product map[string]any   `json:"p_product"`
		Colors  []map[string]any `json:"p_colors"`
		Options []map[string]any `json:"p_options"`
		Specs   []map[string]any `json:"p_specs"`
	}
	if err := json.Unmarshal([]byte(env.rest.find("POST", "rpc/admin_save_product")[0].Body), &args); err != nil {
		t.Fatal(err)
	}
	p := args.Product
	if args.ID != nil || p["name"] != "iPhone 17" || p["slug"] != "iphone-17" || p["description"] != nil ||
		p["is_active"] != true || p["sale_percent"] != 5.0 || p["original_price"] != 32900.0 {
		t.Fatalf("product args: id=%v %v", args.ID, p)
	}
	if lists := p["curated_lists"].([]any); len(lists) != 2 || lists[0] != "flash_sale" || lists[1] != "popular" {
		t.Fatalf("curated_lists should be sorted and de-duplicated: %v", lists)
	}
	if len(args.Colors) != 2 || args.Colors[0]["hex"] != "#1C1C1E" || args.Colors[1]["image_url"] != nil {
		t.Fatalf("colors: %v", args.Colors)
	}
	if len(args.Options) != 2 || args.Options[1]["price"] != 36900.0 || len(args.Specs) != 1 {
		t.Fatalf("options/specs: %v %v", args.Options, args.Specs)
	}
	if q := env.rest.find("GET", "products")[0].Query; q.Get("id") != "eq."+testProductID || q.Has("is_active") {
		t.Fatalf("reload should find hidden products too: %v", q)
	}
}

func TestAdminUpdateProductErrors(t *testing.T) {
	var rpcResponse string
	env := newEnv(t, withRole("admin", func(c restCall) (int, string) {
		return 400, rpcResponse
	}))
	tok := env.token(t)

	status, body := call(t, env.handler, "PUT", "/api/admin/products/not-a-uuid", tok, validProduct())
	wantError(t, status, body, 404, "Product not found")

	rpcResponse = `{"code":"P0002","message":"Product not found"}`
	status, body = call(t, env.handler, "PUT", "/api/admin/products/"+testProductID, tok, validProduct())
	wantError(t, status, body, 404, "Product not found")

	rpcResponse = `{"code":"23505","message":"duplicate key value violates unique constraint \"products_slug_key\""}`
	status, body = call(t, env.handler, "PUT", "/api/admin/products/"+testProductID, tok, validProduct())
	wantError(t, status, body, 409, "This slug is already used by another product")

	rpc := env.rest.find("POST", "rpc/admin_save_product")
	if len(rpc) != 2 || !strings.Contains(rpc[0].Body, `"p_id":"`+testProductID+`"`) {
		t.Fatalf("update should pass the product id: %v", rpc)
	}
}

func TestAdminListToggleAndDeleteProducts(t *testing.T) {
	env := newEnv(t, withRole("admin", func(c restCall) (int, string) {
		if c.Method == "PATCH" {
			return 200, `[{"id":"` + testProductID + `","is_active":false}]`
		}
		return 200, "[]"
	}))
	tok := env.token(t)

	if status, body := call(t, env.handler, "GET", "/api/admin/products", tok, nil); status != 200 {
		t.Fatalf("list: got %d %v", status, body)
	}
	if q := env.rest.find("GET", "products")[0].Query; q.Has("is_active") {
		t.Fatalf("admin list must include hidden products: %v", q)
	}

	status, body := call(t, env.handler, "PATCH", "/api/admin/products/"+testProductID, tok, map[string]any{})
	wantError(t, status, body, 400, "is_active is required")
	status, body = call(t, env.handler, "PATCH", "/api/admin/products/"+testProductID, tok, map[string]any{"is_active": false})
	if status != 200 || body["product"].(map[string]any)["is_active"] != false {
		t.Fatalf("toggle: got %d %v", status, body)
	}
	if patch := env.rest.find("PATCH", "products"); len(patch) != 1 || patch[0].Body != `{"is_active":false}` {
		t.Fatalf("toggle should only touch is_active: %v", patch)
	}

	if status, body := call(t, env.handler, "DELETE", "/api/admin/products/"+testProductID, tok, nil); status != 200 || body["success"] != true {
		t.Fatalf("delete: got %d %v", status, body)
	}
	if del := env.rest.find("DELETE", "products"); len(del) != 1 || del[0].Query.Get("id") != "eq."+testProductID {
		t.Fatalf("delete query: %v", del)
	}
}

func TestAdminCoupons(t *testing.T) {
	env := newEnv(t, withRole("admin", func(c restCall) (int, string) {
		switch c.Method {
		case "POST":
			return 201, `[{"id":"k1","code":"NEWYEAR","discount_percent":15}]`
		case "PATCH":
			return 200, "[]" // no row matched
		}
		return 200, "[]"
	}))
	tok := env.token(t)

	status, body := call(t, env.handler, "POST", "/api/admin/coupons", tok, map[string]any{"code": "NEWYEAR", "discount_percent": 10, "discount_amount": 100})
	wantError(t, status, body, 400, "Set exactly one of discount percent or discount amount")

	status, body = call(t, env.handler, "POST", "/api/admin/coupons", tok, map[string]any{"code": "NEWYEAR", "discount_percent": 10, "expires_at": "31/12/2026"})
	wantError(t, status, body, 400, "Expiry must be a date-time like 2026-12-31T23:59:59+07:00")

	status, body = call(t, env.handler, "POST", "/api/admin/coupons", tok, map[string]any{
		"code": " newyear ", "discount_percent": 15, "max_discount": 0, "max_uses": 50, "expires_at": "2026-12-31T23:59:59+07:00",
	})
	if status != 201 || body["coupon"].(map[string]any)["id"] != "k1" {
		t.Fatalf("create: got %d %v", status, body)
	}
	var row map[string]any
	json.Unmarshal([]byte(env.rest.find("POST", "coupons")[0].Body), &row)
	if row["code"] != "NEWYEAR" || row["max_discount"] != nil || row["max_uses"] != 50.0 ||
		row["expires_at"] != "2026-12-31T16:59:59Z" || row["is_active"] != true {
		t.Fatalf("coupon insert: %v", row)
	}

	status, body = call(t, env.handler, "PUT", "/api/admin/coupons/"+testProductID, tok, map[string]any{"code": "NEWYEAR", "discount_amount": 500})
	wantError(t, status, body, 404, "Coupon not found")
}

func TestAdminUpdateOrderStatus(t *testing.T) {
	env := newEnv(t, withRole("admin", func(c restCall) (int, string) {
		return 200, `[{"id":"` + testProductID + `","status":"shipped"}]`
	}))
	tok := env.token(t)

	status, body := call(t, env.handler, "PATCH", "/api/admin/orders/"+testProductID, tok, map[string]string{"status": "lost"})
	wantError(t, status, body, 400, "Status must be confirmed, processing, shipped, delivered or cancelled")

	status, body = call(t, env.handler, "PATCH", "/api/admin/orders/"+testProductID, tok, map[string]string{"status": "shipped"})
	if status != 200 || body["order"].(map[string]any)["status"] != "shipped" {
		t.Fatalf("got %d %v", status, body)
	}
	patch := env.rest.find("PATCH", "orders")
	if len(patch) != 1 || patch[0].Body != `{"status":"shipped"}` || patch[0].Query.Has("user_id") {
		t.Fatalf("admin may update any customer's order: %v", patch)
	}
}
