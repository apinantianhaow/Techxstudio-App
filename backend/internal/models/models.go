// Package models mirrors the Supabase tables (supabase/migrations) and the
// JSON shapes the frontend expects (frontend/src/types).
package models

import "sort"

type User struct {
	ID        string  `json:"id"`
	Email     string  `json:"email"`
	FullName  *string `json:"full_name"`
	Phone     *string `json:"phone"`
	AvatarURL *string `json:"avatar_url"`
	CreatedAt string  `json:"created_at"`
}

// UserColumns is the public projection of a user row (no password hash).
const UserColumns = "id, email, full_name, phone, avatar_url, created_at"

type UserWithPassword struct {
	User
	PasswordHash string `json:"password_hash"`
}

type ProductColor struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Hex       string  `json:"hex"`
	ImageURL  *string `json:"image_url"`
	SortOrder int     `json:"sort_order"`
}

type ProductOption struct {
	ID        string  `json:"id"`
	Label     string  `json:"label"`
	Price     float64 `json:"price"`
	SortOrder int     `json:"sort_order"`
}

type ProductSpec struct {
	ID        string `json:"id"`
	SpecKey   string `json:"spec_key"`
	SpecValue string `json:"spec_value"`
	SortOrder int    `json:"sort_order"`
}

// Product is a full products row plus its embedded relations.
type Product struct {
	ID             string          `json:"id"`
	Name           string          `json:"name"`
	Slug           string          `json:"slug"`
	Category       string          `json:"category"`
	Description    *string         `json:"description"`
	Badge          *string         `json:"badge"`
	SalePercent    int             `json:"sale_percent"`
	OriginalPrice  float64         `json:"original_price"`
	Rating         float64         `json:"rating"`
	ReviewsCount   int             `json:"reviews_count"`
	IsActive       bool            `json:"is_active"`
	CuratedLists   []string        `json:"curated_lists"`
	CreatedAt      string          `json:"created_at"`
	UpdatedAt      string          `json:"updated_at"`
	ProductColors  []ProductColor  `json:"product_colors,omitempty"`
	ProductOptions []ProductOption `json:"product_options,omitempty"`
	ProductSpecs   []ProductSpec   `json:"product_specs,omitempty"`
}

// SortRelations orders colors, options and specs by sort_order.
func (p *Product) SortRelations() {
	sort.SliceStable(p.ProductColors, func(i, j int) bool { return p.ProductColors[i].SortOrder < p.ProductColors[j].SortOrder })
	sort.SliceStable(p.ProductOptions, func(i, j int) bool { return p.ProductOptions[i].SortOrder < p.ProductOptions[j].SortOrder })
	sort.SliceStable(p.ProductSpecs, func(i, j int) bool { return p.ProductSpecs[i].SortOrder < p.ProductSpecs[j].SortOrder })
}

// SearchResult is the slimmer product shape returned by /api/products/search.
type SearchResult struct {
	ID            string         `json:"id"`
	Name          string         `json:"name"`
	Slug          string         `json:"slug"`
	Category      string         `json:"category"`
	OriginalPrice float64        `json:"original_price"`
	SalePercent   int            `json:"sale_percent"`
	Badge         *string        `json:"badge"`
	Rating        float64        `json:"rating"`
	ProductColors []ProductColor `json:"product_colors"`
}

type ReviewAuthor struct {
	FullName  *string `json:"full_name"`
	AvatarURL *string `json:"avatar_url"`
}

type Review struct {
	ID        string        `json:"id"`
	UserID    string        `json:"user_id,omitempty"`
	Rating    int           `json:"rating"`
	Title     *string       `json:"title"`
	Comment   *string       `json:"comment"`
	CreatedAt string        `json:"created_at"`
	Users     *ReviewAuthor `json:"users,omitempty"`
}

// CartProduct is the product summary embedded in cart items.
type CartProduct struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Slug          string  `json:"slug"`
	OriginalPrice float64 `json:"original_price"`
	SalePercent   int     `json:"sale_percent"`
	Badge         *string `json:"badge"`
}

type CartItem struct {
	ID          string       `json:"id"`
	UserID      string       `json:"user_id"`
	ProductID   string       `json:"product_id"`
	OptionLabel *string      `json:"option_label"`
	ColorName   *string      `json:"color_name"`
	Quantity    int          `json:"quantity"`
	Price       float64      `json:"price"`
	ImageURL    *string      `json:"image_url"`
	CreatedAt   string       `json:"created_at"`
	UpdatedAt   string       `json:"updated_at"`
	Products    *CartProduct `json:"products,omitempty"`
}

// WishlistProduct is the product summary embedded in wishlist items.
type WishlistProduct struct {
	ID             string          `json:"id"`
	Name           string          `json:"name"`
	Slug           string          `json:"slug"`
	Category       string          `json:"category"`
	OriginalPrice  float64         `json:"original_price"`
	SalePercent    int             `json:"sale_percent"`
	Badge          *string         `json:"badge"`
	Rating         float64         `json:"rating"`
	ReviewsCount   int             `json:"reviews_count"`
	ProductColors  []ProductColor  `json:"product_colors"`
	ProductOptions []ProductOption `json:"product_options"`
}

type WishlistItem struct {
	ID        string           `json:"id"`
	UserID    string           `json:"user_id,omitempty"`
	ProductID string           `json:"product_id,omitempty"`
	CreatedAt string           `json:"created_at"`
	Products  *WishlistProduct `json:"products,omitempty"`
}

type Coupon struct {
	ID              string   `json:"id"`
	Code            string   `json:"code"`
	DiscountPercent int      `json:"discount_percent"`
	DiscountAmount  float64  `json:"discount_amount"`
	MinPurchase     float64  `json:"min_purchase"`
	MaxDiscount     *float64 `json:"max_discount"`
	MaxUses         *int     `json:"max_uses"`
	CurrentUses     int      `json:"current_uses"`
	ExpiresAt       *string  `json:"expires_at"`
	IsActive        bool     `json:"is_active"`
	CreatedAt       string   `json:"created_at"`
}

type OrderItem struct {
	ID          string  `json:"id"`
	ProductName string  `json:"product_name"`
	OptionLabel *string `json:"option_label"`
	ColorName   *string `json:"color_name"`
	Quantity    int     `json:"quantity"`
	Price       float64 `json:"price"`
	ImageURL    *string `json:"image_url"`
}

type Order struct {
	ID              string      `json:"id"`
	UserID          string      `json:"user_id"`
	Status          string      `json:"status"`
	TotalAmount     float64     `json:"total_amount"`
	DiscountAmount  float64     `json:"discount_amount"`
	CouponCode      *string     `json:"coupon_code"`
	ShippingAddress *string     `json:"shipping_address"`
	PaymentMethod   *string     `json:"payment_method"`
	CreatedAt       string      `json:"created_at"`
	UpdatedAt       string      `json:"updated_at"`
	OrderItems      []OrderItem `json:"order_items,omitempty"`
}
