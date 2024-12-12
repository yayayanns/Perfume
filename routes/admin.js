const express = require("express");
const router = express.Router();
const { isAdmin } = require("./auth");
const { getDB } = require("./db");

// 顯示香水管理頁面
router.get("/perfume", isAdmin, async (req, res) => {
  try {
    const db = await getDB();
    const perfumes = await db.collection("perfumes").find().toArray();
    res.render("admin-perfume", { perfumes: perfumes });
  } catch (error) {
    console.error("獲取香水資料錯誤:", error);
    res.status(500).render("error", { message: "獲取香水資料時發生錯誤" });
  }
});

// 處理新增香水
router.post("/perfume/add", isAdmin, async (req, res) => {
  try {
    // ... 你的新增香水邏輯 ...
    res.redirect("/admin/perfume");
  } catch (error) {
    console.error("新增香水錯誤:", error);
    res.status(500).render("error", { message: "新增香水時發生錯誤" });
  }
});

module.exports = router;
