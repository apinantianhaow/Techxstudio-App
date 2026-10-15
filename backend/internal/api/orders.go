package api

import (
	"net/http"
	"slices"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/apinantianhaow/techxstudio-app/backend/internal/models"
	"github.com/apinantianhaow/techxstudio-app/backend/internal/supabase"
)

const orderItemColumns = "id, product_name, option_label, color_name, quantity, price, image_url"

// GET /api/orders
func (s *Server) listOrders(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Please log in")
	if !ok {
		return
	}

	orders := []models.Order{}
	err := s.db.From("orders").
		Select("*, order_items("+orderItemColumns+")").
		Eq("user_id", claims.ID).
		Order("created_at", false).
		Get(r.Context(), &orders)
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to fetch orders", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"orders": orders})
}

// paymentMethods are the choices at checkout. None of them charges anything:
// the order is recorded and paid for outside the shop.
var paymentMethods = []string{"credit_card", "bank_transfer", "cod"}

// POST /api/orders  body: { items, shipping_address, payment_method?, coupon_code? }
// Checkout. create_order (007_checkout.sql) prices the items from the catalog,
// applies the coupon, records the order and its items, counts the coupon use
// and empties the caller's server cart, all in one transaction.
func (s *Server) createOrder(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Please log in")
	if !ok {
		return
	}

	var body struct {
		Items           []cartLine `json:"items"`
		ShippingAddress string     `json:"shipping_address"`
		PaymentMethod   *string    `json:"payment_method"`
		CouponCode      string     `json:"coupon_code"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	address := strings.TrimSpace(body.ShippingAddress)
	paymentMethod := "credit_card"
	if body.PaymentMethod != nil {
		paymentMethod = *body.PaymentMethod
	}
	var v validation
	v.check(address != "", "Please enter a shipping address")
	v.check(utf8.RuneCountInString(address) <= 500, "Shipping address must be at most 500 characters")
	v.check(slices.Contains(paymentMethods, paymentMethod), "Please choose a payment method")
	v.check(len(body.Items) > 0, "Cart is empty")
	checkLines(&v, body.Items, false)
	if v.failed(w) {
		return
	}

	ctx := r.Context()
	var orderID string
	err := s.db.RPC(ctx, "create_order", map[string]any{
		"p_user_id":          claims.ID,
		"p_items":            lineArgs(body.Items),
		"p_coupon_code":      strings.ToUpper(strings.TrimSpace(body.CouponCode)),
		"p_shipping_address": address,
		"p_payment_method":   paymentMethod,
	}, &orderID)
	if message, ok := shopperMessage(err); ok {
		writeError(w, http.StatusBadRequest, message)
		return
	}
	// A subtotal under the coupon's minimum: DETAIL holds the minimum.
	if e, ok := supabase.AsError(err); ok && e.Code == "TXMIN" {
		minimum, _ := strconv.ParseFloat(e.Details, 64)
		writeError(w, http.StatusBadRequest, minimumPurchaseMessage(models.Coupon{MinPurchase: minimum}))
		return
	}
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to create order", err)
		return
	}

	var rows []models.Order
	err = s.db.From("orders").Select("*, order_items("+orderItemColumns+")").Eq("id", orderID).Get(ctx, &rows)
	order, found := first(rows)
	if err != nil || !found {
		s.fail(w, r, http.StatusInternalServerError, "Your order was placed but could not be loaded", err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"order": order})
}

// PATCH /api/orders/{id}  body: { status: "cancelled" }
func (s *Server) cancelOrder(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Please log in")
	if !ok {
		return
	}
	orderID := r.PathValue("id")

	var body struct {
		Status string `json:"status"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if body.Status != "cancelled" {
		writeError(w, http.StatusBadRequest, "Only cancellation is allowed")
		return
	}

	var rows []models.Order
	err := s.db.From("orders").Select("id, status").Eq("id", orderID).Eq("user_id", claims.ID).Get(r.Context(), &rows)
	current, found := first(rows)
	if err != nil || !found {
		writeError(w, http.StatusNotFound, "Order not found")
		return
	}
	if current.Status != "confirmed" {
		writeError(w, http.StatusBadRequest, "Only confirmed orders can be cancelled")
		return
	}

	var updated []models.Order
	err = s.db.From("orders").Select("*").Eq("id", orderID).Eq("user_id", claims.ID).
		Update(r.Context(), map[string]any{"status": "cancelled"}, &updated)
	order, found := first(updated)
	if err != nil || !found {
		s.fail(w, r, http.StatusInternalServerError, "Unable to cancel order", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"order": order})
}
