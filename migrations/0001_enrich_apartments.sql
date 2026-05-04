-- =============================================================
-- Migration: enrich `apartments` with structured listing fields
-- =============================================================
-- Run in Supabase Dashboard → SQL Editor → New query → Paste → Run.
-- Idempotent: uses IF NOT EXISTS, safe to re-run.
-- =============================================================

ALTER TABLE apartments
  ADD COLUMN IF NOT EXISTS floor          smallint,         -- 5
  ADD COLUMN IF NOT EXISTS total_floors   smallint,         -- 9
  ADD COLUMN IF NOT EXISTS area_total     numeric(6,1),     -- 56.0
  ADD COLUMN IF NOT EXISTS area_living    numeric(6,1),     -- 23.0
  ADD COLUMN IF NOT EXISTS area_kitchen   numeric(6,1),     -- 21.0
  ADD COLUMN IF NOT EXISTS walls          text,             -- 'цегла' | 'моноліт-каркас' | …
  ADD COLUMN IF NOT EXISTS heating        text,             -- 'індивідуальне' | 'газ' | 'центральне' | …
  ADD COLUMN IF NOT EXISTS year_built     smallint,         -- 2018
  ADD COLUMN IF NOT EXISTS has_repair     boolean,          -- true / false / null
  ADD COLUMN IF NOT EXISTS is_secondary   boolean,          -- true = вторинка
  ADD COLUMN IF NOT EXISTS source         text,             -- 'olx' | 'ria' | 'lun'
  ADD COLUMN IF NOT EXISTS posted_at      timestamptz,      -- момент публікації
  ADD COLUMN IF NOT EXISTS updated_at     timestamptz DEFAULT now();

-- Indexes for the filters the frontend uses
CREATE INDEX IF NOT EXISTS apartments_floor_idx        ON apartments (floor);
CREATE INDEX IF NOT EXISTS apartments_year_built_idx   ON apartments (year_built);
CREATE INDEX IF NOT EXISTS apartments_price_idx        ON apartments (price);
CREATE INDEX IF NOT EXISTS apartments_district_idx     ON apartments (district);
CREATE INDEX IF NOT EXISTS apartments_deal_type_idx    ON apartments (deal_type);
CREATE INDEX IF NOT EXISTS apartments_source_idx       ON apartments (source);
