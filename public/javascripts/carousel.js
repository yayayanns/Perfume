document.addEventListener("DOMContentLoaded", () => {
  const carouselTrack = document.querySelector(".carousel-track");
  const prevButton = document.querySelector(".carousel-nav.prev");
  const nextButton = document.querySelector(".carousel-nav.next");

  let currentIndex = 0;

  const updateCarousel = () => {
    const cardWidth = carouselTrack.children[0].getBoundingClientRect().width;
    carouselTrack.style.transform = `translateX(-${
      currentIndex * cardWidth
    }px)`;
  };

  // 按鈕事件
  prevButton.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      updateCarousel();
    }
  });

  nextButton.addEventListener("click", () => {
    if (currentIndex < carouselTrack.children.length - 1) {
      currentIndex++;
      updateCarousel();
    }
  });

  // 確保會員名字正確顯示
  const memberName = document.querySelector(".member-name");
  if (!memberName || !memberName.innerText.trim()) {
    console.error("會員名字未正確加載！");
  }
});
