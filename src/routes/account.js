const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const db = require("../db");

router.get("/signup", (req, res) => {
  res.render("signup", { error: null, values: {} });
});

router.post("/signup", async (req, res) => {
  const { businessName, email, password } = req.body;

  if (!businessName || !email || !password || password.length < 8) {
    return res.render("signup", {
      error: "Please fill in all fields, and make sure your password is at least 8 characters",
      values: { businessName, email },
    });
  }

  const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(email.toLowerCase().trim());
  if (existing) {
    return res.render("signup", {
      error: "An account with this email already exists — try logging in instead",
      values: { businessName, email },
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const info = db
    .prepare(`INSERT INTO users (business_name, email, password_hash) VALUES (?, ?, ?)`)
    .run(businessName.trim(), email.toLowerCase().trim(), passwordHash);

  db.prepare(`INSERT INTO subscriptions (user_id, status) VALUES (?, 'incomplete')`).run(info.lastInsertRowid);

  req.session.userId = info.lastInsertRowid;
  res.redirect("/billing");
});

router.get("/login", (req, res) => {
  res.render("login", { error: null });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get((email || "").toLowerCase().trim());

  if (!user || !(await bcrypt.compare(password || "", user.password_hash))) {
    return res.render("login", { error: "Incorrect email or password" });
  }

  req.session.userId = user.id;
  res.redirect("/dashboard");
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

module.exports = router;
