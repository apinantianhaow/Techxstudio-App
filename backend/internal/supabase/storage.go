package supabase

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// Upload stores data at bucket/path in Supabase Storage. It never
// overwrites, so give each upload a new path.
func (c *Client) Upload(ctx context.Context, bucket, path, contentType string, data []byte) error {
	if !c.Configured() {
		return ErrNotConfigured
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.storageURL+"/object/"+bucket+"/"+path, bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", contentType)
	// Short on purpose: Supabase's CDN keeps serving a deleted file until its
	// cached copy expires, so a removed photo stays reachable for up to this long.
	req.Header.Set("Cache-Control", "max-age=3600")
	req.Header.Set("x-upsert", "false")
	return c.storageDo(req, "upload "+bucket+"/"+path)
}

// Remove deletes objects from a bucket. Missing objects are not an error.
func (c *Client) Remove(ctx context.Context, bucket string, paths ...string) error {
	if !c.Configured() {
		return ErrNotConfigured
	}
	body, _ := json.Marshal(map[string][]string{"prefixes": paths})
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, c.storageURL+"/object/"+bucket, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	return c.storageDo(req, "remove from "+bucket)
}

// PublicURL is where anyone can download bucket/path (public buckets only).
func (c *Client) PublicURL(bucket, path string) string {
	return c.storageURL + "/object/public/" + bucket + "/" + path
}

// ObjectPath reverses PublicURL: it returns the path of url inside bucket, or
// false when url points somewhere else (e.g. a Google profile photo).
func (c *Client) ObjectPath(bucket, url string) (string, bool) {
	if !c.Configured() {
		return "", false
	}
	path, ok := strings.CutPrefix(url, c.PublicURL(bucket, ""))
	return path, ok && path != ""
}

func (c *Client) storageDo(req *http.Request, what string) error {
	req.Header.Set("apikey", c.key)
	req.Header.Set("Authorization", "Bearer "+c.key)
	res, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("supabase storage: %s: %w", what, err)
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		msg, _ := io.ReadAll(io.LimitReader(res.Body, 1024))
		return fmt.Errorf("supabase storage: %s: %d %s", what, res.StatusCode, strings.TrimSpace(string(msg)))
	}
	return nil
}
