#!/usr/bin/env node

const twilio = require("twilio");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(accountSid, authToken);

async function getSandboxInfo() {
  try {
    console.log("\n🔍 جاري البحث عن معلومات Sandbox...\n");

    // Get Messaging Services
    const services = await client.messaging.v1.services.list({ limit: 10 });

    console.log("📋 خدمات الرسائل المتاحة:\n");
    let found = false;

    for (const service of services) {
      console.log(`Service: ${service.friendlyName}`);
      console.log(`SID: ${service.sid}`);
      console.log(`---`);

      // Get phone numbers in this service
      const phoneNumbers = await client.messaging.v1
        .services(service.sid)
        .phoneNumbers.list({ limit: 10 });

      if (phoneNumbers.length > 0) {
        console.log(`Phone Numbers: ${phoneNumbers.length} found`);
        phoneNumbers.forEach(pn => {
          console.log(`  - ${pn.phoneNumber}`);
        });
      }
    }

    // Try to get WhatsApp-specific info
    console.log("\n📱 معلومات WhatsApp Sandbox:\n");

    try {
      // Query incoming phone numbers
      const incomingPhoneNumbers = await client.incomingPhoneNumbers.list({ limit: 5 });

      console.log(`إجمالي أرقام الهاتف: ${incomingPhoneNumbers.length}`);

      incomingPhoneNumbers.forEach(num => {
        if (num.phoneNumber.includes("+1415")) {
          console.log(`\n✅ Twilio Sandbox Number Found:`);
          console.log(`   Number: ${num.phoneNumber}`);
          console.log(`   SID: ${num.sid}`);
          console.log(`   Friendly Name: ${num.friendlyName || "N/A"}`);
        }
      });
    } catch (e) {
      console.log(`Note: ${e.message}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("📝 الخطوات المطلوبة:\n");
    console.log("1. اذهب إلى Twilio Console:");
    console.log("   https://console.twilio.com/develop/sms/try-it-out/whatsapp\n");

    console.log("2. ستجد:");
    console.log("   - رقم Sandbox: مثل +14155238886");
    console.log("   - اسم الـ Sandbox: مثل CD173D أو whatsapp-sandbox\n");

    console.log("3. من WhatsApp، أرسل رسالة:\n");
    console.log("   إلى: +14155238886");
    console.log("   النص: join <sandbox-name>\n");
    console.log("   مثال: join CD173D\n");

    console.log("4. اتظر الرد من Twilio:");
    console.log("   ✅ Sandbox membership active for 72 hours\n");

    console.log("5. بعدها جرب الفاتورة على:");
    console.log("   http://localhost:3000\n");
    console.log("=".repeat(60) + "\n");

  } catch (error) {
    console.error("\n❌ خطأ:", error.message);
    console.log("\n💡 تأكد من:");
    console.log("   - Twilio Auth Token صحيح");
    console.log("   - لديك اتصال إنترنت");
  }
}

getSandboxInfo();
