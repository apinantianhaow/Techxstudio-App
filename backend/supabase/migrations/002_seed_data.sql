-- ============================================================
-- TechXStudio v2 — Seed Data
-- Run this in Supabase SQL Editor (second)
-- ============================================================

-- ============================================================
-- Products
-- ============================================================

INSERT INTO products (id, name, slug, category, description, badge, sale_percent, original_price, rating, reviews_count, is_active, curated_lists) VALUES
('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'iPhone 16 Pro Max', 'iphone-16-pro-max', 'phone',
 'iPhone 16 Pro Max — สุดยอดสมาร์ทโฟนจาก Apple พร้อมชิป A18 Pro, จอ Super Retina XDR 6.9 นิ้ว, ระบบกล้อง Pro 48MP และ USB-C ที่เร็วกว่าเดิม',
 'HOT', 8, 54900.00, 4.9, 2847, TRUE, '{flash_sale,popular}'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'iPhone 16', 'iphone-16', 'phone',
 'iPhone 16 — ดีไซน์ใหม่ พร้อมชิป A18, กล้อง 48MP อัปเกรด, ปุ่ม Action และ USB-C ที่ใช้งานง่าย',
 'NEW', 5, 34900.00, 4.7, 1523, TRUE, '{popular}'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'iPad Pro M4', 'ipad-pro-m4', 'tablet',
 'iPad Pro M4 — แท็บเล็ตทรงพลังที่สุด จอ Ultra Retina XDR, ชิป M4 สุดล้ำ, Apple Pencil Pro และ Magic Keyboard',
 'HOT', 10, 44900.00, 4.8, 1892, TRUE, '{flash_sale,popular}'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'iPad Air M2', 'ipad-air-m2', 'tablet',
 'iPad Air M2 — แท็บเล็ตสุดบางเบาที่ทรงพลัง ชิป M2, จอ Liquid Retina 10.9 นิ้ว รองรับ Apple Pencil',
 NULL, 0, 24900.00, 4.6, 943, TRUE, '{popular}'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'AirPods Pro 2', 'airpods-pro-2', 'accessory',
 'AirPods Pro 2 — หูฟังไร้สายระดับ Pro ตัดเสียงรบกวนแบบ Active, Adaptive Audio, USB-C และ MagSafe',
 'SALE', 15, 8990.00, 4.8, 3421, TRUE, '{flash_sale,accessories}'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'AirPods Max', 'airpods-max', 'accessory',
 'AirPods Max — หูฟังครอบหูระดับ Hi-Fi ตัดเสียง Active Noise Cancellation, Spatial Audio, USB-C',
 NULL, 0, 19900.00, 4.5, 756, TRUE, '{accessories}'),

('a1b2c3d4-e5f6-7890-abcd-ef1234567807', 'Apple Pencil Pro', 'apple-pencil-pro', 'accessory',
 'Apple Pencil Pro — ปากกาสไตลัสอัจฉริยะรุ่นใหม่ล่าสุด Squeeze gesture, barrel roll, haptic feedback',
 'NEW', 0, 4990.00, 4.7, 567, TRUE, '{accessories}');

-- ============================================================
-- Product Colors
-- ============================================================

INSERT INTO product_colors (product_id, name, hex, image_url, sort_order) VALUES
-- iPhone 16 Pro Max
('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Desert Titanium', '#B8A58C', '/images/iphone16promax-desert.png', 1),
('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Natural Titanium', '#9A9A98', '/images/iphone16promax-natural.png', 2),
('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'White Titanium', '#F2F1ED', '/images/iphone16promax-white.png', 3),
('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'Black Titanium', '#3C3C3C', '/images/iphone16promax-black.png', 4),
-- iPhone 16
('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'Ultramarine', '#4B6BFB', '/images/iphone16-ultramarine.png', 1),
('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'Teal', '#4BA4A4', '/images/iphone16-teal.png', 2),
('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'Pink', '#F2A4B8', '/images/iphone16-pink.png', 3),
('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'White', '#F5F5F0', '/images/iphone16-white.png', 4),
('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'Black', '#3C3C3C', '/images/iphone16-black.png', 5),
-- iPad Pro M4
('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'Space Black', '#1C1C1E', '/images/ipadpro-black.png', 1),
('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'Silver', '#E3E4E5', '/images/ipadpro-silver.png', 2),
-- iPad Air M2
('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'Starlight', '#F0E8D8', '/images/ipadair-starlight.png', 1),
('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'Space Gray', '#68696B', '/images/ipadair-gray.png', 2),
('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'Blue', '#5B7FAF', '/images/ipadair-blue.png', 3),
('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'Purple', '#9B8AA5', '/images/ipadair-purple.png', 4),
-- AirPods Pro 2
('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'White', '#F5F5F0', '/images/airpodspro2.png', 1),
-- AirPods Max
('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'Midnight', '#1C1C1E', '/images/airpodsmax-midnight.png', 1),
('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'Starlight', '#F0E8D8', '/images/airpodsmax-starlight.png', 2),
('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'Blue', '#5B7FAF', '/images/airpodsmax-blue.png', 3),
('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'Orange', '#E8702A', '/images/airpodsmax-orange.png', 4),
('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'Purple', '#9B8AA5', '/images/airpodsmax-purple.png', 5),
-- Apple Pencil Pro
('a1b2c3d4-e5f6-7890-abcd-ef1234567807', 'White', '#F5F5F0', '/images/pencil-pro.png', 1);

-- ============================================================
-- Product Options
-- ============================================================

INSERT INTO product_options (product_id, label, price, sort_order) VALUES
-- iPhone 16 Pro Max
('a1b2c3d4-e5f6-7890-abcd-ef1234567801', '256GB', 50508.00, 1),
('a1b2c3d4-e5f6-7890-abcd-ef1234567801', '512GB', 58900.00, 2),
('a1b2c3d4-e5f6-7890-abcd-ef1234567801', '1TB', 66900.00, 3),
-- iPhone 16
('a1b2c3d4-e5f6-7890-abcd-ef1234567802', '128GB', 33155.00, 1),
('a1b2c3d4-e5f6-7890-abcd-ef1234567802', '256GB', 37900.00, 2),
('a1b2c3d4-e5f6-7890-abcd-ef1234567802', '512GB', 43900.00, 3),
-- iPad Pro M4
('a1b2c3d4-e5f6-7890-abcd-ef1234567803', '256GB WiFi', 40410.00, 1),
('a1b2c3d4-e5f6-7890-abcd-ef1234567803', '512GB WiFi', 49900.00, 2),
('a1b2c3d4-e5f6-7890-abcd-ef1234567803', '1TB WiFi', 59900.00, 3),
('a1b2c3d4-e5f6-7890-abcd-ef1234567803', '2TB WiFi', 69900.00, 4),
-- iPad Air M2
('a1b2c3d4-e5f6-7890-abcd-ef1234567804', '128GB WiFi', 24900.00, 1),
('a1b2c3d4-e5f6-7890-abcd-ef1234567804', '256GB WiFi', 28900.00, 2),
('a1b2c3d4-e5f6-7890-abcd-ef1234567804', '512GB WiFi', 35900.00, 3),
-- AirPods Pro 2
('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'USB-C', 7641.50, 1),
('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'USB-C + MagSafe', 8990.00, 2),
-- AirPods Max
('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'USB-C', 19900.00, 1),
-- Apple Pencil Pro
('a1b2c3d4-e5f6-7890-abcd-ef1234567807', 'Standard', 4990.00, 1);

-- ============================================================
-- Product Specs
-- ============================================================

INSERT INTO product_specs (product_id, spec_key, spec_value, sort_order) VALUES
-- iPhone 16 Pro Max
('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'ชิป', 'A18 Pro', 1),
('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'จอแสดงผล', 'Super Retina XDR 6.9"', 2),
('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'กล้อง', '48MP Main + 12MP Ultra Wide + 12MP Telephoto 5x', 3),
('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'แบตเตอรี่', 'วิดีโอ 33 ชม.', 4),
('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'พอร์ต', 'USB-C (USB 3)', 5),
('a1b2c3d4-e5f6-7890-abcd-ef1234567801', 'กันน้ำ', 'IP68', 6),
-- iPhone 16
('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'ชิป', 'A18', 1),
('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'จอแสดงผล', 'Super Retina XDR 6.1"', 2),
('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'กล้อง', '48MP Main + 12MP Ultra Wide', 3),
('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'แบตเตอรี่', 'วิดีโอ 22 ชม.', 4),
('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'พอร์ต', 'USB-C (USB 2)', 5),
('a1b2c3d4-e5f6-7890-abcd-ef1234567802', 'กันน้ำ', 'IP68', 6),
-- iPad Pro M4
('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'ชิป', 'Apple M4', 1),
('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'จอแสดงผล', 'Ultra Retina XDR 13"', 2),
('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'กล้อง', '12MP Wide', 3),
('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'แบตเตอรี่', '10 ชม.', 4),
('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'พอร์ต', 'Thunderbolt / USB 4', 5),
('a1b2c3d4-e5f6-7890-abcd-ef1234567803', 'รองรับ', 'Apple Pencil Pro, Magic Keyboard', 6),
-- iPad Air M2
('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'ชิป', 'Apple M2', 1),
('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'จอแสดงผล', 'Liquid Retina 10.9"', 2),
('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'กล้อง', '12MP Wide', 3),
('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'แบตเตอรี่', '10 ชม.', 4),
('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'พอร์ต', 'USB-C', 5),
('a1b2c3d4-e5f6-7890-abcd-ef1234567804', 'รองรับ', 'Apple Pencil (USB-C)', 6),
-- AirPods Pro 2
('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'ชิป', 'Apple H2', 1),
('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'ตัดเสียง', 'Active Noise Cancellation', 2),
('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'เสียง', 'Adaptive Audio, Spatial Audio', 3),
('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'แบตเตอรี่', '6 ชม. (30 ชม. กับเคส)', 4),
('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'กันน้ำ', 'IP54', 5),
('a1b2c3d4-e5f6-7890-abcd-ef1234567805', 'ชาร์จ', 'USB-C, MagSafe, Qi', 6),
-- AirPods Max
('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'ชิป', 'Apple H2', 1),
('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'ตัดเสียง', 'Active Noise Cancellation', 2),
('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'เสียง', 'Spatial Audio, Dolby Atmos', 3),
('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'แบตเตอรี่', '20 ชม.', 4),
('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'วัสดุ', 'อะลูมิเนียม + สเตนเลส', 5),
('a1b2c3d4-e5f6-7890-abcd-ef1234567806', 'ชาร์จ', 'USB-C', 6),
-- Apple Pencil Pro
('a1b2c3d4-e5f6-7890-abcd-ef1234567807', 'เซ็นเซอร์', 'Gyroscope, Accelerometer', 1),
('a1b2c3d4-e5f6-7890-abcd-ef1234567807', 'ฟีเจอร์', 'Squeeze, Barrel Roll, Haptic', 2),
('a1b2c3d4-e5f6-7890-abcd-ef1234567807', 'ชาร์จ', 'Magnetic wireless', 3),
('a1b2c3d4-e5f6-7890-abcd-ef1234567807', 'ค้นหา', 'Find My', 4),
('a1b2c3d4-e5f6-7890-abcd-ef1234567807', 'Hover', 'รองรับ', 5),
('a1b2c3d4-e5f6-7890-abcd-ef1234567807', 'รองรับ', 'iPad Pro M4, iPad Air M2', 6);

-- ============================================================
-- Coupons (NEW in v2)
-- ============================================================

INSERT INTO coupons (code, discount_percent, discount_amount, min_purchase, max_discount, max_uses, expires_at, is_active) VALUES
('TECHX10', 10, 0, 5000.00, 5000.00, 100, '2026-12-31 23:59:59+07', TRUE),
('FIRST20', 20, 0, 3000.00, 2000.00, 500, '2026-12-31 23:59:59+07', TRUE),
('FLASH500', 0, 500.00, 2000.00, NULL, 200, '2026-09-30 23:59:59+07', TRUE);
