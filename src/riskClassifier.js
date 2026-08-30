// يقرر هل تقييم معين "آمن" بما يكفي للنشر التلقائي، أو لازم يتحول لمراجعة بشرية.
// نتعمد التحفظ: أي شك يرجّح كفة المراجعة اليدوية، لأن رد منشور بالخطأ ضرر دائم وعلني.

const RISK_KEYWORDS = [
  // عربي
  "سيء", "سيئ", "سيئة", "أسوأ", "مشكلة", "مشاكل", "خدمة سيئة", "لن أعود",
  "لا أنصح", "ما أنصح", "بطيء", "وسخ", "قذر", "غالي", "استرجاع", "شكوى",
  "احتيال", "خطأ", "لكن", "للأسف", "خيبة", "مقرف", "تجنبوا", "زعلان",
  "غاضب", "رديء", "مخيب", "فاشل", "كذب", "خدعوني",
  // English
  "bad", "worst", "problem", "issue", "disappointed", "disappointing",
  "never again", "don't recommend", "not recommend", "slow", "dirty",
  "rude", "refund", "complaint", "scam", "mistake", "but ", "however",
  "unfortunately", "poor", "terrible", "awful", "horrible",
];

// customKeywords: نص خام من إعدادات النشاط التجاري، كلمات مفصولة بفواصل
function parseCustomKeywords(customKeywords) {
  if (!customKeywords) return [];
  return customKeywords
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);
}

function containsRiskKeyword(text, customKeywords) {
  if (!text) return false;
  const lower = text.toLowerCase();
  const allKeywords = RISK_KEYWORDS.concat(parseCustomKeywords(customKeywords));
  return allKeywords.some((word) => lower.includes(word.toLowerCase()));
}

// آمن للنشر التلقائي فقط لو: 4 نجوم فأعلى، وما فيه أي إشارة سلبية بالتعليق (بما فيها كلمات المستخدم الخاصة)
function isLowRisk({ starRating, comment, customKeywords }) {
  if (starRating < 4) return false;
  if (containsRiskKeyword(comment, customKeywords)) return false;
  return true;
}

module.exports = { isLowRisk, containsRiskKeyword };
