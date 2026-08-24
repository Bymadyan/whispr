// تذكير دوري بسيط: كل ساعة، يبعت لصاحب العمل (مو للزبون) تذكير بالفواتير اللي لسه ما انسددت
// من أكثر من 3 أيام وما أُرسل تذكير عنها من قبل. يحتاج قالب رسالة معتمد من واتساب لو مرّ أكثر
// من 24 ساعة على آخر رسالة من صاحب العمل (راجع تنبيه README).

const db = require("./db");
const { sendMessage } = require("./whatsapp");

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // كل ساعة
const REMINDER_AFTER_DAYS = 3;

async function checkAndSendReminders() {
  const cutoff = Math.floor(Date.now() / 1000) - REMINDER_AFTER_DAYS * 24 * 60 * 60;

  const dueInvoices = db
    .prepare(
      `SELECT i.*, w.phone_number
       FROM invoices i
       JOIN whatsapp_links w ON w.user_id = i.user_id
       WHERE i.status = 'unpaid'
         AND i.created_at < ?
         AND (i.reminder_sent_at IS NULL OR i.reminder_sent_at < ?)`
    )
    .all(cutoff, cutoff);

  for (const invoice of dueInvoices) {
    const who = invoice.customer_name || "زبون بدون اسم";
    const amount = invoice.amount != null ? `${invoice.amount} ${invoice.currency || ""}`.trim() : "مبلغ غير محدد";
    try {
      await sendMessage(invoice.phone_number, `⏰ تذكير: فاتورة "${who}" بمبلغ ${amount} لسه ما انسددت من أكثر من ${REMINDER_AFTER_DAYS} أيام. تحب تتابعها؟`);
      db.prepare(`UPDATE invoices SET reminder_sent_at = strftime('%s','now') WHERE id = ?`).run(invoice.id);
    } catch (err) {
      console.error(`فشل إرسال تذكير للفاتورة #${invoice.id}:`, err.message);
    }
  }
}

function startReminderLoop() {
  setInterval(() => {
    checkAndSendReminders().catch((err) => console.error("خطأ في دورة التذكير:", err));
  }, CHECK_INTERVAL_MS);
}

module.exports = { startReminderLoop, checkAndSendReminders };
