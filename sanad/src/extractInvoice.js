// يحوّل نص حر (مفرّغ من رسالة صوتية أو مكتوب مباشرة) إلى بيانات فاتورة منظّمة.
// يستخدم Claude لو متوفر مفتاح، وإلا يرجع لاستخراج بدائي جداً (يمسك أول رقم كمبلغ فقط).

function naiveExtract(text) {
  const amountMatch = (text || "").match(/(\d+(\.\d+)?)/);
  return {
    customer_name: null,
    customer_phone: null,
    description: (text || "").trim(),
    amount: amountMatch ? Number(amountMatch[1]) : null,
    currency: null,
  };
}

async function claudeExtract(text) {
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const system = `أنت تستخرج بيانات فاتورة من رسالة صوتية مفرّغة لحرفي أو صاحب خدمة يوصف شغلة سواها لزبون.
النص عادة عامي وغير منظم. استخرج منه:
- customer_name: اسم الزبون لو مذكور، وإلا null
- customer_phone: رقم جوال الزبون لو مذكور، وإلا null
- description: وصف مختصر وواضح للشغلة/الخدمة المقدّمة
- amount: المبلغ المطلوب كرقم فقط (بدون عملة أو رموز)، وإلا null لو مو واضح
- currency: رمز العملة لو مذكور (مثل SAR, AED, USD, EGP...)، وإلا null

رجّع JSON فقط بدون أي نص إضافي، بهذا الشكل بالضبط:
{"customer_name": "...", "customer_phone": "...", "description": "...", "amount": 000, "currency": "..."}`;

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system,
    messages: [{ role: "user", content: text }],
  });

  const textBlock = msg.content.find((b) => b.type === "text");
  const raw = textBlock && textBlock.text.trim();
  if (!raw) throw new Error("Claude رجّع رد فاضي");

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("رد Claude ما فيه JSON صالح");

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    customer_name: parsed.customer_name || null,
    customer_phone: parsed.customer_phone || null,
    description: parsed.description || text,
    amount: typeof parsed.amount === "number" ? parsed.amount : null,
    currency: parsed.currency || null,
  };
}

async function extractInvoice(text) {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await claudeExtract(text);
    } catch (err) {
      console.error("فشل الاستخراج عبر Claude، رجعنا للاستخراج البسيط:", err.message);
    }
  }
  return naiveExtract(text);
}

module.exports = { extractInvoice };
