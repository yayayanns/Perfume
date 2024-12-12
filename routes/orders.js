// const express = require("express");
// const { ObjectId } = require("mongodb");
// const router = express.Router();
// const { getDB } = require("./db");

// // 幫助函數：檢查訂單是否屬於當前用戶
// const checkUserAccess = (order, sessionUserId) => {
//   if (
//     order.userId &&
//     sessionUserId &&
//     order.userId.toString() !== sessionUserId
//   ) {
//     throw new Error("無權訪問此訂單");
//   }
// };

// // 獲取當前用戶的所有訂單
// router.get("/", async (req, res) => {
//   try {
//     const userId = req.session.userId;
//     if (!userId) {
//       req.session.returnTo = "/orders";
//       return res.redirect("/member/login");
//     }

//     const db = await getDB();
//     const orders = await db
//       .collection("orders")
//       .find({ userId: new ObjectId(userId) })
//       .toArray();

//     const processedOrders = orders.map((order) => ({
//       ...order,
//       orderNumber: order._id.toString().slice(-6),
//       totalAmount: order.totalPrice || 0,
//       status: order.status || "處理中",
//     }));

//     res.render("orders", { orders: processedOrders });
//   } catch (error) {
//     console.error("無法獲取訂單：", error);
//     res.status(500).render("error", {
//       message: "無法獲取訂單",
//       error,
//     });
//   }
// });

// // 訪客訂單查詢頁面
// router.get("/guest/lookup", (req, res) => {
//   res.render("order-lookup", {
//     error: null,
//     isGuest: true,
//   });
// });

// // 訪客訂單查詢處理
// router.get("/guest", async (req, res) => {
//   try {
//     const { orderNumber } = req.query;

//     if (!orderNumber) {
//       return res.redirect("/orders/guest/lookup");
//     }

//     const db = await getDB();
//     const order = await db.collection("orders").findOne({ orderNumber });

//     if (!order) {
//       return res.render("order-lookup", {
//         error: "找不到此訂單編號",
//         orderNumber,
//         isGuest: true,
//       });
//     }

//     // 安全地取得商品詳情
//     const perfumeIds = order.items
//       .map((item) => {
//         try {
//           return new ObjectId(item.perfume._id);
//         } catch (err) {
//           console.error("Invalid perfume ID:", err);
//           return null;
//         }
//       })
//       .filter((id) => id !== null);

//     const perfumes = await db
//       .collection("perfumes")
//       .find({ _id: { $in: perfumeIds } })
//       .toArray();

//     order.products = perfumes || [];

//     res.render("order-detail", {
//       order,
//       isGuest: true,
//     });
//   } catch (error) {
//     console.error("查詢失敗:", error);
//     res.status(500).render("error", {
//       message: "查詢失敗，請稍後再試",
//       error: process.env.NODE_ENV === "development" ? error : {},
//     });
//   }
// });

// // 獲取單個訂單詳情
// router.get("/:orderId", async (req, res) => {
//   try {
//     const db = await getDB();
//     const { orderId } = req.params;

//     if (!ObjectId.isValid(orderId)) {
//       return res.status(400).render("error", { message: "無效的訂單ID格式" });
//     }

//     let order = await db.collection("orders").findOne({ orderNumber: orderId });
//     if (!order) {
//       order = await db
//         .collection("orders")
//         .findOne({ _id: new ObjectId(orderId) });
//     }

//     if (!order) {
//       return res.status(404).render("error", { message: "找不到訂單" });
//     }

//     try {
//       checkUserAccess(order, req.session.userId);
//     } catch (err) {
//       return res.status(403).render("error", { message: err.message });
//     }

//     const perfumeIds = order.items.map(
//       (item) => new ObjectId(item.perfume._id)
//     );
//     const perfumes = await db
//       .collection("perfumes")
//       .find({ _id: { $in: perfumeIds } })
//       .toArray();

//     order.products = perfumes;

//     res.render("order-detail", { order });
//   } catch (error) {
//     console.error("獲取訂單詳情失敗：", error);
//     res.status(500).render("error", {
//       message: "獲取訂單詳情失敗",
//       error,
//     });
//   }
// });

// module.exports = router;

const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();
const { getDB } = require("./db");

// 幫助函數：檢查訂單是否屬於當前用戶
const checkUserAccess = (order, sessionUserId) => {
  if (
    order.userId &&
    sessionUserId &&
    order.userId.toString() !== sessionUserId
  ) {
    throw new Error("無權訪問此訂單");
  }
};

// 獲取當前用戶的所有訂單
router.get("/", async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      req.session.returnTo = "/orders";
      return res.redirect("/member/login");
    }

    const db = await getDB();
    const orders = await db
      .collection("orders")
      .find({ userId: new ObjectId(userId) })
      .toArray();

    const processedOrders = orders.map((order) => ({
      ...order,
      orderNumber: order._id.toString().slice(-6),
      totalAmount: order.totalPrice || 0,
      status: order.status || "處理中",
    }));

    res.render("orders", { orders: processedOrders });
  } catch (error) {
    console.error("無法獲取訂單：", error);
    res.status(500).render("error", {
      message: "無法獲取訂單",
      error,
    });
  }
});

// 訪客訂單查詢頁面
router.get("/guest/lookup", (req, res) => {
  res.render("order-lookup", {
    error: null,
    isGuest: true,
  });
});

// 訪客訂單查詢處理
router.get("/guest", async (req, res) => {
  try {
    const { orderNumber } = req.query;

    if (!orderNumber) {
      return res.redirect("/orders/guest/lookup");
    }

    const db = await getDB();
    const order = await db.collection("orders").findOne({ orderNumber });

    if (!order) {
      return res.render("order-lookup", {
        error: "找不到此訂單編號",
        orderNumber,
        isGuest: true,
      });
    }

    // 直接使用訂單中的資訊
    const orderWithDetails = {
      ...order,
      items: order.items.map((item) => ({
        perfume: item.perfume,
        quantity: item.quantity || 1,
      })),
    };

    // 確保配送資訊完整
    console.log("訂單配送資訊：", order.shipping);

    // 渲染訂單詳情頁面
    res.render("order-detail", {
      order: orderWithDetails,
      isGuest: true,
    });
  } catch (error) {
    console.error("查詢失敗:", error);
    res.status(500).render("error", {
      message: "查詢失敗，請稍後再試",
      error: process.env.NODE_ENV === "development" ? error : {},
    });
  }
});

// 獲取單個訂單詳情
router.get("/:orderId", async (req, res) => {
  try {
    const db = await getDB();
    const { orderId } = req.params;

    if (!ObjectId.isValid(orderId)) {
      return res.status(400).render("error", { message: "無效的訂單ID格式" });
    }

    let order = await db.collection("orders").findOne({ orderNumber: orderId });
    if (!order) {
      order = await db
        .collection("orders")
        .findOne({ _id: new ObjectId(orderId) });
    }

    if (!order) {
      return res.status(404).render("error", { message: "找不到訂單" });
    }

    try {
      checkUserAccess(order, req.session.userId);
    } catch (err) {
      return res.status(403).render("error", { message: err.message });
    }

    // 直接使用訂單資訊，不需要重新查詢商品
    const orderWithDetails = {
      ...order,
      items: order.items.map((item) => ({
        perfume: item.perfume,
        quantity: item.quantity || 1,
      })),
    };

    res.render("order-detail", {
      order: orderWithDetails,
      isGuest: false,
    });
  } catch (error) {
    console.error("獲取訂單詳情失敗：", error);
    res.status(500).render("error", {
      message: "獲取訂單詳情失敗",
      error,
    });
  }
});

module.exports = router;
