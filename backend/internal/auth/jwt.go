// Package auth signs and verifies the HS256 JWTs handed to the frontend.
// Tokens are compatible with the ones the previous Node API issued.
package auth

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const tokenTTL = 7 * 24 * time.Hour

// Claims is the token payload: { id, email, full_name, iat, exp }.
type Claims struct {
	ID       string  `json:"id"`
	Email    string  `json:"email"`
	FullName *string `json:"full_name"`
	jwt.RegisteredClaims
}

type Tokens struct {
	secret []byte
}

func NewTokens(secret string) *Tokens {
	return &Tokens{secret: []byte(secret)}
}

// Sign issues a token that expires in 7 days.
func (t *Tokens) Sign(id, email string, fullName *string) (string, error) {
	now := time.Now()
	claims := Claims{
		ID:       id,
		Email:    email,
		FullName: fullName,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(tokenTTL)),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(t.secret)
}

// Verify parses a token and checks its signature and expiry.
func (t *Tokens) Verify(token string) (*Claims, error) {
	claims := &Claims{}
	_, err := jwt.ParseWithClaims(token, claims, func(*jwt.Token) (any, error) {
		return t.secret, nil
	}, jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}), jwt.WithExpirationRequired())
	if err != nil {
		return nil, err
	}
	if claims.ID == "" {
		return nil, errors.New("auth: token has no user id")
	}
	return claims, nil
}

// UserFromRequest returns the claims from an "Authorization: Bearer <token>"
// header, or nil when the header is missing or the token is invalid.
func (t *Tokens) UserFromRequest(r *http.Request) *Claims {
	header := r.Header.Get("Authorization")
	token, ok := strings.CutPrefix(header, "Bearer ")
	if !ok {
		return nil
	}
	token, _, _ = strings.Cut(token, " ")
	claims, err := t.Verify(token)
	if err != nil {
		return nil
	}
	return claims
}
