package config

import (
	"strings"
	"testing"
)

func TestCheckRequiresARealSecretInProduction(t *testing.T) {
	strong := strings.Repeat("a1", 16) // 32 characters
	for _, tc := range []struct {
		env, secret string
		ok          bool
	}{
		{"development", DefaultJWTSecret, true},
		{"", DefaultJWTSecret, true},
		{"production", DefaultJWTSecret, false},
		{"production", exampleJWTSecret, false},
		{"production", "too-short", false},
		{"production", strong[:31], false},
		{"production", strong, true},
	} {
		err := Config{AppEnv: tc.env, JWTSecret: tc.secret}.Check()
		if (err == nil) != tc.ok {
			t.Errorf("APP_ENV=%q JWT_SECRET=%q: got err %v, want ok=%v", tc.env, tc.secret, err, tc.ok)
		}
	}
}

func TestLoadNormalizesAppEnv(t *testing.T) {
	t.Setenv("APP_ENV", " Production ")
	t.Setenv("JWT_SECRET", "")
	cfg := Load()
	if cfg.AppEnv != "production" || cfg.JWTSecret != DefaultJWTSecret {
		t.Fatalf("got AppEnv %q JWTSecret %q", cfg.AppEnv, cfg.JWTSecret)
	}
	if cfg.Check() == nil {
		t.Fatal("production with the default secret must not start")
	}
}
