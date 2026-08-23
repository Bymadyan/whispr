const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/", (req, res) => {
  const accounts = db.prepare(`SELECT * FROM accounts ORDER BY created_at DESC`).all();

  const reviews = db
    .prepare(
      `SELECT r.*, d.draft_text, d.status AS draft_status, d.generated_by, a.business_name
       FROM reviews r
       JOIN accounts a ON a.id = r.account_id
       LEFT JOIN drafts d ON d.review_id = r.id
       ORDER BY r.review_create_time DESC`
    )
    .all();

  res.render("dashboard", { accounts, reviews });
});

module.exports = router;
