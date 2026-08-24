const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "sanad.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
  -- email/password_hash تصير فاضية للحسابات اللي تتولد تلقائياً من أول رسالة واتساب (بدون تسجيل ويب).
  -- dashboard_token رابط دخول سحري بدون كلمة مرور، يثبت الهوية عن طريق امتلاك رقم واتساب المرتبط أصلاً.
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_name TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    dashboard_token TEXT NOT NULL UNIQUE,
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

  -- الرقم اللي يبعت منه صاحب العمل رسائله على واتساب، بعد ما يربطه عبر رمز الربط
  CREATE TABLE IF NOT EXISTS whatsapp_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    phone_number TEXT NOT NULL UNIQUE, -- مثال: whatsapp:+9665xxxxxxxx
    linked_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  -- رمز مؤقت يعرضه للمستخدم في لوحة التحكم عشان يبعته على بوت واتساب فيربط رقمه بحسابه
  CREATE TABLE IF NOT EXISTS link_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    code TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    used_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    customer_name TEXT,
    customer_phone TEXT,
    description TEXT,
    amount REAL,
    currency TEXT,
    status TEXT NOT NULL DEFAULT 'unpaid', -- unpaid | paid
    raw_transcript TEXT,
    source TEXT NOT NULL DEFAULT 'text', -- text | voice
    payment_url TEXT,
    stripe_checkout_session_id TEXT,
    reminder_sent_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
  );
`);

module.exports = db;
