CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  google_sub VARCHAR(64) UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  picture TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT,
  source VARCHAR(32) NOT NULL DEFAULT 'manual',
  telegram_message_id BIGINT,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  due_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reviewed_at TIMESTAMPTZ,
  flagged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cards ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_telegram_message_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_cards_user_telegram_message
  ON cards (user_id, telegram_message_id);
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards (user_id);

CREATE TABLE IF NOT EXISTS review_log (
  id SERIAL PRIMARY KEY,
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  quality SMALLINT NOT NULL,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cards_due_at ON cards (due_at);
