const express = require("express");
const { ObjectId } = require("mongodb");
const router = express.Router();
const { getDB } = require("./db");

// 香調中英文映射表
const fragranceTypeMap = {
  woody: "木質調",
  floral: "花香調",
  fresh: "清新調",
  oriental: "東方調",
  citrus: "柑橘調",
  green: "綠植調",
  fruity: "果香調",
  sweet: "甜香調",
  marine: "海洋調",
  spicy: "辛香調",
};

router.get("/start", (req, res) => {
  res.render("quiz/start");
});

// 顯示測驗問題頁面
router.get("/question", async (req, res) => {
  try {
    const db = await getDB();
    if (!db) throw new Error("無法連接到資料庫");

    const questions = await db.collection("quiz_questions").find().toArray();
    console.log("Questions fetched from database:", questions);
    res.render("quiz/question", { questions });
  } catch (error) {
    console.error("無法獲取測驗問題：", error);
    res.status(500).send("無法獲取測驗問題");
  }
});

// 提交測驗結果
router.post("/result", async (req, res) => {
  try {
    const answers = req.body;
    const db = await getDB();
    const questions = await db.collection("quiz_questions").find().toArray();

    // 計算分數
    const scores = {
      woody: 0,
      floral: 0,
      fresh: 0,
      oriental: 0,
      citrus: 0,
    };

    // 保存用戶的具體答案
    const userAnswers = [];

    // 計算每種香調的得分並保存答案
    Object.keys(answers).forEach((key) => {
      const questionIndex = parseInt(key.replace("q", ""));
      const answerIndex = parseInt(answers[key]);
      const question = questions[questionIndex];

      if (question) {
        userAnswers.push({
          questionText: question.text,
          selectedOption: question.options[answerIndex],
          questionId: question._id,
        });

        if (question.scores[answerIndex]) {
          Object.entries(question.scores[answerIndex]).forEach(
            ([type, score]) => {
              scores[type] = (scores[type] || 0) + score;
            }
          );
        }
      }
    });

    // 找出最高分的香調並轉換為中文
    let maxScore = 0;
    let dominantType = "";
    Object.entries(scores).forEach(([type, score]) => {
      if (score > maxScore) {
        maxScore = score;
        dominantType = type;
      }
    });

    // 轉換為中文香調名稱
    const chineseDominantType = fragranceTypeMap[dominantType];

    // 香調描述
    const typeDescriptions = {
      woody: {
        type: "木質調愛好者",
        description: "您偏好沉穩的木質香調，展現出成熟穩重的特質。",
      },
      floral: {
        type: "花香調愛好者",
        description: "您具有浪漫優雅的氣質，偏愛花香調的香水。",
      },
      fresh: {
        type: "清新調愛好者",
        description: "您充滿活力與朝氣，喜歡清新怡人的香調。",
      },
      oriental: {
        type: "東方調愛好者",
        description: "您具有神秘感和獨特魅力，偏好東方調的香水。",
      },
      citrus: {
        type: "柑橘調愛好者",
        description: "您是個開朗活潑的人，喜歡充滿活力的柑橘香調。",
      },
    };

    // 獲取推薦香水 - 使用中文香調名稱
    let recommendations = await db
      .collection("perfumes")
      .find({
        type: chineseDominantType,
      })
      .limit(3)
      .toArray();

    // 如果找不到足夠的推薦，獲取次高分香調的推薦
    if (recommendations.length < 3) {
      console.log("主要香調推薦不足，尋找次要香調推薦");

      // 獲取前三高分的香調
      const topTypes = Object.entries(scores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([type]) => fragranceTypeMap[type]); // 轉換為中文

      const additionalRecommendations = await db
        .collection("perfumes")
        .find({
          type: { $in: topTypes },
          _id: { $nin: recommendations.map((r) => r._id) },
        })
        .limit(3 - recommendations.length)
        .toArray();

      recommendations = [...recommendations, ...additionalRecommendations];
    }

    // 如果還是不夠，補充隨機推薦
    if (recommendations.length < 3) {
      console.log("找不到足夠的匹配香水，補充隨機推薦");
      const randomRecommendations = await db
        .collection("perfumes")
        .aggregate([
          {
            $match: {
              _id: { $nin: recommendations.map((r) => r._id) },
            },
          },
          { $sample: { size: 3 - recommendations.length } },
        ])
        .toArray();

      recommendations = [...recommendations, ...randomRecommendations];
    }

    // 創建結果文檔
    const quizResult = {
      userId: req.session?.userId || null,
      createdAt: new Date(),
      answers: userAnswers,
      scores: scores,
      dominantType: chineseDominantType,
      resultType: typeDescriptions[dominantType].type,
      resultDescription: typeDescriptions[dominantType].description,
      recommendations: recommendations.map((r) => ({
        perfumeId: r._id,
        name: r.name,
        type: r.type,
        price: r.price,
      })),
    };

    // 保存到數據庫
    const result = await db.collection("quiz_results").insertOne(quizResult);
    console.log(`保存測驗結果成功，ID: ${result.insertedId}`);

    // 渲染結果頁面
    res.render("quiz/result", {
      scores,
      result: typeDescriptions[dominantType],
      recommendations,
      resultId: result.insertedId,
    });
  } catch (error) {
    console.error("處理測驗結果失敗：", error);
    res.status(500).render("error", {
      message: "處理測驗結果失敗",
      error,
    });
  }
});

// 添加一個路由來查看歷史結果
router.get("/history", async (req, res) => {
  try {
    const db = await getDB();
    const results = await db
      .collection("quiz_results")
      .find({ userId: req.session?.userId })
      .sort({ createdAt: -1 })
      .toArray();

    res.render("quiz/history", { results });
  } catch (error) {
    console.error("獲取歷史記錄失敗：", error);
    res.status(500).render("error", {
      message: "獲取歷史記錄失敗",
      error,
    });
  }
});

module.exports = router;
