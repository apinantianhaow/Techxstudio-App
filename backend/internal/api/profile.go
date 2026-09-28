package api

// Profile: username (every change is logged by a database trigger, see
// 006_usernames_and_avatars.sql) and profile photo (Supabase Storage).

import (
	"context"
	"errors"
	"io"
	"net/http"
	"regexp"
	"slices"
	"strings"
	"time"

	"github.com/apinantianhaow/techxstudio-app/backend/internal/models"
)

const (
	avatarBucket   = "avatars"
	maxAvatarBytes = 2 << 20
	// A released username stays with its previous owner this long, so nobody
	// can pick it up right away and pose as them.
	usernameHold = 30 * 24 * time.Hour
)

var (
	usernamePattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9_.]{2,29}$`)
	// Keep in sync with generate_username() in 006_usernames_and_avatars.sql.
	reservedUsernames = []string{"admin", "administrator", "root", "support", "help", "staff",
		"moderator", "system", "official", "techx", "techxstudio", "apple"}
	avatarExtensions = map[string]string{"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
)

// usernameProblem explains why userID can't use name, with the status to
// report; "" means the name is free. Case doesn't matter: "APXNAN" and
// "apxnan" are the same name.
func (s *Server) usernameProblem(ctx context.Context, userID, name string) (string, int, error) {
	if !usernamePattern.MatchString(name) {
		return "Usernames are 3-30 characters: letters, numbers, _ or . (starting with a letter or number)", http.StatusBadRequest, nil
	}
	key := strings.ToLower(name)
	if slices.Contains(reservedUsernames, key) {
		return "This username isn't available", http.StatusConflict, nil
	}

	var rows []struct {
		ID string `json:"id"`
	}
	if err := s.db.From("users").Select("id").Eq("username_key", key).Neq("id", userID).Limit(1).Get(ctx, &rows); err != nil {
		return "", 0, err
	}
	if len(rows) > 0 {
		return "This username is already taken", http.StatusConflict, nil
	}

	since := time.Now().Add(-usernameHold).UTC().Format(time.RFC3339)
	err := s.db.From("username_history").Select("id").
		Eq("old_key", key).Neq("user_id", userID).Gte("changed_at", since).Limit(1).
		Get(ctx, &rows)
	if err != nil {
		return "", 0, err
	}
	if len(rows) > 0 {
		return "Someone used this username recently. Please choose another.", http.StatusConflict, nil
	}
	return "", 0, nil
}

// GET /api/auth/username-available?username=
func (s *Server) usernameAvailable(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Please log in")
	if !ok {
		return
	}
	problem, _, err := s.usernameProblem(r.Context(), claims.ID, strings.TrimSpace(r.URL.Query().Get("username")))
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Something went wrong", err)
		return
	}
	resp := map[string]any{"available": problem == ""}
	if problem != "" {
		resp["reason"] = problem
	}
	writeJSON(w, http.StatusOK, resp)
}

// GET /api/auth/me/username-history — newest first.
func (s *Server) usernameHistory(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Please log in")
	if !ok {
		return
	}
	history := []models.UsernameChange{}
	err := s.db.From("username_history").Select("old_username, new_username, changed_at").
		Eq("user_id", claims.ID).Order("changed_at", false).Limit(50).
		Get(r.Context(), &history)
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to load username history", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"history": history})
}

// PUT /api/auth/me/avatar — the body is the photo itself (JPEG, PNG or WebP,
// up to 2 MB). The store crops and shrinks photos before uploading.
func (s *Server) uploadAvatar(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Please log in")
	if !ok {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxAvatarBytes)
	data, err := io.ReadAll(r.Body)
	var tooBig *http.MaxBytesError
	switch {
	case errors.As(err, &tooBig):
		writeError(w, http.StatusRequestEntityTooLarge, "Photos must be 2 MB or smaller")
		return
	case err != nil:
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	case len(data) == 0:
		writeError(w, http.StatusBadRequest, "Choose a photo to upload")
		return
	}
	// Trust the bytes, not the Content-Type header.
	contentType := http.DetectContentType(data)
	ext, ok := avatarExtensions[contentType]
	if !ok {
		writeError(w, http.StatusUnsupportedMediaType, "Photos must be JPEG, PNG or WebP")
		return
	}

	ctx := r.Context()
	current, found, err := s.userByID(ctx, claims.ID)
	if err != nil || !found {
		s.fail(w, r, http.StatusNotFound, "User not found", err)
		return
	}
	path := claims.ID + "/" + newUUID() + ext
	if err := s.db.Upload(ctx, avatarBucket, path, contentType, data); err != nil {
		s.fail(w, r, http.StatusBadGateway, "Unable to upload photo", err)
		return
	}
	url := s.db.PublicURL(avatarBucket, path)
	user, err := s.setAvatar(ctx, claims.ID, &url)
	if err != nil {
		s.removeAvatarFile(ctx, claims.ID, &url)
		s.fail(w, r, http.StatusInternalServerError, "Unable to update profile", err)
		return
	}
	s.removeAvatarFile(ctx, claims.ID, current.AvatarURL)
	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

// DELETE /api/auth/me/avatar
func (s *Server) deleteAvatar(w http.ResponseWriter, r *http.Request) {
	claims, ok := s.requireUser(w, r, "Please log in")
	if !ok {
		return
	}
	ctx := r.Context()
	current, found, err := s.userByID(ctx, claims.ID)
	if err != nil || !found {
		s.fail(w, r, http.StatusNotFound, "User not found", err)
		return
	}
	user, err := s.setAvatar(ctx, claims.ID, nil)
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to update profile", err)
		return
	}
	s.removeAvatarFile(ctx, claims.ID, current.AvatarURL)
	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

func (s *Server) setAvatar(ctx context.Context, userID string, url *string) (models.User, error) {
	var rows []models.User
	err := s.db.From("users").Select(models.UserColumns).Eq("id", userID).
		Update(ctx, map[string]any{"avatar_url": url}, &rows)
	user, found := first(rows)
	if err == nil && !found {
		err = errors.New("user not found")
	}
	return user, err
}

// removeAvatarFile deletes a photo this API stored for userID. Other URLs,
// such as a Google profile photo, are left alone; failures are only logged.
func (s *Server) removeAvatarFile(ctx context.Context, userID string, url *string) {
	if url == nil {
		return
	}
	path, ours := s.db.ObjectPath(avatarBucket, *url)
	if !ours || !strings.HasPrefix(path, userID+"/") {
		return
	}
	if err := s.db.Remove(ctx, avatarBucket, path); err != nil {
		s.log.Error("remove avatar", "path", path, "err", err)
	}
}
