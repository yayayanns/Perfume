// document.addEventListener("DOMContentLoaded", () => {
//   initNavbar();
//   loadRandomPerfumes();
//   updateCartCount();
// });

// // 導航欄初始化
// function initNavbar() {
//   const navbar = document.querySelector(".navbar");
//   window.addEventListener("scroll", () => {
//     if (window.scrollY > 50) {
//       navbar.style.backgroundColor = "rgba(255, 255, 255, 0.95)";
//       navbar.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
//     } else {
//       navbar.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
//       navbar.style.boxShadow = "none";
//     }
//   });
// }

// // 載入隨機香水
// async function loadRandomPerfumes() {
//   try {
//     const response = await fetch("/perfume/api/perfumes/random");
//     if (!response.ok) {
//       throw new Error("獲取香水資料失敗");
//     }
//     const perfumes = await response.json();
//     console.log("獲取到的隨機香水:", perfumes);
//     displayPerfumes(perfumes);
//   } catch (error) {
//     console.error("載入香水失敗:", error);
//     const grid = document.getElementById("perfume-grid");
//     if (grid) {
//       grid.innerHTML =
//         '<p class="error-message">無法載入香水資料，請稍後再試</p>';
//     }
//   }
// }

// document.addEventListener("DOMContentLoaded", () => {
//   async function updateCartCount() {
//     try {
//       const response = await fetch("/cart/count");
//       const data = await response.json();
//       const countBadge = document.querySelector(".floating-cart .cart-count");
//       if (countBadge) {
//         countBadge.textContent = data.count || 0;
//       }
//     } catch (error) {
//       console.error("無法更新購物車數量：", error);
//     }
//   }

//   // 初始化購物車數量
//   updateCartCount();
// });
document.addEventListener("DOMContentLoaded", () => {
  initNavbar();
  loadRandomPerfumes();
  updateCartCount();
});

// 導航欄初始化
function initNavbar() {
  const navbar = document.querySelector(".navbar");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      navbar.style.backgroundColor = "rgba(255, 255, 255, 0.95)";
      navbar.style.boxShadow = "0 2px 5px rgba(0,0,0,0.1)";
    } else {
      navbar.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
      navbar.style.boxShadow = "none";
    }
  });
}

// 載入隨機香水
async function loadRandomPerfumes() {
  try {
    const response = await fetch("/perfume/api/perfumes/random");
    if (!response.ok) {
      throw new Error("獲取香水資料失敗");
    }
    const perfumes = await response.json();
    console.log("獲取到的隨機香水:", perfumes);
    displayPerfumes(perfumes);
  } catch (error) {
    console.error("載入香水失敗:", error);
    const grid = document.getElementById("perfume-grid");
    if (grid) {
      grid.innerHTML =
        '<p class="error-message">無法載入香水資料，請稍後再試</p>';
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  async function updateCartCount() {
    try {
      const response = await fetch("/cart/count");
      const data = await response.json();
      const countBadge = document.querySelector(".floating-cart .cart-count");
      if (countBadge) {
        countBadge.textContent = data.count || 0;
      }
    } catch (error) {
      console.error("無法更新購物車數量：", error);
    }
  }

  // 初始化購物車數量
  updateCartCount();
});
