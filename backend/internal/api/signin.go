package api

// Two-step sign-in and Google sign-in.
//
// Password sign-in (and sign-up) never returns a token directly: it creates a
// login challenge and emails a 6-digit code. POST /api/auth/login/verify
// exchanges the code for the token. Google sign-in skips the code because
// Google has already verified the person.

import (
	"context"
	"crypto/rand"
	"fmt"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/apinantianhaow/techxstudio-app/backend/internal/auth"
	"github.com/apinantianhaow/techxstudio-app/backend/internal/mail"
	"github.com/apinantianhaow/techxstudio-app/backend/internal/models"
	"github.com/apinantianhaow/techxstudio-app/backend/internal/supabase"
)

const (
	codeTTL         = 10 * time.Minute
	resendAfter     = 60 * time.Second
	maxCodeAttempts = 5
	maxCodeSends    = 5
	// At most challengeLimit password sign-ins per user per challengeWindow,
	// so a leaked password can't be used to flood the owner's inbox.
	challengeLimit  = 5
	challengeWindow = 15 * time.Minute
)

// GoogleVerifier checks "Sign in with Google" ID tokens (*auth.GoogleVerifier).
type GoogleVerifier interface {
	Enabled() bool
	ClientID() string
	Verify(ctx context.Context, idToken string) (*auth.GoogleIdentity, error)
}

// challengeResponse tells the client that a code was emailed.
type challengeResponse struct {
	OTPRequired bool   `json:"otp_required"`
	ChallengeID string `json:"challenge_id"`
	Email       string `json:"email"`      // masked, e.g. "a•••@gmail.com"
	ExpiresIn   int    `json:"expires_in"` // seconds until the code expires
	ResendIn    int    `json:"resend_in"`  // seconds until a new code may be requested
}

// GET /api/auth/providers — lets the frontends decide which buttons to show.
func (s *Server) authProviders(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"google_client_id": s.google.ClientID(),
		"code_length":      auth.CodeLength,
	})
}

// startChallenge emails user a new code and responds with the challenge.
func (s *Server) startChallenge(w http.ResponseWriter, r *http.Request, user models.User, status int) {
	ctx := r.Context()

	var recent []struct {
		ID string `json:"id"`
	}
	since := time.Now().Add(-challengeWindow).UTC().Format(time.RFC3339)
	if err := s.db.From("login_challenges").Select("id").Eq("user_id", user.ID).Gte("created_at", since).Get(ctx, &recent); err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Something went wrong", err)
		return
	}
	if len(recent) >= challengeLimit {
		writeError(w, http.StatusTooManyRequests, "Too many sign-in attempts. Please try again in 15 minutes.")
		return
	}

	code, err := auth.NewCode()
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Something went wrong", err)
		return
	}
	id := newUUID()
	now := time.Now().UTC()
	err = s.db.From("login_challenges").Insert(ctx, map[string]any{
		"id":           id,
		"user_id":      user.ID,
		"code_hash":    s.tokens.CodeHash(id, code),
		"expires_at":   now.Add(codeTTL).Format(time.RFC3339),
		"last_sent_at": now.Format(time.RFC3339),
	}, nil)
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Something went wrong", err)
		return
	}

	if err := s.sendCode(ctx, user.Email, code); err != nil {
		s.fail(w, r, http.StatusBadGateway, "We couldn't send the verification email. Please try again.", err)
		return
	}
	writeJSON(w, status, challengeResponse{
		OTPRequired: true,
		ChallengeID: id,
		Email:       maskEmail(user.Email),
		ExpiresIn:   int(codeTTL.Seconds()),
		ResendIn:    int(resendAfter.Seconds()),
	})
}

// POST /api/auth/login/verify  body: { challenge_id, code }
func (s *Server) verifyLogin(w http.ResponseWriter, r *http.Request) {
	user, ok := s.verifyChallenge(w, r)
	if !ok {
		return
	}
	s.issueToken(w, r, user)
}

// verifyChallenge checks the emailed code and returns the user it signs in,
// or writes an error. Each challenge allows maxCodeAttempts guesses and can
// be used once.
func (s *Server) verifyChallenge(w http.ResponseWriter, r *http.Request) (models.User, bool) {
	var body struct {
		ChallengeID string `json:"challenge_id"`
		Code        string `json:"code"`
	}
	if !decodeJSON(w, r, &body) {
		return models.User{}, false
	}
	code := strings.TrimSpace(body.Code)
	if len(code) != auth.CodeLength || strings.Trim(code, "0123456789") != "" {
		writeError(w, http.StatusBadRequest, fmt.Sprintf("Enter the %d-digit code from your email", auth.CodeLength))
		return models.User{}, false
	}

	ctx := r.Context()
	ch, found, err := s.loadChallenge(ctx, body.ChallengeID)
	switch {
	case err != nil:
		s.fail(w, r, http.StatusInternalServerError, "Something went wrong", err)
		return models.User{}, false
	case !found || ch.UsedAt != nil || !time.Now().Before(parseTime(ch.ExpiresAt)):
		writeError(w, http.StatusBadRequest, "This code has expired. Request a new one or sign in again.")
		return models.User{}, false
	case ch.Attempts >= maxCodeAttempts:
		writeError(w, http.StatusTooManyRequests, "Too many incorrect codes. Please sign in again.")
		return models.User{}, false
	}

	if !s.tokens.CodeMatches(ch.ID, code, ch.CodeHash) {
		// Only count the guess if nobody else did in the meantime (optimistic lock).
		err := s.db.From("login_challenges").Eq("id", ch.ID).Eq("attempts", ch.Attempts).
			Update(ctx, map[string]any{"attempts": ch.Attempts + 1}, nil)
		if err != nil {
			s.log.Error("record code attempt", "challenge", ch.ID, "err", err)
		}
		left := maxCodeAttempts - ch.Attempts - 1
		if left <= 0 {
			writeError(w, http.StatusTooManyRequests, "Too many incorrect codes. Please sign in again.")
		} else {
			writeError(w, http.StatusBadRequest, fmt.Sprintf("Incorrect code. %s left.", countNoun(left, "attempt")))
		}
		return models.User{}, false
	}

	var used []models.LoginChallenge
	err = s.db.From("login_challenges").Select("id").Eq("id", ch.ID).IsNull("used_at").
		Update(ctx, map[string]any{"used_at": time.Now().UTC().Format(time.RFC3339)}, &used)
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Something went wrong", err)
		return models.User{}, false
	}
	if len(used) == 0 { // verified concurrently
		writeError(w, http.StatusBadRequest, "This code has expired. Request a new one or sign in again.")
		return models.User{}, false
	}

	user, found, err := s.userByID(ctx, ch.UserID)
	if err != nil || !found {
		s.fail(w, r, http.StatusInternalServerError, "Something went wrong", err)
		return models.User{}, false
	}
	return user, true
}

// POST /api/auth/login/resend  body: { challenge_id } — emails a fresh code
// for the same challenge (the previous code stops working).
func (s *Server) resendCode(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ChallengeID string `json:"challenge_id"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	ctx := r.Context()
	ch, found, err := s.loadChallenge(ctx, body.ChallengeID)
	switch {
	case err != nil:
		s.fail(w, r, http.StatusInternalServerError, "Something went wrong", err)
		return
	case !found || ch.UsedAt != nil || ch.Attempts >= maxCodeAttempts:
		writeError(w, http.StatusBadRequest, "This sign-in has expired. Please sign in again.")
		return
	case ch.Sends >= maxCodeSends:
		writeError(w, http.StatusTooManyRequests, "Too many codes requested. Please sign in again.")
		return
	}
	if wait := resendAfter - time.Since(parseTime(ch.LastSentAt)); wait > 0 {
		writeError(w, http.StatusTooManyRequests, fmt.Sprintf("Please wait %d seconds before requesting a new code.", int(wait.Seconds())+1))
		return
	}

	user, found, err := s.userByID(ctx, ch.UserID)
	if err != nil || !found {
		s.fail(w, r, http.StatusInternalServerError, "Something went wrong", err)
		return
	}
	code, err := auth.NewCode()
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Something went wrong", err)
		return
	}
	now := time.Now().UTC()
	var updated []models.LoginChallenge
	err = s.db.From("login_challenges").Select("id").Eq("id", ch.ID).Eq("sends", ch.Sends).
		Update(ctx, map[string]any{
			"code_hash":    s.tokens.CodeHash(ch.ID, code),
			"expires_at":   now.Add(codeTTL).Format(time.RFC3339),
			"last_sent_at": now.Format(time.RFC3339),
			"sends":        ch.Sends + 1,
		}, &updated)
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Something went wrong", err)
		return
	}
	if len(updated) == 0 { // another resend won the race; its code is on the way
		writeError(w, http.StatusTooManyRequests, "A new code is already on its way.")
		return
	}
	if err := s.sendCode(ctx, user.Email, code); err != nil {
		s.fail(w, r, http.StatusBadGateway, "We couldn't send the verification email. Please try again.", err)
		return
	}
	writeJSON(w, http.StatusOK, challengeResponse{
		OTPRequired: true,
		ChallengeID: ch.ID,
		Email:       maskEmail(user.Email),
		ExpiresIn:   int(codeTTL.Seconds()),
		ResendIn:    int(resendAfter.Seconds()),
	})
}

func (s *Server) loadChallenge(ctx context.Context, id string) (models.LoginChallenge, bool, error) {
	if !uuidPattern.MatchString(id) {
		return models.LoginChallenge{}, false, nil
	}
	var rows []models.LoginChallenge
	err := s.db.From("login_challenges").Select("*").Eq("id", id).Limit(1).Get(ctx, &rows)
	ch, found := first(rows)
	return ch, found, err
}

func (s *Server) userByID(ctx context.Context, id string) (models.User, bool, error) {
	var rows []models.User
	err := s.db.From("users").Select(models.UserColumns).Eq("id", id).Limit(1).Get(ctx, &rows)
	user, found := first(rows)
	return user, found, err
}

// ── Google ────────────────────────────────────────────────────

// POST /api/auth/google  body: { credential } — the ID token from Google's
// button. Creates the account on first use.
func (s *Server) googleLogin(w http.ResponseWriter, r *http.Request) {
	user, _, ok := s.googleUser(w, r, true)
	if !ok {
		return
	}
	s.issueToken(w, r, user)
}

// googleUser verifies the Google credential in the body and returns the
// matching user: by Google account id, else by email (linking the Google
// account to it), else a new user when create is true (found = false when
// there's no user and create is false).
func (s *Server) googleUser(w http.ResponseWriter, r *http.Request, create bool) (user models.User, found, ok bool) {
	if !s.google.Enabled() {
		writeError(w, http.StatusNotFound, "Google sign-in is not enabled")
		return models.User{}, false, false
	}
	var body struct {
		Credential string `json:"credential"`
	}
	if !decodeJSON(w, r, &body) {
		return models.User{}, false, false
	}
	ctx := r.Context()
	id, err := s.google.Verify(ctx, body.Credential)
	if err != nil {
		s.log.Warn("google sign-in rejected", "err", err)
		writeError(w, http.StatusUnauthorized, "Google sign-in failed. Please try again.")
		return models.User{}, false, false
	}
	if !id.EmailVerified {
		writeError(w, http.StatusForbidden, "Your Google account's email address is not verified")
		return models.User{}, false, false
	}
	email := strings.ToLower(id.Email)

	type googleRow struct {
		models.User
		GoogleSub *string `json:"google_sub"`
	}
	lookup := func(column, value string) (googleRow, bool, error) {
		var rows []googleRow
		err := s.db.From("users").Select(models.UserColumns+", google_sub").Eq(column, value).Limit(1).Get(ctx, &rows)
		row, found := first(rows)
		return row, found, err
	}

	row, found, err := lookup("google_sub", id.Subject)
	if err == nil && !found {
		row, found, err = lookup("email", email)
	}
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Something went wrong", err)
		return models.User{}, false, false
	}

	if found {
		switch {
		case row.GoogleSub == nil:
			// First Google sign-in for an existing account: link it.
			if err := s.db.From("users").Eq("id", row.ID).Update(ctx, map[string]any{"google_sub": id.Subject}, nil); err != nil {
				s.fail(w, r, http.StatusInternalServerError, "Something went wrong", err)
				return models.User{}, false, false
			}
		case *row.GoogleSub != id.Subject:
			writeError(w, http.StatusConflict, "This email is linked to a different Google account")
			return models.User{}, false, false
		}
		return row.User, true, true
	}
	if !create {
		return models.User{}, false, true
	}

	var created []models.User
	err = s.db.From("users").Select(models.UserColumns).Insert(ctx, map[string]any{
		"email":      email,
		"full_name":  nonEmpty(id.Name),
		"avatar_url": nonEmpty(id.Picture),
		"google_sub": id.Subject,
	}, &created)
	newUser, ok := first(created)
	switch {
	case supabase.IsCode(err, "23505"):
		writeError(w, http.StatusConflict, "This account was just created. Please try again.")
		return models.User{}, false, false
	case err != nil || !ok:
		s.fail(w, r, http.StatusInternalServerError, "Unable to create account", err)
		return models.User{}, false, false
	}
	return newUser, true, true
}

// ── Helpers ───────────────────────────────────────────────────

func (s *Server) sendCode(ctx context.Context, to, code string) error {
	return s.mailer.Send(ctx, mail.Message{
		To:      to,
		Subject: "รหัสยืนยัน TechXStudio (Verification code)",
		Text:    fmt.Sprintf(codeEmailText, code, code),
		HTML:    fmt.Sprintf(codeEmailHTML, code),
	})
}

const codeEmailText = `รหัสยืนยันของคุณคือ %s
ใช้ได้ภายใน 10 นาที ห้ามบอกรหัสนี้กับใคร รวมถึงพนักงาน TechXStudio

Your TechXStudio verification code is %s
It expires in 10 minutes. Never share it with anyone, including TechXStudio staff.

ถ้าคุณไม่ได้เป็นคนขอรหัสนี้ ไม่ต้องทำอะไร และอย่ากรอกรหัสนี้ที่ใด
If you didn't request this code, ignore this email and don't enter the code anywhere.
`

const codeEmailHTML = `<!doctype html>
<html><body style="margin:0;padding:32px 16px;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue','Noto Sans Thai',Arial,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:18px;padding:32px">
<tr><td>
<p style="margin:0 0 24px;font-size:15px;font-weight:600">TechXStudio</p>
<p style="margin:0 0 4px;font-size:15px">รหัสยืนยันของคุณ · Your verification code</p>
<p style="margin:0 0 20px;font-size:36px;font-weight:600;letter-spacing:8px">%s</p>
<p style="margin:0 0 4px;font-size:13px;color:#6e6e73">ใช้ได้ภายใน 10 นาที ห้ามบอกรหัสนี้กับใคร รวมถึงพนักงาน TechXStudio</p>
<p style="margin:0 0 20px;font-size:13px;color:#6e6e73">Expires in 10 minutes. Never share it with anyone, including TechXStudio staff.</p>
<p style="margin:0;font-size:12px;color:#86868b">ถ้าคุณไม่ได้เป็นคนขอรหัสนี้ ไม่ต้องทำอะไร · If you didn't request this code, you can ignore this email.</p>
</td></tr></table>
</td></tr></table>
</body></html>`

// maskEmail shows enough of an address to recognise it: "a•••@gmail.com".
func maskEmail(email string) string {
	local, domain, ok := strings.Cut(email, "@")
	if !ok || local == "" {
		return email
	}
	first, _ := utf8.DecodeRuneInString(local)
	return string(first) + "•••@" + domain
}

// countNoun renders "1 attempt" / "3 attempts".
func countNoun(n int, noun string) string {
	if n == 1 {
		return "1 " + noun
	}
	return fmt.Sprintf("%d %ss", n, noun)
}

func nonEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// parseTime reads a timestamptz from PostgREST; unparsable values count as
// the zero time (i.e. long expired).
func parseTime(s string) time.Time {
	t, _ := time.Parse(time.RFC3339, s)
	return t
}

// newUUID returns a random (version 4) UUID.
func newUUID() string {
	b := make([]byte, 16)
	rand.Read(b)
	b[6] = b[6]&0x0f | 0x40
	b[8] = b[8]&0x3f | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}
