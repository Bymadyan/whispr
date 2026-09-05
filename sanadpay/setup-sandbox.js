#!/usr/bin/env node

const twilio = require("twilio");
const fetch = require("node-fetch");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(accountSid, authToken);

async function setupSandbox() {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("🔧 Twilio Sandbox Setup - جاري التفعيل...");
    console.log("=".repeat(60) + "\n");

    console.log("📱 البحث عن معلومات الـ WhatsApp Sandbox...\n");

    // Try to get messaging services
    const services = await client.messaging.v1.services.list({ limit: 10 });

    console.log(`✅ وجدت ${services.length} خدمة رسائل\n`);

    // Try to get incoming phone numbers
    const incomingNumbers = await client.incomingPhoneNumbers.list({ limit: 10 });

    console.log(`📞 أرقام الهاتف الموجودة: ${incomingNumbers.length}\n`);

    // Look for Twilio sandbox or WhatsApp numbers
    let sandboxFound = false;
    incomingNumbers.forEach(num => {
      console.log(`   - ${num.phoneNumber} (${num.friendlyName || "No name"})`);
      if (num.phoneNumber.includes("+1415")) {
        sandboxFound = true;
      }
    });

    // Try to access WhatsApp-specific data
    console.log("\n🔍 محاولة الوصول إلى بيانات WhatsApp...\n");

    // Get account info
    const account = await client.api.accounts(accountSid).fetch();
    console.log(`✅ حساب Twilio:`);
    console.log(`   Account SID: ${accountSid}`);
    console.log(`   Status: ${account.status}`);
    console.log(`   Type: ${account.type}\n`);

    // Try to find sandbox info via API
    console.log("🎯 محاولة الحصول على معلومات الـ Sandbox...\n");

    // Make direct API call to get sandbox info
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    try {
      // Try REST API endpoint for WhatsApp sandbox
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json?PageSize=1`,
        {
          method: "GET",
          headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded"
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("✅ اتصال API ناجح\n");
      }
    } catch (e) {
      console.log(`⚠️  Note: ${e.message}\n`);
    }

    // Display instructions
    console.log("=" .repeat(60));
    console.log("📝 معلومات مهمة:");
    console.log("=" .repeat(60) + "\n");

    console.log("✅ حسابك متصل بـ Twilio بنجاح!");
    console.log("✅ Twilio Auth معتمد!\n");

    console.log("⚠️  الخطوة التالية:");
    console.log("   من WhatsApp أرسل: join CD173D");
    console.log("   إلى: +14155238886\n");

    console.log("إذا ما اشتغل، استخدم هذا الأمر:");
    console.log("   node /home/user/whispr/sanadpay/get-sandbox-manual-setup.js\n");

    console.log("=" .repeat(60) + "\n");

  } catch (error) {
    console.error("\n❌ خطأ:", error.message);
    console.error("\nتفاصيل:", error);
  }
}

setupSandbox();
