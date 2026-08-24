const express = require("express");
const router = express.Router();
const twilio = require("twilio");
const db = require("../db");
const { downloadMedia } = require("../whatsapp");
const { transcribeAudio } = require("../transcribe");
const { extractInvoice } = require("../extractInvoice");

function baseUrl() {
  return process.env.APP_BASE_URL || "http://localhost:3000";
}

// يتحقق إن الطلب فعلاً جاي من Twilio (يمنع أي حد يزوّر رسائل واتساب مباشرة لراوت الويب هوك)
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

function formatInvoiceMessage(invoice) {
  const amountLine = invoice.amount != null ? `💰 المبلغ: ${invoice.amount} ${invoice.currency || ""}`.trim() : "💰 المبلغ: (لم يُذكر بوضوح، عدّله من لوحة التحكم)";
  const customerLine = invoice.customer_name ? `👤 الزبون: ${invoice.customer_name}` : "👤 الزبون: (غير مذكور)";
  return [
    "✅ سويت لك الفاتورة:",
    "",
    customerLine,
    `📝 الوصف: ${invoice.description || "-"}`,
    amountLine,
    "",
    "انسخ هذي الرسالة وابعتها لزبونك، أو راجع/عدّل الفاتورة من لوحة التحكم.",
  ].join("\n");
}

router.post("/whatsapp/webhook", express.urlencoded({ extended: false }), validateTwilioSignature, async (req, res) => {
  try {
    const from = req.body.From; // "whatsapp:+9665xxxxxxxx"
    const body = (req.body.Body || "").trim();
    const numMedia = Number(req.body.NumMedia || 0);

    if (!from) return res.status(400).send("Missing From");

    const link = db.prepare(`SELECT * FROM whatsapp_links WHERE phone_number = ?`).get(from);

    if (!link) {
      // مو مربوط بعد: نشوف إذا الرسالة رمز ربط صالح
      if (body) {
        const pending = db
          .prepare(`SELECT * FROM link_codes WHERE code = ? AND used_at IS NULL AND expires_at > strftime('%s','now')`)
          .get(body.toUpperCase());

        if (pending) {
          db.prepare(`INSERT OR IGNORE INTO whatsapp_links (user_id, phone_number) VALUES (?, ?)`).run(pending.user_id, from);
          db.prepare(`UPDATE link_codes SET used_at = strftime('%s','now') WHERE id = ?`).run(pending.id);
          return reply(res, "تم ربط رقمك بنجاح ✅\n\nالحين ابعت رسالة صوتية أو نصية توصف فيها الشغلة اللي سويتها، اسم الزبون (اختياري)، والمبلغ — وراح أسوي لك فاتورة جاهزة فوراً.");
        }
      }
      return reply(res, "هذا الرقم مو مرتبط بحساب على سند بعد.\n\nسجّل حساب واشترك من الموقع، وبعدها راح تلقى رمز ربط تبعته هنا لربط رقمك.");
    }

    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(link.user_id);
    if (!user) return reply(res, "حصل خطأ في حسابك، تواصل معنا.");

    let transcript = "";
    let source = "text";

    if (numMedia > 0 && (req.body.MediaContentType0 || "").startsWith("audio")) {
      source = "voice";
      if (!process.env.OPENAI_API_KEY) {
        return reply(res, "الرسائل الصوتية تحتاج تفعيل خدمة التحويل الصوتي على حسابك. لحد ما تنفعّل، اكتب تفاصيل الشغلة نصياً: اسم الزبون، الوصف، والمبلغ.");
      }
      try {
        const { buffer, contentType } = await downloadMedia(req.body.MediaUrl0);
        transcript = await transcribeAudio(buffer, contentType);
      } catch (err) {
        console.error("فشل تحويل الرسالة الصوتية:", err.message);
        return reply(res, "ما قدرت أفهم الرسالة الصوتية. جرب ترسلها مرة ثانية أو اكتب التفاصيل نصياً.");
      }
    } else if (body) {
      transcript = body;
    } else {
      return reply(res, "ابعت رسالة صوتية أو نصية فيها تفاصيل الشغلة (اسم الزبون، الوصف، والمبلغ).");
    }

    const extracted = await extractInvoice(transcript);

    const result = db
      .prepare(
        `INSERT INTO invoices (user_id, customer_name, customer_phone, description, amount, currency, raw_transcript, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        user.id,
        extracted.customer_name,
        extracted.customer_phone,
        extracted.description,
        extracted.amount,
        extracted.currency,
        transcript,
        source
      );

    const invoice = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(result.lastInsertRowid);
    reply(res, formatInvoiceMessage(invoice));
  } catch (err) {
    console.error("خطأ في معالجة رسالة واتساب:", err);
    reply(res, "صار خطأ غير متوقع، جرب مرة ثانية بعد شوي.");
  }
});

module.exports = router;
