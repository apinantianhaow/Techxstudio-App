package auth

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"math/big"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const testClientID = "1234-abc.apps.googleusercontent.com"

type fakeGoogle struct {
	key     *rsa.PrivateKey
	kid     string
	fetches atomic.Int32
}

func newFakeGoogle(t *testing.T) (*fakeGoogle, *GoogleVerifier) {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	g := &fakeGoogle{key: key, kid: "key-1"}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		g.fetches.Add(1)
		w.Header().Set("Cache-Control", "public, max-age=3600")
		json.NewEncoder(w).Encode(map[string]any{"keys": []map[string]string{{
			"kid": g.kid, "kty": "RSA", "alg": "RS256", "use": "sig",
			"n": base64.RawURLEncoding.EncodeToString(key.N.Bytes()),
			"e": base64.RawURLEncoding.EncodeToString(big.NewInt(int64(key.E)).Bytes()),
		}}})
	}))
	t.Cleanup(srv.Close)

	v := NewGoogleVerifier(testClientID)
	v.certsURL = srv.URL
	return g, v
}

func (g *fakeGoogle) sign(t *testing.T, edit func(c jwt.MapClaims)) string {
	t.Helper()
	claims := jwt.MapClaims{
		"iss": "https://accounts.google.com", "aud": testClientID, "sub": "110169484474386276334",
		"email": "ann@gmail.com", "email_verified": true, "name": "Ann Example", "picture": "https://lh3.googleusercontent.com/a/x",
		"iat": time.Now().Unix(), "exp": time.Now().Add(time.Hour).Unix(),
	}
	if edit != nil {
		edit(claims)
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	tok.Header["kid"] = g.kid
	s, err := tok.SignedString(g.key)
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func TestGoogleVerifierAcceptsValidToken(t *testing.T) {
	g, v := newFakeGoogle(t)
	id, err := v.Verify(context.Background(), g.sign(t, nil))
	if err != nil {
		t.Fatal(err)
	}
	if id.Subject != "110169484474386276334" || id.Email != "ann@gmail.com" || !id.EmailVerified || id.Name != "Ann Example" {
		t.Fatalf("got %+v", id)
	}
	// Keys are cached for max-age.
	if _, err := v.Verify(context.Background(), g.sign(t, nil)); err != nil || g.fetches.Load() != 1 {
		t.Fatalf("second verify: err=%v fetches=%d", err, g.fetches.Load())
	}
}

func TestGoogleVerifierRejectsBadTokens(t *testing.T) {
	g, v := newFakeGoogle(t)
	otherKey, _ := rsa.GenerateKey(rand.Reader, 2048)
	forged := jwt.NewWithClaims(jwt.SigningMethodRS256, jwt.MapClaims{
		"iss": "accounts.google.com", "aud": testClientID, "sub": "1", "email": "x@gmail.com", "exp": time.Now().Add(time.Hour).Unix(),
	})
	forged.Header["kid"] = g.kid
	forgedToken, _ := forged.SignedString(otherKey)
	hs := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"iss": "accounts.google.com", "aud": testClientID, "sub": "1", "email": "x@gmail.com", "exp": time.Now().Add(time.Hour).Unix()})
	hsToken, _ := hs.SignedString([]byte("guess"))

	for name, token := range map[string]string{
		"other app's client id":  g.sign(t, func(c jwt.MapClaims) { c["aud"] = "someone-else.apps.googleusercontent.com" }),
		"wrong issuer":           g.sign(t, func(c jwt.MapClaims) { c["iss"] = "https://evil.example" }),
		"expired":                g.sign(t, func(c jwt.MapClaims) { c["exp"] = time.Now().Add(-time.Hour).Unix() }),
		"no expiry":              g.sign(t, func(c jwt.MapClaims) { delete(c, "exp") }),
		"no email":               g.sign(t, func(c jwt.MapClaims) { delete(c, "email") }),
		"signed by another key":  forgedToken,
		"HS256 instead of RS256": hsToken,
		"garbage":                "not.a.jwt",
	} {
		if id, err := v.Verify(context.Background(), token); err == nil {
			t.Errorf("%s: accepted %+v", name, id)
		}
	}
}

func TestGoogleVerifierRefetchesRotatedKeys(t *testing.T) {
	g, v := newFakeGoogle(t)
	if _, err := v.Verify(context.Background(), g.sign(t, nil)); err != nil {
		t.Fatal(err)
	}
	g.kid = "key-2" // Google rotated keys
	v.lastFetch = time.Now().Add(-2 * time.Minute)
	if _, err := v.Verify(context.Background(), g.sign(t, nil)); err != nil || g.fetches.Load() != 2 {
		t.Fatalf("after rotation: err=%v fetches=%d", err, g.fetches.Load())
	}
}

func TestDisabledGoogleVerifier(t *testing.T) {
	v := NewGoogleVerifier("")
	if v.Enabled() || v.ClientID() != "" {
		t.Fatal("empty client id should disable Google sign-in")
	}
	if _, err := v.Verify(context.Background(), "x"); err == nil || !strings.Contains(err.Error(), "not configured") {
		t.Fatalf("got %v", err)
	}
}

func TestCodes(t *testing.T) {
	seen := map[string]bool{}
	for range 200 {
		c, err := NewCode()
		if err != nil || len(c) != CodeLength || strings.Trim(c, "0123456789") != "" {
			t.Fatalf("bad code %q (%v)", c, err)
		}
		seen[c] = true
	}
	if len(seen) < 190 {
		t.Fatalf("codes are not random enough: %d unique of 200", len(seen))
	}

	a, b := NewTokens("secret-a"), NewTokens("secret-b")
	hash := a.CodeHash("challenge-1", "123456")
	if hash == "123456" || !a.CodeMatches("challenge-1", "123456", hash) {
		t.Fatal("code should match its own hash")
	}
	for name, ok := range map[string]bool{
		"wrong code":      a.CodeMatches("challenge-1", "123457", hash),
		"other challenge": a.CodeMatches("challenge-2", "123456", hash),
		"other secret":    b.CodeMatches("challenge-1", "123456", hash),
	} {
		if ok {
			t.Errorf("%s: matched", name)
		}
	}
}
