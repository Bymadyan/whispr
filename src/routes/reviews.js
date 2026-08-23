const express = require("express");
const router = express.Router();
const db = require("../db");
const google = require("../googleClient");
const { generateDraftReply } = require("../replyGenerator");

// يجيب التقييمات الجديدة فقط من Google لكل الحسابات المربوطة، ويولد مسودة رد لكل تقييم جديد
router.post("/sync", async (req, res, next) => {
  try {
    const accounts = db.prepare(`SELECT * FROM accounts`).all();
    let newCount = 0;

    for (const account of accounts) {
      const client = await google.getAuthedClientForAccount(account);

      let pageToken;
      do {
        const { reviews, nextPageToken } = await google.listReviews(client, account.location_name, pageToken);
        pageToken = nextPageToken;

        for (const gr of reviews) {
          const exists = db
            .prepare(`SELECT id FROM reviews WHERE account_id = ? AND google_review_id = ?`)
            .get(account.id, gr.reviewId);
          if (exists) continue;

          const starRatingMap = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
          const starRating = starRatingMap[gr.starRating] || 0;
          const comment = gr.comment || "";
          const hasOwnerReply = gr.reviewReply ? 1 : 0;

          const info = db
            .prepare(
              `INSERT INTO reviews (account_id, google_review_id, reviewer_name, star_rating, comment, review_create_time, has_owner_reply)
               VALUES (?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              account.id,
              gr.reviewId,
              (gr.reviewer && gr.reviewer.displayName) || "",
              starRating,
              comment,
              gr.createTime || null,
              hasOwnerReply
            );

          newCount++;

          // ما نسوي مسودة رد لتقييم عنده رد من صاحب النشاط أصلاً
          if (!hasOwnerReply) {
            const { text, generatedBy } = await generateDraftReply({
              businessName: account.business_name,
              starRating,
              comment,
              reviewerName: (gr.reviewer && gr.reviewer.displayName) || "",
            });

            db.prepare(
              `INSERT INTO drafts (review_id, draft_text, status, generated_by) VALUES (?, ?, 'draft', ?)`
            ).run(info.lastInsertRowid, text, generatedBy);
          }
        }
      } while (pageToken);

      db.prepare(`UPDATE accounts SET last_synced_at = strftime('%s','now') WHERE id = ?`).run(account.id);
    }

    res.redirect(`/?synced=${newCount}`);
  } catch (err) {
    next(err);
  }
});

// حفظ تعديل المستخدم على نص المسودة (بدون نشر)
router.post("/:id/draft", (req, res, next) => {
  try {
    const reviewId = Number(req.params.id);
    const { draftText } = req.body;

    const existing = db.prepare(`SELECT id FROM drafts WHERE review_id = ?`).get(reviewId);
    if (existing) {
      db.prepare(
        `UPDATE drafts SET draft_text = ?, status = 'edited', updated_at = strftime('%s','now') WHERE review_id = ?`
      ).run(draftText, reviewId);
    } else {
      db.prepare(
        `INSERT INTO drafts (review_id, draft_text, status, generated_by) VALUES (?, ?, 'edited', 'manual')`
      ).run(reviewId, draftText);
    }

    res.redirect("/#review-" + reviewId);
  } catch (err) {
    next(err);
  }
});

// يعيد توليد مسودة جديدة لتقييم معين
router.post("/:id/regenerate", async (req, res, next) => {
  try {
    const reviewId = Number(req.params.id);
    const review = db
      .prepare(
        `SELECT r.*, a.business_name FROM reviews r JOIN accounts a ON a.id = r.account_id WHERE r.id = ?`
      )
      .get(reviewId);
    if (!review) return res.status(404).send("التقييم غير موجود");

    const { text, generatedBy } = await generateDraftReply({
      businessName: review.business_name,
      starRating: review.star_rating,
      comment: review.comment,
      reviewerName: review.reviewer_name,
    });

    const existing = db.prepare(`SELECT id FROM drafts WHERE review_id = ?`).get(reviewId);
    if (existing) {
      db.prepare(
        `UPDATE drafts SET draft_text = ?, status = 'draft', generated_by = ?, updated_at = strftime('%s','now') WHERE review_id = ?`
      ).run(text, generatedBy, reviewId);
    } else {
      db.prepare(
        `INSERT INTO drafts (review_id, draft_text, status, generated_by) VALUES (?, ?, 'draft', ?)`
      ).run(reviewId, text, generatedBy);
    }

    res.redirect("/#review-" + reviewId);
  } catch (err) {
    next(err);
  }
});

// النشر الفعلي على Google — يحدث فقط هنا، وفقط لما المستخدم يضغط الزر بنفسه
router.post("/:id/publish", async (req, res, next) => {
  try {
    const reviewId = Number(req.params.id);

    // لو المستخدم عدّل النص في الصندوق ولحقّ الضغط على نشر مباشرة بدون حفظ منفصل، نحفظ آخر نص كتبه أولاً
    if (typeof req.body.draftText === "string" && req.body.draftText.trim()) {
      db.prepare(
        `UPDATE drafts SET draft_text = ?, updated_at = strftime('%s','now') WHERE review_id = ?`
      ).run(req.body.draftText, reviewId);
    }

    const row = db
      .prepare(
        `SELECT r.id AS review_id, r.account_id, r.google_review_id, d.draft_text
         FROM reviews r
         JOIN accounts a ON a.id = r.account_id
         JOIN drafts d ON d.review_id = r.id
         WHERE r.id = ?`
      )
      .get(reviewId);

    if (!row) return res.status(404).send("لا توجد مسودة لهذا التقييم");
    if (!row.draft_text || !row.draft_text.trim()) {
      return res.status(400).send("نص المسودة فاضي، عدّل الرد قبل النشر");
    }

    const account = db.prepare(`SELECT * FROM accounts WHERE id = ?`).get(row.account_id);
    const client = await google.getAuthedClientForAccount(account);
    const reviewResourceName = `${account.location_name}/reviews/${row.google_review_id}`;

    await google.publishReply(client, reviewResourceName, row.draft_text);

    db.prepare(
      `UPDATE drafts SET status = 'published', published_at = strftime('%s','now') WHERE review_id = ?`
    ).run(reviewId);
    db.prepare(`UPDATE reviews SET has_owner_reply = 1 WHERE id = ?`).run(reviewId);

    res.redirect("/#review-" + reviewId);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
