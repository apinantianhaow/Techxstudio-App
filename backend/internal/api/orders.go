package api

import (
	"net/http"

	"github.com/apinantianhaow/techxstudio-app/backend/internal/models"
)

// GET /api/orders
func (s *Server) listOrders(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Please log in")
	if !ok {
		return
	}

	orders := []models.Order{}
	err := s.db.From("orders").
		Select("*, order_items(id, product_name, option_label, color_name, quantity, price, image_url)").
		Eq("user_id", claims.ID).
		Order("created_at", false).
		Get(r.Context(), &orders)
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to fetch orders", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"orders": orders})
}

// POST /api/orders — turns the caller's server-side cart into an order.
func (s *Server) createOrder(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Please log in")
	if !ok {
		return
	}

	var body struct {
		ShippingAddress string  `json:"shipping_address"`
		PaymentMethod   *string `json:"payment_method"`
		CouponCode      string  `json:"coupon_code"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	var v validation
	v.check(body.ShippingAddress != "", "Please enter a shipping address")
	if v.failed(w) {
		return
	}
	paymentMethod := "credit_card"
	if body.PaymentMethod != nil {
		paymentMethod = *body.PaymentMethod
	}

	ctx := r.Context()

	var cartItems []models.CartItem
	if err := s.db.From("cart_items").Select("*").Eq("user_id", claims.ID).Get(ctx, &cartItems); err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to create order", err)
		return
	}
	if len(cartItems) == 0 {
		writeError(w, http.StatusBadRequest, "Cart is empty")
		return
	}

	total := 0.0
	for _, item := range cartItems {
		total += item.Price * float64(item.Quantity)
	}

	discount := 0.0
	var coupon *models.Coupon
	if body.CouponCode != "" {
		var rows []models.Coupon
		err := s.db.From("coupons").Select("*").
			Eq("code", body.CouponCode).Eq("is_active", true).Limit(1).
			Get(ctx, &rows)
		if c, found := first(rows); err == nil && found {
			switch {
			case c.MinPurchase > 0 && total < c.MinPurchase:
				writeError(w, http.StatusBadRequest, minimumPurchaseMessage(c))
				return
			case couponUsedUp(c), couponExpired(c):
				writeError(w, http.StatusBadRequest, "Coupon has expired")
				return
			}
			discount = couponDiscount(c, total)
			coupon = &c
		}
	}

	var couponCode *string
	if body.CouponCode != "" {
		couponCode = &body.CouponCode
	}

	var created []models.Order
	err := s.db.From("orders").Select("*").Insert(ctx, map[string]any{
		"user_id":          claims.ID,
		"total_amount":     total - discount,
		"discount_amount":  discount,
		"coupon_code":      couponCode,
		"shipping_address": body.ShippingAddress,
		"payment_method":   paymentMethod,
	}, &created)
	order, found := first(created)
	if err != nil || !found {
		s.fail(w, r, http.StatusInternalServerError, "Unable to create order", err)
		return
	}

	// Count the coupon use only once the order exists.
	if coupon != nil {
		err := s.db.From("coupons").Eq("id", coupon.ID).
			Update(ctx, map[string]any{"current_uses": coupon.CurrentUses + 1}, nil)
		if err != nil {
			s.log.Error("create order: update coupon uses", "coupon", coupon.Code, "err", err)
		}
	}

	names := s.productNames(r, cartItems)
	orderItems := make([]map[string]any, len(cartItems))
	for i, item := range cartItems {
		name, ok := names[item.ProductID]
		if !ok {
			name = "Unknown Product"
		}
		orderItems[i] = map[string]any{
			"order_id":     order.ID,
			"product_id":   item.ProductID,
			"product_name": name,
			"option_label": item.OptionLabel,
			"color_name":   item.ColorName,
			"quantity":     item.Quantity,
			"price":        item.Price,
			"image_url":    item.ImageURL,
		}
	}
	if err := s.db.From("order_items").Insert(ctx, orderItems, nil); err != nil {
		s.log.Error("create order: insert items", "order_id", order.ID, "err", err)
	}

	if err := s.db.From("cart_items").Eq("user_id", claims.ID).Delete(ctx); err != nil {
		s.log.Error("create order: clear cart", "order_id", order.ID, "err", err)
	}

	writeJSON(w, http.StatusCreated, map[string]any{"order": order})
}

// productNames maps product id → name for the products in the cart.
func (s *Server) productNames(r *http.Request, items []models.CartItem) map[string]string {
	ids := make([]string, 0, len(items))
	seen := map[string]bool{}
	for _, item := range items {
		if !seen[item.ProductID] {
			seen[item.ProductID] = true
			ids = append(ids, item.ProductID)
		}
	}

	var products []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	}
	if err := s.db.From("products").Select("id, name").In("id", ids).Get(r.Context(), &products); err != nil {
		s.log.Error("create order: load product names", "err", err)
	}

	names := make(map[string]string, len(products))
	for _, p := range products {
		names[p.ID] = p.Name
	}
	return names
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
