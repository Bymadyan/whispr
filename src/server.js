require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");

const requireEnv = ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GOOGLE_REDIRECT_URI", "SESSION_SECRET", "DASHBOARD_PASSWORD"];
const missing = requireEnv.filter((k) => !process.env[k]);
if (missing.length) {
  console.warn(`تحذير: المتغيرات التالية غير مضبوطة في .env: ${missing.join(", ")}`);
}

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 },
  })
);

function requireLogin(req, res, next) {
  if (req.session.loggedIn) return next();
  res.redirect("/login");
}

app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.post("/login", (req, res) => {
  if (req.body.password && req.body.password === process.env.DASHBOARD_PASSWORD) {
    req.session.loggedIn = true;
    return res.redirect("/");
  }
  res.render("login", { error: "كلمة المرور غير صحيحة" });
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

app.use("/auth", requireLogin, require("./routes/auth"));
app.use("/", requireLogin, require("./routes/dashboard"));
app.use("/reviews", requireLogin, require("./routes/reviews"));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send(`<pre>حدث خطأ: ${String(err.message || err)}</pre>`);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Whispr شغالة على http://localhost:${port}`);
});
