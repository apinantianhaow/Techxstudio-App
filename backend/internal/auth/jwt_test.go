package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"
)

// nodeToken builds an HS256 token the way the old Node API (jsonwebtoken) did.
func nodeToken(secret, payload string) string {
	enc := base64.RawURLEncoding
	unsigned := enc.EncodeToString([]byte(`{"alg":"HS256","typ":"JWT"}`)) + "." + enc.EncodeToString([]byte(payload))
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(unsigned))
	return unsigned + "." + enc.EncodeToString(mac.Sum(nil))
}

func TestAcceptsTokensFromNodeAPI(t *testing.T) {
	now := time.Now().Unix()
	payload := `{"id":"u1","email":"a@b.co","full_name":"Ann","iat":` + strconv.FormatInt(now, 10) + `,"exp":` + strconv.FormatInt(now+3600, 10) + `}`
	tokens := NewTokens("secret")

	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer "+nodeToken("secret", payload))
	claims := tokens.UserFromRequest(req)
	if claims == nil || claims.ID != "u1" || claims.Email != "a@b.co" || *claims.FullName != "Ann" {
		t.Fatalf("got %+v", claims)
	}
}

func TestRejectsBadTokens(t *testing.T) {
	now := time.Now().Unix()
	valid := `{"id":"u1","email":"a@b.co","exp":` + strconv.FormatInt(now+3600, 10) + `}`
	expired := `{"id":"u1","email":"a@b.co","exp":` + strconv.FormatInt(now-10, 10) + `}`
	noExpiry := `{"id":"u1","email":"a@b.co"}`
	tokens := NewTokens("secret")

	for name, token := range map[string]string{
		"wrong secret": nodeToken("other", valid),
		"expired":      nodeToken("secret", expired),
		"no expiry":    nodeToken("secret", noExpiry),
		"alg none":     base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"none"}`)) + "." + base64.RawURLEncoding.EncodeToString([]byte(valid)) + ".",
	} {
		if _, err := tokens.Verify(token); err == nil {
			t.Errorf("%s: token accepted", name)
		}
	}
}

func TestSignRoundTrip(t *testing.T) {
	tokens := NewTokens("secret")
	token, err := tokens.Sign("u1", "a@b.co", nil)
	if err != nil {
		t.Fatal(err)
	}
	claims, err := tokens.Verify(token)
	if err != nil || claims.ID != "u1" || claims.FullName != nil {
		t.Fatalf("got %+v, %v", claims, err)
	}
	if ttl := time.Until(claims.ExpiresAt.Time); ttl < 6*24*time.Hour || ttl > 7*24*time.Hour {
		t.Fatalf("unexpected expiry in %v", ttl)
	}
}
