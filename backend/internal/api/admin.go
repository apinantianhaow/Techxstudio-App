package api

// Admin API for the separate TechXStudio Admin app. Every route except
// /api/admin/login requires a token for a user whose users.role is 'admin'
// (supabase/migrations/004_admin.sql).

import (
	"context"
	"net/http"
	"strings"

	"github.com/apinantianhaow/techxstudio-app/backend/internal/auth"
	"github.com/apinantianhaow/techxstudio-app/backend/internal/models"
)

// requireAdmin returns the caller's claims when they are an admin, otherwise
// writes a 401 (no valid token) or 403 (not an admin). The role is read from
// the database on each request, so revoking it takes effect immediately.
func (s *Server) requireAdmin(w http.ResponseWriter, r *http.Request) (*auth.Claims, bool) {
	claims, ok := s.requireUser(w, r, "Unauthorized")
	if !ok {
		return nil, false
	}
	admin, err := s.isAdmin(r.Context(), claims.ID)
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Something went wrong", err)
		return nil, false
	}
	if !admin {
		writeError(w, http.StatusForbidden, "Admin access required")
		return nil, false
	}
	return claims, true
}

func (s *Server) isAdmin(ctx context.Context, userID string) (bool, error) {
	var rows []struct {
		Role string `json:"role"`
	}
	if err := s.db.From("users").Select("role").Eq("id", userID).Limit(1).Get(ctx, &rows); err != nil {
		return false, err
	}
	user, found := first(rows)
	return found && user.Role == "admin", nil
}

// POST /api/admin/login — like /api/auth/login, but only admins get a token.
func (s *Server) adminLogin(w http.ResponseWriter, r *http.Request) {
	user, ok := s.checkCredentials(w, r)
	if !ok {
		return
	}
	admin, err := s.isAdmin(r.Context(), user.ID)
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Something went wrong", err)
		return
	}
	if !admin {
		writeError(w, http.StatusForbidden, "This account does not have admin access")
		return
	}
	s.issueToken(w, r, user)
}

// GET /api/admin/me
func (s *Server) adminMe(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireAdmin(w, r)
	if !ok {
		return
	}

	var rows []models.User
	err := s.db.From("users").Select(models.UserColumns).Eq("id", claims.ID).Get(r.Context(), &rows)
	user, found := first(rows)
	if err != nil || !found {
		writeError(w, http.StatusNotFound, "User not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

// ── Input helpers shared by the admin handlers ───────────────

// maxPrice keeps amounts well inside DECIMAL(12,2).
const maxPrice = 99_999_999

func validPrice(p float64) bool { return p > 0 && p <= maxPrice }

// optionalText trims s and turns "" into nil (stored as NULL).
func optionalText(s *string) *string {
	if s == nil {
		return nil
	}
	t := strings.TrimSpace(*s)
	if t == "" {
		return nil
	}
	return &t
}

func valueOr[T any](p *T, fallback T) T {
	if p == nil {
		return fallback
	}
	return *p
}

// distinct reports whether key returns a different value for every item.
func distinct[T any](items []T, key func(T) string) bool {
	seen := make(map[string]bool, len(items))
	for _, item := range items {
		k := key(item)
		if seen[k] {
			return false
		}
		seen[k] = true
	}
	return true
}
