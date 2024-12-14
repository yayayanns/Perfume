document.addEventListener("DOMContentLoaded", () => {
  // 獲取所有必要的元素
  const sortSelect = document.getElementById("sort-select");
  const filterType = document.getElementById("filter-type");
  const searchInput = document.getElementById("search-input");
  const perfumeGrid = document.querySelector(".perfume-grid");
  const perfumeCards = Array.from(document.querySelectorAll(".perfume-card"));

  // 搜尋功能
  searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.toLowerCase().trim();

    perfumeCards.forEach((card) => {
      const name = card.querySelector("h3").textContent.toLowerCase();
      const type = card.querySelector(".type").textContent.toLowerCase();
      const description = card
        .querySelector(".description")
        .textContent.toLowerCase();

      if (
        name.includes(searchTerm) ||
        type.includes(searchTerm) ||
        description.includes(searchTerm)
      ) {
        card.style.display = "";
      } else {
        card.style.display = "none";
      }
    });
  });

  // 排序功能
  sortSelect.addEventListener("change", () => {
    const sortBy = sortSelect.value;
    const sortedCards = [...perfumeCards].sort((a, b) => {
      const priceA = parseInt(
        a.querySelector(".price").textContent.replace("HKD$ ", "")
      );
      const priceB = parseInt(
        b.querySelector(".price").textContent.replace("HKD$ ", "")
      );
      const nameA = a.querySelector("h3").textContent;
      const nameB = b.querySelector("h3").textContent;

      switch (sortBy) {
        case "price-asc":
          return priceA - priceB;
        case "price-desc":
          return priceB - priceA;
        case "name-asc":
          return nameA.localeCompare(nameB);
        case "name-desc":
          return nameB.localeCompare(nameA);
        default:
          return 0;
      }
    });

    // 重新排列卡片
    perfumeGrid.innerHTML = "";
    sortedCards.forEach((card) => perfumeGrid.appendChild(card));
  });

  // 篩選功能
  filterType.addEventListener("change", () => {
    const selectedType = filterType.value;

    perfumeCards.forEach((card) => {
      const type = card.querySelector(".type").textContent;
      if (selectedType === "all" || type === selectedType) {
        card.style.display = "";
      } else {
        card.style.display = "none";
      }
    });
  });

  // 重置所有篩選和排序
  document.getElementById("reset-filters").addEventListener("click", () => {
    searchInput.value = "";
    sortSelect.value = "default";
    filterType.value = "all";

    perfumeCards.forEach((card) => {
      card.style.display = "";
    });

    // 恢復原始排序
    const originalOrder = perfumeCards.sort((a, b) => {
      return (
        Array.from(perfumeGrid.children).indexOf(a) -
        Array.from(perfumeGrid.children).indexOf(b)
      );
    });
    perfumeGrid.innerHTML = "";
    originalOrder.forEach((card) => perfumeGrid.appendChild(card));
  });

  // 添加商品到購物車
  async function addToCart(perfumeId) {
    try {
      // 檢查會員狀態
      const checkResponse = await fetch("/member/check-status");
      const statusResult = await checkResponse.json();

      if (statusResult.isMember) {
        // 會員購物車
        const response = await fetch("/member/cart/add", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ perfumeId: perfumeId }),
        });

        const result = await response.json();

        if (result.success) {
          alert("成功加入購物車！");
        } else {
          throw new Error(result.message);
        }
      } else {
        // 如果不是會員，顯示選項對話框
        const choice = confirm(
          "您目前不是會員。\n" +
            "按「確定」註冊成為會員享有折扣優惠\n" +
            "按「取消」繼續以訪客身份購物"
        );

        if (choice) {
          // 選擇註冊會員
          window.location.href = `/register?redirect=perfume&perfumeId=${perfumeId}`;
        } else {
          // 訪客購物車
          const response = await fetch("/cart/add", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ perfumeId: perfumeId }),
          });

          const result = await response.json();

          if (result.success) {
            alert("成功加入購物車！");
          } else {
            throw new Error(result.message);
          }
        }
      }
    } catch (error) {
      console.error("添加到購物車失敗:", error);
      alert("添加失敗，請稍後重試");
    }
  }
});
