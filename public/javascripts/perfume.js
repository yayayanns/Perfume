document.addEventListener("DOMContentLoaded", async () => {
  await loadPerfumes("/perfume/api/perfumes", (perfumes) => {
    displayPerfumes(perfumes, ".perfume-grid");
  });

  initializeFilters();
  setupSearch();

  if (document.querySelector(".perfume-detail")) {
    initializeDetailPage();
  }
});

let currentPerfumes = [];

async function loadPerfumes(type = "all") {
  try {
    const response = await fetch(
      type === "all"
        ? "/perfume/api/perfumes"
        : `/perfume/api/perfumes/filter/${type}`
    );
    const perfumes = await response.json();
    currentPerfumes = perfumes;
    displayPerfumes(perfumes);
  } catch (error) {
    console.error("載入香水失敗:", error);
  }
}

function displayPerfumes(perfumes) {
  const grid = document.querySelector(".perfume-grid");
  if (!grid) return;

  grid.innerHTML = perfumes
    .map(
      (perfume) => `
          <div class="perfume-card" data-id="${perfume._id}">
              <img src="${perfume.image}" alt="${perfume.name}" />
              <h3>${perfume.name}</h3>
              <p class="type">香調：${perfume.type}</p>
              <p class="price">HKD$ ${perfume.price}</p>
              <button class="add-to-cart" data-id="${perfume._id}">
                  <svg class="cart-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M9 20a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm7 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-7 2h7a2 2 0 0 0 2-2V6H6v14a2 2 0 0 0 2 2zM3 6h18l-3 13H6L3 6z"/>
                  </svg>
                  加入購物車
              </button>
          </div>
      `
    )
    .join("");
  setupAddToCartButtons();
}

function addToCart(perfumeId) {
  console.log(`正在添加香水，ID: ${perfumeId}`);

  fetch("/cart/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ perfumeId: perfumeId }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        window.location.href = "/cart";
      } else {
        console.error(data.message);
        alert("加入購物車失敗，請稍後再試");
      }
    })
    .catch((error) => {
      console.error("加入購物車出錯:", error);
      alert("加入購物車失敗，請稍後再試");
    });
}

function setupAddToCartButtons() {
  const cartButtons = document.querySelectorAll(".add-to-cart");
  cartButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      // 添加日誌查看 ID 是否正確
      const perfumeId = event.currentTarget.dataset.id;
      console.log("正在添加商品，ID:", perfumeId);

      if (perfumeId) {
        button.disabled = true;
        addToCart(perfumeId);
        setTimeout(() => {
          button.disabled = false;
        }, 1000);
      }
    });
  });
}

function addToCart(perfumeId) {
  console.log("發送數據:", { perfumeId });

  // 檢查是否為會員（可以通過檢查特定的元素來判斷）
  const isMember = document
    .querySelector(".nav-link")
    ?.textContent.includes("登出");
  const cartEndpoint = isMember ? "/member/cart/add" : "/cart/add";

  fetch(cartEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ perfumeId }),
  })
    .then((response) => {
      console.log("響應狀態:", response.status);
      return response.json();
    })
    .then((data) => {
      console.log("伺服器響應:", data);
      if (data.success) {
        // 根據是否為會員決定重定向的頁面
        window.location.href = isMember ? "/member/cart" : "/cart";
      } else {
        throw new Error(data.message || "加入購物車失敗");
      }
    })
    .catch((error) => {
      console.error("錯誤:", error);
      alert("加入購物車失敗，請稍後再試");
    });
}
