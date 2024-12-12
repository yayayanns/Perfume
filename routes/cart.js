const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();
const { getDB } = require("./db");

// 顯示訪客購物車內容
router.get("/", async (req, res) => {
  try {
    const db = await getDB();
    let cartItems = [];
    let totalPrice = 0;

    // 如果用戶已登入，重定向到會員購物車
    if (req.session.userId) {
      return res.redirect("/member/cart");
    }

    // 處理訪客購物車
    if (req.session.cart && req.session.cart.length > 0) {
      const perfumes = await db
        .collection("perfumes")
        .find({
          _id: {
            $in: req.session.cart.map((item) => new ObjectId(item.perfumeId)),
          },
        })
        .toArray();

      cartItems = req.session.cart.map((cartItem) => {
        const perfume = perfumes.find(
          (p) => p._id.toString() === cartItem.perfumeId
        );
        return {
          perfume,
          quantity: cartItem.quantity || 1,
        };
      });

      totalPrice = cartItems.reduce(
        (sum, item) => sum + item.perfume.price * item.quantity,
        0
      );
    }

    res.render("cart", {
      cartItems,
      totalPrice,
      isGuest: true,
    });
  } catch (error) {
    console.error("購物車錯誤:", error);
    res.status(500).render("error", { message: "無法載入購物車內容" });
  }
});

// 更新訪客購物車商品數量
router.post("/update-quantity", async (req, res) => {
  try {
    // 如果用戶已登入，返回錯誤
    if (req.session.userId) {
      return res
        .status(400)
        .json({ success: false, message: "請使用會員購物車功能" });
    }

    const { perfumeId, action } = req.body;

    if (!req.session.cart) {
      req.session.cart = [];
    }

    const cartItem = req.session.cart.find(
      (item) => item.perfumeId === perfumeId
    );

    if (cartItem) {
      if (action === "increase") {
        cartItem.quantity = (cartItem.quantity || 1) + 1;
      } else if (action === "decrease" && cartItem.quantity > 1) {
        cartItem.quantity--;
      } else if (action === "decrease" && cartItem.quantity === 1) {
        req.session.cart = req.session.cart.filter(
          (item) => item.perfumeId !== perfumeId
        );
      }
    } else if (action === "increase") {
      req.session.cart.push({ perfumeId, quantity: 1 });
    }

    await req.session.save();
    res.json({ success: true, cart: req.session.cart });
  } catch (error) {
    console.error("更新數量錯誤:", error);
    res.status(500).json({ success: false, message: "更新數量失敗" });
  }
});

// 訪客添加商品到購物車

router.post("/add", async (req, res) => {
  try {
    const { perfumeId } = req.body;

    // 驗證商品 ID 是否有效
    if (!perfumeId || !ObjectId.isValid(perfumeId)) {
      return res.status(400).json({ success: false, message: "無效的商品 ID" });
    }

    // 使用 session 或 cookie 儲存訪客購物車
    let cart = req.session.cart || [];
    const existingItem = cart.find((item) => item.perfumeId === perfumeId);

    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      cart.push({ perfumeId, quantity: 1 });
    }

    req.session.cart = cart; // 更新 session
    res.json({ success: true, message: "商品已加入購物車" });
  } catch (error) {
    console.error("訪客購物車錯誤:", error);
    res.status(500).json({ success: false, message: "添加商品失敗" });
  }
});
// 從訪客購物車移除商品
router.post("/remove", async (req, res) => {
  try {
    // 如果用戶已登入，返回錯誤
    if (req.session.userId) {
      return res
        .status(400)
        .json({ success: false, message: "請使用會員購物車功能" });
    }

    const { perfumeId } = req.body;

    if (req.session.cart) {
      req.session.cart = req.session.cart.filter(
        (item) => item.perfumeId !== perfumeId
      );
      await req.session.save();
    }

    res.json({ success: true, message: "商品已移除" });
  } catch (error) {
    console.error("移除商品錯誤:", error);
    res.status(500).json({ success: false, message: "移除商品失敗" });
  }
});

// 訪客結帳
router.get("/checkout", async (req, res) => {
  try {
    // 如果用戶已登入，重定向到會員結帳
    if (req.session.userId) {
      return res.redirect("/member/cart/checkout");
    }

    const db = await getDB();

    if (!req.session.cart || req.session.cart.length === 0) {
      return res.render("error", {
        message: "購物車為空，無法進行結帳。",
        error: null,
      });
    }

    const cartItems = [];
    const perfumes = await db
      .collection("perfumes")
      .find({
        _id: {
          $in: req.session.cart.map((item) => new ObjectId(item.perfumeId)),
        },
      })
      .toArray();

    for (const cartItem of req.session.cart) {
      const perfume = perfumes.find(
        (p) => p._id.toString() === cartItem.perfumeId
      );
      if (perfume) {
        cartItems.push({
          perfume: perfume,
          quantity: cartItem.quantity || 1,
        });
      }
    }

    const totalPrice = cartItems.reduce(
      (sum, item) => sum + item.perfume.price * item.quantity,
      0
    );

    res.render("checkout", {
      cartItems,
      totalPrice,
      isGuest: true,
    });
  } catch (error) {
    console.error("載入結帳頁面失敗：", error);
    res.status(500).render("error", {
      message: "無法載入結帳頁面，請稍後再試。",
      error: null,
    });
  }
});

// 獲取訪客購物車商品數量
router.get("/count", (req, res) => {
  if (req.session.userId) {
    return res.json({ count: 0 });
  }

  const cart = req.session.cart || [];
  const count = cart.reduce((total, item) => total + (item.quantity || 1), 0);
  res.json({ count });
});

module.exports = router;
