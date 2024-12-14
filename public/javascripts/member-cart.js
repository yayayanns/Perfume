document.addEventListener("DOMContentLoaded", function () {
  // 數量控制功能
  const quantityControls = document.querySelectorAll(".quantity-control");

  quantityControls.forEach((control) => {
    const minusBtn = control.querySelector(".minus-btn");
    const plusBtn = control.querySelector(".plus-btn");
    const quantitySpan = control.querySelector(".quantity");
    const perfumeId = control.getAttribute("data-perfume-id");

    // 通用的數量更新函數
    const updateQuantity = async (action) => {
      try {
        if (!perfumeId) {
          alert("商品ID不存在");
          return;
        }

        const response = await fetch("/member/cart/update-quantity", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", // 添加這行確保發送 cookie
          body: JSON.stringify({
            perfumeId: perfumeId,
            action: action,
          }),
        });

        if (response.status === 401) {
          // 處理未登入情況
          alert("請先登入會員");
          window.location.href = "/member/login";
          return;
        }

        const data = await response.json();
        if (response.ok && data.success) {
          window.location.reload();
        } else {
          alert(data.message || "更新數量失敗");
        }
      } catch (error) {
        console.error(`更新數量失敗 (${action}):`, error);
        alert("更新數量失敗，請稍後再試");
      }
    };

    // 減少數量按鈕
    minusBtn &&
      minusBtn.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("點擊減少按鈕，商品ID:", perfumeId);
        updateQuantity("decrease");
      });

    // 增加數量按鈕
    plusBtn &&
      plusBtn.addEventListener("click", (e) => {
        e.preventDefault();
        console.log("點擊增加按鈕，商品ID:", perfumeId);
        updateQuantity("increase");
      });
  });

  // 刪除按鈕功能
  const deleteButtons = document.querySelectorAll(".delete-btn");
  deleteButtons.forEach((button) => {
    button.addEventListener("click", async (e) => {
      e.preventDefault();
      if (confirm("確定要刪除這個商品嗎？")) {
        try {
          const perfumeId = button.getAttribute("data-perfume-id");
          const response = await fetch("/member/cart/remove", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              perfumeId: perfumeId,
            }),
          });

          const data = await response.json();
          if (response.ok && data.success) {
            window.location.reload();
          } else {
            alert(data.message || "刪除失敗");
          }
        } catch (error) {
          console.error("刪除失敗:", error);
          alert("刪除失敗，請稍後再試");
        }
      }
    });
  });

  // 結帳按鈕功能
  const checkoutButton = document.querySelector(".checkout-btn");
  checkoutButton &&
    checkoutButton.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "/member/checkout";
    });
});
