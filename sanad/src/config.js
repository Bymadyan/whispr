// عدد الفواتير (مع رابط الدفع) المجانية قبل ما نطلب اشتراك
const FREE_INVOICE_LIMIT = 3;

// نسبة عمولة المنصة الوحيدة (شاملة كل شي) من كل فاتورة تُدفع فعلياً عبر رابط الدفع — تُخصم تلقائياً
// وقت التحويل لحساب الحرفي عبر Stripe Connect. هذي النسبة "all-inclusive": المنصة تتحمل من داخلها
// رسوم معالجة Stripe لكل عملية (~2.9%+0.30$) ورسوم السحب البنكي (2$/شهر + 0.25%+0.25$ لكل سحبة)،
// عشان الحرفي ما يشوف إلا خصم واحد نظيف بنفس الرقم المعلن له — بدون أي رسوم "مخفية" إضافية تظهر
// له لاحقاً بحساب Stripe الخاص فيه. لا تنزّلها تحت ~3.5-4% وإلا تصير خاسرة على الفواتير الصغيرة.
const PLATFORM_FEE_PERCENT = 4;

// خريطة بسيطة لتطبيع العملة اللي يذكرها Claude (نص حر) إلى كود ISO يقبله Stripe
const CURRENCY_ALIASES = {
  "ريال": "sar",
  "ريال سعودي": "sar",
  "sar": "sar",
  "sr": "sar",
  "درهم": "aed",
  "aed": "aed",
  "دينار": "kwd",
  "kwd": "kwd",
  "جنيه": "egp",
  "egp": "egp",
  "دولار": "usd",
  "usd": "usd",
  "$": "usd",
};

function normalizeCurrency(raw) {
  if (!raw) return (process.env.DEFAULT_CURRENCY || "usd").toLowerCase();
  const key = String(raw).trim().toLowerCase();
  return CURRENCY_ALIASES[key] || (process.env.DEFAULT_CURRENCY || "usd").toLowerCase();
}

module.exports = { FREE_INVOICE_LIMIT, PLATFORM_FEE_PERCENT, normalizeCurrency };
