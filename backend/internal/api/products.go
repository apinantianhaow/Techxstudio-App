package api

import (
	_ "embed"
	"encoding/json"
	"net/http"
	"slices"
	"strings"
	"unicode/utf8"

	"github.com/apinantianhaow/techxstudio-app/backend/internal/models"
	"github.com/apinantianhaow/techxstudio-app/backend/internal/supabase"
)

const (
	colorColumns  = "id, name, hex, image_url, sort_order"
	optionColumns = "id, label, price, sort_order"
	specColumns   = "id, spec_key, spec_value, sort_order"
)

// GET /api/products?category=phone|tablet|accessory|all
func (s *Server) listProducts(w http.ResponseWriter, r *http.Request) {
	q := s.db.From("products").
		Select("*, product_colors("+colorColumns+"), product_options("+optionColumns+")").
		Eq("is_active", true).
		Order("created_at", false)
	if category := r.URL.Query().Get("category"); category != "" && category != "all" {
		q = q.Eq("category", category)
	}

	products := []models.Product{}
	if err := q.Get(r.Context(), &products); err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to fetch products", err)
		return
	}
	for i := range products {
		products[i].SortRelations()
	}
	writeJSON(w, http.StatusOK, map[string]any{"products": products})
}

// GET /api/products/search?q=
func (s *Server) searchProducts(w http.ResponseWriter, r *http.Request) {
	term := strings.TrimSpace(r.URL.Query().Get("q"))
	results := []models.SearchResult{}
	if utf8.RuneCountInString(term) < 2 {
		writeJSON(w, http.StatusOK, map[string]any{"products": results})
		return
	}

	pattern := supabase.Quote("%" + term + "%")
	err := s.db.From("products").
		Select("id, name, slug, category, original_price, sale_percent, badge, rating, product_colors("+colorColumns+")").
		Eq("is_active", true).
		Or("name.ilike."+pattern+",description.ilike."+pattern+",category.ilike."+pattern).
		Limit(8).
		Get(r.Context(), &results)
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Search failed", err)
		return
	}
	for i := range results {
		slices.SortStableFunc(results[i].ProductColors, func(a, b models.ProductColor) int { return a.SortOrder - b.SortOrder })
	}
	writeJSON(w, http.StatusOK, map[string]any{"products": results})
}

// GET /api/products/{id}
func (s *Server) getProduct(w http.ResponseWriter, r *http.Request) {
	var rows []models.Product
	err := s.db.From("products").
		Select("*, product_colors("+colorColumns+"), product_options("+optionColumns+"), product_specs("+specColumns+")").
		Eq("id", r.PathValue("id")).
		Eq("is_active", true).
		Get(r.Context(), &rows)
	product, ok := first(rows)
	if err != nil || !ok {
		writeError(w, http.StatusNotFound, "Product not found")
		return
	}
	product.SortRelations()
	writeJSON(w, http.StatusOK, map[string]any{"product": product})
}

// Fallback data served by the curated endpoint when Supabase is not configured
// or the query fails, so the home page still renders.
//
//go:embed curated_mock.json
var curatedMockJSON []byte

var curatedMock = func() map[string]json.RawMessage {
	m := map[string]json.RawMessage{}
	if err := json.Unmarshal(curatedMockJSON, &m); err != nil {
		panic("api: invalid curated_mock.json: " + err.Error())
	}
	return m
}()

var curatedLists = []string{"flash_sale", "popular", "accessories"}

// GET /api/products/curated/{list}
func (s *Server) curatedProducts(w http.ResponseWriter, r *http.Request, list string) {
	if !slices.Contains(curatedLists, list) {
		writeError(w, http.StatusBadRequest, "Invalid curated list")
		return
	}

	if s.db.Configured() {
		products := []models.Product{}
		err := s.db.From("products").
			Select("*, product_colors("+colorColumns+"), product_options("+optionColumns+")").
			Eq("is_active", true).
			Contains("curated_lists", list).
			Order("created_at", false).
			Get(r.Context(), &products)
		if err == nil {
			for i := range products {
				products[i].SortRelations()
			}
			writeJSON(w, http.StatusOK, map[string]any{"products": products})
			return
		}
		s.log.Warn("curated query failed, serving mock data", "list", list, "err", err)
	}

	writeJSON(w, http.StatusOK, map[string]any{"products": curatedMock[list]})
}
