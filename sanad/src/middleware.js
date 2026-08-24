const db = require("./db");

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.redirect("/login");
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.session.userId);
  if (!user) {
    req.session.destroy(() => res.redirect("/login"));
    return;
  }
  req.user = user;
  next();
}

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

function requireActiveSubscription(req, res, next) {
  const sub = db.prepare(`SELECT * FROM subscriptions WHERE user_id = ?`).get(req.user.id);
  if (!sub || !ACTIVE_STATUSES.has(sub.status)) {
    return res.redirect("/billing");
  }
  req.subscription = sub;
  next();
}

module.exports = { requireAuth, requireActiveSubscription };
