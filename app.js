// 引入需要的套件
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var session = require("express-session");
var MongoStore = require("connect-mongo");

// 引入路由
var indexRouter = require("./routes/index");
var memberRouter = require("./routes/member");
var perfumeRouter = require("./routes/perfume");
var quizRouter = require("./routes/quiz");
var cartRoutes = require("./routes/cart");
var checkoutRouter = require("./routes/checkout");
var ordersRouter = require("./routes/orders");
var adminRouter = require("./routes/admin");
var { router: authRouter, isAdmin } = require("./routes/auth");
var memberCartRouter = require("./routes/member-cart");
var memberCheckoutRouter = require("./routes/member-checkout");
var memberOrdersRouter = require("./routes/member-orders");

var app = express();

// 設定 view engine
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// 使用中介軟體
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// 設定 session
app.use(
  session({
    secret: "mysecret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: "mongodb://localhost:27017/perfume",
      ttl: 24 * 60 * 60,
      autoRemove: "native",
    }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
    },
  })
);

// 設置全局變量
app.locals.baseUrl = process.env.BASE_URL || "http://localhost:3200";
// 添加全局中間件來檢查登入狀態
app.use((req, res, next) => {
  res.locals.isAuthenticated = !!req.session.userId;
  res.locals.username = req.session.username;
  next();
});

// 使用路由
app.use("/", indexRouter);
app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/quiz", quizRouter);
app.use("/member", memberRouter);
app.use("/perfume", perfumeRouter);
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
app.use("/cart", cartRoutes);
app.use("/checkout", checkoutRouter);
app.use("/orders", ordersRouter);
app.use("/member/cart", memberCartRouter);
app.use("/member/orders", memberOrdersRouter);
app.use("/member/checkout", memberCheckoutRouter);
app.use("/member/orders", memberOrdersRouter);

// 處理 404
app.use(function (req, res, next) {
  next(createError(404));
});

// 錯誤處理
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  res.render("error");
});

//讀取圖片
app.use(express.static("public"));

module.exports = app;
