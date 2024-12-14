document.addEventListener("DOMContentLoaded", function () {
  // 購物車按鈕點擊處理
  const cartBtn = document.querySelector(".cart-btn");

  if (cartBtn) {
    cartBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      try {
        // 檢查登入狀態
        const response = await fetch("/check-auth");
        const data = await response.json();

        if (data.isLoggedIn) {
          // 如果是會員，跳轉到會員購物車
          window.location.href = "/member/cart";
        } else {
          // 如果是訪客，跳轉到訪客購物車
          window.location.href = "/cart"; // 修改為正確的訪客購物車路徑
        }
      } catch (error) {
        console.error("檢查登入狀態失敗:", error);
        // 發生錯誤時預設導向訪客購物車
        window.location.href = "/cart"; // 修改為正確的訪客購物車路徑
      }
    });
  }
});
