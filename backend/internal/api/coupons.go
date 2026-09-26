package api

import (
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/apinantianhaow/techxstudio-app/backend/internal/models"
)

// POST /api/coupons/validate  body: { code, total? }
func (s *Server) validateCoupon(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Code  string   `json:"code"`
		Total *float64 `json:"total"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	var v validation
	v.check(body.Code != "", "Please enter a coupon code")
	v.check(body.Total == nil || *body.Total > 0, "Total must be a positive number")
	if v.failed(w) {
		return
	}
	total := 0.0
	if body.Total != nil {
		total = *body.Total
	}

	var rows []models.Coupon
	err := s.db.From("coupons").Select("*").
		Eq("code", strings.ToUpper(body.Code)).Eq("is_active", true).Limit(1).
		Get(r.Context(), &rows)
	coupon, found := first(rows)
	if err != nil || !found {
		writeError(w, http.StatusNotFound, "Coupon not found")
		return
	}

	switch {
	case couponExpired(coupon):
		writeError(w, http.StatusBadRequest, "Coupon has expired")
		return
	case couponUsedUp(coupon):
		writeError(w, http.StatusBadRequest, "Coupon fully redeemed")
		return
	case total > 0 && coupon.MinPurchase > 0 && total < coupon.MinPurchase:
		writeError(w, http.StatusBadRequest, minimumPurchaseMessage(coupon))
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"valid": true,
		"coupon": map[string]any{
			"code":             coupon.Code,
			"discount_percent": coupon.DiscountPercent,
			"discount_amount":  coupon.DiscountAmount,
			"min_purchase":     coupon.MinPurchase,
			"max_discount":     coupon.MaxDiscount,
		},
		"calculated_discount": couponDiscount(coupon, total),
	})
}

// couponDiscount applies a percentage (rounded, capped by max_discount) when
// a total is known, otherwise the fixed discount_amount.
func couponDiscount(c models.Coupon, total float64) float64 {
	if c.DiscountPercent > 0 && total > 0 {
		discount := math.Round(total * float64(c.DiscountPercent) / 100)
		if c.MaxDiscount != nil && *c.MaxDiscount > 0 {
			discount = math.Min(discount, *c.MaxDiscount)
		}
		return discount
	}
	if c.DiscountAmount > 0 {
		return c.DiscountAmount
	}
	return 0
}

func couponExpired(c models.Coupon) bool {
	if c.ExpiresAt == nil {
		return false
	}
	expires, err := time.Parse(time.RFC3339, *c.ExpiresAt)
	return err == nil && expires.Before(time.Now())
}

func couponUsedUp(c models.Coupon) bool {
	return c.MaxUses != nil && *c.MaxUses > 0 && c.CurrentUses >= *c.MaxUses
}

func minimumPurchaseMessage(c models.Coupon) string {
	return "Minimum purchase ฿" + formatNumber(c.MinPurchase)
}

// formatNumber renders 1500 as "1,500" (like JS toLocaleString in en-US).
func formatNumber(n float64) string {
	s := strconv.FormatFloat(math.Round(n*1000)/1000, 'f', -1, 64)
	sign := ""
	if strings.HasPrefix(s, "-") {
		sign, s = "-", s[1:]
	}
	intPart, frac, hasFrac := strings.Cut(s, ".")

	var b strings.Builder
	for i, digit := range intPart {
		if i > 0 && (len(intPart)-i)%3 == 0 {
			b.WriteByte(',')
		}
		b.WriteRune(digit)
	}
	if hasFrac {
		b.WriteString("." + frac)
	}
	return sign + b.String()
}
