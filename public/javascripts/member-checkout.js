document.addEventListener("DOMContentLoaded", function () {
  const checkoutForm = document.getElementById("checkout-form");
  
  if (checkoutForm) {
    checkoutForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      try {
        // 獲取表單數據
        const formData = new FormData(checkoutForm);
        const formDataObj = Object.fromEntries(formData.entries());

        console.log('提交結帳表單:', formDataObj); // 調試日誌

        // 發送結帳請求
        const response = await fetch("/member/checkout/process", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formDataObj),
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
          // 結帳成功，導向成功頁面
          window.location.href = `/member/orders/success?orderId=${data.orderId}&amount=${data.totalAmount}`;
        } else {
          // 顯示錯誤信息
          alert(data.message || "結帳失敗，請稍後再試");
        }
      } catch (error) {
        console.error("結帳失敗:", error);
        alert("系統錯誤，請稍後再試");
      }
    });
  }

  // 確認結帳按鈕的事件處理
  const confirmCheckoutBtn = document.querySelector(".confirm-checkout-btn");
  if (confirmCheckoutBtn) {
    confirmCheckoutBtn.addEventListener("click", async () => {
      try {
        const response = await fetch("/member/checkout/process", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          }
        });

        const data = await response.json();
        
        if (response.ok && data.success) {
          // 結帳成功，導向成功頁面
          window.location.href = `/member/orders/success?orderId=${data.orderId}&amount=${data.totalAmount}`;
        } else {
          alert(data.message || "結帳失敗");
        }
      } catch (error) {
        console.error("結帳失敗:", error);
        alert("結帳失敗，請稍後再試");
      }
    });
  }

  // 地址自動填充功能（如果需要）
  const sameAsShippingCheckbox = document.getElementById("sameAsShipping");
  if (sameAsShippingCheckbox) {
    sameAsShippingCheckbox.addEventListener("change", function() {
      if (this.checked) {
        // 複製送貨地址到帳單地址
        document.getElementById("billingAddress").value = document.getElementById("shippingAddress").value;
        document.getElementById("billingCity").value = document.getElementById("shippingCity").value;
        document.getElementById("billingPostal").value = document.getElementById("shippingPostal").value;
      }
    });
  }
}); 