const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth, requireActiveSubscription } = require("../middleware");

router.get("/dashboard", requireAuth, requireActiveSubscription, (req, res) => {
  const accounts = db.prepare(`SELECT * FROM accounts WHERE user_id = ? ORDER BY created_at DESC`).all(req.user.id);

  const reviews = db
    .prepare(
      `SELECT r.*, d.draft_text, d.status AS draft_status, d.generated_by, a.business_name
       FROM reviews r
       JOIN accounts a ON a.id = r.account_id
       LEFT JOIN drafts d ON d.review_id = r.id
       WHERE a.user_id = ?
       ORDER BY r.review_create_time DESC`
    )
    .all(req.user.id);

  res.render("dashboard", { accounts, reviews, user: req.user });
});

module.exports = router;
