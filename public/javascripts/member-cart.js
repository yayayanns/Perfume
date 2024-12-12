document.addEventListener("DOMContentLoaded", function () {
  // 綁定會員購物車按鈕事件
  const addToMemberCartButtons =
    document.querySelectorAll(".add-to-membercart");

  addToMemberCartButtons.forEach((button) => {
    button.addEventListener("click", async function (e) {
      e.preventDefault();

      const perfumeId = this.dataset.id;
      const perfumeName = this.dataset.name;

      try {
        // 修改這裡的路徑
        const response = await fetch("/member/cart/add", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            perfumeId: perfumeId,
          }),
        });

        const result = await response.json();

        if (response.status === 401) {
          window.location.href = "/member/login";
          return;
        }

        if (result.success) {
          // 更新購物車數量顯示
          const cartCountElement = document.getElementById("cartCount");
          if (cartCountElement) {
            cartCountElement.textContent =
              Number(cartCountElement.textContent || 0) + 1;
          }
          alert(`${perfumeName} 已加入會員購物車！`);
        } else {
          alert(result.message || "加入購物車失敗");
        }
      } catch (error) {
        console.error("加入會員購物車失敗:", error);
        alert("加入購物車時發生錯誤，請稍後再試");
      }
    });
  });

  // 更新購物車數量顯示路徑也要修改
  const updateCartCount = async () => {
    try {
      const response = await fetch("/member/cart/count");
      const data = await response.json();

      if (data.success) {
        const cartCountElement = document.getElementById("cartCount");
        if (cartCountElement) {
          cartCountElement.textContent = data.count;
        }
      }
    } catch (error) {
      console.error("更新購物車數量失敗:", error);
    }
  };

  // 頁面載入時更新購物車數量
  updateCartCount();
});
