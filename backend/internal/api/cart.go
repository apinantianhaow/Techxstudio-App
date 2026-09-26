package api

import (
	"net/http"

	"github.com/apinantianhaow/techxstudio-app/backend/internal/models"
)

// GET /api/cart
func (s *Server) listCart(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Please log in")
	if !ok {
		return
	}

	items := []models.CartItem{}
	err := s.db.From("cart_items").
		Select("*, products(id, name, slug, original_price, sale_percent, badge)").
		Eq("user_id", claims.ID).
		Order("created_at", false).
		Get(r.Context(), &items)
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to fetch cart", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// POST /api/cart — adds an item, or bumps the quantity of a matching
// product/option/color line.
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
		Price       *float64 `json:"price"`
		ImageURL    *string  `json:"image_url"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	var v validation
	v.check(uuidPattern.MatchString(body.ProductID), "Invalid product ID")
	v.check(body.Quantity == nil || (isInt(*body.Quantity) && *body.Quantity >= 1), "Quantity must be a whole number of at least 1")
	v.check(body.Price != nil && *body.Price > 0, "Price must be a positive number")
	if v.failed(w) {
		return
	}
	quantity := 1
	if body.Quantity != nil {
		quantity = int(*body.Quantity)
	}

	var existing []models.CartItem
	err := s.db.From("cart_items").Select("id, quantity").
		Eq("user_id", claims.ID).
		Eq("product_id", body.ProductID).
		Eq("option_label", body.OptionLabel).
		Eq("color_name", body.ColorName).
		Limit(1).
		Get(r.Context(), &existing)
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to add to cart", err)
		return
	}

	if line, found := first(existing); found {
		var updated []models.CartItem
		err := s.db.From("cart_items").Select("*").Eq("id", line.ID).
			Update(r.Context(), map[string]any{"quantity": line.Quantity + quantity}, &updated)
		item, ok := first(updated)
		if err != nil || !ok {
			s.fail(w, r, http.StatusInternalServerError, "Unable to update cart", err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"item": item})
		return
	}

	row := map[string]any{
		"user_id":      claims.ID,
		"product_id":   body.ProductID,
		"option_label": body.OptionLabel,
		"color_name":   body.ColorName,
		"quantity":     quantity,
		"price":        *body.Price,
	}
	if body.ImageURL != nil {
		row["image_url"] = *body.ImageURL
	}

	var created []models.CartItem
	err = s.db.From("cart_items").Select("*").Insert(r.Context(), row, &created)
	item, ok := first(created)
	if err != nil || !ok {
		s.fail(w, r, http.StatusInternalServerError, "Unable to add to cart", err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"item": item})
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
	v.check(body.Quantity != nil && isInt(*body.Quantity) && *body.Quantity >= 1, "Quantity must be a whole number of at least 1")
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
