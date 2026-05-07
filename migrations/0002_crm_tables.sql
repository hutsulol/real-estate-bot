-- =============================================================
-- Migration: CRM tables for the Telegram autoresponder
-- =============================================================
-- Run AFTER 0001_enrich_apartments.sql.
-- Creates: clients, chat_messages, pinned_listings.
-- Idempotent (IF NOT EXISTS).
-- =============================================================

-- ── clients ──
CREATE TABLE IF NOT EXISTS clients (
  id                 uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text          NOT NULL,
  username           text          UNIQUE,                         -- e.g. "@danylo_r"
  telegram_id        bigint,                                       -- resolved on first DM, fallback when no @username
  description        text,                                         -- free text → AI context
  budget             text,                                         -- human-readable, e.g. "до 60 000 USD"
  district           text,                                         -- human-readable
  rooms              text,                                         -- "2", "2-3"
  criteria           jsonb         NOT NULL DEFAULT '{}'::jsonb,   -- structured filter for matching apartments
  status             text          NOT NULL DEFAULT 'active'       -- active | paused | closed
                                   CHECK (status IN ('active','paused','closed')),
  auto_enabled       boolean       NOT NULL DEFAULT true,
  initiate           boolean       NOT NULL DEFAULT true,          -- bot writes first?
  delay_min          smallint      NOT NULL DEFAULT 8,             -- min minutes before bot replies
  delay_max          smallint      NOT NULL DEFAULT 15,
  frequency_seconds  integer       NOT NULL DEFAULT 7200,          -- min interval between proactive messages
  frequency_label    text          NOT NULL DEFAULT '1 раз / 2 год',
  message_template   text          NOT NULL DEFAULT 'Доброго дня, {{name}}! Знайшов {{count}} нових варіантів. Скинути?',
  quiet_start        smallint      NOT NULL DEFAULT 22,            -- no outbound after this hour
  quiet_end          smallint      NOT NULL DEFAULT 9,
  last_outbound_at   timestamptz,
  last_inbound_at    timestamptz,
  created_at         timestamptz   NOT NULL DEFAULT now(),
  updated_at         timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clients_status_idx       ON clients (status);
CREATE INDEX IF NOT EXISTS clients_telegram_id_idx  ON clients (telegram_id);

-- ── chat_messages ──
CREATE TABLE IF NOT EXISTS chat_messages (
  id              bigserial     PRIMARY KEY,
  client_id       uuid          NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  direction       text          NOT NULL CHECK (direction IN ('in','out')),
  text            text          NOT NULL,
  tg_message_id   bigint,                                          -- Telegram msg id for dedup / replies
  ai_generated    boolean       NOT NULL DEFAULT false,
  sent_at         timestamptz,
  received_at     timestamptz,
  read_at         timestamptz,
  created_at      timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_client_idx   ON chat_messages (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chat_messages_direction_idx ON chat_messages (client_id, direction);

-- ── pinned_listings ──
-- Apartments pinned to a specific client (manually from frontend OR auto by bot).
-- Once pinned, the bot won't notify the same client about them again.
CREATE TABLE IF NOT EXISTS pinned_listings (
  client_id    uuid          NOT NULL REFERENCES clients(id)   ON DELETE CASCADE,
  listing_id   text          NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
  pinned_at    timestamptz   NOT NULL DEFAULT now(),
  notified_at  timestamptz,                                     -- moment the bot mentioned it in chat
  PRIMARY KEY (client_id, listing_id)
);

CREATE INDEX IF NOT EXISTS pinned_client_idx   ON pinned_listings (client_id);
CREATE INDEX IF NOT EXISTS pinned_listing_idx  ON pinned_listings (listing_id);

-- ── updated_at trigger ──
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS clients_touch_updated_at ON clients;
CREATE TRIGGER clients_touch_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
