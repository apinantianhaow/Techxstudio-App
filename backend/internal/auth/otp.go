package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"
)

// CodeLength is the number of digits in an emailed sign-in code.
const CodeLength = 6

// NewCode returns a uniformly random numeric code such as "042917".
func NewCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1_000_000))
	if err != nil {
		return "", fmt.Errorf("auth: generate code: %w", err)
	}
	return fmt.Sprintf("%0*d", CodeLength, n.Int64()), nil
}

// CodeHash is what the database stores instead of the code: an HMAC keyed
// by the server secret, so a leaked table can't be brute-forced offline.
// Binding the challenge id stops a code from being replayed on another
// challenge.
func (t *Tokens) CodeHash(challengeID, code string) string {
	mac := hmac.New(sha256.New, t.codeKey())
	mac.Write([]byte(challengeID + ":" + code))
	return hex.EncodeToString(mac.Sum(nil))
}

// CodeMatches compares a submitted code with a stored hash in constant time.
func (t *Tokens) CodeMatches(challengeID, code, storedHash string) bool {
	return hmac.Equal([]byte(t.CodeHash(challengeID, code)), []byte(storedHash))
}

// codeKey derives a separate key from the JWT secret for code hashes.
func (t *Tokens) codeKey() []byte {
	mac := hmac.New(sha256.New, t.secret)
	mac.Write([]byte("techx sign-in codes"))
	return mac.Sum(nil)
}
