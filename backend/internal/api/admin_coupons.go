package api

import (
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/apinantianhaow/techxstudio-app/backend/internal/models"
	"github.com/apinantianhaow/techxstudio-app/backend/internal/supabase"
)

var couponCodePattern = regexp.MustCompile(`^[A-Z0-9_-]{3,32}$`)

// couponInput is the body of POST and PUT /api/admin/coupons. current_uses
// is counted by checkout and can't be set.
type couponInput struct {
	Code            string   `json:"code"`
	DiscountPercent *float64 `json:"discount_percent"`
	DiscountAmount  *float64 `json:"discount_amount"`
	MinPurchase     *float64 `json:"min_purchase"`
	MaxDiscount     *float64 `json:"max_discount"`
	MaxUses         *float64 `json:"max_uses"`
	ExpiresAt       *string  `json:"expires_at"`
	IsActive        *bool    `json:"is_active"`
}

// row validates the input and returns the columns to write, or writes a 400.
func (in couponInput) row(w http.ResponseWriter) (map[string]any, bool) {
	code := strings.ToUpper(strings.TrimSpace(in.Code))
	percent := valueOr(in.DiscountPercent, 0)
	amount := valueOr(in.DiscountAmount, 0)
	minPurchase := valueOr(in.MinPurchase, 0)
	expiresText := optionalText(in.ExpiresAt)

	var v validation
	v.check(couponCodePattern.MatchString(code), "Code must be 3-32 characters of A-Z, 0-9, - or _")
	v.check(isInt(percent) && percent >= 0 && percent <= 100, "Discount percent must be a whole number from 0 to 100")
	v.check(amount >= 0 && amount <= maxPrice, "Discount amount must be between 0 and 99,999,999")
	v.check((percent > 0) != (amount > 0), "Set exactly one of discount percent or discount amount")
	v.check(minPurchase >= 0 && minPurchase <= maxPrice, "Minimum purchase must be between 0 and 99,999,999")
	v.check(in.MaxDiscount == nil || (*in.MaxDiscount >= 0 && *in.MaxDiscount <= maxPrice), "Max discount must be between 0 and 99,999,999")
	v.check(in.MaxUses == nil || (isInt(*in.MaxUses) && *in.MaxUses >= 1), "Max uses must be a whole number of at least 1")

	var expiresAt *string
	if expiresText != nil {
		t, err := time.Parse(time.RFC3339, *expiresText)
		v.check(err == nil, "Expiry must be a date-time like 2026-12-31T23:59:59+07:00")
		if err == nil {
			utc := t.UTC().Format(time.RFC3339)
			expiresAt = &utc
		}
	}
	if v.failed(w) {
		return nil, false
	}

	// 0 means "no limit", same as NULL (see couponDiscount / couponUsedUp).
	var maxDiscount *float64
	if in.MaxDiscount != nil && *in.MaxDiscount > 0 {
		maxDiscount = in.MaxDiscount
	}
	var maxUses *int
	if in.MaxUses != nil {
		n := int(*in.MaxUses)
		maxUses = &n
	}

	return map[string]any{
		"code":             code,
		"discount_percent": int(percent),
		"discount_amount":  amount,
		"min_purchase":     minPurchase,
		"max_discount":     maxDiscount,
		"max_uses":         maxUses,
		"expires_at":       expiresAt,
		"is_active":        valueOr(in.IsActive, true),
	}, true
}

// GET /api/admin/coupons — all coupons, including inactive and expired ones.
func (s *Server) adminListCoupons(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}

	coupons := []models.Coupon{}
	if err := s.db.From("coupons").Select("*").Order("created_at", false).Get(r.Context(), &coupons); err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to fetch coupons", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"coupons": coupons})
}

// POST /api/admin/coupons
func (s *Server) adminCreateCoupon(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	var body couponInput
	if !decodeJSON(w, r, &body) {
		return
	}
	row, ok := body.row(w)
	if !ok {
		return
	}

	var created []models.Coupon
	err := s.db.From("coupons").Select("*").Insert(r.Context(), row, &created)
	coupon, found := first(created)
	switch {
	case supabase.IsCode(err, "23505"):
		writeError(w, http.StatusConflict, "This coupon code already exists")
	case err != nil || !found:
		s.fail(w, r, http.StatusInternalServerError, "Unable to create coupon", err)
	default:
		writeJSON(w, http.StatusCreated, map[string]any{"coupon": coupon})
	}
}

// PUT /api/admin/coupons/{id}
func (s *Server) adminUpdateCoupon(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	id := r.PathValue("id")
	if !uuidPattern.MatchString(id) {
		writeError(w, http.StatusNotFound, "Coupon not found")
		return
	}
	var body couponInput
	if !decodeJSON(w, r, &body) {
		return
	}
	row, ok := body.row(w)
	if !ok {
		return
	}

	var updated []models.Coupon
	err := s.db.From("coupons").Select("*").Eq("id", id).Update(r.Context(), row, &updated)
	coupon, found := first(updated)
	switch {
	case supabase.IsCode(err, "23505"):
		writeError(w, http.StatusConflict, "This coupon code already exists")
	case err != nil:
		s.fail(w, r, http.StatusInternalServerError, "Unable to update coupon", err)
	case !found:
		writeError(w, http.StatusNotFound, "Coupon not found")
	default:
		writeJSON(w, http.StatusOK, map[string]any{"coupon": coupon})
	}
}

// DELETE /api/admin/coupons/{id} — orders keep the coupon code as text.
func (s *Server) adminDeleteCoupon(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	id := r.PathValue("id")
	if !uuidPattern.MatchString(id) {
		writeError(w, http.StatusNotFound, "Coupon not found")
		return
	}
	if err := s.db.From("coupons").Eq("id", id).Delete(r.Context()); err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to delete coupon", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}
