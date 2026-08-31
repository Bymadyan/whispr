// يجمع التقرير الأسبوعي لعميل معين: إحصائيات هالأسبوع مقابل اللي قبله، أبرز تقييم إيجابي وسلبي،
// وأهم نمط شكوى متكرر (من التحليل الذكي المخزّن مسبقاً لكل نشاط). يرجّع نص جاهز للبريد وللوحة.

const db = require("./db");

function getStats(userId) {
  return db
    .prepare(
      `SELECT
         SUM(CASE WHEN r.review_create_time >= datetime('now','-7 days') THEN 1 ELSE 0 END) AS this_week_count,
         ROUND(AVG(CASE WHEN r.review_create_time >= datetime('now','-7 days') THEN r.star_rating END), 1) AS this_week_avg,
         SUM(CASE WHEN r.review_create_time >= datetime('now','-14 days') AND r.review_create_time < datetime('now','-7 days') THEN 1 ELSE 0 END) AS last_week_count,
         ROUND(AVG(CASE WHEN r.review_create_time >= datetime('now','-14 days') AND r.review_create_time < datetime('now','-7 days') THEN r.star_rating END), 1) AS last_week_avg
       FROM reviews r
       JOIN accounts a ON a.id = r.account_id
       WHERE a.user_id = ?`
    )
    .get(userId);
}

function getBestReview(userId) {
  return db
    .prepare(
      `SELECT r.star_rating, r.comment, r.reviewer_name, a.business_name
       FROM reviews r JOIN accounts a ON a.id = r.account_id
       WHERE a.user_id = ? AND r.review_create_time >= datetime('now','-7 days')
         AND r.comment IS NOT NULL AND r.comment != '' AND r.star_rating >= 4
       ORDER BY r.star_rating DESC, r.id DESC LIMIT 1`
    )
    .get(userId);
}

function getWorstReview(userId) {
  return db
    .prepare(
      `SELECT r.star_rating, r.comment, r.reviewer_name, a.business_name
       FROM reviews r JOIN accounts a ON a.id = r.account_id
       WHERE a.user_id = ? AND r.review_create_time >= datetime('now','-7 days')
         AND r.comment IS NOT NULL AND r.comment != '' AND r.star_rating <= 3
       ORDER BY r.star_rating ASC, r.id DESC LIMIT 1`
    )
    .get(userId);
}

function getTopInsightLines(userId) {
  const accounts = db
    .prepare(`SELECT business_name, insight_summary FROM accounts WHERE user_id = ? AND insight_summary IS NOT NULL`)
    .all(userId);

  const lines = [];
  for (const acc of accounts) {
    const firstLine = (acc.insight_summary || "").split("\n")[0];
    if (firstLine && firstLine.startsWith("•")) {
      lines.push(accounts.length > 1 ? `${firstLine} (${acc.business_name})` : firstLine);
    }
  }
  return lines;
}

function trendArrow(thisAvg, lastAvg) {
  if (thisAvg == null || lastAvg == null) return "";
  if (thisAvg > lastAvg) return " ⬆️ تحسّن عن الأسبوع اللي قبله";
  if (thisAvg < lastAvg) return " ⬇️ أقل من الأسبوع اللي قبله";
  return " (بدون تغيير عن الأسبوع اللي قبله)";
}

function templateNarrative({ businessName, stats, bestReview, worstReview, insightLines }) {
  const parts = [];

  if (!stats.this_week_count) {
    parts.push(`مرحباً ${businessName}، ما وصلك أي تقييم جديد هالأسبوع.`);
  } else {
    parts.push(
      `مرحباً ${businessName}، هالأسبوع وصلك ${stats.this_week_count} ${
        stats.this_week_count === 1 ? "تقييم" : "تقييمات"
      } بمتوسط ${stats.this_week_avg} نجوم${trendArrow(stats.this_week_avg, stats.last_week_avg)}.`
    );
  }

  if (insightLines.length) {
    parts.push(`أبرز شي يستاهل انتباهك: ${insightLines[0].replace(/^•\s*/, "")}`);
  }

  if (bestReview) {
    parts.push(`أفضل تقييم وصلك: "${bestReview.comment}" — ${bestReview.reviewer_name || "عميل"} (${bestReview.star_rating}★)`);
  }

  if (worstReview) {
    parts.push(`تقييم يحتاج اهتمامك: "${worstReview.comment}" — ${worstReview.star_rating}★`);
  }

  return parts.join("\n\n");
}

async function claudeNarrative({ businessName, stats, bestReview, worstReview, insightLines }) {
  const Anthropic = require("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const facts = `اسم النشاط: ${businessName}
عدد التقييمات هالأسبوع: ${stats.this_week_count || 0}
متوسط النجوم هالأسبوع: ${stats.this_week_avg ?? "لا يوجد"}
متوسط النجوم الأسبوع اللي قبله: ${stats.last_week_avg ?? "لا يوجد"}
أهم نمط شكوى متكرر: ${insightLines[0] || "لا يوجد نمط واضح"}
أفضل تقييم: ${bestReview ? `"${bestReview.comment}" (${bestReview.star_rating} نجوم)` : "لا يوجد"}
أسوأ تقييم يحتاج اهتمام: ${worstReview ? `"${worstReview.comment}" (${worstReview.star_rating} نجوم)` : "لا يوجد"}`;

  const system = `أنت مساعد أعمال تكتب تقرير أسبوعي مختصر ودافئ بالعربي لصاحب نشاط تجاري عن تقييمات عملائه على Google.
اكتب 3-5 جمل بأسلوب شخصي وودود (مو رسمي جاف)، تلخّص الوضع، تسلّط الضوء على النمط المتكرر لو موجود، وتذكر أبرز تقييم إيجابي وسلبي لو موجودين.
لا تخترع أرقام أو تفاصيل غير معطاة لك. لا تكتب عنوان أو مقدمة زي "تقرير أسبوعي:"، ابدأ مباشرة بالتحية.`;

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    system,
    messages: [{ role: "user", content: facts }],
  });

  const textBlock = msg.content.find((b) => b.type === "text");
  const text = textBlock && textBlock.text.trim();
  if (!text) throw new Error("Claude returned empty digest narrative");
  return text;
}

// يرجّع null لو ما عند العميل أي نشاط تجاري مربوط أصلاً
async function buildWeeklyDigest(user) {
  const accounts = db.prepare(`SELECT id FROM accounts WHERE user_id = ?`).all(user.id);
  if (!accounts.length) return null;

  const stats = getStats(user.id);
  const bestReview = getBestReview(user.id);
  const worstReview = getWorstReview(user.id);
  const insightLines = getTopInsightLines(user.id);

  const context = { businessName: user.business_name, stats, bestReview, worstReview, insightLines };

  let narrative;
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      narrative = await claudeNarrative(context);
    } catch (err) {
      console.error("Claude digest narrative failed, falling back to template:", err.message);
    }
  }
  if (!narrative) narrative = templateNarrative(context);

  return {
    narrative,
    thisWeekCount: stats.this_week_count || 0,
    subject: stats.this_week_count
      ? `تقريرك الأسبوعي: ${stats.this_week_count} ${stats.this_week_count === 1 ? "تقييم جديد" : "تقييمات جديدة"} على Whispr`
      : `تقريرك الأسبوعي على Whispr`,
  };
}

module.exports = { buildWeeklyDigest };
