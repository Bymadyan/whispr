const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "whispr.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_name TEXT,
    google_account_name TEXT,   -- accounts/{id} من Google
    location_name TEXT,          -- accounts/{id}/locations/{id} من Google
    access_token TEXT,
    refresh_token TEXT,
    token_expiry INTEGER,
    last_synced_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL REFERENCES accounts(id),
    google_review_id TEXT NOT NULL,
    reviewer_name TEXT,
    star_rating INTEGER,
    comment TEXT,
    review_create_time TEXT,
    has_owner_reply INTEGER NOT NULL DEFAULT 0,
    synced_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    UNIQUE(account_id, google_review_id)
  );

  CREATE TABLE IF NOT EXISTS drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_id INTEGER NOT NULL UNIQUE REFERENCES reviews(id),
    draft_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- draft | edited | published
    generated_by TEXT NOT NULL DEFAULT 'template', -- template | claude
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    published_at INTEGER
  );
`);

module.exports = db;
