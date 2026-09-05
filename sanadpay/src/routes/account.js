const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const db = require("../db");
const { requireAuth } = require("../middleware");

function generateCode() {
  return crypto.randomBytes(3).toString("hex").toUpperCase(); // مثال: 4F2A9C
}

router.get("/connect-whatsapp", requireAuth, (req, res) => {
  const link = db.prepare(`SELECT * FROM whatsapp_links WHERE user_id = ?`).get(req.user.id);

  let pendingCode = db
    .prepare(`SELECT * FROM link_codes WHERE user_id = ? AND used_at IS NULL AND expires_at > strftime('%s','now') ORDER BY created_at DESC LIMIT 1`)
    .get(req.user.id);

  if (!link && !pendingCode) {
    const code = generateCode();
    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60; // صالح 30 دقيقة
    db.prepare(`INSERT INTO link_codes (user_id, code, expires_at) VALUES (?, ?, ?)`).run(req.user.id, code, expiresAt);
    pendingCode = { code, expires_at: expiresAt };
  }

  res.render("connect-whatsapp", {
    link,
    pendingCode,
    whatsappNumber: (process.env.TWILIO_WHATSAPP_FROM || "").replace("whatsapp:", ""),
  });
});

// يولّد رمز ربط جديد (مثلاً لو انتهت صلاحية القديم أو المستخدم يبي يربط رقم ثاني)
router.post("/connect-whatsapp/new-code", requireAuth, (req, res) => {
  const code = generateCode();
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60;
  db.prepare(`INSERT INTO link_codes (user_id, code, expires_at) VALUES (?, ?, ?)`).run(req.user.id, code, expiresAt);
  res.redirect("/connect-whatsapp");
});

// يحدّث اسم النشاط اللي يظهر للزبون النهائي بصفحة الفاتورة (بدل "مزوّد الخدمة" العام)
router.post("/account/business-name", requireAuth, (req, res) => {
  const businessName = (req.body.businessName || "").trim().slice(0, 120);
  if (businessName) {
    db.prepare(`UPDATE users SET business_name = ? WHERE id = ?`).run(businessName, req.user.id);
  }
  res.redirect("/dashboard");
});

module.exports = router;
