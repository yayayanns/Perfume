const express = require("express");
const router = express.Router();
const { getDB } = require("./db");
const { ObjectId } = require("mongodb");

// 訂單查詢頁面 - 移到最前面
router.get("/lookup", async (req, res) => {
  try {
    const db = await getDB();
    const userId = new ObjectId(req.session.userId);

    // 獲取最近的訂單
    const recentOrders = await db
      .collection("orders")
      .find({ userId: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    res.render("member-order-lookup", {
      searchResults: recentOrders,
      orderNumber: req.query.orderNumber,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });
  } catch (error) {
    console.error("訂單查詢頁面載入失敗：", error);
    res.status(500).render("member-order-lookup", {
      error: "載入失敗，請稍後再試",
      searchResults: [],
    });
  }
});

// 訂單查詢處理
router.post("/search", async (req, res) => {
  try {
    const { orderNumber, startDate, endDate } = req.body;
    const userId = new ObjectId(req.session.userId);
    const db = await getDB();

    let query = { userId };

    if (orderNumber && ObjectId.isValid(orderNumber)) {
      query._id = new ObjectId(orderNumber);
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate + "T23:59:59");
      }
    }

    const searchResults = await db
      .collection("orders")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.render("member-order-lookup", {
      searchResults,
      orderNumber,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error("訂單查詢失敗：", error);
    res.status(500).render("member-order-lookup", {
      error: "查詢失敗，請稍後再試",
      searchResults: [],
    });
  }
});

// 訂單列表頁面
router.get("/", async (req, res) => {
  try {
    const db = await getDB();
    const userId = new ObjectId(req.session.userId);

    const orders = await db
      .collection("orders")
      .find({ userId: userId })
      .sort({ createdAt: -1 })
      .toArray();

    res.render("member-orders", {
      title: "我的訂單",
      orders: orders,
    });
  } catch (error) {
    console.error("獲取訂單列表失敗：", error);
    res.status(500).send("獲取訂單列表失敗");
  }
});

// 訂單成功頁面
router.get("/success", async (req, res) => {
  try {
    const { orderId, amount } = req.query;
    const userId = new ObjectId(req.session.userId);

    // 獲取會員信息
    const db = await getDB();
    const member = await db.collection("members").findOne({ _id: userId });

    res.render("member-order-success", {
      orderId: orderId,
      totalAmount: amount,
      memberName: member ? member.name : "會員",
    });
  } catch (error) {
    console.error("顯示訂單成功頁面失敗：", error);
    res.status(500).send("系統錯誤");
  }
});

// 訂單詳情頁面
router.get("/:orderId", async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.orderId)) {
      return res.status(400).send("無效的訂單編號");
    }

    const db = await getDB();
    const orderId = new ObjectId(req.params.orderId);
    const userId = new ObjectId(req.session.userId);

    // 獲取訂單信息並關聯香水數據
    const order = await db.collection("orders").findOne({
      _id: orderId,
      userId: userId,
    });

    if (!order) {
      return res.status(404).send("訂單不存在");
    }

    // 獲取訂單中所有香水的詳細信息
    const perfumeIds = order.items.map((item) => new ObjectId(item.perfumeId));
    const perfumes = await db
      .collection("perfumes")
      .find({ _id: { $in: perfumeIds } })
      .toArray();

    // 將香水信息添加到訂單項目中
    const itemsWithDetails = order.items.map((item) => {
      const perfume = perfumes.find(
        (p) => p._id.toString() === item.perfumeId.toString()
      );
      return {
        ...item,
        name: perfume.name,
        image: perfume.image,
        price: perfume.price,
      };
    });

    // 更新訂單對象
    order.items = itemsWithDetails;

    res.render("member-order-detail", {
      title: "訂單詳情",
      order: order,
    });
  } catch (error) {
    console.error("獲取訂單詳情失敗：", error);
    res.status(500).send("獲取訂單詳情失敗");
  }
});

module.exports = router;
