// يشغّل التقرير الأسبوعي تلقائياً لكل عميل عنده اشتراك فعّال، كل يوم اثنين الساعة 8 صباحاً (UTC).
// لو ما فيه RESEND_API_KEY، التقرير لسه يتولّد ويتخزّن (يظهر باللوحة)، بس ما يُرسل بريد.

const cron = require("node-cron");
const db = require("./db");
const { buildWeeklyDigest } = require("./digestGenerator");
const { sendWeeklyDigest } = require("./emailer");

async function runWeeklyDigestForAllUsers() {
  const users = db
    .prepare(
      `SELECT u.* FROM users u
       JOIN subscriptions s ON s.user_id = u.id
       WHERE s.status IN ('active', 'trialing')`
    )
    .all();

  for (const user of users) {
    try {
      const digest = await buildWeeklyDigest(user);
      if (!digest) continue; // ما عنده أي نشاط تجاري مربوط بعد

      db.prepare(
        `UPDATE users SET last_digest_summary = ?, last_digest_sent_at = strftime('%s','now') WHERE id = ?`
      ).run(digest.narrative, user.id);

      if (digest.thisWeekCount > 0) {
        await sendWeeklyDigest({ toEmail: user.email, subject: digest.subject, narrative: digest.narrative });
      }
    } catch (err) {
      console.error(`Weekly digest failed for user ${user.id}:`, err.message);
    }
  }
}

function startScheduler() {
  // "0 8 * * 1" = كل اثنين الساعة 8 صباحاً UTC
  cron.schedule("0 8 * * 1", () => {
    runWeeklyDigestForAllUsers().catch((err) => console.error("Weekly digest job crashed:", err.message));
  });
}

module.exports = { startScheduler, runWeeklyDigestForAllUsers };
