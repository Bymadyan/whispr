const twilio = require("twilio");

let client = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

// يرسل رسالة واتساب لرقم معيّن. `to` بصيغة "whatsapp:+9665xxxxxxxx"
async function sendMessage(to, body) {
  if (!client || !process.env.TWILIO_WHATSAPP_FROM) {
    console.warn("Twilio غير مضبوط — تم تجاهل إرسال رسالة واتساب:", body);
    return;
  }
  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to,
    body,
  });
}

// يحمّل ملف الوسائط (مثل رسالة صوتية) من رابط Twilio باستخدام مصادقة الحساب
async function downloadMedia(mediaUrl) {
  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const res = await fetch(mediaUrl, { headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) throw new Error(`فشل تحميل ملف الوسائط من Twilio: ${res.status}`);
  const contentType = res.headers.get("content-type") || "audio/ogg";
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType };
}

module.exports = { client, sendMessage, downloadMedia };
