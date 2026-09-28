package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"regexp"
	"strings"
	"sync"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"

	"github.com/apinantianhaow/techxstudio-app/backend/internal/auth"
	"github.com/apinantianhaow/techxstudio-app/backend/internal/mail"
	"github.com/apinantianhaow/techxstudio-app/backend/internal/supabase"
)

// ── Fakes ────────────────────────────────────────────────────

type fakeMailer struct {
	mu   sync.Mutex
	sent []mail.Message
	fail error
}

func (f *fakeMailer) Send(_ context.Context, m mail.Message) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.fail != nil {
		return f.fail
	}
	f.sent = append(f.sent, m)
	return nil
}

func (f *fakeMailer) last(t *testing.T) mail.Message {
	t.Helper()
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.sent) == 0 {
		t.Fatal("no email was sent")
	}
	return f.sent[len(f.sent)-1]
}

var codePattern = regexp.MustCompile(`\b\d{6}\b`)

// lastCode is the sign-in code in the most recent email.
func (f *fakeMailer) lastCode(t *testing.T) string {
	t.Helper()
	code := codePattern.FindString(f.last(t).Text)
	if code == "" {
		t.Fatalf("no code in email: %q", f.last(t).Text)
	}
	return code
}

// fakeGoogle accepts the credentials registered in ids.
type fakeGoogle struct {
	ids map[string]*auth.GoogleIdentity
}

func (f *fakeGoogle) Enabled() bool    { return true }
func (f *fakeGoogle) ClientID() string { return "test-client.apps.googleusercontent.com" }
func (f *fakeGoogle) Verify(_ context.Context, token string) (*auth.GoogleIdentity, error) {
	if id, ok := f.ids[token]; ok {
		return id, nil
	}
	return nil, errors.New("bad token")
}

// challengeTable is an in-memory login_challenges table that honours the
// filters the API uses (id, user_id, attempts/sends optimistic locks,
// used_at is.null).
type challengeTable struct {
	mu   sync.Mutex
	rows map[string]map[string]any
}

func newChallengeTable() *challengeTable {
	return &challengeTable{rows: map[string]map[string]any{}}
}

func (ct *challengeTable) handle(c restCall) (int, string, bool) {
	if c.Table != "login_challenges" {
		return 0, "", false
	}
	ct.mu.Lock()
	defer ct.mu.Unlock()
	encode := func(rows []map[string]any) string {
		b, _ := json.Marshal(rows)
		return string(b)
	}

	switch c.Method {
	case "POST":
		var row map[string]any
		json.Unmarshal([]byte(c.Body), &row)
		row["attempts"], row["sends"], row["used_at"] = 0.0, 1.0, nil
		row["created_at"] = time.Now().UTC().Format(time.RFC3339)
		ct.rows[row["id"].(string)] = row
		return 201, "", true
	case "GET":
		var out []map[string]any
		for _, row := range ct.rows {
			if matches(row, c.Query) {
				out = append(out, row)
			}
		}
		return 200, encode(out), true
	case "PATCH":
		var patch map[string]any
		json.Unmarshal([]byte(c.Body), &patch)
		var out []map[string]any
		for _, row := range ct.rows {
			if matches(row, c.Query) {
				for k, v := range patch {
					row[k] = v
				}
				out = append(out, row)
			}
		}
		return 200, encode(out), true
	}
	return 500, `{"message":"unexpected"}`, true
}

func matches(row map[string]any, q map[string][]string) bool {
	for col, filters := range q {
		if col == "select" || col == "limit" || col == "created_at" {
			continue
		}
		for _, f := range filters {
			switch {
			case f == "is.null":
				if row[col] != nil {
					return false
				}
			case strings.HasPrefix(f, "eq."):
				if fmt.Sprint(row[col]) != strings.TrimPrefix(f, "eq.") {
					return false
				}
			}
		}
	}
	return true
}

// ── Helpers ──────────────────────────────────────────────────

// signinEnv serves one password user (secret1) plus the challenge table.
func signinEnv(t *testing.T) (*testEnv, *challengeTable) {
	t.Helper()
	hash, _ := bcrypt.GenerateFromPassword([]byte("secret1"), bcrypt.MinCost)
	challenges := newChallengeTable()
	env := newEnv(t, func(c restCall) (int, string) {
		if status, body, ok := challenges.handle(c); ok {
			return status, body
		}
		return 200, `[{"id":"` + testUserID + `","email":"ann@example.com","full_name":"Ann","password_hash":"` + string(hash) + `"}]`
	})
	return env, challenges
}

func startLogin(t *testing.T, env *testEnv) string {
	t.Helper()
	status, body := call(t, env.handler, "POST", "/api/auth/login", "", map[string]string{"email": "ann@example.com", "password": "secret1"})
	if status != 200 {
		t.Fatalf("login: got %d %v", status, body)
	}
	return body["challenge_id"].(string)
}

func verify(t *testing.T, env *testEnv, challenge, code string) (int, map[string]any) {
	t.Helper()
	return call(t, env.handler, "POST", "/api/auth/login/verify", "", map[string]string{"challenge_id": challenge, "code": code})
}

// ── Two-step sign-in ─────────────────────────────────────────

func TestVerifyLocksAfterTooManyWrongCodes(t *testing.T) {
	env, _ := signinEnv(t)
	challenge := startLogin(t, env)
	code := env.mail.lastCode(t)
	wrong := "000000"
	if code == wrong {
		wrong = "111111"
	}

	for left := 4; left >= 1; left-- {
		status, body := verify(t, env, challenge, wrong)
		wantError(t, status, body, 400, fmt.Sprintf("Incorrect code. %s left.", countNoun(left, "attempt")))
	}
	status, body := verify(t, env, challenge, wrong)
	wantError(t, status, body, 429, "Too many incorrect codes. Please sign in again.")
	status, body = verify(t, env, challenge, code)
	wantError(t, status, body, 429, "Too many incorrect codes. Please sign in again.")
}

func TestVerifyRejectsBadInput(t *testing.T) {
	env, challenges := signinEnv(t)
	challenge := startLogin(t, env)

	for _, code := range []string{"", "12345", "1234567", "12a456"} {
		status, body := verify(t, env, challenge, code)
		wantError(t, status, body, 400, "Enter the 6-digit code from your email")
	}
	status, body := verify(t, env, "not-a-uuid", env.mail.lastCode(t))
	wantError(t, status, body, 400, "This code has expired. Request a new one or sign in again.")

	challenges.rows[challenge]["expires_at"] = time.Now().Add(-time.Second).UTC().Format(time.RFC3339)
	status, body = verify(t, env, challenge, env.mail.lastCode(t))
	wantError(t, status, body, 400, "This code has expired. Request a new one or sign in again.")
}

func TestResendCode(t *testing.T) {
	env, challenges := signinEnv(t)
	challenge := startLogin(t, env)
	oldCode := env.mail.lastCode(t)
	resend := func() (int, map[string]any) {
		return call(t, env.handler, "POST", "/api/auth/login/resend", "", map[string]string{"challenge_id": challenge})
	}

	status, body := resend()
	if status != 429 || !strings.HasPrefix(body["error"].(string), "Please wait ") {
		t.Fatalf("immediate resend: got %d %v", status, body)
	}

	challenges.rows[challenge]["last_sent_at"] = time.Now().Add(-2 * time.Minute).UTC().Format(time.RFC3339)
	status, body = resend()
	if status != 200 || body["challenge_id"] != challenge || len(env.mail.sent) != 2 {
		t.Fatalf("resend: got %d %v (emails %d)", status, body, len(env.mail.sent))
	}
	newCode := env.mail.lastCode(t)
	if newCode != oldCode {
		status, body = verify(t, env, challenge, oldCode)
		if status != 400 {
			t.Fatalf("old code still works: %d %v", status, body)
		}
	}
	if status, body := verify(t, env, challenge, newCode); status != 200 || body["token"] == nil {
		t.Fatalf("new code: got %d %v", status, body)
	}

	status, body = resend()
	wantError(t, status, body, 400, "This sign-in has expired. Please sign in again.")
}

func TestResendLimit(t *testing.T) {
	env, challenges := signinEnv(t)
	challenge := startLogin(t, env)
	challenges.rows[challenge]["sends"] = float64(maxCodeSends)
	challenges.rows[challenge]["last_sent_at"] = time.Now().Add(-time.Hour).UTC().Format(time.RFC3339)
	status, body := call(t, env.handler, "POST", "/api/auth/login/resend", "", map[string]string{"challenge_id": challenge})
	wantError(t, status, body, 429, "Too many codes requested. Please sign in again.")
}

func TestLoginRateLimit(t *testing.T) {
	env, _ := signinEnv(t)
	for range challengeLimit {
		startLogin(t, env)
	}
	status, body := call(t, env.handler, "POST", "/api/auth/login", "", map[string]string{"email": "ann@example.com", "password": "secret1"})
	wantError(t, status, body, 429, "Too many sign-in attempts. Please try again in 15 minutes.")
	if len(env.mail.sent) != challengeLimit {
		t.Fatalf("sent %d emails, want %d", len(env.mail.sent), challengeLimit)
	}
	q := env.rest.find("GET", "login_challenges")[0].Query
	if q.Get("user_id") != "eq."+testUserID || !strings.HasPrefix(q.Get("created_at"), "gte.") {
		t.Fatalf("rate-limit query: %v", q)
	}
}

func TestLoginReportsMailFailure(t *testing.T) {
	env, _ := signinEnv(t)
	env.mail.fail = errors.New("smtp down")
	status, body := call(t, env.handler, "POST", "/api/auth/login", "", map[string]string{"email": "ann@example.com", "password": "secret1"})
	wantError(t, status, body, 502, "We couldn't send the verification email. Please try again.")
}

func TestGoogleOnlyAccountsCantUsePasswords(t *testing.T) {
	env := newEnv(t, func(c restCall) (int, string) {
		return 200, `[{"id":"` + testUserID + `","email":"g@gmail.com","password_hash":null}]`
	})
	status, body := call(t, env.handler, "POST", "/api/auth/login", "", map[string]string{"email": "g@gmail.com", "password": "anything"})
	wantError(t, status, body, 401, "Invalid email or password")
}

// ── Google ───────────────────────────────────────────────────

// googleUsers fakes the users table for Google sign-in.
type googleUsers struct {
	bySub   map[string]string // google_sub → user JSON
	byEmail map[string]string // email → user JSON
	role    string
}

func (g *googleUsers) respond(c restCall) (int, string) {
	switch {
	case c.Table == "users" && c.Query.Get("select") == "role":
		return 200, `[{"role":"` + g.role + `"}]`
	case c.Method == "GET" && c.Query.Has("google_sub"):
		if u, ok := g.bySub[strings.TrimPrefix(c.Query.Get("google_sub"), "eq.")]; ok {
			return 200, "[" + u + "]"
		}
		return 200, "[]"
	case c.Method == "GET" && c.Query.Has("email"):
		if u, ok := g.byEmail[strings.TrimPrefix(c.Query.Get("email"), "eq.")]; ok {
			return 200, "[" + u + "]"
		}
		return 200, "[]"
	case c.Method == "POST":
		return 201, `[{"id":"new-user","email":"new@gmail.com","full_name":"New Person"}]`
	}
	return 200, "[]"
}

func TestGoogleLogin(t *testing.T) {
	users := &googleUsers{
		bySub: map[string]string{"sub-linked": `{"id":"u-linked","email":"linked@gmail.com","google_sub":"sub-linked"}`},
		byEmail: map[string]string{
			"ann@gmail.com":   `{"id":"u-ann","email":"ann@gmail.com","full_name":"Ann","google_sub":null}`,
			"taken@gmail.com": `{"id":"u-taken","email":"taken@gmail.com","google_sub":"someone-else"}`,
		},
	}
	env := newEnv(t, users.respond)
	env.google.ids = map[string]*auth.GoogleIdentity{
		"tok-linked":     {Subject: "sub-linked", Email: "linked@gmail.com", EmailVerified: true},
		"tok-ann":        {Subject: "sub-ann", Email: "Ann@Gmail.com", EmailVerified: true},
		"tok-new":        {Subject: "sub-new", Email: "new@gmail.com", EmailVerified: true, Name: "New Person", Picture: "https://pic"},
		"tok-taken":      {Subject: "sub-other", Email: "taken@gmail.com", EmailVerified: true},
		"tok-unverified": {Subject: "sub-x", Email: "x@gmail.com", EmailVerified: false},
	}
	google := func(cred string) (int, map[string]any) {
		return call(t, env.handler, "POST", "/api/auth/google", "", map[string]string{"credential": cred})
	}
	tokenFor := func(status int, body map[string]any) string {
		t.Helper()
		if status != 200 || body["token"] == nil {
			t.Fatalf("got %d %v", status, body)
		}
		claims, _ := env.tokens.Verify(body["token"].(string))
		return claims.ID
	}

	status, body := google("forged")
	wantError(t, status, body, 401, "Google sign-in failed. Please try again.")
	status, body = google("tok-unverified")
	wantError(t, status, body, 403, "Your Google account's email address is not verified")

	if id := tokenFor(google("tok-linked")); id != "u-linked" {
		t.Fatalf("linked account signed in as %s", id)
	}
	if len(env.rest.find("PATCH", "users")) != 0 || len(env.mail.sent) != 0 {
		t.Fatal("Google sign-in should not email a code or relink")
	}

	if id := tokenFor(google("tok-ann")); id != "u-ann" {
		t.Fatalf("email match signed in as %s", id)
	}
	link := env.rest.find("PATCH", "users")
	if len(link) != 1 || link[0].Body != `{"google_sub":"sub-ann"}` || link[0].Query.Get("id") != "eq.u-ann" {
		t.Fatalf("link: %v", link)
	}

	status, body = google("tok-taken")
	wantError(t, status, body, 409, "This email is linked to a different Google account")

	if id := tokenFor(google("tok-new")); id != "new-user" {
		t.Fatalf("new account signed in as %s", id)
	}
	var created map[string]any
	json.Unmarshal([]byte(env.rest.find("POST", "users")[0].Body), &created)
	if created["email"] != "new@gmail.com" || created["google_sub"] != "sub-new" || created["full_name"] != "New Person" || created["password_hash"] != nil {
		t.Fatalf("created: %v", created)
	}
}

func TestAdminGoogleLogin(t *testing.T) {
	users := &googleUsers{
		bySub: map[string]string{"sub-boss": `{"id":"u-boss","email":"boss@gmail.com","google_sub":"sub-boss"}`},
		role:  "customer",
	}
	env := newEnv(t, users.respond)
	env.google.ids = map[string]*auth.GoogleIdentity{
		"tok-boss":     {Subject: "sub-boss", Email: "boss@gmail.com", EmailVerified: true},
		"tok-stranger": {Subject: "sub-s", Email: "stranger@gmail.com", EmailVerified: true},
	}
	admin := func(cred string) (int, map[string]any) {
		return call(t, env.handler, "POST", "/api/admin/login/google", "", map[string]string{"credential": cred})
	}

	status, body := admin("tok-stranger")
	wantError(t, status, body, 403, "This account does not have admin access")
	if len(env.rest.find("POST", "users")) != 0 {
		t.Fatal("admin Google sign-in must never create accounts")
	}
	status, body = admin("tok-boss")
	wantError(t, status, body, 403, "This account does not have admin access")

	users.role = "admin"
	if status, body := admin("tok-boss"); status != 200 || body["token"] == nil {
		t.Fatalf("admin: got %d %v", status, body)
	}
}

func TestProvidersAndDisabledGoogle(t *testing.T) {
	env := newEnv(t, nil)
	status, body := call(t, env.handler, "GET", "/api/auth/providers", "", nil)
	if status != 200 || body["google_client_id"] != "test-client.apps.googleusercontent.com" || body["code_length"] != 6.0 {
		t.Fatalf("providers: got %d %v", status, body)
	}

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	h := NewServer(supabase.New("", ""), auth.NewTokens("x"), auth.NewGoogleVerifier(""), &fakeMailer{}, logger, "").Handler()
	status, body = call(t, h, "GET", "/api/auth/providers", "", nil)
	if body["google_client_id"] != "" {
		t.Fatalf("disabled providers: %v", body)
	}
	status, body = call(t, h, "POST", "/api/auth/google", "", map[string]string{"credential": "x"})
	wantError(t, status, body, 404, "Google sign-in is not enabled")
}

func TestMaskEmail(t *testing.T) {
	for in, want := range map[string]string{"ann@gmail.com": "a•••@gmail.com", "ชื่อ@example.com": "ช•••@example.com", "broken": "broken", "@x.co": "@x.co"} {
		if got := maskEmail(in); got != want {
			t.Errorf("maskEmail(%q) = %q, want %q", in, got, want)
		}
	}
}
