const express = require("express");
const router = express.Router();
const { getDB } = require("./db");
const { ObjectId } = require("mongodb");

// 獲取會員購物車內容
router.get("/cart", (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/member/login");
  }

  // 處理會員購物車邏輯
  res.render("member-cart", {
    isGuest: false, // 會員購物車設為 false
    /* 其他會員購物車數據 */
  });
});

router.get("/", async (req, res) => {
  try {
    const userId = new ObjectId(req.session.userId);
    const db = await getDB();

    const cart = await db.collection("member_carts").findOne({
      userId: userId,
      status: "active",
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.render("member-cart", {
        cartItems: [],
        totalPrice: 0,
        discountedTotal: 0,
      });
    }

    const perfumeIds = cart.items.map((item) => new ObjectId(item.perfumeId));
    const perfumes = await db
      .collection("perfumes")
      .find({ _id: { $in: perfumeIds } })
      .toArray();

    const memberDiscount = 0.95; // 95折會員優惠

    const cartItems = cart.items.map((item) => {
      const perfume = perfumes.find(
        (p) => p._id.toString() === item.perfumeId.toString()
      );
      const originalPrice = perfume.price;
      const discountedPrice = Math.round(originalPrice * memberDiscount); // 四捨五入到整數

      return {
        _id: perfume._id,
        name: perfume.name,
        image: perfume.image,
        originalPrice: originalPrice,
        discountedPrice: discountedPrice,
        quantity: item.quantity,
        subtotal: discountedPrice * item.quantity,
      };
    });

    const totalPrice = cartItems.reduce(
      (sum, item) => sum + item.originalPrice * item.quantity,
      0
    );
    const discountedTotal = cartItems.reduce(
      (sum, item) => sum + item.subtotal,
      0
    );
    const totalSaved = totalPrice - discountedTotal;

    res.render("member-cart", {
      cartItems,
      totalPrice,
      discountedTotal,
      totalSaved,
      memberDiscount,
    });
  } catch (error) {
    console.error("加載購物車失敗：", error);
    res.status(500).render("error", { message: "無法加載購物車" });
  }
});

router.post("/add", async (req, res) => {
  try {
    const { perfumeId } = req.body;

    // 調試日誌
    console.log("Received perfumeId:", perfumeId);
    console.log("perfumeId type:", typeof perfumeId);

    // 基本驗證
    if (!perfumeId) {
      return res.status(400).json({
        success: false,
        message: "商品 ID 是必需的",
      });
    }

    // 轉換並驗證 ID
    let perfumeObjectId;
    try {
      perfumeObjectId = new ObjectId(perfumeId);
    } catch (err) {
      console.error("Invalid perfume ID format:", perfumeId);
      return res.status(400).json({
        success: false,
        message: "無效的商品 ID 格式",
      });
    }

    const db = await getDB();
    const userId = new ObjectId(req.session.userId);

    // 檢查商品是否存在
    const perfume = await db.collection("perfumes").findOne({
      _id: perfumeObjectId,
    });

    if (!perfume) {
      return res.status(404).json({
        success: false,
        message: "找不到該商品",
      });
    }

    // 獲取或創建購物車
    let cart = await db.collection("member_carts").findOne({
      userId: userId,
      status: "active",
    });

    if (!cart) {
      // 創建新購物車
      const newCart = {
        userId: userId,
        items: [],
        status: "active",
        createdAt: new Date(),
      };
      const result = await db.collection("member_carts").insertOne(newCart);
      cart = {
        ...newCart,
        _id: result.insertedId,
      };
    }

    // 檢查商品是否已在購物車中
    const existingItemIndex = cart.items.findIndex(
      (item) => item.perfumeId.toString() === perfumeObjectId.toString()
    );

    if (existingItemIndex !== -1) {
      // 更新現有商品數量
      cart.items[existingItemIndex].quantity += 1;
    } else {
      // 添加新商品
      cart.items.push({
        perfumeId: perfumeObjectId,
        quantity: 1,
      });
    }

    // 更新購物車
    await db
      .collection("member_carts")
      .updateOne({ _id: cart._id }, { $set: { items: cart.items } });

    res.json({
      success: true,
      message: "商品已成功添加到購物車",
    });
  } catch (error) {
    console.error("添加商品到購物車失敗：", error);
    res.status(500).json({
      success: false,
      message: "添加商品失敗，請稍後再試",
    });
  }
});

// 更新商品數量
router.put("/update/:perfumeId", async (req, res) => {
  try {
    const userId = new ObjectId(req.session.userId);
    const perfumeId = new ObjectId(req.params.perfumeId);
    const quantity = parseInt(req.body.quantity);
    const db = await getDB();

    if (isNaN(quantity) || quantity < 1) {
      return res.status(400).json({ success: false, message: "無效的數量" });
    }

    const result = await db
      .collection("member_carts")
      .updateOne(
        { userId: userId, "items.perfumeId": perfumeId.toString() },
        { $set: { "items.$.quantity": quantity } }
      );

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: "商品不存在" });
    }

    res.json({ success: true, message: "數量更新成功" });
  } catch (error) {
    console.error("更新數量失敗：", error);
    res.status(500).json({ success: false, message: "更新數量失敗" });
  }
});
// 刪除購物車商品
router.post("/remove", async (req, res) => {
  try {
    const db = await getDB();
    const userId = new ObjectId(req.session.userId);
    const perfumeId = new ObjectId(req.body.perfumeId); // 轉換為 ObjectId

    console.log("正在刪除商品:", {
      userId: userId,
      perfumeId: perfumeId,
    });

    // 執行刪除操作
    const result = await db.collection("member_carts").updateOne(
      {
        userId: userId,
        status: "active",
        "items.perfumeId": perfumeId, // 使用 ObjectId 比較
      },
      {
        $pull: {
          items: {
            perfumeId: perfumeId, // 使用 ObjectId
          },
        },
      }
    );

    console.log("刪除結果:", result); // 調試日誌

    if (result.matchedCount === 0) {
      return res
        .status(404)
        .json({ success: false, message: "找不到購物車或商品" });
    }

    if (result.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: "刪除失敗" });
    }

    res.json({ success: true, message: "商品已移除" });
  } catch (error) {
    console.error("刪除商品失敗：", error);
    res.status(500).json({ success: false, message: "刪除商品失敗" });
  }
});

// 獲取購物車商品總數量
router.get("/count", async (req, res) => {
  try {
    const userId = new ObjectId(req.session.userId);
    const db = await getDB();

    const cart = await db.collection("member_carts").findOne({
      userId: userId,
      status: "active",
    });

    const count = cart
      ? cart.items.reduce((sum, item) => sum + item.quantity, 0)
      : 0;

    res.json({ success: true, count });
  } catch (error) {
    console.error("獲取購物車數量失敗：", error);
    res.status(500).json({ success: false, message: "獲取購物車數量失敗" });
  }
});

// 更新購物車商品數量
router.post("/update-quantity", async (req, res) => {
  try {
    const db = await getDB();
    const userId = new ObjectId(req.session.userId);
    const { perfumeId, action } = req.body;

    console.log("收到的更新請求:", {
      userId: userId,
      perfumeId: perfumeId,
      action: action,
      body: req.body,
    });

    // 檢查必要參數
    if (!perfumeId || !action) {
      return res.status(400).json({
        success: false,
        message: "缺少必要參數",
      });
    }

    // 轉換 perfumeId 為 ObjectId
    const perfumeObjectId = new ObjectId(perfumeId);

    // 找到購物車
    const cart = await db.collection("member_carts").findOne({
      userId: userId,
      status: "active",
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "購物車不存在",
      });
    }

    // 找到要更新的商品
    const itemIndex = cart.items.findIndex(
      (item) => item.perfumeId.toString() === perfumeId.toString()
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "商品不存在",
      });
    }

    // 計算新數量
    let newQuantity = cart.items[itemIndex].quantity;
    if (action === "increase") {
      newQuantity += 1;
    } else if (action === "decrease") {
      newQuantity = Math.max(1, newQuantity - 1);
    }

    // 更新數量
    const result = await db.collection("member_carts").updateOne(
      {
        userId: userId,
        "items.perfumeId": perfumeObjectId,
      },
      {
        $set: { "items.$.quantity": newQuantity },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        success: false,
        message: "更新失敗",
      });
    }

    res.json({
      success: true,
      message: "更新成功",
    });
  } catch (error) {
    console.error("更新數量失敗：", error);
    res.status(500).json({
      success: false,
      message: "更新數量失敗，請稍後再試",
    });
  }
});
module.exports = router;
