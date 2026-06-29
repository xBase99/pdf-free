const isPremium = false;

function insertAds() {
  if (isPremium) return;

  // 모바일(640px 이하)에서만 하단 광고 삽입
  // PC는 사이드바 광고만 사용
  const isMobile = window.innerWidth <= 640;
  if (!isMobile) return;

  const adHTML = `
    <div class="ad-section">
      <a href="https://www.trip.com/t/zGQ0YJsVIV2" target="_blank" rel="noopener">
        <img src="trip_ad_banner.png" alt="Trip.com 광고" />
      </a>
    </div>
  `;

  const footer = document.querySelector('.footer');
  if (footer) {
    footer.insertAdjacentHTML('afterend', adHTML);
  } else {
    document.body.insertAdjacentHTML('beforeend', adHTML);
  }
}

window.addEventListener('DOMContentLoaded', insertAds);
