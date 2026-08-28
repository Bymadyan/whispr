const express = require("express");
const router = express.Router();
const db = require("../db");
const stripe = require("../stripeClient");
const { requireAuth } = require("../middleware");

function baseUrl(req) {
  return process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
}

router.get("/billing", requireAuth, (req, res) => {
  const sub = db.prepare(`SELECT * FROM subscriptions WHERE user_id = ?`).get(req.user.id);
  res.render("billing", { sub, stripeConfigured: !!stripe });
});

// ينشئ جلسة دفع اشتراك شهري 35$ ويحوّل العميل لصفحة الدفع المستضافة على Stripe
router.post("/billing/checkout", requireAuth, async (req, res, next) => {
  try {
    if (!stripe || !process.env.STRIPE_PRICE_ID) {
      return res.status(500).send("نظام الدفع غير مفعّل بعد (STRIPE_SECRET_KEY / STRIPE_PRICE_ID غير مضبوطة)");
    }

    let sub = db.prepare(`SELECT * FROM subscriptions WHERE user_id = ?`).get(req.user.id);

    let customerId = sub && sub.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.business_name,
        metadata: { whispr_user_id: String(req.user.id) },
      });
      customerId = customer.id;
      db.prepare(`UPDATE subscriptions SET stripe_customer_id = ?, updated_at = strftime('%s','now') WHERE user_id = ?`).run(
        customerId,
        req.user.id
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${baseUrl(req)}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl(req)}/billing`,
      metadata: { whispr_user_id: String(req.user.id) },
      subscription_data: { metadata: { whispr_user_id: String(req.user.id) } },
    });

    res.redirect(session.url);
  } catch (err) {
    next(err);
  }
});

// نجيب حالة الاشتراك فوراً بعد رجوع العميل من Stripe (بدون الاعتماد فقط على الـ webhook اللي قد يتأخر ثوانٍ)
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

// بوابة إدارة الاشتراك المستضافة من Stripe (تغيير بطاقة، إلغاء الاشتراك، فواتير سابقة)
router.post("/billing/portal", requireAuth, async (req, res, next) => {
  try {
    const sub = db.prepare(`SELECT * FROM subscriptions WHERE user_id = ?`).get(req.user.id);
    if (!stripe || !sub || !sub.stripe_customer_id) return res.redirect("/billing");

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${baseUrl(req)}/billing`,
    });
    res.redirect(portalSession.url);
  } catch (err) {
    next(err);
  }
});

function upsertSubscriptionFromStripe(userId, customerId, subscription) {
  db.prepare(
    `UPDATE subscriptions
     SET stripe_customer_id = ?, stripe_subscription_id = ?, status = ?, current_period_end = ?, updated_at = strftime('%s','now')
     WHERE user_id = ?`
  ).run(
    customerId,
    subscription.id,
    subscription.status,
    subscription.current_period_end || null,
    userId
  );
}

// Stripe يستدعي هذا الرابط مباشرة (لا يمر عبر جلسة تسجيل الدخول) — يحتاج body خام للتحقق من التوقيع
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
    if (event.type === "checkout.session.completed" && obj.subscription) {
      const userId = Number(obj.metadata && obj.metadata.whispr_user_id);
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
      const userId = Number(obj.metadata && obj.metadata.whispr_user_id);
      if (userId) {
        upsertSubscriptionFromStripe(userId, obj.customer, obj);
      } else {
        // احتياطي لو ماكو metadata على الاشتراك نفسه، نطابق عن طريق stripe_customer_id
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
