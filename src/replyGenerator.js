// يولّد رد مقترح لتقييم واحد. يحاول استخدام Claude إذا كان في ANTHROPIC_API_KEY،
// وإلا يرجع لقوالب جاهزة عربي/إنجليزي حسب لغة التقييم. النتيجة دايماً "مسودة" فقط.

function isArabic(text) {
  return /[؀-ۿ]/.test(text || "");
}

function ratingBucket(stars) {
  if (stars >= 4) return "positive";
  if (stars === 3) return "neutral";
  return "negative";
}

function templateReply({ businessName, starRating, comment }) {
  const ar = isArabic(comment) || !comment;
  const bucket = ratingBucket(starRating || 5);
  const name = businessName || (ar ? "فريقنا" : "our team");

  const templates = {
    positive: {
      ar: `شكراً جزيلاً لك على تقييمك الرائع لـ ${name}! يسعدنا جداً إنك استمتعت بتجربتك معنا، ونتطلع لخدمتك مرة ثانية قريباً. 🙏`,
      en: `Thank you so much for your kind review of ${name}! We're thrilled you had a great experience, and we look forward to welcoming you back soon.`,
    },
    neutral: {
      ar: `شكراً لك على وقتك ومشاركة رأيك عن ${name}. نقدّر ملاحظاتك وراح نشتغل على تحسين تجربتك في زيارتك القادمة. لو عندك أي تفاصيل إضافية تحب تشاركنا فيها، يسعدنا نسمعها.`,
      en: `Thank you for taking the time to share your feedback about ${name}. We appreciate your comments and will work on improving your experience next time. Feel free to share more details with us anytime.`,
    },
    negative: {
      ar: `نعتذر بشدة عن التجربة اللي مرّيت فيها مع ${name}، وهذا مو المستوى اللي نطمح نقدمه لعملائنا. نأخذ ملاحظتك بكل جدية ونحب نتواصل معك لحل الموضوع. نتمنى تعطينا فرصة ثانية لتصحيح الأمر.`,
      en: `We sincerely apologize for the experience you had with ${name} — this isn't the standard we aim for. We take your feedback seriously and would love the chance to make this right. Please feel free to reach out to us directly.`,
    },
  };

  return templates[bucket][ar ? "ar" : "en"];
}

async function claudeReply({ businessName, starRating, comment, reviewerName }) {
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const system = `أنت تكتب مسودة رد على تقييم عميل على Google Business Profile نيابة عن صاحب النشاط التجاري "${businessName}".
اكتب رد قصير (2-4 جمل)، بنفس لغة التقييم (عربي أو إنجليزي)، بأسلوب إنساني ومحترف وليس رسمياً جداً.
لو التقييم 4 أو 5 نجوم: اشكر العميل بحرارة واذكر تفصيل من تقييمه لو موجود.
لو التقييم 3 نجوم: اشكره واعترف بالملاحظة بدون مبالغة في الاعتذار.
لو التقييم 1 أو 2: اعتذر بصدق ومهنية، بدون تبرير مفرط، واعرض حل المشكلة خارج المنصة إذا أمكن.
لا تخترع تفاصيل غير موجودة في التقييم. لا تضع اسم صاحب الرد أو توقيع. رجّع نص الرد فقط بدون أي شرح إضافي.`;

  const userMsg = `اسم المراجع: ${reviewerName || "غير معروف"}
عدد النجوم: ${starRating}
نص التقييم: ${comment || "(بدون نص، تقييم بالنجوم فقط)"}`;

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system,
    messages: [{ role: "user", content: userMsg }],
  });

  const textBlock = msg.content.find((b) => b.type === "text");
  const text = textBlock && textBlock.text.trim();
  if (!text) throw new Error("Claude returned empty reply");
  return text;
}

async function generateDraftReply(review) {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const text = await claudeReply(review);
      return { text, generatedBy: "claude" };
    } catch (err) {
      console.error("Claude generation failed, falling back to template:", err.message);
    }
  }
  return { text: templateReply(review), generatedBy: "template" };
}

module.exports = { generateDraftReply };
