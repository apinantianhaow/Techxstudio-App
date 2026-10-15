// Package config loads server settings from the environment (and an optional .env file).
package config

import (
	"bufio"
	"errors"
	"os"
	"strings"
)

// DefaultJWTSecret matches the fallback the original Node API used, so tokens
// issued in development stay valid. Always set JWT_SECRET in production.
const DefaultJWTSecret = "dev-secret-change-me-in-production"

// exampleJWTSecret is the placeholder older copies of .env.example shipped.
const exampleJWTSecret = "your-secret-key-min-32-characters-long"

// minJWTSecretLength is the shortest JWT_SECRET allowed in production;
// openssl rand -hex 32 gives 64 characters.
const minJWTSecretLength = 32

type Config struct {
	AppEnv             string // "development" (default) or "production"
	Port               string
	AppURL             string // allowed CORS origin (the Next.js frontend)
	SupabaseURL        string
	SupabaseServiceKey string
	JWTSecret          string

	// Google sign-in (empty = off). The client id is public.
	GoogleClientID string

	// SMTP for emailed sign-in codes (empty host = print codes to the log).
	SMTPHost     string
	SMTPPort     string
	SMTPUsername string
	SMTPPassword string
	SMTPFrom     string
}

// Load reads .env from the working directory (without overriding variables
// that are already set) and then builds a Config from the environment.
func Load() Config {
	loadDotEnv(".env")

	return Config{
		AppEnv:             strings.ToLower(strings.TrimSpace(getenv("APP_ENV", "development"))),
		Port:               getenv("PORT", "8080"),
		AppURL:             getenv("APP_URL", "http://localhost:3000"),
		SupabaseURL:        strings.TrimRight(os.Getenv("SUPABASE_URL"), "/"),
		SupabaseServiceKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		JWTSecret:          getenv("JWT_SECRET", DefaultJWTSecret),
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		SMTPHost:           os.Getenv("SMTP_HOST"),
		SMTPPort:           getenv("SMTP_PORT", "587"),
		SMTPUsername:       os.Getenv("SMTP_USERNAME"),
		SMTPPassword:       os.Getenv("SMTP_PASSWORD"),
		SMTPFrom:           getenv("SMTP_FROM", os.Getenv("SMTP_USERNAME")),
	}
}

// Check reports why the API must not start with these settings. In
// production the session secret has to be a long random value: with a known
// one (unset, or a published placeholder) anyone could sign their own tokens.
func (c Config) Check() error {
	if c.AppEnv != "production" {
		return nil
	}
	if c.JWTSecret == DefaultJWTSecret || c.JWTSecret == exampleJWTSecret || len(c.JWTSecret) < minJWTSecretLength {
		return errors.New("APP_ENV=production needs JWT_SECRET set to a random value of at least 32 characters (e.g. openssl rand -hex 32)")
	}
	return nil
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// loadDotEnv supports the simple KEY=value format used by .env.example.
func loadDotEnv(path string) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, value, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(strings.TrimPrefix(key, "export "))
		value = strings.Trim(strings.TrimSpace(value), `"'`)
		if _, exists := os.LookupEnv(key); !exists {
			os.Setenv(key, value)
		}
	}
}
