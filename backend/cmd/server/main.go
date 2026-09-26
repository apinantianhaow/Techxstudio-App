// Command server runs the TechXStudio API.
//
//	cd backend && go run ./cmd/server
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/apinantianhaow/techxstudio-app/backend/internal/api"
	"github.com/apinantianhaow/techxstudio-app/backend/internal/auth"
	"github.com/apinantianhaow/techxstudio-app/backend/internal/config"
	"github.com/apinantianhaow/techxstudio-app/backend/internal/supabase"
)

func main() {
	logger := slog.New(slog.NewTextHandler(os.Stdout, nil))
	cfg := config.Load()

	db := supabase.New(cfg.SupabaseURL, cfg.SupabaseServiceKey)
	if !db.Configured() {
		logger.Warn("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — only mock curated products will work")
	}
	if cfg.JWTSecret == config.DefaultJWTSecret {
		logger.Warn("JWT_SECRET not set — using the development default")
	}

	server := api.NewServer(db, auth.NewTokens(cfg.JWTSecret), logger, cfg.AppURL)
	httpServer := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           server.Handler(),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       120 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		logger.Info("API listening", "addr", "http://localhost:"+cfg.Port)
		if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("server stopped", "err", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	logger.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		logger.Error("shutdown", "err", err)
	}
}
