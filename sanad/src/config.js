// عدد الفواتير (مع رابط الدفع) المجانية قبل ما نطلب اشتراك
const FREE_INVOICE_LIMIT = 3;

// نسبة عمولة المنصة من كل فاتورة تُدفع فعلياً عبر رابط الدفع (تُخصم تلقائياً وقت التحويل لحساب
// الحرفي عبر Stripe Connect — ما تنطبق إلا لما تكون الفاتورة رايحة لحساب حرفي مربوط)
const PLATFORM_FEE_PERCENT = 2;

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
