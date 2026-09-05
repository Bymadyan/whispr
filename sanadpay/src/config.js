// نسبة عمولة المنصة الوحيدة (شاملة كل شي) — الدخل الوحيد للمنصة، ما فيه اشتراك ولا تجربة مجانية
// محدودة، الاستخدام مجاني بالكامل. تُخصم تلقائياً من كل فاتورة تُدفع فعلياً عبر رابط الدفع وقت
// التحويل لحساب الحرفي عبر Stripe Connect (0% لو ما فيه دفع أصلاً). هذي النسبة "all-inclusive":
// المنصة تتحمل من داخلها رسوم معالجة Stripe لكل عملية (~2.9%+0.30$) ورسوم السحب البنكي (2$/شهر +
// 0.25%+0.25$ لكل سحبة)، عشان الحرفي ما يشوف إلا خصم واحد نظيف بنفس الرقم المعلن له. لا تنزّلها
// تحت ~3.5-4% وإلا تصير خاسرة على الفواتير الصغيرة (راجع README لتفاصيل صافي الربح بالضبط).
const PLATFORM_FEE_PERCENT = 5;

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

module.exports = { PLATFORM_FEE_PERCENT, normalizeCurrency };
