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

function containsRiskKeyword(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return RISK_KEYWORDS.some((word) => lower.includes(word.toLowerCase()));
}

// آمن للنشر التلقائي فقط لو: 4 نجوم فأعلى، وما فيه أي إشارة سلبية بالتعليق
function isLowRisk({ starRating, comment }) {
  if (starRating < 4) return false;
  if (containsRiskKeyword(comment)) return false;
  return true;
}

module.exports = { isLowRisk, containsRiskKeyword };
