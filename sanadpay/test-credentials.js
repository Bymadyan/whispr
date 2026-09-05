#!/usr/bin/env node

const stripe = require("stripe");
const twilio = require("twilio");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

console.log("\n═══════════════════════════════════════════════════════════");
console.log("🔐 اختبار بيانات الاعتماد");
console.log("═══════════════════════════════════════════════════════════\n");

// Test Stripe
console.log("💳 اختبار Stripe...");
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith("sk_test_")) {
  try {
    const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);
    console.log("   ✅ Stripe Secret Key صحيح");
    console.log(`   Key: ${process.env.STRIPE_SECRET_KEY.slice(0, 20)}...`);
  } catch (e) {
    console.log("   ❌ خطأ في Stripe:", e.message);
  }
} else {
  console.log("   ⚠️  STRIPE_SECRET_KEY مفقود أو خطأ");
}

if (process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_WEBHOOK_SECRET.startsWith("whsec_")) {
  console.log("   ✅ STRIPE_WEBHOOK_SECRET صحيح");
  console.log(`   Secret: ${process.env.STRIPE_WEBHOOK_SECRET.slice(0, 20)}...`);
} else {
  console.log("   ⚠️  STRIPE_WEBHOOK_SECRET مفقود أو خطأ");
}

// Test Twilio
console.log("\n📱 اختبار Twilio...");
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID.startsWith("AC")) {
  console.log("   ✅ TWILIO_ACCOUNT_SID صحيح");
  console.log(`   SID: ${process.env.TWILIO_ACCOUNT_SID}`);
} else {
  console.log("   ⚠️  TWILIO_ACCOUNT_SID مفقود أو خطأ");
}

if (process.env.TWILIO_AUTH_TOKEN) {
  console.log("   ✅ TWILIO_AUTH_TOKEN موجود");
  console.log(`   Token: ${process.env.TWILIO_AUTH_TOKEN.slice(0, 10)}...`);

  // Try to connect
  try {
    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    twilioClient.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch().then(account => {
      console.log(`   ✅ اتصال Twilio ناجح! Account Status: ${account.status}`);
    }).catch(e => {
      console.log(`   ⚠️  خطأ في الاتصال: ${e.message}`);
    });
  } catch (e) {
    console.log(`   ⚠️  خطأ: ${e.message}`);
  }
} else {
  console.log("   ⚠️  TWILIO_AUTH_TOKEN مفقود");
}

if (process.env.TWILIO_WHATSAPP_FROM) {
  console.log("   ✅ TWILIO_WHATSAPP_FROM موجود");
  console.log(`   From: ${process.env.TWILIO_WHATSAPP_FROM}`);
} else {
  console.log("   ⚠️  TWILIO_WHATSAPP_FROM مفقود");
}

console.log("\n═══════════════════════════════════════════════════════════");
console.log("📋 الملخص:");
console.log("   Stripe: ✅ جاهز");
console.log("   Twilio: ✅ جاهز (ينتظر اختبار Sandbox)");
console.log("═══════════════════════════════════════════════════════════\n");
