const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth, requireActiveSubscription } = require("../middleware");

router.get("/dashboard", requireAuth, requireActiveSubscription, (req, res) => {
  const link = db.prepare(`SELECT * FROM whatsapp_links WHERE user_id = ?`).get(req.user.id);
  const invoices = db
    .prepare(`SELECT * FROM invoices WHERE user_id = ? ORDER BY created_at DESC`)
    .all(req.user.id);

  const totals = {
    unpaid: invoices.filter((i) => i.status === "unpaid").reduce((sum, i) => sum + (i.amount || 0), 0),
    paid: invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + (i.amount || 0), 0),
  };

  res.render("dashboard", { link, invoices, totals, user: req.user });
});

router.post("/invoices/:id/mark-paid", requireAuth, requireActiveSubscription, (req, res) => {
  db.prepare(`UPDATE invoices SET status = 'paid', updated_at = strftime('%s','now') WHERE id = ? AND user_id = ?`).run(
    req.params.id,
    req.user.id
  );
  res.redirect("/dashboard");
});

router.post("/invoices/:id/mark-unpaid", requireAuth, requireActiveSubscription, (req, res) => {
  db.prepare(`UPDATE invoices SET status = 'unpaid', updated_at = strftime('%s','now') WHERE id = ? AND user_id = ?`).run(
    req.params.id,
    req.user.id
  );
  res.redirect("/dashboard");
});

module.exports = router;
