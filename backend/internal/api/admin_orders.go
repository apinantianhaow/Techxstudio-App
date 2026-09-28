package api

import (
	"net/http"
	"slices"

	"github.com/apinantianhaow/techxstudio-app/backend/internal/models"
)

var orderStatuses = []string{"confirmed", "processing", "shipped", "delivered", "cancelled"}

// GET /api/admin/orders — every customer's orders, newest first.
func (s *Server) adminListOrders(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}

	orders := []models.AdminOrder{}
	err := s.db.From("orders").
		Select("*, order_items("+orderItemColumns+"), users(email, full_name)").
		Order("created_at", false).
		Get(r.Context(), &orders)
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to fetch orders", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"orders": orders})
}

// PATCH /api/admin/orders/{id}  body: { status }
// Orders are created at checkout and never deleted; cancelling is the admin's
// "delete", and it keeps the record for accounting.
func (s *Server) adminUpdateOrderStatus(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	id := r.PathValue("id")
	if !uuidPattern.MatchString(id) {
		writeError(w, http.StatusNotFound, "Order not found")
		return
	}

	var body struct {
		Status string `json:"status"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if !slices.Contains(orderStatuses, body.Status) {
		writeError(w, http.StatusBadRequest, "Status must be confirmed, processing, shipped, delivered or cancelled")
		return
	}

	var updated []models.Order
	err := s.db.From("orders").Select("*").Eq("id", id).
		Update(r.Context(), map[string]any{"status": body.Status}, &updated)
	order, found := first(updated)
	switch {
	case err != nil:
		s.fail(w, r, http.StatusInternalServerError, "Unable to update order", err)
	case !found:
		writeError(w, http.StatusNotFound, "Order not found")
	default:
		writeJSON(w, http.StatusOK, map[string]any{"order": order})
	}
}
