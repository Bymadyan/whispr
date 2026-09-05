#!/usr/bin/env node

const twilio = require("twilio");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(accountSid, authToken);

async function testWhatsAppMessage() {
  try {
    console.log("\n" + "=".repeat(70));
    console.log("📱 اختبار إرسال رسالة WhatsApp - وضع الاختبار");
    console.log("=".repeat(70) + "\n");

    console.log("🔄 جاري إرسال رسالة اختبار...\n");

    // Use Twilio Sandbox number for testing
    const message = await client.messages.create({
      body: "✅ Hello! This is a test message from SanadPay. If you received this, WhatsApp integration is working!",
      from: "whatsapp:+14155238886", // Twilio Sandbox number
      to: "whatsapp:+971522121121" // Your number
    });

    console.log("✅ الرسالة أُرسلت بنجاح!\n");
    console.log(`Message SID: ${message.sid}`);
    console.log(`Status: ${message.status}`);
    console.log(`From: ${message.from}`);
    console.log(`To: ${message.to}`);
    console.log(`Body: ${message.body}\n`);

    console.log("=" .repeat(70));
    console.log("✨ النتيجة:");
    console.log("=" .repeat(70) + "\n");

    console.log("✅ اتصال WhatsApp يعمل!");
    console.log("📱 يجب أن تستقبل الرسالة على: +971522121121\n");

    console.log("⚠️  تنبيه مهم:");
    console.log("   - هذا اختبار من Twilio Sandbox");
    console.log("   - بدون تفعيل Sandbox من WhatsApp، قد لا تصل الرسالة");
    console.log("   - لتفعيل: أرسل 'join CD173D' إلى +14155238886\n");

    console.log("=" .repeat(70) + "\n");

  } catch (error) {
    console.error("\n❌ خطأ في الإرسال:");
    console.error(error.message);

    if (error.message.includes("Sandbox")) {
      console.log("\n💡 الحل:");
      console.log("   1. أرسل: join CD173D");
      console.log("   2. إلى: +14155238886");
      console.log("   3. من WhatsApp على رقمك: +971522121121\n");
    }
  }
}

// Run
testWhatsAppMessage();
