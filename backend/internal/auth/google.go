package auth

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"regexp"
	"slices"
	"strconv"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const googleCertsURL = "https://www.googleapis.com/oauth2/v3/certs"

var googleIssuers = []string{"accounts.google.com", "https://accounts.google.com"}

// GoogleIdentity is the verified content of a "Sign in with Google" ID token.
type GoogleIdentity struct {
	Subject       string // stable Google account id
	Email         string
	EmailVerified bool
	Name          string
	Picture       string
}

type googleClaims struct {
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	jwt.RegisteredClaims
}

// GoogleVerifier checks ID tokens from Google Identity Services against
// Google's published signing keys and this app's OAuth client id.
type GoogleVerifier struct {
	clientID string
	certsURL string
	http     *http.Client

	mu        sync.Mutex
	keys      map[string]*rsa.PublicKey
	expires   time.Time
	lastFetch time.Time
}

// NewGoogleVerifier returns a verifier for clientID. An empty clientID
// yields a disabled verifier (Google sign-in is off).
func NewGoogleVerifier(clientID string) *GoogleVerifier {
	return &GoogleVerifier{clientID: clientID, certsURL: googleCertsURL, http: &http.Client{Timeout: 10 * time.Second}}
}

func (v *GoogleVerifier) Enabled() bool { return v != nil && v.clientID != "" }

// ClientID is public: the browser needs it to show Google's button.
func (v *GoogleVerifier) ClientID() string {
	if v == nil {
		return ""
	}
	return v.clientID
}

// Verify checks the token's signature, audience, issuer and expiry.
func (v *GoogleVerifier) Verify(ctx context.Context, idToken string) (*GoogleIdentity, error) {
	if !v.Enabled() {
		return nil, errors.New("auth: Google sign-in is not configured")
	}
	claims := &googleClaims{}
	_, err := jwt.ParseWithClaims(idToken, claims, func(t *jwt.Token) (any, error) {
		kid, _ := t.Header["kid"].(string)
		return v.key(ctx, kid)
	},
		jwt.WithValidMethods([]string{jwt.SigningMethodRS256.Alg()}),
		jwt.WithAudience(v.clientID),
		jwt.WithExpirationRequired(),
		jwt.WithLeeway(30*time.Second),
	)
	if err != nil {
		return nil, fmt.Errorf("auth: invalid Google token: %w", err)
	}
	if !slices.Contains(googleIssuers, claims.Issuer) {
		return nil, fmt.Errorf("auth: unexpected Google token issuer %q", claims.Issuer)
	}
	if claims.Subject == "" || claims.Email == "" {
		return nil, errors.New("auth: Google token has no subject or email")
	}
	return &GoogleIdentity{
		Subject:       claims.Subject,
		Email:         claims.Email,
		EmailVerified: claims.EmailVerified,
		Name:          claims.Name,
		Picture:       claims.Picture,
	}, nil
}

// key returns Google's public key for kid, refreshing the cached key set when
// it has expired or kid is new (Google rotates keys), at most once a minute.
func (v *GoogleVerifier) key(ctx context.Context, kid string) (*rsa.PublicKey, error) {
	v.mu.Lock()
	defer v.mu.Unlock()

	if k, ok := v.keys[kid]; ok && time.Now().Before(v.expires) {
		return k, nil
	}
	if time.Since(v.lastFetch) > time.Minute {
		if err := v.fetchKeys(ctx); err != nil {
			return nil, err
		}
	}
	if k, ok := v.keys[kid]; ok {
		return k, nil
	}
	return nil, fmt.Errorf("auth: unknown Google signing key %q", kid)
}

var maxAgePattern = regexp.MustCompile(`max-age=(\d+)`)

func (v *GoogleVerifier) fetchKeys(ctx context.Context) error {
	v.lastFetch = time.Now()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, v.certsURL, nil)
	if err != nil {
		return err
	}
	res, err := v.http.Do(req)
	if err != nil {
		return fmt.Errorf("auth: fetch Google keys: %w", err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("auth: fetch Google keys: status %d", res.StatusCode)
	}

	var set struct {
		Keys []struct {
			Kid string `json:"kid"`
			Kty string `json:"kty"`
			N   string `json:"n"`
			E   string `json:"e"`
		} `json:"keys"`
	}
	if err := json.NewDecoder(res.Body).Decode(&set); err != nil {
		return fmt.Errorf("auth: decode Google keys: %w", err)
	}

	keys := make(map[string]*rsa.PublicKey, len(set.Keys))
	for _, k := range set.Keys {
		if k.Kty != "RSA" {
			continue
		}
		n, errN := base64.RawURLEncoding.DecodeString(k.N)
		e, errE := base64.RawURLEncoding.DecodeString(k.E)
		if errN != nil || errE != nil || len(e) == 0 || len(e) > 4 {
			continue
		}
		keys[k.Kid] = &rsa.PublicKey{N: new(big.Int).SetBytes(n), E: int(new(big.Int).SetBytes(e).Int64())}
	}
	if len(keys) == 0 {
		return errors.New("auth: Google key set is empty")
	}

	ttl := time.Hour
	if m := maxAgePattern.FindStringSubmatch(res.Header.Get("Cache-Control")); m != nil {
		if secs, err := strconv.Atoi(m[1]); err == nil && secs > 0 {
			ttl = time.Duration(secs) * time.Second
		}
	}
	v.keys, v.expires = keys, time.Now().Add(ttl)
	return nil
}
