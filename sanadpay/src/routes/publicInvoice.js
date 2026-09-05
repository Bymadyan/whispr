const express = require("express");
const router = express.Router();
const db = require("../db");
const { detectPageLanguage, pageText } = require("../i18n");

router.get("/invoice/:token", (req, res) => {
  const invoice = db.prepare(`SELECT * FROM invoices WHERE public_token = ?`).get(req.params.token);
  if (!invoice) return res.status(404).send("Invoice not found / الفاتورة غير موجودة");

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(invoice.user_id);
  const link = db.prepare(`SELECT * FROM whatsapp_links WHERE user_id = ?`).get(invoice.user_id);

  // ?lang= يفضّل على لغة المتصفح (زر التبديل اليدوي بالصفحة يستخدمها)
  const SUPPORTED_LANGS = ["ar", "en", "ur"];
  const lang = SUPPORTED_LANGS.includes(req.query.lang) ? req.query.lang : detectPageLanguage(req.headers["accept-language"]);

  res.render("invoice-public", {
    invoice,
    lang,
    tr: pageText(lang),
    businessName: (user && user.business_name) || pageText(lang).serviceProvider,
    businessPhone: link ? link.phone_number.replace("whatsapp:", "") : null,
    invoiceNumber: `SND-${String(invoice.id).padStart(6, "0")}`,
    invoiceDate: new Date(invoice.created_at * 1000).toLocaleDateString(lang === "en" ? "en-US" : "ar", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  });
});

module.exports = router;
