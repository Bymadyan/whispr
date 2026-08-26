const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const twilio = require("twilio");
const db = require("../db");
const { downloadMedia, sendMessage } = require("../whatsapp");
const { transcribeAudio } = require("../transcribe");
const { extractInvoice } = require("../extractInvoice");
const { buildInvoicePaymentUrl, buildSubscriptionCheckoutUrl, buildConnectOnboardingUrl } = require("./billing");
const { FREE_INVOICE_LIMIT } = require("../config");
const { detectLanguage, t } = require("../i18n");

function baseUrl() {
  return process.env.APP_BASE_URL || "http://localhost:3000";
}

function validateTwilioSignature(req, res, next) {
  if (!process.env.TWILIO_AUTH_TOKEN) {
    console.warn("تحذير: TWILIO_AUTH_TOKEN غير مضبوط — تم تجاوز التحقق من توقيع Twilio");
    return next();
  }
  const signature = req.headers["x-twilio-signature"];
  const url = `${baseUrl()}/whatsapp/webhook`;
  const valid = twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN, signature, url, req.body);
  if (!valid) return res.status(403).send("توقيع Twilio غير صالح");
  next();
}

function reply(res, text) {
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(text);
  res.type("text/xml").send(twiml.toString());
}

function dashboardUrl(user) {
  return `${baseUrl()}/d/${user.dashboard_token}`;
}

function invoicePageUrl(invoice) {
  return `${baseUrl()}/invoice/${invoice.public_token}`;
}

function getOrCreateUserForPhone(from) {
  const existingLink = db.prepare(`SELECT * FROM whatsapp_links WHERE phone_number = ?`).get(from);
  if (existingLink) {
    return { user: db.prepare(`SELECT * FROM users WHERE id = ?`).get(existingLink.user_id), isNew: false };
  }

  const token = crypto.randomBytes(24).toString("hex");
  const result = db.prepare(`INSERT INTO users (dashboard_token) VALUES (?)`).run(token);
  db.prepare(`INSERT INTO subscriptions (user_id, status) VALUES (?, 'incomplete')`).run(result.lastInsertRowid);
  db.prepare(`INSERT INTO whatsapp_links (user_id, phone_number) VALUES (?, ?)`).run(result.lastInsertRowid, from);

  return { user: db.prepare(`SELECT * FROM users WHERE id = ?`).get(result.lastInsertRowid), isNew: true };
}

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

async function processInvoiceMessage(res, user, transcript, source, isNew, lang) {
  const msg = t(lang);
  const invoiceCount = db.prepare(`SELECT COUNT(*) AS n FROM invoices WHERE user_id = ?`).get(user.id).n;
  const sub = db.prepare(`SELECT * FROM subscriptions WHERE user_id = ?`).get(user.id);
  const hasActiveSubscription = sub && ACTIVE_STATUSES.has(sub.status);

  if (invoiceCount >= FREE_INVOICE_LIMIT && !hasActiveSubscription) {
    let checkoutLine = msg.checkoutLineFallback;
    try {
      const url = await buildSubscriptionCheckoutUrl(user);
      if (url) checkoutLine = msg.checkoutLineWithUrl(url);
    } catch (err) {
      console.error("فشل إنشاء رابط الاشتراك:", err.message);
    }
    return reply(res, msg.paywall(FREE_INVOICE_LIMIT, checkoutLine));
  }

  const extracted = await extractInvoice(transcript);
  const publicToken = crypto.randomBytes(16).toString("hex");

  const result = db
    .prepare(
      `INSERT INTO invoices (user_id, customer_name, customer_phone, description, amount, currency, raw_transcript, source, public_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      user.id,
      extracted.customer_name,
      extracted.customer_phone,
      extracted.description,
      extracted.amount,
      extracted.currency,
      transcript,
      source,
      publicToken
    );

  let invoice = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(result.lastInsertRowid);

  try {
    const paymentUrl = await buildInvoicePaymentUrl(invoice, user);
    if (paymentUrl) invoice = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(invoice.id);
  } catch (err) {
    console.error("فشل إنشاء رابط الدفع للفاتورة:", err.message);
  }

  const remainingFree = hasActiveSubscription ? null : Math.max(0, FREE_INVOICE_LIMIT - (invoiceCount + 1));
  let message = msg.invoice(invoice, remainingFree, invoicePageUrl(invoice));

  if (isNew) {
    let connectUrl = null;
    try {
      connectUrl = await buildConnectOnboardingUrl(user);
    } catch (err) {
      console.error("فشل إنشاء رابط ربط الحساب البنكي:", err.message);
    }
    message = `${msg.welcome(FREE_INVOICE_LIMIT, connectUrl)}\n\n—\n\n${message}\n\n${msg.dashboardLine(dashboardUrl(user))}`;
  }

  reply(res, message);
}

router.post("/whatsapp/webhook", express.urlencoded({ extended: false }), validateTwilioSignature, async (req, res) => {
  try {
    const from = req.body.From; // "whatsapp:+9665xxxxxxxx"
    const body = (req.body.Body || "").trim();
    const numMedia = Number(req.body.NumMedia || 0);
    const lang = detectLanguage(body);
    const msg = t(lang);

    if (!from) return res.status(400).send("Missing From");

    // مستخدم قديم أنشأ حسابه من الموقع وعنده رمز ربط صالح؟ نربط رقمه بنفس ذاك الحساب بدل إنشاء حساب جديد
    if (body) {
      const pending = db
        .prepare(`SELECT * FROM link_codes WHERE code = ? AND used_at IS NULL AND expires_at > strftime('%s','now')`)
        .get(body.toUpperCase());
      if (pending) {
        db.prepare(`INSERT OR IGNORE INTO whatsapp_links (user_id, phone_number) VALUES (?, ?)`).run(pending.user_id, from);
        db.prepare(`UPDATE link_codes SET used_at = strftime('%s','now') WHERE id = ?`).run(pending.id);
        return reply(res, msg.linkSuccess);
      }
    }

    const { user, isNew } = getOrCreateUserForPhone(from);

    let transcript = "";
    let source = "text";

    if (numMedia > 0 && (req.body.MediaContentType0 || "").startsWith("audio")) {
      source = "voice";
      if (!process.env.OPENAI_API_KEY) {
        return reply(res, msg.voiceNoOpenAI);
      }
      try {
        const { buffer, contentType } = await downloadMedia(req.body.MediaUrl0);
        transcript = await transcribeAudio(buffer, contentType);
      } catch (err) {
        console.error("فشل تحويل الرسالة الصوتية:", err.message);
        return reply(res, msg.voiceFailed);
      }
    } else if (body) {
      transcript = body;
    } else {
      return reply(res, isNew ? msg.welcome(FREE_INVOICE_LIMIT, null) : msg.emptyPrompt);
    }

    // للرسائل الصوتية، نكتشف اللغة من النص المفرّغ نفسه (أدق من نص الرسالة الأصلي اللي غالباً فاضي)
    const finalLang = source === "voice" ? detectLanguage(transcript) : lang;

    // نحفظ آخر لغة مكتشفة لاستخدامها لاحقاً بالإشعارات اللي ما فيها رسالة واردة نكتشف منها اللغة
    // (تنبيه دفعة استُلمت، تذكير تحصيل، تأكيد تحويل بنكي)
    db.prepare(`UPDATE users SET preferred_language = ? WHERE id = ?`).run(finalLang, user.id);

    await processInvoiceMessage(res, user, transcript, source, isNew, finalLang);
  } catch (err) {
    console.error("خطأ في معالجة رسالة واتساب:", err);
    reply(res, t(detectLanguage(req.body.Body)).unexpectedError);
  }
});

module.exports = router;
