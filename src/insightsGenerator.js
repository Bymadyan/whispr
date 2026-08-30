// يحلل التقييمات السلبية/المتوسطة الأخيرة ويطلع أهم الأنماط المتكررة (شكاوى تتكرر)،
// عشان صاحب النشاط يعرف بالضبط وش يصلح بمشروعه بدل ما يقرأ كل تقييم بنفسه.
// يستخدم Claude لو مفعّل، وإلا يرجع لعدّ تكرار الكلمات (نفس قائمة كلمات الخطر) كبديل بدون تكلفة.

const { RISK_KEYWORDS, parseCustomKeywords } = require("./riskClassifier");

const MIN_REVIEWS_FOR_INSIGHT = 3;

function keywordFrequencyInsight(reviews, customKeywords) {
  const allKeywords = RISK_KEYWORDS.concat(parseCustomKeywords(customKeywords));

  const counts = {};
  for (const r of reviews) {
    if (!r.comment) continue;
    const lower = r.comment.toLowerCase();
    for (const kw of allKeywords) {
      if (lower.includes(kw.toLowerCase())) {
        counts[kw] = (counts[kw] || 0) + 1;
      }
    }
  }

  const sorted = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (!sorted.length) {
    return "ما لقينا نمط واضح متكرر بالتقييمات الأخيرة — الشكاوى متنوعة وغير مركّزة على سبب واحد.";
  }

  return sorted
    .map(([kw, count]) => `• "${kw}" — ذُكرت في ${count} ${count === 1 ? "تقييم" : "تقييمات"}`)
    .join("\n");
}

async function claudeInsight(reviews, businessName) {
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const reviewsText = reviews
    .map((r) => `- (${r.star_rating} نجوم) ${r.comment}`)
    .join("\n");

  const system = `أنت محلل أعمال تساعد صاحب نشاط تجاري اسمه "${businessName}" يفهم تقييمات عملائه السلبية والمتوسطة.
اقرأ التقييمات المعطاة واستخرج أهم 3 إلى 5 أنماط أو أسباب شكوى متكررة فعلاً (مو كل شكوى فردية، بس اللي تكررت).
لكل نمط اكتب سطر واحد بالعربي بالصيغة: "• [وصف السبب] — ذُكر في X تقييمات تقريباً"
لو ما فيه نمط واضح متكرر، قول هذا صراحة بجملة وحدة.
لا تكتب مقدمة ولا خاتمة، بس النقاط مباشرة.`;

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system,
    messages: [{ role: "user", content: reviewsText }],
  });

  const textBlock = msg.content.find((b) => b.type === "text");
  const text = textBlock && textBlock.text.trim();
  if (!text) throw new Error("Claude returned empty insight");
  return text;
}

// يرجع { summary, source } أو null لو ما فيه بيانات كافية
async function generateInsights({ businessName, reviews, customKeywords }) {
  const negativeOrNeutral = reviews.filter((r) => r.star_rating <= 3 && r.comment);

  if (negativeOrNeutral.length < MIN_REVIEWS_FOR_INSIGHT) {
    return {
      summary: `ما فيه بيانات كافية للتحليل بعد (نحتاج ${MIN_REVIEWS_FOR_INSIGHT} تقييمات سلبية/متوسطة فيها تعليق على الأقل).`,
      source: "insufficient_data",
    };
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const summary = await claudeInsight(negativeOrNeutral, businessName);
      return { summary, source: "claude" };
    } catch (err) {
      console.error("Claude insight generation failed, falling back to keyword frequency:", err.message);
    }
  }

  return { summary: keywordFrequencyInsight(negativeOrNeutral, customKeywords), source: "keywords" };
}

module.exports = { generateInsights };
