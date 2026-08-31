require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");

const requireEnv = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI", "SESSION_SECRET"];
const missing = requireEnv.filter((k) => !process.env[k]);
if (missing.length) {
  console.warn(`تحذير: المتغيرات التالية غير مضبوطة في .env: ${missing.join(", ")}`);
}
if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
  console.warn("تحذير: STRIPE_SECRET_KEY أو STRIPE_PRICE_ID غير مضبوطة — صفحة الدفع لن تعمل حتى تضبطها.");
}

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 },
  })
);

// راوت الـ webhook الخاص بـ Stripe يحتاج body خام (raw) للتحقق من التوقيع، فنسجله قبل urlencoded العام
app.use("/", require("./routes/billing"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// قراءة كوكي اللغة يدوياً بدون الحاجة لمكتبة cookie-parser إضافية
function readLangCookie(req) {
  const header = req.headers.cookie || "";
  const match = header.match(/(?:^|;\s*)whispr_lang=(en|ar)/);
  return match ? match[1] : null;
}

app.get("/", (req, res) => {
  if (req.session.userId) return res.redirect("/dashboard");

  const queryLang = req.query.lang === "ar" || req.query.lang === "en" ? req.query.lang : null;
  const lang = queryLang || readLangCookie(req) || "en"; // الإنجليزي هو الافتراضي

  if (queryLang) {
    res.cookie("whispr_lang", queryLang, { maxAge: 1000 * 60 * 60 * 24 * 365, httpOnly: false });
  }

  const { getLandingCopy } = require("./i18n/landing");
  res.render("landing", { t: getLandingCopy(lang) });
});

app.get("/privacy", (req, res) => res.render("privacy"));
app.get("/terms", (req, res) => res.render("terms"));

app.use("/", require("./routes/account"));
app.use("/auth", require("./routes/auth"));
app.use("/", require("./routes/dashboard"));
app.use("/reviews", require("./routes/reviews"));

app.use((req, res) => {
  res.status(404).send("الصفحة غير موجودة");
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send(`<pre>حدث خطأ: ${String(err.message || err)}</pre>`);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Whispr شغالة على http://localhost:${port}`);
});

require("./scheduler").startScheduler();
