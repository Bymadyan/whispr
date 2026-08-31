const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "sanad-review.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    last_digest_summary TEXT, -- آخر تقرير أسبوعي تولّد (نص، يظهر باللوحة كنسخة احتياطية عن الإيميل)
    last_digest_sent_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT NOT NULL DEFAULT 'incomplete', -- incomplete | active | trialing | past_due | canceled | unpaid
    current_period_end INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    business_name TEXT,
    google_account_name TEXT,   -- accounts/{id} من Google
    location_name TEXT,          -- accounts/{id}/locations/{id} من Google
    access_token TEXT,
    refresh_token TEXT,
    token_expiry INTEGER,
    last_synced_at INTEGER,
    auto_publish_positive INTEGER NOT NULL DEFAULT 0, -- نشر تلقائي للتقييمات الإيجابية الآمنة فقط، تعطيل افتراضياً
    custom_risk_keywords TEXT, -- كلمات إضافية يضيفها صاحب النشاط توقف النشر التلقائي، مفصولة بفواصل
    reply_tone TEXT NOT NULL DEFAULT 'friendly', -- friendly | formal | short
    insight_summary TEXT, -- آخر تحليل للأنماط المتكررة بالتقييمات السلبية
    insight_generated_at INTEGER,
    insight_source TEXT, -- claude | keywords
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
    auto_published INTEGER NOT NULL DEFAULT 0, -- 1 لو انتشر تلقائياً بدون مراجعة بشرية (تقييم آمن + الإعداد مفعّل)
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    published_at INTEGER
  );
`);

// ترقية بسيطة لقواعد بيانات قديمة أُنشئت قبل إضافة نظام الحسابات المتعدد (multi-tenant)
const userColumns = db.prepare(`PRAGMA table_info(users)`).all().map((c) => c.name);
if (!userColumns.includes("last_digest_summary")) {
  db.exec(`ALTER TABLE users ADD COLUMN last_digest_summary TEXT`);
}
if (!userColumns.includes("last_digest_sent_at")) {
  db.exec(`ALTER TABLE users ADD COLUMN last_digest_sent_at INTEGER`);
}

const accountColumns = db.prepare(`PRAGMA table_info(accounts)`).all().map((c) => c.name);
if (!accountColumns.includes("user_id")) {
  db.exec(`ALTER TABLE accounts ADD COLUMN user_id INTEGER REFERENCES users(id)`);
}
if (!accountColumns.includes("auto_publish_positive")) {
  db.exec(`ALTER TABLE accounts ADD COLUMN auto_publish_positive INTEGER NOT NULL DEFAULT 0`);
}
if (!accountColumns.includes("custom_risk_keywords")) {
  db.exec(`ALTER TABLE accounts ADD COLUMN custom_risk_keywords TEXT`);
}
if (!accountColumns.includes("reply_tone")) {
  db.exec(`ALTER TABLE accounts ADD COLUMN reply_tone TEXT NOT NULL DEFAULT 'friendly'`);
}
if (!accountColumns.includes("insight_summary")) {
  db.exec(`ALTER TABLE accounts ADD COLUMN insight_summary TEXT`);
}
if (!accountColumns.includes("insight_generated_at")) {
  db.exec(`ALTER TABLE accounts ADD COLUMN insight_generated_at INTEGER`);
}
if (!accountColumns.includes("insight_source")) {
  db.exec(`ALTER TABLE accounts ADD COLUMN insight_source TEXT`);
}

const draftColumns = db.prepare(`PRAGMA table_info(drafts)`).all().map((c) => c.name);
if (!draftColumns.includes("auto_published")) {
  db.exec(`ALTER TABLE drafts ADD COLUMN auto_published INTEGER NOT NULL DEFAULT 0`);
}

module.exports = db;
