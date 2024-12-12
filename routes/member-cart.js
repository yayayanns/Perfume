const express = require("express");
const router = express.Router();
const { getDB } = require("./db");
const { ObjectId } = require("mongodb");

// 獲取會員購物車內容
router.get("/", async (req, res) => {
  try {
    const db = await getDB();
    const userId = new ObjectId(req.session.userId);

    let cartItems = [];
    let totalPrice = 0;

    // 取得會員購物車內容
    const cart = await db.collection("member_carts").findOne({
      userId: userId,
      status: "active",
    });

    // 如果購物車存在且有商品
    if (cart && cart.items && cart.items.length > 0) {
      // 取得所有香水資料
      const perfumeIds = cart.items.map((item) => new ObjectId(item.perfumeId));
      const perfumes = await db
        .collection("perfumes")
        .find({ _id: { $in: perfumeIds } })
        .toArray();

      // 整理購物車資料
      cartItems = perfumes.map((perfume) => {
        const cartItem = cart.items.find(
          (item) => item.perfumeId.toString() === perfume._id.toString()
        );
        return {
          perfume: perfume,
          quantity: cartItem.quantity,
        };
      });

      // 計算總價
      totalPrice = cartItems.reduce(
        (sum, item) => sum + item.perfume.price * item.quantity,
        0
      );
    }

    // 渲染頁面
    res.render("member-cart", {
      username: req.session.username,
      cartItems: cartItems,
      totalPrice: totalPrice,
    });
  } catch (error) {
    console.error("獲取購物車失敗:", error);
    res.status(500).render("error", { message: "無法載入購物車" });
  }
});
// 添加商品到會員購物車
router.post("/add", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "請先登入" });
    }

    const db = await getDB();

    // 確保 collection 存在
    if (!(await db.listCollections({ name: "member_carts" }).hasNext())) {
      await db.createCollection("member_carts");
      console.log("member_carts collection 已創建");
    }

    const userId = new ObjectId(req.session.userId);
    const perfumeId = req.body.perfumeId;

    // 創建或更新購物車
    let result = await db.collection("member_carts").updateOne(
      {
        userId: userId,
        status: "active",
      },
      {
        $setOnInsert: {
          userId: userId,
          status: "active",
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    // 更新購物車內容
    await db.collection("member_carts").updateOne(
      {
        userId: userId,
        status: "active",
      },
      {
        $push: {
          items: {
            perfumeId: perfumeId,
            quantity: 1,
            addedAt: new Date(),
          },
        },
      }
    );

    res.json({ success: true, message: "成功加入購物車" });
  } catch (error) {
    console.error("添加到購物車失敗:", error);
    res.status(500).json({ success: false, message: "添加商品失敗" });
  }
});

// 更新商品數量
router.put("/update/:perfumeId", async (req, res) => {
  try {
    const db = await getDB();
    const userId = new ObjectId(req.session.userId);
    const perfumeId = new ObjectId(req.params.perfumeId);
    const { quantity } = req.body;

    if (quantity < 1) {
      return res
        .status(400)
        .json({ success: false, message: "數量必須大於 0" });
    }

    const result = await db.collection("member_carts").updateOne(
      {
        userId: userId,
        "items.perfumeId": perfumeId,
      },
      {
        $set: { "items.$.quantity": quantity },
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("更新數量失敗:", error);
    res.status(500).json({ success: false, message: "更新數量失敗" });
  }
});

// 刪除商品
router.delete("/remove/:perfumeId", async (req, res) => {
  try {
    const db = await getDB();
    const userId = new ObjectId(req.session.userId);
    const perfumeId = new ObjectId(req.params.perfumeId);

    await db.collection("member_carts").updateOne(
      { userId: userId },
      {
        $pull: {
          items: { perfumeId: perfumeId },
        },
      }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("刪除商品失敗:", error);
    res.status(500).json({ success: false, message: "刪除商品失敗" });
  }
});

// 獲取購物車商品數量
router.get("/count", async (req, res) => {
  try {
    const db = await getDB();
    const userId = new ObjectId(req.session.userId);

    const cart = await db.collection("member_carts").findOne({
      userId: userId,
      status: "active",
    });

    const count = cart
      ? cart.items.reduce((sum, item) => sum + item.quantity, 0)
      : 0;
    res.json({ success: true, count: count });
  } catch (error) {
    console.error("獲取購物車數量失敗:", error);
    res.status(500).json({ success: false, message: "獲取數量失敗" });
  }
});
module.exports = router;
