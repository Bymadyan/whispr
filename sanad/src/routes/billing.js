const express = require("express");
const router = express.Router();
const db = require("../db");
const stripe = require("../stripeClient");
const { requireAuth } = require("../middleware");
const { normalizeCurrency, PLATFORM_FEE_PERCENT } = require("../config");
const { sendMessage } = require("../whatsapp");

function baseUrl() {
  return process.env.APP_BASE_URL || "http://localhost:3000";
}

function getOrCreateStripeCustomer(user) {
  let sub = db.prepare(`SELECT * FROM subscriptions WHERE user_id = ?`).get(user.id);
  if (sub && sub.stripe_customer_id) return sub.stripe_customer_id;

  return stripe
    .customers.create({
      email: user.email || undefined,
      name: user.business_name || "عميل سند",
      metadata: { sanad_user_id: String(user.id) },
    })
    .then((customer) => {
      db.prepare(`UPDATE subscriptions SET stripe_customer_id = ?, updated_at = strftime('%s','now') WHERE user_id = ?`).run(
        customer.id,
        user.id
      );
      return customer.id;
    });
}

// يبني رابط دفع اشتراك جاهز — يُستخدم من صفحة الويب ومن رسالة واتساب نفسها بعد نفاد التجربة المجانية
async function buildSubscriptionCheckoutUrl(user) {
  if (!stripe || !process.env.STRIPE_PRICE_ID) return null;

  const customerId = await getOrCreateStripeCustomer(user);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${baseUrl()}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl()}/billing`,
    metadata: { sanad_user_id: String(user.id) },
    subscription_data: { metadata: { sanad_user_id: String(user.id) } },
  });

  return session.url;
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

router.get("/billing", requireAuth, (req, res) => {
  const sub = db.prepare(`SELECT * FROM subscriptions WHERE user_id = ?`).get(req.user.id);
  res.render("billing", { sub, stripeConfigured: !!stripe });
});

router.post("/billing/checkout", requireAuth, async (req, res, next) => {
  try {
    if (!stripe || !process.env.STRIPE_PRICE_ID) {
      return res.status(500).send("نظام الدفع غير مفعّل بعد (STRIPE_SECRET_KEY / STRIPE_PRICE_ID غير مضبوطة)");
    }
    const url = await buildSubscriptionCheckoutUrl(req.user);
    res.redirect(url);
  } catch (err) {
    next(err);
  }
});

router.get("/billing/success", requireAuth, async (req, res, next) => {
  try {
    if (!stripe || !req.query.session_id) return res.redirect("/billing");

    const session = await stripe.checkout.sessions.retrieve(req.query.session_id, {
      expand: ["subscription"],
    });

    if (session.subscription) {
      upsertSubscriptionFromStripe(req.user.id, session.customer, session.subscription);
    }

    res.redirect("/dashboard");
  } catch (err) {
    next(err);
  }
});

router.post("/billing/portal", requireAuth, async (req, res, next) => {
  try {
    const sub = db.prepare(`SELECT * FROM subscriptions WHERE user_id = ?`).get(req.user.id);
    if (!stripe || !sub || !sub.stripe_customer_id) return res.redirect("/billing");

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${baseUrl()}/billing`,
    });
    res.redirect(portalSession.url);
  } catch (err) {
    next(err);
  }
});

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

function upsertSubscriptionFromStripe(userId, customerId, subscription) {
  db.prepare(
    `UPDATE subscriptions
     SET stripe_customer_id = ?, stripe_subscription_id = ?, status = ?, current_period_end = ?, updated_at = strftime('%s','now')
     WHERE user_id = ?`
  ).run(customerId, subscription.id, subscription.status, subscription.current_period_end || null, userId);
}

// لما زبون نهائي يدفع فاتورة، نعلّمها مسددة وننبّه صاحب العمل على واتساب
async function handleInvoicePaid(invoiceId) {
  const invoice = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(invoiceId);
  if (!invoice || invoice.status === "paid") return;

  db.prepare(`UPDATE invoices SET status = 'paid', updated_at = strftime('%s','now') WHERE id = ?`).run(invoiceId);

  const link = db.prepare(`SELECT * FROM whatsapp_links WHERE user_id = ?`).get(invoice.user_id);
  if (link) {
    const who = invoice.customer_name || "الزبون";
    await sendMessage(link.phone_number, `💰 استلمت دفعة! ${who} دفع فاتورة بمبلغ ${invoice.amount} ${invoice.currency || ""}`.trim());
  }
}

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
    if (event.type === "account.updated") {
      db.prepare(`UPDATE users SET stripe_connect_charges_enabled = ? WHERE stripe_connect_account_id = ?`).run(
        obj.charges_enabled ? 1 : 0,
        obj.id
      );
    } else if (event.type === "checkout.session.completed" && obj.metadata && obj.metadata.sanad_invoice_id) {
      handleInvoicePaid(Number(obj.metadata.sanad_invoice_id)).catch((err) =>
        console.error("خطأ أثناء تحديث فاتورة مدفوعة:", err)
      );
    } else if (event.type === "checkout.session.completed" && obj.subscription) {
      const userId = Number(obj.metadata && obj.metadata.sanad_user_id);
      if (userId) {
        stripe.subscriptions.retrieve(obj.subscription).then((sub) => {
          upsertSubscriptionFromStripe(userId, obj.customer, sub);
        });
      }
    } else if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.deleted"
    ) {
      const userId = Number(obj.metadata && obj.metadata.sanad_user_id);
      if (userId) {
        upsertSubscriptionFromStripe(userId, obj.customer, obj);
      } else {
        db.prepare(
          `UPDATE subscriptions SET status = ?, current_period_end = ?, stripe_subscription_id = ?, updated_at = strftime('%s','now') WHERE stripe_customer_id = ?`
        ).run(obj.status, obj.current_period_end || null, obj.id, obj.customer);
      }
    }
  } catch (err) {
    console.error("Error handling Stripe webhook:", err);
  }

  res.json({ received: true });
});

module.exports = router;
module.exports.buildSubscriptionCheckoutUrl = buildSubscriptionCheckoutUrl;
module.exports.buildInvoicePaymentUrl = buildInvoicePaymentUrl;
module.exports.buildConnectOnboardingUrl = buildConnectOnboardingUrl;
