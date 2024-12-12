const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { getDB } = require("./db");

// 配置 multer 來處理文件上傳
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "public/uploads/perfumes";
    // 確保上傳目錄存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一的文件名
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    // 只允許上傳圖片
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error("只允許上傳圖片文件！"), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 限制5MB
  },
});

// 顯示管理頁面
router.get("/admin", async (req, res) => {
  try {
    const db = await getDB();
    const perfumes = await db.collection("perfumes").find().toArray();
    res.render("admin-perfume", { perfumes });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).render("error", { message: "獲取數據失敗" });
  }
});

// 處理新增香水的 POST 請求
router.post("/admin/add", upload.single("image"), async (req, res) => {
  console.log("收到新增香水請求");
  console.log("表單數據:", req.body);
  console.log("上傳的文件:", req.file);

  try {
    const db = await getDB();

    // 獲取當前最大的 id
    const maxIdPerfume = await db
      .collection("perfumes")
      .find()
      .sort({ id: -1 })
      .limit(1)
      .toArray();
    const nextId = maxIdPerfume.length > 0 ? maxIdPerfume[0].id + 1 : 1;

    const newPerfume = {
      id: nextId,
      name: req.body.name,
      type: req.body.type,
      price: parseInt(req.body.price),
      image: `/uploads/perfumes/${req.file.filename}`, // 保存相對路徑
      description: req.body.description,
    };

    console.log("準備插入的新香水數據:", newPerfume);

    await db.collection("perfumes").insertOne(newPerfume);
    console.log("新香水數據已插入");

    res.redirect("/perfume/admin");
  } catch (error) {
    console.error("新增香水失敗:", error);
    res.status(500).render("error", {
      message: "新增香水失敗",
      error: error,
    });
  }
});

// 處理編輯香水頁面的 GET 請求
router.get("/admin/edit/:id", async (req, res) => {
  try {
    const db = await getDB();
    const perfume = await db.collection("perfumes").findOne({
      id: parseInt(req.params.id),
    });

    if (!perfume) {
      return res.status(404).render("error", {
        message: "找不到此香水",
        error: { status: 404 },
      });
    }

    console.log("找到香水:", perfume);
    res.render("admin-perfume-edit", { perfume });
  } catch (error) {
    console.error("獲取香水資料錯誤:", error);
    res.status(500).render("error", {
      message: "獲取香水資料失敗",
      error: error,
    });
  }
});

// 處理編輯香水的 POST 請求
router.post("/admin/edit/:id", upload.single("image"), async (req, res) => {
  try {
    const db = await getDB();
    const perfumeId = parseInt(req.params.id);

    // 獲取原有香水資料
    const oldPerfume = await db
      .collection("perfumes")
      .findOne({ id: perfumeId });

    // 準備更新數據
    const updateData = {
      name: req.body.name,
      type: req.body.type,
      price: parseInt(req.body.price),
      description: req.body.description,
    };

    // 如果上傳了新圖片
    if (req.file) {
      // 刪除舊圖片
      const oldImagePath = path.join(
        __dirname,
        "..",
        "public",
        oldPerfume.image
      );
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
      // 更新圖片路徑
      updateData.image = `/uploads/perfumes/${req.file.filename}`;
    }

    // 更新數據庫
    await db
      .collection("perfumes")
      .updateOne({ id: perfumeId }, { $set: updateData });

    res.redirect("/perfume/admin");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).render("error", {
      message: "更新香水資料失敗",
      error: error,
    });
  }
});

// 處理刪除香水的請求
router.delete("/admin/delete/:id", async (req, res) => {
  try {
    const db = await getDB();
    const perfume = await db.collection("perfumes").findOne({
      id: parseInt(req.params.id),
    });

    if (!perfume) {
      return res.status(404).json({
        success: false,
        message: "找不到此香水",
      });
    }

    // 刪除圖片文件
    if (perfume.image) {
      const imagePath = path.join(__dirname, "..", "public", perfume.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // 從數據庫中刪除記錄
    await db.collection("perfumes").deleteOne({ id: parseInt(req.params.id) });

    res.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      success: false,
      message: "刪除失敗",
    });
  }
});

router.get("/api/perfumes/random", async (req, res) => {
  try {
    const db = await getDB();
    const allPerfumes = await db.collection("perfumes").find().toArray();

    if (allPerfumes.length < 2) {
      return res.json(allPerfumes);
    }

    const indices = new Set();
    while (indices.size < 2) {
      const randomIndex = Math.floor(Math.random() * allPerfumes.length);
      indices.add(randomIndex);
    }

    const selectedPerfumes = Array.from(indices).map(
      (index) => allPerfumes[index]
    );
    console.log("返回的隨機香水:", selectedPerfumes);
    res.json(selectedPerfumes);
  } catch (error) {
    console.error("獲取隨機香水失敗:", error);
    res.status(500).json({ error: "伺服器錯誤" });
  }
});

// 根據類型篩選香水
router.get("/api/perfumes/filter/:type", async (req, res) => {
  try {
    const db = await getDB();
    const type = req.params.type;
    const query = type === "all" ? {} : { type: type };
    const perfumes = await db.collection("perfumes").find(query).toArray();
    res.json(perfumes);
  } catch (error) {
    console.error("篩選香水失敗:", error);
    res.status(500).json({ message: "篩選香水失敗" });
  }
});

// 顯示香水詳情
router.get("/detail/:id", async (req, res) => {
  try {
    const db = await getDB();
    const perfume = await db.collection("perfumes").findOne({
      id: parseInt(req.params.id),
    });

    if (!perfume) {
      return res.status(404).render("error", {
        message: "找不到此香水",
        error: { status: 404 },
      });
    }

    res.render("perfume-detail", { perfume });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).render("error", {
      message: "獲取香水詳情失敗",
      error: error,
    });
  }
});

// 初始化香水數據的路由
router.get("/init-perfumes", async (req, res) => {
  try {
    console.log("開始初始化香水數據...");
    const db = await getDB();
    console.log("資料庫連接成功");

    // 清空現有數據
    await db.collection("perfumes").deleteMany({});
    console.log("舊數據清除完成");

    // 初始香水數據
    const perfumes = [
      {
        id: 1,
        name: "晨露玫瑰",
        type: "花香調",
        price: 280,
        image: "/images/rose.jpg",
        description: "清新的玫瑰香氣，帶來早晨第一道曙光的感受",
      },
    ];

    // 插入新數據
    const result = await db.collection("perfumes").insertMany(perfumes);
    console.log("新數據插入成功，數量:", result.insertedCount);

    res.json({
      success: true,
      message: "香水數據初始化成功",
      count: result.insertedCount,
    });
  } catch (error) {
    console.error("初始化失敗:", error);
    res.status(500).json({
      success: false,
      message: "初始化數據失敗",
      error: error.message,
    });
  }
});

module.exports = router;
