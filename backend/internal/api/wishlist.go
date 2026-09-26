package api

import (
	"net/http"

	"github.com/apinantianhaow/techxstudio-app/backend/internal/models"
	"github.com/apinantianhaow/techxstudio-app/backend/internal/supabase"
)

// GET /api/wishlist
func (s *Server) listWishlist(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Please log in")
	if !ok {
		return
	}

	items := []models.WishlistItem{}
	err := s.db.From("wishlist_items").
		Select(`id, created_at,
			products(id, name, slug, category, original_price, sale_percent, badge, rating, reviews_count,
				product_colors(`+colorColumns+`),
				product_options(`+optionColumns+`)
			)`).
		Eq("user_id", claims.ID).
		Order("created_at", false).
		Get(r.Context(), &items)
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to fetch wishlist", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

// POST /api/wishlist  body: { product_id }
func (s *Server) addToWishlist(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Please log in")
	if !ok {
		return
	}

	var body struct {
		ProductID string `json:"product_id"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if body.ProductID == "" {
		writeError(w, http.StatusBadRequest, "Please specify a product")
		return
	}

	var created []models.WishlistItem
	err := s.db.From("wishlist_items").Select("*").Insert(r.Context(), map[string]any{
		"user_id":    claims.ID,
		"product_id": body.ProductID,
	}, &created)
	if supabase.IsCode(err, "23505") {
		writeError(w, http.StatusConflict, "Product already in wishlist")
		return
	}
	item, found := first(created)
	if err != nil || !found {
		s.fail(w, r, http.StatusInternalServerError, "Unable to add", err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{"item": item})
}

// DELETE /api/wishlist?product_id=
func (s *Server) removeFromWishlist(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Please log in")
	if !ok {
		return
	}

	productID := r.URL.Query().Get("product_id")
	if productID == "" {
		writeError(w, http.StatusBadRequest, "Please specify a product")
		return
	}

	err := s.db.From("wishlist_items").Eq("user_id", claims.ID).Eq("product_id", productID).Delete(r.Context())
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to delete", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}
