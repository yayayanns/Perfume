// 引入需要的套件
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const { getDB, ObjectId } = require("./db");
const { checkAuth } = require("./auth");

// 顯示註冊頁面
router.get("/register", (req, res) => {
  res.render("register");
});

// 顯示登入頁面
router.get("/login", (req, res) => {
  res.render("login");
});

// 處理註冊請求
router.post("/register", async (req, res) => {
  try {
    // 連線到資料庫
    const db = await getDB(); // 使用 getDB

    // 取得使用者輸入的資料
    const { username, email, password } = req.body;

    // 檢查使用者是否已經存在
    const user = await db.collection("users").findOne({
      $or: [{ username: username }, { email: email }],
    });

    if (user) {
      return res.json({ message: "使用者名稱或信箱已經被使用" });
    }

    // 將密碼加密
    const hashPassword = await bcrypt.hash(password, 10);

    // 將使用者資料存入資料庫
    const result = await db.collection("users").insertOne({
      username: username,
      email: email,
      password: hashPassword,
      createDate: new Date(),
    });

    // 設定登入狀態
    req.session.userId = result.insertedId;
    req.session.username = username;

    // 回傳成功訊息時加上狀態碼
    res.status(201).json({ message: "註冊成功！" });
  } catch (error) {
    // 錯誤時也加上狀態碼
    console.log("註冊時發生錯誤：", error);
    res.status(500).json({ message: "註冊失敗，請聯絡我們。" });
  }
});

// 處理登入請求
router.post("/login", async (req, res) => {
  try {
    const db = await getDB();
    const { username, password } = req.body;

    const user = await db.collection("users").findOne({ username: username });

    if (!user) {
      return res.status(401).json({ message: "使用者名稱或密碼錯誤" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "使用者名稱或密碼錯誤" });
    }

    req.session.userId = user._id;
    req.session.username = user.username;

    // 檢查是否來自購物車
    let redirectUrl = "/member";
    if (req.session.returnTo === "/cart") {
      redirectUrl = "/cart";
      delete req.session.returnTo;
    }

    res.status(200).json({
      message: "登入成功",
      redirectUrl: redirectUrl,
    });
  } catch (error) {
    console.log("登入時發生錯誤：", error);
    res.status(500).json({ message: "登入失敗，請稍後再試" });
  }
});

// 會員中心路由
router.get("/profile", checkAuth, async (req, res) => {
  try {
    const db = await getDB();
    const user = await db.collection("users").findOne({
      _id: new ObjectId(req.session.userId),
    });

    if (!user) {
      return res.redirect("/member/login");
    }

    // 從資料庫獲取香水資料
    const perfumes = await db.collection("perfumes").find().toArray();

    // 傳遞用戶名稱和香水資料至 EJS
    res.render("profile", {
      username: user.username,
      perfumes: perfumes,
    });
  } catch (error) {
    console.error("獲取會員資料錯誤:", error);
    res.status(500).render("error", { message: "獲取會員資料時發生錯誤" });
  }
});

// 獲取用戶資料
router.get("/profile-data", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: "請先登入" });
    }

    const db = await getDB(); // 使用 getDB
    const user = await db
      .collection("users")
      .findOne(
        { _id: new ObjectId(req.session.userId) },
        { projection: { password: 0 } }
      );

    if (!user) {
      return res.status(404).json({ message: "找不到用戶" });
    }

    res.json(user);
  } catch (error) {
    console.log("獲取用戶資料錯誤：", error);
    res.status(500).json({ message: "獲取資料失敗" });
  }
});

// 顯示修改資料頁面
router.get("/edit", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/member/login");
  }
  res.render("edit");
});

// 更新用戶資料
router.put("/update", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: "請先登入" });
    }

    const db = await getDB(); // 使用 getDB
    const { username, email, currentPassword, newPassword } = req.body;
    const updateData = {};

    const user = await db.collection("users").findOne({
      _id: new ObjectId(req.session.userId),
    });

    if (!user) {
      return res.status(404).json({ message: "用戶不存在" });
    }

    // 如果要更改密碼
    if (currentPassword && newPassword) {
      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isValidPassword) {
        return res.status(400).json({ message: "目前密碼錯誤" });
      }
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    // 更新其他資料
    if (username) updateData.username = username;
    if (email) updateData.email = email;

    const result = await db
      .collection("users")
      .updateOne(
        { _id: new ObjectId(req.session.userId) },
        { $set: updateData }
      );

    if (result.modifiedCount > 0) {
      if (username) req.session.username = username;
      res.json({ message: "更新成功" });
    } else {
      res.status(400).json({ message: "沒有資料被更新" });
    }
  } catch (error) {
    console.log("更新用戶資料錯誤：", error);
    res.status(500).json({ message: "更新失敗" });
  }
});

// 登出
router.post("/logout", (req, res) => {
  // 清除登入狀態
  req.session.destroy((err) => {
    if (err) {
      console.error("登出錯誤:", err);
      return res.status(500).json({ message: "登出失敗" });
    }
    res.json({ message: "已登出" });
  });
});

// 添加商品到購物車
router.post("/cart/add", checkAuth, async (req, res) => {
  try {
    const db = await getDB();
    const { perfumeId } = req.body;
    const userId = req.session.userId;

    // 查找用戶的購物車
    let cart = await db.collection("shopping_carts").findOne({
      userId: new ObjectId(userId),
      status: "active",
    });

    if (!cart) {
      // 如果購物車不存在，創建新的購物車
      cart = {
        userId: new ObjectId(userId),
        items: [],
        status: "active",
        lastModified: new Date(),
        createdAt: new Date(),
      };
    }

    // 檢查商品是否已在購物車中
    const existingItem = cart.items.find(
      (item) => item.perfumeId.toString() === perfumeId
    );

    if (existingItem) {
      // 如果商品已存在，增加數量
      await db.collection("shopping_carts").updateOne(
        {
          userId: new ObjectId(userId),
          "items.perfumeId": new ObjectId(perfumeId),
        },
        {
          $inc: { "items.$.quantity": 1 },
          $set: { lastModified: new Date() },
        }
      );
    } else {
      // 如果商品不存在，添加新商品
      await db.collection("shopping_carts").updateOne(
        { userId: new ObjectId(userId) },
        {
          $push: {
            items: {
              perfumeId: new ObjectId(perfumeId),
              quantity: 1,
              addedAt: new Date(),
            },
          },
          $set: { lastModified: new Date() },
        },
        { upsert: true }
      );
    }

    res.json({ success: true, message: "商品已加入購物車" });
  } catch (error) {
    console.error("加入購物車錯誤:", error);
    res.status(500).json({ success: false, message: "無法加入購物車" });
  }
});

module.exports = router;
