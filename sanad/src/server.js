require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const { startReminderLoop } = require("./reminders");

const requireEnv = ["SESSION_SECRET", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_FROM"];
const missing = requireEnv.filter((k) => !process.env[k]);
if (missing.length) {
  console.warn(`تحذير: المتغيرات التالية غير مضبوطة في .env: ${missing.join(", ")}`);
}
if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
  console.warn("تحذير: STRIPE_SECRET_KEY أو STRIPE_PRICE_ID غير مضبوطة — صفحة الدفع لن تعمل حتى تضبطها.");
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("تحذير: ANTHROPIC_API_KEY غير مضبوط — استخراج بيانات الفاتورة راح يكون بدائي جداً.");
}
if (!process.env.OPENAI_API_KEY) {
  console.warn("تحذير: OPENAI_API_KEY غير مضبوط — الرسائل الصوتية بواتساب لن تعمل.");
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

// راوت Stripe webhook يحتاج body خام، وراوت واتساب يحتاج urlencoded خاص فيه — نسجلهم قبل urlencoded العام
app.use("/", require("./routes/billing"));
app.use("/", require("./routes/whatsappWebhook"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  if (req.session.userId) return res.redirect("/dashboard");
  const whatsappNumber = (process.env.TWILIO_WHATSAPP_FROM || "").replace("whatsapp:", "").replace("+", "");
  res.render("landing", { whatsappNumber });
});

app.use("/", require("./routes/magicLogin"));
app.use("/", require("./routes/auth"));
app.use("/", require("./routes/account"));
app.use("/", require("./routes/dashboard"));

app.use((req, res) => {
  res.status(404).send("الصفحة غير موجودة");
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send(`<pre>حدث خطأ: ${String(err.message || err)}</pre>`);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`سند شغالة على http://localhost:${port}`);
  startReminderLoop();
});
