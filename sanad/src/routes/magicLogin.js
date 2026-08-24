const express = require("express");
const router = express.Router();
const db = require("../db");

// رابط دخول سحري بدون كلمة مرور — يثبت الهوية عن طريق امتلاك الرابط نفسه (اللي انبعث فقط
// على رقم واتساب المرتبط أصلاً بالحساب). يُستخدم للمستخدمين اللي أنشأوا حسابهم تلقائياً من واتساب.
router.get("/d/:token", (req, res) => {
  const user = db.prepare(`SELECT * FROM users WHERE dashboard_token = ?`).get(req.params.token);
  if (!user) return res.status(404).send("الرابط غير صالح");

  req.session.userId = user.id;
  res.redirect("/dashboard");
});

module.exports = router;
