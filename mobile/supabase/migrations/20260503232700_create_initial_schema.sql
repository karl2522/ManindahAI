-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE user_role AS ENUM ('owner', 'customer', 'moderator');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'banned');
CREATE TYPE store_status AS ENUM ('active', 'inactive', 'under_review');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');
CREATE TYPE moderation_action_type AS ENUM ('warning', 'suspension', 'ban', 'store_removal', 'review_deletion');
CREATE TYPE inventory_change_type AS ENUM ('restock', 'sale', 'adjustment', 'loss');

-- =============================================
-- USERS TABLE
-- Synced from Firebase Auth (firebase_uid is the link)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  user_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid VARCHAR(128) UNIQUE NOT NULL,
  name        VARCHAR(255),
  email       VARCHAR(255) UNIQUE NOT NULL,
  role        user_role NOT NULL DEFAULT 'customer',
  status      user_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- STORES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS stores (
  store_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  store_name  VARCHAR(255) NOT NULL,
  address     TEXT,
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  image_url   TEXT,
  status      store_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- PRODUCTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS products (
  product_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        UUID NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  original_price  NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  selling_price   NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  quantity        INTEGER NOT NULL DEFAULT 0,
  category        VARCHAR(100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- SUPPLIERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  contact_info  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- SUPPLIER PRICES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS supplier_prices (
  supplier_price_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  supplier_id       UUID NOT NULL REFERENCES suppliers(supplier_id) ON DELETE CASCADE,
  price             NUMERIC(10, 2) NOT NULL,
  date_recorded     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- SALES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS sales (
  sale_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      UUID NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
  date          TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_amount  NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_profit  NUMERIC(10, 2) NOT NULL DEFAULT 0.00
);

-- =============================================
-- SALE ITEMS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS sale_items (
  sale_item_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id       UUID NOT NULL REFERENCES sales(sale_id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
  quantity      INTEGER NOT NULL DEFAULT 1,
  price_at_sale NUMERIC(10, 2) NOT NULL
);

-- =============================================
-- EXPENSES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS expenses (
  expense_id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    UUID NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
  name        VARCHAR(255) NOT NULL,
  amount      NUMERIC(10, 2) NOT NULL,
  date        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- INVENTORY LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS inventory_logs (
  log_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  change_type       inventory_change_type NOT NULL,
  quantity_changed  INTEGER NOT NULL,
  date              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- REVIEWS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS reviews (
  review_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  store_id    UUID NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- REPORTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS reports (
  report_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  review_id   UUID REFERENCES reviews(review_id) ON DELETE SET NULL,
  store_id    UUID REFERENCES stores(store_id) ON DELETE SET NULL,
  reason      TEXT NOT NULL,
  status      report_status NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- MODERATION ACTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS moderation_actions (
  action_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id  UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  user_id       UUID REFERENCES users(user_id) ON DELETE SET NULL,
  store_id      UUID REFERENCES stores(store_id) ON DELETE SET NULL,
  action_type   moderation_action_type NOT NULL,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- updated_at auto-update function
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
