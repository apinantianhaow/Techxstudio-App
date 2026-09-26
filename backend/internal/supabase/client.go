// Package supabase is a small PostgREST client for Supabase using the
// service-role key (bypasses RLS, so it must only ever run server-side).
package supabase

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// ErrNotConfigured is returned by every query when SUPABASE_URL or
// SUPABASE_SERVICE_ROLE_KEY is missing.
var ErrNotConfigured = errors.New("supabase: credentials not configured")

// Error is an error response from PostgREST.
type Error struct {
	Status  int    `json:"-"`
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details"`
	Hint    string `json:"hint"`
}

func (e *Error) Error() string {
	return fmt.Sprintf("supabase: %d %s: %s", e.Status, e.Code, e.Message)
}

// IsCode reports whether err is a PostgREST/Postgres error with the given code
// (e.g. "23505" for unique_violation).
func IsCode(err error, code string) bool {
	var e *Error
	return errors.As(err, &e) && e.Code == code
}

type Client struct {
	restURL string
	key     string
	http    *http.Client
}

// New returns a client for the project at baseURL. Missing credentials yield a
// client whose queries all fail with ErrNotConfigured.
func New(baseURL, serviceKey string) *Client {
	c := &Client{key: serviceKey, http: &http.Client{Timeout: 15 * time.Second}}
	if baseURL != "" && serviceKey != "" {
		c.restURL = strings.TrimRight(baseURL, "/") + "/rest/v1"
	}
	return c
}

func (c *Client) Configured() bool { return c != nil && c.restURL != "" }

// From starts a query on a table.
func (c *Client) From(table string) *Query {
	return &Query{client: c, table: table, params: url.Values{}}
}

// Query builds a PostgREST request. Filters are ANDed together.
type Query struct {
	client *Client
	table  string
	params url.Values
}

func (q *Query) Select(columns string) *Query {
	q.params.Set("select", compact(columns))
	return q
}

func (q *Query) Eq(column string, value any) *Query {
	q.params.Add(column, "eq."+fmt.Sprint(value))
	return q
}

// In filters column to one of values.
func (q *Query) In(column string, values []string) *Query {
	quoted := make([]string, len(values))
	for i, v := range values {
		quoted[i] = Quote(v)
	}
	q.params.Add(column, "in.("+strings.Join(quoted, ",")+")")
	return q
}

// Contains filters an array column to rows containing every value.
func (q *Query) Contains(column string, values ...string) *Query {
	quoted := make([]string, len(values))
	for i, v := range values {
		quoted[i] = Quote(v)
	}
	q.params.Add(column, "cs.{"+strings.Join(quoted, ",")+"}")
	return q
}

// Or adds a raw PostgREST "or" expression, e.g. "name.ilike.x,slug.eq.y".
// Quote user-supplied values with Quote.
func (q *Query) Or(expr string) *Query {
	q.params.Add("or", "("+expr+")")
	return q
}

func (q *Query) Order(column string, ascending bool) *Query {
	dir := "desc"
	if ascending {
		dir = "asc"
	}
	q.params.Add("order", column+"."+dir)
	return q
}

func (q *Query) Limit(n int) *Query {
	q.params.Set("limit", strconv.Itoa(n))
	return q
}

// Get runs a SELECT and decodes the row array into out (a pointer to a slice).
func (q *Query) Get(ctx context.Context, out any) error {
	return q.do(ctx, http.MethodGet, nil, out)
}

// Insert inserts body (a struct or slice of structs). When out is non-nil the
// inserted rows are returned and decoded into it (use Select to pick columns).
func (q *Query) Insert(ctx context.Context, body, out any) error {
	return q.do(ctx, http.MethodPost, body, out)
}

// Update applies body to every row matching the filters. When out is non-nil
// the updated rows are decoded into it.
func (q *Query) Update(ctx context.Context, body, out any) error {
	return q.do(ctx, http.MethodPatch, body, out)
}

// Delete removes every row matching the filters.
func (q *Query) Delete(ctx context.Context) error {
	return q.do(ctx, http.MethodDelete, nil, nil)
}

func (q *Query) do(ctx context.Context, method string, body, out any) error {
	if !q.client.Configured() {
		return ErrNotConfigured
	}

	var reader io.Reader
	if body != nil {
		buf, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("supabase: encode body: %w", err)
		}
		reader = bytes.NewReader(buf)
	}

	endpoint := q.client.restURL + "/" + q.table
	if len(q.params) > 0 {
		endpoint += "?" + q.params.Encode()
	}
	req, err := http.NewRequestWithContext(ctx, method, endpoint, reader)
	if err != nil {
		return err
	}
	req.Header.Set("apikey", q.client.key)
	req.Header.Set("Authorization", "Bearer "+q.client.key)
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if method != http.MethodGet {
		if out != nil {
			req.Header.Set("Prefer", "return=representation")
		} else {
			req.Header.Set("Prefer", "return=minimal")
		}
	}

	res, err := q.client.http.Do(req)
	if err != nil {
		return fmt.Errorf("supabase: %s %s: %w", method, q.table, err)
	}
	defer res.Body.Close()

	data, err := io.ReadAll(res.Body)
	if err != nil {
		return fmt.Errorf("supabase: read response: %w", err)
	}
	if res.StatusCode >= 300 {
		apiErr := &Error{Status: res.StatusCode}
		if json.Unmarshal(data, apiErr) != nil || apiErr.Message == "" {
			apiErr.Message = strings.TrimSpace(string(data))
		}
		return apiErr
	}
	if out == nil || len(data) == 0 {
		return nil
	}
	if err := json.Unmarshal(data, out); err != nil {
		return fmt.Errorf("supabase: decode %s: %w", q.table, err)
	}
	return nil
}

// Quote wraps a filter value in double quotes so reserved characters
// (commas, parentheses, dots) in user input can't alter the filter.
func Quote(v string) string {
	v = strings.ReplaceAll(v, `\`, `\\`)
	v = strings.ReplaceAll(v, `"`, `\"`)
	return `"` + v + `"`
}

// compact strips whitespace from a multi-line select list.
func compact(s string) string {
	return strings.Join(strings.Fields(s), "")
}
