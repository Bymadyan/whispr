const express = require("express");
const router = express.Router();

router.get("/terms", (req, res) => {
  res.render("terms");
});

router.get("/privacy", (req, res) => {
  res.render("privacy");
});

module.exports = router;
