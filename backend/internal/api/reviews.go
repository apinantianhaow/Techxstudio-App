package api

import (
	"context"
	"math"
	"net/http"
	"unicode/utf8"

	"github.com/apinantianhaow/techxstudio-app/backend/internal/models"
)

const reviewColumns = "id, rating, title, comment, created_at"

type reviewInput struct {
	Rating  *float64 `json:"rating"`
	Title   *string  `json:"title"`
	Comment *string  `json:"comment"`
}

func (in reviewInput) validate(w http.ResponseWriter) bool {
	var v validation
	v.check(in.Rating != nil && isInt(*in.Rating) && *in.Rating >= 1 && *in.Rating <= 5, "Rating must be a whole number from 1 to 5")
	v.check(in.Title == nil || utf8.RuneCountInString(*in.Title) <= 200, "Title must be at most 200 characters")
	v.check(in.Comment == nil || utf8.RuneCountInString(*in.Comment) <= 1000, "Comment must be at most 1000 characters")
	return !v.failed(w)
}

// fields returns the columns to write; omitted title/comment are left untouched.
func (in reviewInput) fields() map[string]any {
	f := map[string]any{"rating": int(*in.Rating)}
	if in.Title != nil {
		f["title"] = *in.Title
	}
	if in.Comment != nil {
		f["comment"] = *in.Comment
	}
	return f
}

// GET /api/products/{id}/reviews
func (s *Server) listReviews(w http.ResponseWriter, r *http.Request) {
	reviews := []models.Review{}
	err := s.db.From("product_reviews").
		Select("id, user_id, rating, title, comment, created_at, users(full_name, avatar_url)").
		Eq("product_id", r.PathValue("id")).
		Order("created_at", false).
		Limit(20).
		Get(r.Context(), &reviews)
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to fetch reviews", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"reviews": reviews})
}

// POST /api/products/{id}/reviews
func (s *Server) createReview(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Please log in")
	if !ok {
		return
	}
	productID := r.PathValue("id")

	var body reviewInput
	if !decodeJSON(w, r, &body) || !body.validate(w) {
		return
	}

	var existing []struct {
		ID string `json:"id"`
	}
	err := s.db.From("product_reviews").Select("id").
		Eq("product_id", productID).Eq("user_id", claims.ID).Limit(1).
		Get(r.Context(), &existing)
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to submit review", err)
		return
	}
	if len(existing) > 0 {
		writeError(w, http.StatusConflict, "You have already reviewed this product")
		return
	}

	row := body.fields()
	row["product_id"] = productID
	row["user_id"] = claims.ID

	var created []models.Review
	err = s.db.From("product_reviews").Select(reviewColumns).Insert(r.Context(), row, &created)
	review, ok := first(created)
	if err != nil || !ok {
		s.fail(w, r, http.StatusInternalServerError, "Unable to submit review", err)
		return
	}

	s.recalculateRating(r.Context(), productID)
	writeJSON(w, http.StatusCreated, map[string]any{"review": review})
}

// PUT /api/products/{id}/reviews  body: { reviewId, rating, title?, comment? }
func (s *Server) updateReview(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Please log in")
	if !ok {
		return
	}
	productID := r.PathValue("id")

	var body struct {
		ReviewID string `json:"reviewId"`
		reviewInput
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if body.ReviewID == "" {
		writeError(w, http.StatusBadRequest, "Review ID is required")
		return
	}
	if !body.validate(w) {
		return
	}

	var updated []models.Review
	err := s.db.From("product_reviews").Select(reviewColumns).
		Eq("id", body.ReviewID).Eq("user_id", claims.ID).Eq("product_id", productID).
		Update(r.Context(), body.fields(), &updated)
	review, found := first(updated)
	if err != nil || !found {
		writeError(w, http.StatusNotFound, "Review not found or not yours")
		return
	}

	s.recalculateRating(r.Context(), productID)
	writeJSON(w, http.StatusOK, map[string]any{"review": review})
}

// DELETE /api/products/{id}/reviews?reviewId=
func (s *Server) deleteReview(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Please log in")
	if !ok {
		return
	}
	productID := r.PathValue("id")

	reviewID := r.URL.Query().Get("reviewId")
	if reviewID == "" {
		writeError(w, http.StatusBadRequest, "Review ID is required")
		return
	}

	err := s.db.From("product_reviews").
		Eq("id", reviewID).Eq("user_id", claims.ID).Eq("product_id", productID).
		Delete(r.Context())
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to delete review", err)
		return
	}

	s.recalculateRating(r.Context(), productID)
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}

// recalculateRating refreshes products.rating (1 decimal) and reviews_count.
func (s *Server) recalculateRating(ctx context.Context, productID string) {
	var ratings []struct {
		Rating int `json:"rating"`
	}
	if err := s.db.From("product_reviews").Select("rating").Eq("product_id", productID).Get(ctx, &ratings); err != nil {
		s.log.Error("recalculate rating: load reviews", "product_id", productID, "err", err)
		return
	}

	avg := 0.0
	if len(ratings) > 0 {
		sum := 0
		for _, r := range ratings {
			sum += r.Rating
		}
		avg = math.Round(float64(sum)/float64(len(ratings))*10) / 10
	}

	err := s.db.From("products").Eq("id", productID).Update(ctx, map[string]any{
		"rating":        avg,
		"reviews_count": len(ratings),
	}, nil)
	if err != nil {
		s.log.Error("recalculate rating: update product", "product_id", productID, "err", err)
	}
}
