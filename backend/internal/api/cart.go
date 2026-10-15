package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"unicode/utf8"

	"github.com/apinantianhaow/techxstudio-app/backend/internal/models"
	"github.com/apinantianhaow/techxstudio-app/backend/internal/supabase"
)

const (
	maxCartLines    = 50
	maxLineQuantity = 99
	maxLabelLength  = 200
)

// cartLine is a product/option/color line as the storefront sends it. There
// is no price: the database works it out (cart_line_price in
// 007_checkout.sql), so a shopper can't choose what they pay.
type cartLine struct {
	ProductID   string   `json:"product_id"`
	OptionLabel string   `json:"option_label"`
	ColorName   string   `json:"color_name"`
	Quantity    *float64 `json:"quantity"`
}

// cartLineArg is a checked cartLine in the shape the SQL functions read.
type cartLineArg struct {
	ProductID   string `json:"product_id"`
	OptionLabel string `json:"option_label"`
	ColorName   string `json:"color_name"`
	Quantity    int    `json:"quantity"`
}

// checkLines validates lines for PUT /api/cart and POST /api/orders. Only a
// cart may repeat a line (replace_cart adds the quantities up).
func checkLines(v *validation, lines []cartLine, allowRepeats bool) {
	v.check(len(lines) <= maxCartLines, fmt.Sprintf("A cart can hold at most %d items", maxCartLines))
	seen := make(map[cartLineArg]bool, len(lines))
	for _, line := range lines {
		v.check(uuidPattern.MatchString(line.ProductID), "Invalid product ID")
		v.check(line.Quantity != nil && validQuantity(*line.Quantity), "Quantity must be a whole number from 1 to 99")
		v.check(utf8.RuneCountInString(line.OptionLabel) <= maxLabelLength &&
			utf8.RuneCountInString(line.ColorName) <= maxLabelLength, "Invalid product option")

		key := cartLineArg{ProductID: strings.ToLower(line.ProductID), OptionLabel: line.OptionLabel, ColorName: line.ColorName}
		v.check(allowRepeats || !seen[key], "Each product option can only be listed once")
		seen[key] = true
	}
}

func validQuantity(q float64) bool { return isInt(q) && q >= 1 && q <= maxLineQuantity }

// lineArgs converts checked lines for an RPC call.
func lineArgs(lines []cartLine) []cartLineArg {
	args := make([]cartLineArg, len(lines))
	for i, line := range lines {
		args[i] = cartLineArg{ProductID: line.ProductID, OptionLabel: line.OptionLabel, ColorName: line.ColorName, Quantity: int(*line.Quantity)}
	}
	return args
}

// shopperMessage returns the text of an error a SQL function raised for the
// shopper on purpose (RAISE EXCEPTION ... USING ERRCODE = 'P0001').
func shopperMessage(err error) (string, bool) {
	if e, ok := supabase.AsError(err); ok && e.Code == "P0001" {
		return e.Message, true
	}
	return "", false
}

// GET /api/cart — the caller's cart priced from the current catalog, in the
// storefront's CartItem shape. Lines that can't be bought any more are left out.
func (s *Server) listCart(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Please log in")
	if !ok {
		return
	}

	var items json.RawMessage
	if err := s.db.RPC(r.Context(), "get_cart", map[string]any{"p_user_id": claims.ID}, &items); err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to fetch cart", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// PUT /api/cart  body: { items: [{ product_id, option_label, color_name, quantity }] }
// Makes the caller's cart exactly these lines; the storefront sends its whole
// cart after every change. Lines that can't be bought are skipped and counted.
func (s *Server) replaceCart(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Please log in")
	if !ok {
		return
	}

	var body struct {
		Items *[]cartLine `json:"items"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	var v validation
	v.check(body.Items != nil, "Please send the cart items")
	if v.failed(w) {
		return
	}
	checkLines(&v, *body.Items, true)
	if v.failed(w) {
		return
	}

	// { items: [...], skipped: n }
	var cart json.RawMessage
	err := s.db.RPC(r.Context(), "replace_cart", map[string]any{"p_user_id": claims.ID, "p_items": lineArgs(*body.Items)}, &cart)
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to update cart", err)
		return
	}
	writeJSON(w, http.StatusOK, cart)
}

// POST /api/cart  body: { product_id, option_label, color_name, quantity? }
// Adds an item, or bumps the quantity of the matching product/option/color
// line (at most 99). Any price in the body is ignored.
func (s *Server) addToCart(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Please log in")
	if !ok {
		return
	}

	var body struct {
		ProductID   string   `json:"product_id"`
		OptionLabel string   `json:"option_label"`
		ColorName   string   `json:"color_name"`
		Quantity    *float64 `json:"quantity"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	var v validation
	v.check(uuidPattern.MatchString(body.ProductID), "Invalid product ID")
	v.check(body.Quantity == nil || validQuantity(*body.Quantity), "Quantity must be a whole number from 1 to 99")
	v.check(utf8.RuneCountInString(body.OptionLabel) <= maxLabelLength &&
		utf8.RuneCountInString(body.ColorName) <= maxLabelLength, "Invalid product option")
	if v.failed(w) {
		return
	}
	quantity := 1
	if body.Quantity != nil {
		quantity = int(*body.Quantity)
	}

	var added struct {
		Item    json.RawMessage `json:"item"`
		Created bool            `json:"created"`
	}
	err := s.db.RPC(r.Context(), "add_cart_item", map[string]any{
		"p_user_id":      claims.ID,
		"p_product_id":   body.ProductID,
		"p_option_label": body.OptionLabel,
		"p_color_name":   body.ColorName,
		"p_quantity":     quantity,
	}, &added)
	if message, ok := shopperMessage(err); ok {
		writeError(w, http.StatusBadRequest, message)
		return
	}
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to add to cart", err)
		return
	}

	status := http.StatusOK
	if added.Created {
		status = http.StatusCreated
	}
	writeJSON(w, status, map[string]any{"item": added.Item})
}

// PATCH /api/cart/{id}  body: { quantity }
func (s *Server) updateCartItem(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Please log in")
	if !ok {
		return
	}

	var body struct {
		Quantity *float64 `json:"quantity"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	var v validation
	v.check(body.Quantity != nil && validQuantity(*body.Quantity), "Quantity must be a whole number from 1 to 99")
	if v.failed(w) {
		return
	}

	var updated []models.CartItem
	err := s.db.From("cart_items").Select("*").
		Eq("id", r.PathValue("id")).Eq("user_id", claims.ID).
		Update(r.Context(), map[string]any{"quantity": int(*body.Quantity)}, &updated)
	item, found := first(updated)
	if err != nil || !found {
		writeError(w, http.StatusNotFound, "Item not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"item": item})
}

// DELETE /api/cart/{id}
func (s *Server) deleteCartItem(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Please log in")
	if !ok {
		return
	}
	err := s.db.From("cart_items").Eq("id", r.PathValue("id")).Eq("user_id", claims.ID).Delete(r.Context())
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to delete", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}
