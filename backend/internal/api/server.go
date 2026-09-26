// Package api implements the TechXStudio REST API consumed by the Next.js
// frontend (proxied from /api/*).
package api

import (
	"encoding/json"
	"log/slog"
	"math"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/apinantianhaow/techxstudio-app/backend/internal/auth"
	"github.com/apinantianhaow/techxstudio-app/backend/internal/supabase"
)

type Server struct {
	db     *supabase.Client
	tokens *auth.Tokens
	log    *slog.Logger
	appURL string
}

func NewServer(db *supabase.Client, tokens *auth.Tokens, logger *slog.Logger, appURL string) *Server {
	return &Server{db: db, tokens: tokens, log: logger, appURL: appURL}
}

// Handler returns the router wrapped in the standard middleware.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "supabase": s.db.Configured()})
	})

	mux.HandleFunc("POST /api/auth/signup", s.signup)
	mux.HandleFunc("POST /api/auth/login", s.login)
	mux.HandleFunc("GET /api/auth/me", s.getMe)
	mux.HandleFunc("PUT /api/auth/me", s.updateMe)
	mux.HandleFunc("DELETE /api/auth/me", s.deleteMe)

	mux.HandleFunc("GET /api/products", s.listProducts)
	mux.HandleFunc("GET /api/products/search", s.searchProducts)
	mux.HandleFunc("GET /api/products/{id}", s.getProduct)
	// ServeMux rejects "curated/{list}" next to "{id}/reviews" as ambiguous
	// (both match /api/products/curated/reviews), so two-segment GETs other
	// than reviews go through one handler.
	mux.HandleFunc("GET /api/products/{group}/{name}", s.productSubresource)
	mux.HandleFunc("GET /api/products/{id}/reviews", s.listReviews)
	mux.HandleFunc("POST /api/products/{id}/reviews", s.createReview)
	mux.HandleFunc("PUT /api/products/{id}/reviews", s.updateReview)
	mux.HandleFunc("DELETE /api/products/{id}/reviews", s.deleteReview)

	mux.HandleFunc("GET /api/cart", s.listCart)
	mux.HandleFunc("POST /api/cart", s.addToCart)
	mux.HandleFunc("PATCH /api/cart/{id}", s.updateCartItem)
	mux.HandleFunc("DELETE /api/cart/{id}", s.deleteCartItem)

	mux.HandleFunc("GET /api/wishlist", s.listWishlist)
	mux.HandleFunc("POST /api/wishlist", s.addToWishlist)
	mux.HandleFunc("DELETE /api/wishlist", s.removeFromWishlist)

	mux.HandleFunc("POST /api/coupons/validate", s.validateCoupon)

	mux.HandleFunc("GET /api/orders", s.listOrders)
	mux.HandleFunc("POST /api/orders", s.createOrder)
	mux.HandleFunc("PATCH /api/orders/{id}", s.cancelOrder)

	return s.recoverPanics(s.logRequests(s.securityHeaders(mux)))
}

func (s *Server) productSubresource(w http.ResponseWriter, r *http.Request) {
	if r.PathValue("group") == "curated" {
		s.curatedProducts(w, r, r.PathValue("name"))
		return
	}
	http.NotFound(w, r)
}

// ── Middleware ────────────────────────────────────────────────

// securityHeaders sets the headers the old next.config.mjs applied to /api/*
// and answers CORS preflight requests.
func (s *Server) securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("Access-Control-Allow-Origin", s.appURL)
		h.Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		h.Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("X-XSS-Protection", "1; mode=block")
		h.Set("Referrer-Policy", "strict-origin-when-cross-origin")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	r.status = code
	r.ResponseWriter.WriteHeader(code)
}

func (s *Server) logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		s.log.Info("request", "method", r.Method, "path", r.URL.Path, "status", rec.status, "duration", time.Since(start).Round(time.Millisecond))
	})
}

func (s *Server) recoverPanics(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if v := recover(); v != nil {
				s.log.Error("panic", "path", r.URL.Path, "value", v)
				writeError(w, http.StatusInternalServerError, "Something went wrong")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// ── Response / request helpers ───────────────────────────────

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

// fail logs err and responds with the given status and message.
func (s *Server) fail(w http.ResponseWriter, r *http.Request, status int, message string, err error) {
	s.log.Error(message, "method", r.Method, "path", r.URL.Path, "err", err)
	writeError(w, status, message)
}

// decodeJSON reads the request body into dst, writing a 400 on failure.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return false
	}
	return true
}

// requireUser returns the caller's token claims, or writes a 401 with message.
func (s *Server) requireUser(w http.ResponseWriter, r *http.Request, message string) (*auth.Claims, bool) {
	claims := s.tokens.UserFromRequest(r)
	if claims == nil {
		writeError(w, http.StatusUnauthorized, message)
		return nil, false
	}
	return claims, true
}

// validation collects the first failed check, like zod's safeParse did.
type validation struct{ message string }

func (v *validation) check(ok bool, message string) {
	if !ok && v.message == "" {
		v.message = message
	}
}

func (v *validation) failed(w http.ResponseWriter) bool {
	if v.message == "" {
		return false
	}
	writeError(w, http.StatusBadRequest, v.message)
	return true
}

var (
	emailPattern = regexp.MustCompile(`^[A-Za-z0-9_'+\-.]*[A-Za-z0-9_+\-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$`)
	uuidPattern  = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)
)

func isEmail(s string) bool {
	return emailPattern.MatchString(s) && !strings.HasPrefix(s, ".") && !strings.Contains(s, "..")
}

func isInt(f float64) bool { return f == math.Trunc(f) && !math.IsInf(f, 0) }

func first[T any](rows []T) (T, bool) {
	var zero T
	if len(rows) == 0 {
		return zero, false
	}
	return rows[0], true
}
