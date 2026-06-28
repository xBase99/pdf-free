const isPremium = false;

function insertAds() {
  if (isPremium) return;

  const adHTML = `
    <div class="ad-section">
      <a href="https://www.trip.com/t/zGQ0YJsVIV2" target="_blank">
        <img src="trip_ad_banner.png" class="trip-banner">
      </a>
    </div>
  `;

  // body 끝 삽입 대신 footer 바로 앞에 삽입 → 문서 흐름 안에 위치
  const footer = document.querySelector('.footer');
  if (footer) {
    footer.insertAdjacentHTML('beforebegin', adHTML);
  } else {
    document.body.insertAdjacentHTML('beforeend', adHTML);
  }
}

window.addEventListener('DOMContentLoaded', insertAds);
