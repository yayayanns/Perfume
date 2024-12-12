// 引入 mongodb
const { MongoClient, ObjectId } = require("mongodb");

// 資料庫連線設定
const url = "mongodb://127.0.0.1:27017";
const dbName = "perfume_system";
let db = null;

// 建立資料庫連線
const client = new MongoClient(url);

// 連線到資料庫
async function connectDB() {
  try {
    await client.connect();
    console.log("成功連線到資料庫！");
    return client.db(dbName);
  } catch (error) {
    console.log("連線資料庫時發生錯誤：", error);
    throw error;
  }
}

// 獲取資料庫連接
async function getDB() {
  if (!db) {
    db = await connectDB();
  }
  return db;
}

module.exports = {
  connectDB,
  getDB,
  ObjectId,
};

