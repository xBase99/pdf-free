const isPremium = false;

// ── 언어 감지 헬퍼 ──
function getAdAltText() {
  const userLang = navigator.language || navigator.userLanguage;
  return userLang.startsWith('ko') ? 'Trip.com 광고' : 'Trip.com Ad';
}

function handleAds() {
  if (isPremium) return;

  const existingAd = document.querySelector('.ad-section');
  const isMobile = window.innerWidth <= 640;

  // PC 스크린(640px 초과)인 경우 기존 모바일 광고 제거
  if (!isMobile) {
    if (existingAd) existingAd.remove();
    return;
  }

  // 모바일 화면이고 이미 광고가 삽입되어 있다면 추가 작업 없음
  if (existingAd) return;

  // 모바일 전용 하단 광고 생성
  const altText = getAdAltText();
  const adContainer = document.createElement('div');
  adContainer.className = 'ad-section';
  adContainer.innerHTML = `
    <a href="https://www.trip.com/t/zGQ0YJsVIV2" target="_blank" rel="noopener">
      <img src="trip_ad_banner.png" alt="${altText}" />
    </a>
  `;

  const footer = document.querySelector('.footer');
  if (footer) {
    footer.insertAdjacentElement('afterend', adContainer);
  } else {
    document.body.appendChild(adContainer);
  }
}

// ── 이벤트 리스너 등록 ──
window.addEventListener('DOMContentLoaded', handleAds);

// 창 크기 변경 시에도 모바일/PC 모드에 맞게 광고 표시/제거
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(handleAds, 200);
});
