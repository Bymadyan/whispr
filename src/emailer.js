// إشعار بريدي بسيط لما توصل تقييمات جديدة تحتاج مراجعة يدوية.
// اختياري بالكامل: لو ما فيه RESEND_API_KEY بالإعدادات، ما يصير أي شي (بدون أي تكلفة أو خطأ).
// يستخدم Resend عبر REST API مباشرة (بدون SDK إضافي) — https://resend.com

async function notifyNewReviews({ toEmail, businessName, count }) {
  if (!process.env.RESEND_API_KEY) return;

  const fromEmail = process.env.RESEND_FROM_EMAIL || "Whispr <onboarding@resend.dev>";
  const subject = count === 1 ? "تقييم جديد يحتاج ردك على Whispr" : `${count} تقييمات جديدة تحتاج ردك على Whispr`;

  const html = `
    <div dir="rtl" style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>مرحباً ${businessName || ""} 👋</h2>
      <p>وصلك <strong>${count}</strong> ${count === 1 ? "تقييم جديد" : "تقييمات جديدة"} على Google يحتاج مراجعتك قبل النشر.</p>
      <p>الأداة جهزت مسودة رد جاهزة لكل وحدة — بس تحتاج تراجعها وتضغط نشر.</p>
      <p><a href="${process.env.APP_BASE_URL || ""}/dashboard" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">افتح لوحة التحكم</a></p>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

module.exports = { notifyNewReviews };
