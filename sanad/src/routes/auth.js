const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const db = require("../db");

router.get("/signup", (req, res) => {
  res.render("signup", { error: null, values: {} });
});

router.post("/signup", async (req, res, next) => {
  try {
    const { businessName, email, password } = req.body;
    if (!businessName || !email || !password) {
      return res.render("signup", { error: "لازم تعبي كل الحقول", values: { businessName, email } });
    }

    const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email);
    if (existing) {
      return res.render("signup", { error: "فيه حساب مسجل بهذا الإيميل مسبقاً", values: { businessName, email } });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const dashboardToken = crypto.randomBytes(24).toString("hex");
    const result = db
      .prepare(`INSERT INTO users (business_name, email, password_hash, dashboard_token) VALUES (?, ?, ?, ?)`)
      .run(businessName, email, passwordHash, dashboardToken);

    db.prepare(`INSERT INTO subscriptions (user_id, status) VALUES (?, 'incomplete')`).run(result.lastInsertRowid);

    req.session.userId = result.lastInsertRowid;
    res.redirect("/billing");
  } catch (err) {
    next(err);
  }
});

router.get("/login", (req, res) => {
  res.render("login", { error: null });
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
    if (!user || !user.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return res.render("login", { error: "بيانات الدخول غير صحيحة" });
    }
    req.session.userId = user.id;
    res.redirect("/dashboard");
  } catch (err) {
    next(err);
  }
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

module.exports = router;
