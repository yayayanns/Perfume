const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const { getDB } = require("./db");

// 生成唯一訂單編號
async function generateOrderNumber() {
  try {
    const db = await getDB();
    let isUnique = false;
    let orderNumber;

    while (!isUnique) {
      const timestamp = Date.now().toString();
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      orderNumber = `ORD-${timestamp}-${randomNum}`;

      // 檢查訂單號是否已存在
      const existingOrder = await db
        .collection("orders")
        .findOne({ orderNumber });
      if (!existingOrder) {
        isUnique = true;
      }
    }

    return orderNumber;
  } catch (error) {
    console.error("生成訂單號碼失敗：", error);
    throw error;
  }
}

// 顯示結帳頁面
router.get("/", async (req, res) => {
  try {
    const db = await getDB();
    const userId = req.session.userId;
    let cartItems = [];
    let totalPrice = 0;

    if (!req.session.cart || req.session.cart.length === 0) {
      return res.render("checkout", {
        cartItems: [],
        totalPrice: 0,
        isGuest: !userId,
        error: "購物車是空的",
      });
    }

    // 獲取商品資訊
    const perfumes = await db
      .collection("perfumes")
      .find({
        _id: {
          $in: req.session.cart.map((item) => new ObjectId(item.perfumeId)),
        },
      })
      .toArray();

    // 組合購物車項目
    cartItems = req.session.cart
      .map((cartItem) => {
        const perfume = perfumes.find(
          (p) => p._id.toString() === cartItem.perfumeId
        );
        return {
          perfume,
          quantity: cartItem.quantity || 1,
        };
      })
      .filter((item) => item.perfume); // 過濾掉找不到的商品

    // 計算總價
    totalPrice = cartItems.reduce((sum, item) => {
      return sum + item.perfume.price * item.quantity;
    }, 0);

    res.render("checkout", {
      cartItems,
      totalPrice,
      isGuest: !userId,
    });
  } catch (error) {
    console.error("載入結帳頁面失敗：", error);
    res.status(500).render("error", {
      message: "無法載入結帳頁面",
    });
  }
});

// 處理結帳
router.post("/process", async (req, res) => {
  try {
    const db = await getDB();
    const userId = req.session.userId;
    let cartItems = [];
    let totalPrice = 0;

    // 打印調試信息
    console.log("配送資訊：", req.body.shipping);
    console.log("付款資訊：", req.body.payment);
    console.log("購物車內容：", req.session.cart);

    if (
      !req.body.shipping ||
      !req.body.shipping.name ||
      !req.body.shipping.phone ||
      !req.body.shipping.address
    ) {
      return res.status(400).json({
        success: false,
        message: "請填寫完整的配送資訊",
      });
    }

    if (
      !req.body.payment ||
      !req.body.payment.cardHolder ||
      !req.body.payment.cardNumber ||
      !req.body.payment.expiry ||
      !req.body.payment.cvv
    ) {
      return res.status(400).json({
        success: false,
        message: "請填寫完整的付款資訊",
      });
    }

    if (!req.session.cart || req.session.cart.length === 0) {
      return res.status(400).json({ success: false, message: "購物車是空的" });
    }

    const validCartItems = req.session.cart.filter((item) => {
      try {
        new ObjectId(item.perfumeId);
        return true;
      } catch {
        console.error("無效的 perfumeId：", item.perfumeId);
        return false;
      }
    });

    const perfumes = await db
      .collection("perfumes")
      .find({
        _id: {
          $in: validCartItems.map((item) => new ObjectId(item.perfumeId)),
        },
      })
      .toArray();

    cartItems = validCartItems
      .map((cartItem) => {
        const perfume = perfumes.find(
          (p) => p._id.toString() === cartItem.perfumeId
        );
        return perfume
          ? {
              perfume,
              quantity: cartItem.quantity || 1,
            }
          : null;
      })
      .filter((item) => item !== null);

    if (!cartItems.length) {
      return res.status(400).json({ success: false, message: "購物車是空的" });
    }

    totalPrice = cartItems.reduce(
      (sum, item) => sum + item.perfume.price * item.quantity,
      0
    );

    const orderNumber = await generateOrderNumber();
    console.log("Generated order number:", orderNumber);

    const order = {
      orderNumber,
      userId: userId ? new ObjectId(userId) : null,
      items: cartItems,
      shipping: req.body.shipping,
      payment: {
        ...req.body.payment,
        cardNumber: `****${req.body.payment.cardNumber.slice(-4)}`,
        cvv: "***",
      },
      status: "pending",
      createdAt: new Date(),
      totalPrice,
    };

    const result = await db.collection("orders").insertOne(order);
    console.log("Order created:", result);

    if (userId) {
      await db
        .collection("shopping_carts")
        .updateOne({ userId: new ObjectId(userId) }, { $set: { items: [] } });
    }
    req.session.cart = [];

    res.redirect(`/checkout/success?orderNumber=${orderNumber}`);
  } catch (error) {
    console.error("處理結帳失敗：", error.stack || error);
    res.status(500).json({
      success: false,
      message: "處理結帳失敗，請稍後再試",
    });
  }
});

// 訪客訂單查詢路由
router.get("/guest", async (req, res) => {
  try {
    const { orderNumber } = req.query;
    if (!orderNumber) {
      return res.render("order-lookup", {
        error: null,
        isGuest: true,
      });
    }

    const db = await getDB();
    const order = await db.collection("orders").findOne({
      orderNumber: orderNumber.toString(),
    });

    if (!order) {
      return res.render("order-lookup", {
        error: "找不到此訂單編號",
        orderNumber,
        isGuest: true,
      });
    }

    // 在這裡記錄一下接收到的訂單資訊，用於調試
    console.log("Order details:", {
      orderNumber: order.orderNumber,
      shipping: order.shipping,
      items: order.items,
    });

    // 直接使用原始訂單資訊
    const orderWithDetails = {
      ...order,
      items: order.items.map((item) => ({
        perfume: item.perfume,
        quantity: item.quantity || 1,
      })),
    };

    res.render("order-detail", {
      order: orderWithDetails,
      isGuest: true,
    });
  } catch (error) {
    console.error("查詢失敗:", error);
    res.render("order-lookup", {
      error: "查詢失敗，請稍後再試",
      orderNumber: req.query.orderNumber,
      isGuest: true,
    });
  }
});

// 結帳成功頁面
router.get("/success", async (req, res) => {
  try {
    const { orderNumber } = req.query;
    console.log("Success page orderNumber:", orderNumber);

    if (!orderNumber) {
      return res.render("checkout-success", {
        orderNumber: null,
      });
    }

    const db = await getDB();
    const order = await db.collection("orders").findOne({ orderNumber });
    console.log("Found order:", order);

    res.render("checkout-success", {
      orderNumber: orderNumber,
    });
  } catch (error) {
    console.error("載入成功頁面失敗：", error);
    res.status(500).render("error", {
      message: "無法載入頁面",
    });
  }
});

module.exports = router;
