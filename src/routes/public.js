const express = require("express");
const router = express.Router();
const db = require("../db");

// رابط عام (بدون تسجيل دخول) يفتحه أي عميل يمسح كود QR أو يضغط رابط طلب التقييم،
// ويوجهه مباشرة لصفحة كتابة تقييم جديد على Google لنفس النشاط التجاري
router.get("/r/:id", (req, res) => {
  const accountId = Number(req.params.id);
  const account = db.prepare(`SELECT google_review_link FROM accounts WHERE id = ?`).get(accountId);

  if (!account || !account.google_review_link) {
    return res.status(404).send("This review link isn't available yet.");
  }

  res.redirect(account.google_review_link);
});

module.exports = router;
