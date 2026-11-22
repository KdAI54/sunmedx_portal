-- Cloudflare D1 / SQLite Schema for SunMedX
-- Run: npx wrangler d1 execute sunmedx-db --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS documents (
  collection TEXT NOT NULL,
  id TEXT NOT NULL,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (collection, id)
);

CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents(collection);

CREATE TABLE IF NOT EXISTS auth_accounts (
  uid TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  name TEXT NOT NULL,
  hospital TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'customer',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_auth_accounts_email ON auth_accounts(email);
