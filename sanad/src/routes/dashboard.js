const express = require("express");
const router = express.Router();
const db = require("../db");
const { requireAuth } = require("../middleware");
const { FREE_INVOICE_LIMIT } = require("../config");

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

router.get("/dashboard", requireAuth, (req, res) => {
  const link = db.prepare(`SELECT * FROM whatsapp_links WHERE user_id = ?`).get(req.user.id);
  const sub = db.prepare(`SELECT * FROM subscriptions WHERE user_id = ?`).get(req.user.id);
  const invoices = db
    .prepare(`SELECT * FROM invoices WHERE user_id = ? ORDER BY created_at DESC`)
    .all(req.user.id);

  const totals = {
    unpaid: invoices.filter((i) => i.status === "unpaid").reduce((sum, i) => sum + (i.amount || 0), 0),
    paid: invoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + (i.amount || 0), 0),
  };

  const hasActiveSubscription = sub && ACTIVE_STATUSES.has(sub.status);
  const remainingFree = hasActiveSubscription ? null : Math.max(0, FREE_INVOICE_LIMIT - invoices.length);

  res.render("dashboard", { link, invoices, totals, user: req.user, hasActiveSubscription, remainingFree });
});

router.post("/invoices/:id/mark-paid", requireAuth, (req, res) => {
  db.prepare(`UPDATE invoices SET status = 'paid', updated_at = strftime('%s','now') WHERE id = ? AND user_id = ?`).run(
    req.params.id,
    req.user.id
  );
  res.redirect("/dashboard");
});

router.post("/invoices/:id/mark-unpaid", requireAuth, (req, res) => {
  db.prepare(`UPDATE invoices SET status = 'unpaid', updated_at = strftime('%s','now') WHERE id = ? AND user_id = ?`).run(
    req.params.id,
    req.user.id
  );
  res.redirect("/dashboard");
});

module.exports = router;
