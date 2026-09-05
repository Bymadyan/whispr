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

module.exports = { requireAuth };
