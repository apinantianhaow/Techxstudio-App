// Package config loads server settings from the environment (and an optional .env file).
package config

import (
	"bufio"
	"os"
	"strings"
)

// DefaultJWTSecret matches the fallback the original Node API used, so tokens
// issued in development stay valid. Always set JWT_SECRET in production.
const DefaultJWTSecret = "dev-secret-change-me-in-production"

type Config struct {
	Port               string
	AppURL             string // allowed CORS origin (the Next.js frontend)
	SupabaseURL        string
	SupabaseServiceKey string
	JWTSecret          string
}

// Load reads .env from the working directory (without overriding variables
// that are already set) and then builds a Config from the environment.
func Load() Config {
	loadDotEnv(".env")

	return Config{
		Port:               getenv("PORT", "8080"),
		AppURL:             getenv("APP_URL", "http://localhost:3000"),
		SupabaseURL:        strings.TrimRight(os.Getenv("SUPABASE_URL"), "/"),
		SupabaseServiceKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		JWTSecret:          getenv("JWT_SECRET", DefaultJWTSecret),
	}
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
