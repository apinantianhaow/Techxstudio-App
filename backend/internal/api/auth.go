package api

import (
	"net/http"
	"unicode/utf8"

	"golang.org/x/crypto/bcrypt"

	"github.com/apinantianhaow/techxstudio-app/backend/internal/models"
)

const bcryptCost = 10

type authResponse struct {
	User  models.User `json:"user"`
	Token string      `json:"token"`
}

// POST /api/auth/signup
func (s *Server) signup(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
		FullName string `json:"full_name"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	var v validation
	v.check(isEmail(body.Email), "Invalid email address")
	v.check(utf8.RuneCountInString(body.Password) >= 6, "Password must be at least 6 characters")
	v.check(body.FullName != "", "Please enter your name")
	if v.failed(w) {
		return
	}

	var existing []struct {
		ID string `json:"id"`
	}
	err := s.db.From("users").Select("id").Eq("email", body.Email).Limit(1).Get(r.Context(), &existing)
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Something went wrong", err)
		return
	}
	if len(existing) > 0 {
		writeError(w, http.StatusConflict, "This email is already in use")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcryptCost)
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Something went wrong", err)
		return
	}

	var created []models.User
	err = s.db.From("users").Select(models.UserColumns).Insert(r.Context(), map[string]any{
		"email":         body.Email,
		"password_hash": string(hash),
		"full_name":     body.FullName,
	}, &created)
	user, ok := first(created)
	if err != nil || !ok {
		s.fail(w, r, http.StatusInternalServerError, "Unable to create account", err)
		return
	}

	token, err := s.tokens.Sign(user.ID, user.Email, user.FullName)
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Something went wrong", err)
		return
	}
	writeJSON(w, http.StatusCreated, authResponse{User: user, Token: token})
}

// POST /api/auth/login
func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	var v validation
	v.check(isEmail(body.Email), "Invalid email address")
	v.check(body.Password != "", "Please enter your password")
	if v.failed(w) {
		return
	}

	var rows []models.UserWithPassword
	err := s.db.From("users").Select(models.UserColumns+", password_hash").Eq("email", body.Email).Limit(1).Get(r.Context(), &rows)
	user, ok := first(rows)
	if err != nil || !ok {
		if err != nil {
			s.log.Error("login lookup failed", "err", err)
		}
		writeError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(body.Password)) != nil {
		writeError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	token, err := s.tokens.Sign(user.ID, user.Email, user.FullName)
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Something went wrong", err)
		return
	}
	writeJSON(w, http.StatusOK, authResponse{User: user.User, Token: token})
}

// GET /api/auth/me
func (s *Server) getMe(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Unauthorized")
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

// PUT /api/auth/me
func (s *Server) updateMe(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Unauthorized")
	if !ok {
		return
	}

	var body struct {
		FullName *string `json:"full_name"`
		Phone    *string `json:"phone"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	var v validation
	if body.FullName != nil {
		v.check(*body.FullName != "", "Name is required")
		v.check(utf8.RuneCountInString(*body.FullName) <= 100, "Name must be at most 100 characters")
	}
	if body.Phone != nil {
		v.check(utf8.RuneCountInString(*body.Phone) <= 20, "Phone must be at most 20 characters")
	}
	if v.failed(w) {
		return
	}

	updates := map[string]any{}
	if body.FullName != nil {
		updates["full_name"] = *body.FullName
	}
	if body.Phone != nil {
		updates["phone"] = *body.Phone
	}
	if len(updates) == 0 {
		writeError(w, http.StatusBadRequest, "No fields to update")
		return
	}

	var rows []models.User
	err := s.db.From("users").Select(models.UserColumns).Eq("id", claims.ID).Update(r.Context(), updates, &rows)
	user, found := first(rows)
	if err != nil || !found {
		s.fail(w, r, http.StatusInternalServerError, "Unable to update profile", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

// DELETE /api/auth/me — related rows go via ON DELETE CASCADE.
func (s *Server) deleteMe(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Unauthorized")
	if !ok {
		return
	}
	if err := s.db.From("users").Eq("id", claims.ID).Delete(r.Context()); err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to delete account", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}
