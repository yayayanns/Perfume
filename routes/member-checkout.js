const express = require("express");
const router = express.Router();
const { getDB } = require("./db");
const { ObjectId } = require("mongodb");

router.get("/", async (req, res) => {
  try {
    const userId = new ObjectId(req.session.userId);
    const db = await getDB();

    // 獲取購物車內容
    const cart = await db.collection("member_carts").findOne({
      userId: userId,
      status: "active",
    });

    if (!cart || !cart.items || cart.items.length === 0) {
      return res.redirect("/member/cart");
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
      const discountedPrice = Math.round(originalPrice * memberDiscount);
      
      return {
        _id: perfume._id,
        name: perfume.name,
        image: perfume.image,
        originalPrice: originalPrice,
        discountedPrice: discountedPrice,
        quantity: item.quantity,
        subtotal: discountedPrice * item.quantity
      };
    });

    const totalPrice = cartItems.reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0);
    const discountedTotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    const totalSaved = totalPrice - discountedTotal;

    // 獲取會員資料（如果有儲存的配送資訊）
    const user = await db.collection("users").findOne({ _id: userId });

    res.render("member-checkout", {
      cartItems,
      totalPrice,
      discountedTotal,
      totalSaved,
      memberDiscount,
      savedAddress: user.address, // 如果有儲存的地址
      savedPhone: user.phone     // 如果有儲存的電話
    });

  } catch (error) {
    console.error("結帳頁面載入失敗：", error);
    res.status(500).render("error", { message: "無法載入結帳頁面" });
  }
});

// 處理結帳
router.post("/process", async (req, res) => {
  try {
    const userId = new ObjectId(req.session.userId);
    const db = await getDB();
    const { 
      shippingName, 
      shippingPhone, 
      shippingAddress,
      cardName,
      cardNumber,
      cardExpiry,
      cardCVV
    } = req.body;

    // 獲取購物車內容
    const cart = await db.collection("member_carts").findOne({
      userId: userId,
      status: "active"
    });

    if (!cart) {
      return res.status(400).json({ success: false, message: "購物車為空" });
    }

    // 創建訂單
    const order = {
      userId: userId,
      items: cart.items,
      shipping: {
        name: shippingName,
        phone: shippingPhone,
        address: shippingAddress
      },
      payment: {
        cardLast4: cardNumber.slice(-4),
        cardName: cardName
      },
      status: "pending",
      createdAt: new Date(),
      totalAmount: req.body.totalAmount,
      discountedAmount: req.body.discountedAmount
    };

    // 儲存訂單
    const orderResult = await db.collection("orders").insertOne(order);
    const orderId = orderResult.insertedId;

    // 清空購物車
    await db.collection("member_carts").updateOne(
      { userId: userId },
      { $set: { items: [] } }
    );

    // 返回成功信息，包含訂單ID
    res.json({ 
      success: true, 
      message: "訂單建立成功",
      orderId: orderId,
      totalAmount: order.totalAmount
    });

  } catch (error) {
    console.error("結帳失敗：", error);
    res.status(500).json({ success: false, message: "結帳失敗，請稍後再試" });
  }
});

module.exports = router;
