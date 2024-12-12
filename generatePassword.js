const bcrypt = require("bcrypt");
const saltRounds = 10;
const plainPassword = "admin1234";
bcrypt.hash(plainPassword, saltRounds).then((hash) => {
  console.log("你的密碼是:", plainPassword);
  console.log("加密後的密碼是:", hash);
});
