const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/invoice/:token", (req, res) => {
  const invoice = db.prepare(`SELECT * FROM invoices WHERE public_token = ?`).get(req.params.token);
  if (!invoice) return res.status(404).send("الفاتورة غير موجودة");

  const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(invoice.user_id);
  const link = db.prepare(`SELECT * FROM whatsapp_links WHERE user_id = ?`).get(invoice.user_id);

  res.render("invoice-public", {
    invoice,
    businessName: (user && user.business_name) || "مزوّد الخدمة",
    businessPhone: link ? link.phone_number.replace("whatsapp:", "") : null,
    invoiceNumber: `SND-${String(invoice.id).padStart(6, "0")}`,
    invoiceDate: new Date(invoice.created_at * 1000).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" }),
  });
});

module.exports = router;
