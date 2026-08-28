const express = require("express");
const router = express.Router();
const db = require("../db");
const stripe = require("../stripeClient");
const { normalizeCurrency, PLATFORM_FEE_PERCENT } = require("../config");
const { sendMessage } = require("../whatsapp");
const { t } = require("../i18n");

function baseUrl() {
  return process.env.APP_BASE_URL || "http://localhost:3000";
}

// يبني رابط دفع لمرة وحدة لفاتورة معيّنة — هذا اللي الزبون النهائي يضغطه ويدفع فيه.
// لو صاحب الفاتورة كمّل ربط حسابه البنكي (Stripe Connect)، الفلوس تروح له مباشرة (destination charge).
// غير كذا، الفلوس تدخل حساب المنصة مؤقتاً لحد ما يكمّل الربط.
async function buildInvoicePaymentUrl(invoice, user) {
  if (!stripe || invoice.amount == null || invoice.amount <= 0) return null;

  const currency = normalizeCurrency(invoice.currency);
  const productName = `فاتورة: ${invoice.description || "خدمة"}`.slice(0, 250);
  const amountInCents = Math.round(invoice.amount * 100);

  const sessionParams = {
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency,
          product_data: { name: productName },
          unit_amount: amountInCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${baseUrl()}/pay/success`,
    cancel_url: `${baseUrl()}/pay/cancel`,
    metadata: { sanad_invoice_id: String(invoice.id) },
  };

  if (user && user.stripe_connect_charges_enabled && user.stripe_connect_account_id) {
    // بدون on_behalf_of عمداً: رسوم معالجة Stripe نفسها تُخصم من حساب المنصة (منّا)، مو من الحرفي.
    // الحرفي يستلم بالضبط (مبلغ الفاتورة − application_fee_amount) بدون أي خصم إضافي يشوفه بحسابه —
    // نسبة PLATFORM_FEE_PERCENT محسوبة أصلاً لتغطي رسوم المعالجة + السحب البنكي من داخلها بهامش مريح،
    // عشان الرقم المعلن للحرفي يطابق بالضبط الخصم الفعلي اللي يشوفه، بدون مفاجآت لاحقة.
    sessionParams.payment_intent_data = {
      transfer_data: { destination: user.stripe_connect_account_id },
      application_fee_amount: Math.round((amountInCents * PLATFORM_FEE_PERCENT) / 100),
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  db.prepare(`UPDATE invoices SET payment_url = ?, stripe_checkout_session_id = ? WHERE id = ?`).run(
    session.url,
    session.id,
    invoice.id
  );

  return session.url;
}

// يبني رابط "اربط حسابك البنكي" (Stripe Connect Express onboarding) — يُبعث مرة وحدة بالرسالة
// الترحيبية. خطوة اختيارية: النظام يشتغل بدونها، بس فلوس الفواتير تضل بحساب المنصة لحد ما يكملها.
async function buildConnectOnboardingUrl(user) {
  if (!stripe) return null;

  let accountId = user.stripe_connect_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: process.env.STRIPE_CONNECT_COUNTRY || "SA",
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { sanad_user_id: String(user.id) },
      // جدول سحب أسبوعي بدل اليومي الافتراضي — يقلل عدد رسوم السحب البنكي (0.25%+0.25$ لكل سحبة)
      // بشكل كبير بدون ما يأخر وصول فلوس الحرفي كثير. الحرفي ما يحتاج يعدّل أي شي بنفسه.
      settings: { payouts: { schedule: { interval: "weekly", weekly_anchor: "monday" } } },
    });
    accountId = account.id;
    db.prepare(`UPDATE users SET stripe_connect_account_id = ? WHERE id = ?`).run(accountId, user.id);
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${baseUrl()}/connect-bank/refresh`,
    return_url: `${baseUrl()}/connect-bank/done`,
    type: "account_onboarding",
  });

  return accountLink.url;
}

// صفحات هبوط بسيطة بعد دفع الزبون النهائي لفاتورة (الحالة الفعلية تتحدث عبر الـ webhook، مو من هنا)
router.get("/pay/success", (req, res) => {
  res.send("<h2>تم الدفع بنجاح ✅</h2><p>شكراً لك.</p>");
});
router.get("/pay/cancel", (req, res) => {
  res.send("<h2>تم إلغاء عملية الدفع</h2>");
});

// صفحات هبوط بعد إكمال (أو انقطاع) نموذج ربط الحساب البنكي — بدون تسجيل دخول، Stripe يفتحها مباشرة
router.get("/connect-bank/done", (req, res) => {
  res.send("<h2>تم ✅</h2><p>لو خلصت كل الخطوات، فواتيرك الجاية تروح مباشرة لحسابك البنكي. تقدر تسكر الصفحة والرجوع لواتساب.</p>");
});
router.get("/connect-bank/refresh", (req, res) => {
  res.send("<h2>انتهت صلاحية الرابط</h2><p>ارجع لواتساب واكتب أي رسالة لسند عشان يرسل لك رابط جديد.</p>");
});

// لما زبون نهائي يدفع فاتورة، نعلّمها مسددة وننبّه صاحب العمل على واتساب
async function handleInvoicePaid(invoiceId) {
  const invoice = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(invoiceId);
  if (!invoice || invoice.status === "paid") return;

  db.prepare(`UPDATE invoices SET status = 'paid', updated_at = strftime('%s','now') WHERE id = ?`).run(invoiceId);

  const link = db.prepare(`SELECT * FROM whatsapp_links WHERE user_id = ?`).get(invoice.user_id);
  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(invoice.user_id);
  if (link) {
    const msg = t(user ? user.preferred_language : "ar");
    await sendMessage(link.phone_number, msg.paymentReceived(invoice.customer_name || "-", invoice.amount, invoice.currency || ""));
  }
}

// لما تحويل بنكي فعلي يصل (أو يفشل) لحساب Connect الخاص بالحرفي — يوصلنا كـevent على حساب الحرفي
// نفسه، مو حساب المنصة، فنحتاج نربطه برقم واتسابه عن طريق stripe_connect_account_id
async function handleConnectedAccountEvent(event) {
  const connectedAccountId = event.account;
  if (!connectedAccountId) return;

  if (event.type === "account.updated") {
    db.prepare(`UPDATE users SET stripe_connect_charges_enabled = ? WHERE stripe_connect_account_id = ?`).run(
      event.data.object.charges_enabled ? 1 : 0,
      connectedAccountId
    );
    return;
  }

  if (event.type !== "payout.paid" && event.type !== "payout.failed") return;

  const user = db.prepare(`SELECT * FROM users WHERE stripe_connect_account_id = ?`).get(connectedAccountId);
  if (!user) return;

  const link = db.prepare(`SELECT * FROM whatsapp_links WHERE user_id = ?`).get(user.id);
  if (!link) return;

  const payout = event.data.object;
  const amount = (payout.amount / 100).toFixed(2);
  const currency = (payout.currency || "").toUpperCase();
  const msg = t(user.preferred_language);

  await sendMessage(link.phone_number, event.type === "payout.paid" ? msg.payoutArrived(amount, currency) : msg.payoutFailed(amount, currency));
}

// Webhook الرئيسي (Scoped "Your account") — يستقبل بس تأكيد دفع الفواتير الفردية. ما فيه أي حدث
// اشتراك لأنه ما فيه اشتراك بالنظام أصلاً — الدخل الوحيد عمولة PLATFORM_FEE_PERCENT لكل فاتورة مدفوعة.
router.post("/billing/webhook", express.raw({ type: "application/json" }), (req, res) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).send("Webhook not configured");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const obj = event.data.object;

  try {
    if (event.type === "checkout.session.completed" && obj.metadata && obj.metadata.sanad_invoice_id) {
      handleInvoicePaid(Number(obj.metadata.sanad_invoice_id)).catch((err) =>
        console.error("خطأ أثناء تحديث فاتورة مدفوعة:", err)
      );
    }
  } catch (err) {
    console.error("Error handling Stripe webhook:", err);
  }

  res.json({ received: true });
});

// Webhook منفصل مخصص لأحداث حسابات الحرفيين المرتبطة (Connect) — account.updated وpayout.paid/failed
// تصل هنا لأنها Scoped على "Connected accounts" بلوحة Stripe، مو "Your account" مثل الـwebhook أعلاه.
// راجع README لخطوات إنشاء هذا الـendpoint بلوحة Stripe.
router.post("/billing/webhook/connect", express.raw({ type: "application/json" }), (req, res) => {
  if (!stripe || !process.env.STRIPE_CONNECT_WEBHOOK_SECRET) {
    return res.status(500).send("Connect webhook not configured");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], process.env.STRIPE_CONNECT_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe Connect webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  handleConnectedAccountEvent(event).catch((err) => console.error("Error handling Stripe Connect webhook:", err));

  res.json({ received: true });
});

module.exports = router;
module.exports.buildInvoicePaymentUrl = buildInvoicePaymentUrl;
module.exports.buildConnectOnboardingUrl = buildConnectOnboardingUrl;
