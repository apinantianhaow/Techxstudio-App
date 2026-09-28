package api

import (
	"net/http"
	"regexp"
	"slices"
	"strings"
	"unicode/utf8"

	"github.com/apinantianhaow/techxstudio-app/backend/internal/models"
	"github.com/apinantianhaow/techxstudio-app/backend/internal/supabase"
)

const adminProductColumns = "*, product_colors(" + colorColumns + "), product_options(" + optionColumns + "), product_specs(" + specColumns + ")"

var (
	slugPattern = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)
	hexPattern  = regexp.MustCompile(`^#[0-9A-F]{6}$`)

	productCategories = []string{"phone", "tablet", "accessory"}
	productBadges     = []string{"NEW", "HOT", "SALE"}
)

type colorInput struct {
	Name     string  `json:"name"`
	Hex      string  `json:"hex"`
	ImageURL *string `json:"image_url"`
}

type optionInput struct {
	Label string   `json:"label"`
	Price *float64 `json:"price"`
}

type specInput struct {
	SpecKey   string `json:"spec_key"`
	SpecValue string `json:"spec_value"`
}

// productInput is the body of POST and PUT /api/admin/products. It uses the
// same keys as a product response, so the admin app can send back what it
// loaded. rating and reviews_count come from reviews and can't be set.
type productInput struct {
	Name           string        `json:"name"`
	Slug           string        `json:"slug"`
	Category       string        `json:"category"`
	Description    *string       `json:"description"`
	Badge          *string       `json:"badge"`
	SalePercent    *float64      `json:"sale_percent"`
	OriginalPrice  *float64      `json:"original_price"`
	IsActive       *bool         `json:"is_active"`
	CuratedLists   []string      `json:"curated_lists"`
	ProductColors  []colorInput  `json:"product_colors"`
	ProductOptions []optionInput `json:"product_options"`
	ProductSpecs   []specInput   `json:"product_specs"`
}

// saveArgs validates the input and builds the admin_save_product arguments
// (id nil = create), writing a 400 on failure. Colors, options and specs are
// stored in the order given.
func (in productInput) saveArgs(w http.ResponseWriter, id *string) (map[string]any, bool) {
	name := strings.TrimSpace(in.Name)
	slug := strings.ToLower(strings.TrimSpace(in.Slug))
	description := optionalText(in.Description)
	badge := optionalText(in.Badge)
	salePercent := valueOr(in.SalePercent, 0)

	var v validation
	v.check(name != "", "Name is required")
	v.check(utf8.RuneCountInString(name) <= 200, "Name must be at most 200 characters")
	v.check(slugPattern.MatchString(slug) && len(slug) <= 100, "Slug may only contain a-z, 0-9 and single dashes (max 100)")
	v.check(slices.Contains(productCategories, in.Category), "Category must be phone, tablet or accessory")
	v.check(description == nil || utf8.RuneCountInString(*description) <= 5000, "Description must be at most 5000 characters")
	v.check(badge == nil || slices.Contains(productBadges, *badge), "Badge must be NEW, HOT or SALE")
	v.check(isInt(salePercent) && salePercent >= 0 && salePercent <= 99, "Sale percent must be a whole number from 0 to 99")
	v.check(in.OriginalPrice != nil && validPrice(*in.OriginalPrice), "Price must be greater than 0 and at most 99,999,999")
	for _, list := range in.CuratedLists {
		v.check(slices.Contains(curatedLists, list), "Unknown curated list: "+list)
	}

	v.check(len(in.ProductColors) <= 20, "A product can have at most 20 colors")
	colors := make([]colorInput, len(in.ProductColors))
	for i, c := range in.ProductColors {
		c.Name = strings.TrimSpace(c.Name)
		c.Hex = strings.ToUpper(strings.TrimSpace(c.Hex))
		c.ImageURL = optionalText(c.ImageURL)
		v.check(c.Name != "" && utf8.RuneCountInString(c.Name) <= 50, "Each color needs a name (max 50 characters)")
		v.check(hexPattern.MatchString(c.Hex), "Color codes must look like #1D1D1F")
		v.check(c.ImageURL == nil || len(*c.ImageURL) <= 500, "Image URLs must be at most 500 characters")
		colors[i] = c
	}
	v.check(distinct(colors, func(c colorInput) string { return strings.ToLower(c.Name) }), "Color names must be unique")

	v.check(len(in.ProductOptions) <= 20, "A product can have at most 20 options")
	options := make([]optionInput, len(in.ProductOptions))
	for i, o := range in.ProductOptions {
		o.Label = strings.TrimSpace(o.Label)
		v.check(o.Label != "" && utf8.RuneCountInString(o.Label) <= 50, "Each option needs a label (max 50 characters)")
		v.check(o.Price != nil && validPrice(*o.Price), "Option prices must be greater than 0 and at most 99,999,999")
		options[i] = o
	}
	v.check(distinct(options, func(o optionInput) string { return strings.ToLower(o.Label) }), "Option labels must be unique")

	v.check(len(in.ProductSpecs) <= 50, "A product can have at most 50 specs")
	specs := make([]specInput, len(in.ProductSpecs))
	for i, sp := range in.ProductSpecs {
		sp.SpecKey = strings.TrimSpace(sp.SpecKey)
		sp.SpecValue = strings.TrimSpace(sp.SpecValue)
		v.check(sp.SpecKey != "" && utf8.RuneCountInString(sp.SpecKey) <= 100, "Each spec needs a name (max 100 characters)")
		v.check(sp.SpecValue != "" && utf8.RuneCountInString(sp.SpecValue) <= 500, "Each spec needs a value (max 500 characters)")
		specs[i] = sp
	}

	if v.failed(w) {
		return nil, false
	}

	lists := append([]string{}, in.CuratedLists...)
	slices.Sort(lists)

	return map[string]any{
		"p_id": id,
		"p_product": map[string]any{
			"name":           name,
			"slug":           slug,
			"category":       in.Category,
			"description":    description,
			"badge":          badge,
			"sale_percent":   int(salePercent),
			"original_price": *in.OriginalPrice,
			"is_active":      valueOr(in.IsActive, true),
			"curated_lists":  slices.Compact(lists),
		},
		"p_colors":  colors,
		"p_options": options,
		"p_specs":   specs,
	}, true
}

// GET /api/admin/products — every product, including hidden ones.
func (s *Server) adminListProducts(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}

	products := []models.Product{}
	err := s.db.From("products").
		Select("*, product_colors("+colorColumns+"), product_options("+optionColumns+")").
		Order("created_at", false).
		Get(r.Context(), &products)
	if err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to fetch products", err)
		return
	}
	for i := range products {
		products[i].SortRelations()
	}
	writeJSON(w, http.StatusOK, map[string]any{"products": products})
}

// GET /api/admin/products/{id}
func (s *Server) adminGetProduct(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}

	var rows []models.Product
	err := s.db.From("products").Select(adminProductColumns).Eq("id", r.PathValue("id")).Get(r.Context(), &rows)
	product, found := first(rows)
	if err != nil || !found {
		writeError(w, http.StatusNotFound, "Product not found")
		return
	}
	product.SortRelations()
	writeJSON(w, http.StatusOK, map[string]any{"product": product})
}

// POST /api/admin/products
func (s *Server) adminCreateProduct(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	s.saveProduct(w, r, nil)
}

// PUT /api/admin/products/{id} — replaces the product, including its
// colors, options and specs.
func (s *Server) adminUpdateProduct(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	id := r.PathValue("id")
	if !uuidPattern.MatchString(id) {
		writeError(w, http.StatusNotFound, "Product not found")
		return
	}
	s.saveProduct(w, r, &id)
}

// saveProduct creates (id nil) or replaces a product in one transaction via
// admin_save_product, then responds with the saved product.
func (s *Server) saveProduct(w http.ResponseWriter, r *http.Request, id *string) {
	var body productInput
	if !decodeJSON(w, r, &body) {
		return
	}
	args, ok := body.saveArgs(w, id)
	if !ok {
		return
	}

	var savedID string
	err := s.db.RPC(r.Context(), "admin_save_product", args, &savedID)
	switch {
	case supabase.IsCode(err, "23505"):
		writeError(w, http.StatusConflict, "This slug is already used by another product")
		return
	case supabase.IsCode(err, "P0002"):
		writeError(w, http.StatusNotFound, "Product not found")
		return
	case err != nil:
		s.fail(w, r, http.StatusInternalServerError, "Unable to save product", err)
		return
	}

	var rows []models.Product
	err = s.db.From("products").Select(adminProductColumns).Eq("id", savedID).Get(r.Context(), &rows)
	product, found := first(rows)
	if err != nil || !found {
		s.fail(w, r, http.StatusInternalServerError, "Product saved but could not be reloaded", err)
		return
	}
	product.SortRelations()

	status := http.StatusOK
	if id == nil {
		status = http.StatusCreated
	}
	writeJSON(w, status, map[string]any{"product": product})
}

// PATCH /api/admin/products/{id}  body: { is_active } — shows or hides a
// product in the store without resending the whole product.
func (s *Server) adminSetProductActive(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	id := r.PathValue("id")
	if !uuidPattern.MatchString(id) {
		writeError(w, http.StatusNotFound, "Product not found")
		return
	}
	var body struct {
		IsActive *bool `json:"is_active"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	if body.IsActive == nil {
		writeError(w, http.StatusBadRequest, "is_active is required")
		return
	}

	var updated []models.Product
	err := s.db.From("products").Select("*").Eq("id", id).
		Update(r.Context(), map[string]any{"is_active": *body.IsActive}, &updated)
	product, found := first(updated)
	switch {
	case err != nil:
		s.fail(w, r, http.StatusInternalServerError, "Unable to update product", err)
	case !found:
		writeError(w, http.StatusNotFound, "Product not found")
	default:
		writeJSON(w, http.StatusOK, map[string]any{"product": product})
	}
}

// DELETE /api/admin/products/{id} — permanent. Colors, options, specs,
// reviews, cart and wishlist rows go with it (ON DELETE CASCADE); past
// order_items keep their own copy of the name and price. To only hide a
// product from the store, save it with is_active = false instead.
func (s *Server) adminDeleteProduct(w http.ResponseWriter, r *http.Request) {
	if _, ok := s.requireAdmin(w, r); !ok {
		return
	}
	id := r.PathValue("id")
	if !uuidPattern.MatchString(id) {
		writeError(w, http.StatusNotFound, "Product not found")
		return
	}
	if err := s.db.From("products").Eq("id", id).Delete(r.Context()); err != nil {
		s.fail(w, r, http.StatusInternalServerError, "Unable to delete product", err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true})
}
