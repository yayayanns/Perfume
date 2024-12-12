const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { getDB } = require("./db");

// 顯示管理員登入頁面
router.get("/login", (req, res) => {
  res.render("admin-login", { error: null });
});

// 處理管理員登入請求
router.post("/login", async (req, res) => {
  try {
    const db = await getDB();
    const { username, password } = req.body;

    const admin = await db.collection("admin").findOne({ username: username });

    if (!admin) {
      // 維持在管理員登入頁面，顯示錯誤訊息
      return res.render("admin-login", { error: "無效的帳號或密碼" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (isMatch && admin.isAdmin) {
      req.session.user = {
        username: admin.username,
        isAdmin: true,
      };
      // 登入成功，導向管理面板
      res.redirect("/admin/perfume");
    } else {
      // 維持在管理員登入頁面，顯示錯誤訊息
      res.render("admin-login", { error: "無效的帳號或密碼" });
    }
  } catch (error) {
    console.error("登入錯誤:", error);
    res.render("admin-login", { error: "登入過程發生錯誤" });
  }
});

const isAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.isAdmin) {
    next();
  } else {
    res.redirect("/auth/login");
  }
};

const checkAuth = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect("/");
  }
};

module.exports = {
  router,
  isAdmin,
  checkAuth,
};
