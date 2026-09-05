#!/usr/bin/env node

const twilio = require("twilio");
const dotenv = require("dotenv");
const path = require("path");

// Load .env
dotenv.config({ path: path.join(__dirname, ".env") });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.error("❌ خطأ: TWILIO_ACCOUNT_SID أو TWILIO_AUTH_TOKEN غير مضبوطة في .env");
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function getSandboxInfo() {
  try {
    console.log("🔍 جاري البحث عن معلومات الـ Sandbox...\n");

    // Get account info
    const account = await client.api.accounts(accountSid).fetch();
    console.log("✅ حساب Twilio متصل:");
    console.log(`   Account SID: ${accountSid}`);
    console.log(`   Account Status: ${account.status}`);
    console.log(`   Account Type: ${account.type}`);

    // Check Messaging services
    console.log("\n📱 جاري البحث عن خدمات الرسائل...\n");

    try {
      const services = await client.messaging.v1.services.list({ limit: 5 });
      console.log(`✅ وجدت ${services.length} خدمة رسائل:`);
      services.forEach(service => {
        console.log(`   - ${service.friendlyName} (${service.sid})`);
      });
    } catch (e) {
      console.log("   (لا توجد خدمات رسائل إضافية)");
    }

    // Try to get WhatsApp Sandbox info via API
    console.log("\n📋 معلومات Twilio Sandbox:\n");
    console.log("⚠️  الوضع الحالي:");
    console.log("   - Sandbox membership انتهى (72 ساعة مرت)");
    console.log("   - لازم تعيد تفعيل الـ Sandbox\n");

    console.log("🔧 الحل السريع - اتبع هذه الخطوات:\n");
    console.log("1️⃣  اذهب إلى: https://console.twilio.com/develop/sms/try-it-out/whatsapp");
    console.log("2️⃣  ستشوف رقم Twilio Sandbox (مثل: +14155238886)");
    console.log("3️⃣  اسم الـ Sandbox (مثل: whatsapp-sandbox)");
    console.log("4️⃣  افتح WhatsApp على الهاتف");
    console.log("5️⃣  أرسل رسالة نصية:");
    console.log("   >>> join <sandbox-name>");
    console.log("   (مثلاً: join CD173D)\n");
    console.log("6️⃣  Twilio سيرد بتأكيد الانضمام (72 ساعة جديدة)");
    console.log("7️⃣  بعدها تقدر تختبر التطبيق!\n");

    // Direct Twilio Console link
    console.log("🔗 الروابط المهمة:");
    console.log(`   - Twilio Console: https://console.twilio.com/develop/sms/try-it-out/whatsapp`);
    console.log(`   - Twilio Dashboard: https://console.twilio.com/account`);
    console.log(`   - Account SID: ${accountSid}\n`);

  } catch (error) {
    console.error("❌ خطأ عند الاتصال بـ Twilio API:");
    console.error(error.message);
    console.error("\n💡 تحقق من:");
    console.error("   - TWILIO_ACCOUNT_SID صحيح في .env");
    console.error("   - TWILIO_AUTH_TOKEN صحيح في .env");
    console.error("   - الاتصال بالإنترنت يعمل");
    process.exit(1);
  }
}

// Run
console.log("═══════════════════════════════════════════════════════════\n");
console.log("🎯 Twilio Sandbox - أداة إعادة التفعيل\n");
console.log("═══════════════════════════════════════════════════════════\n");

getSandboxInfo().then(() => {
  console.log("═══════════════════════════════════════════════════════════\n");
  console.log("✨ بعد ما تكمل الخطوات أعلاه:");
  console.log("   npm run dev  →  ثم جرب من http://localhost:3000\n");
  console.log("═══════════════════════════════════════════════════════════");
});
