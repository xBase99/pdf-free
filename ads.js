const isPremium = false;  // 무료 버전 → 광고 표시

const TRIP_AD_LINK = "https://www.trip.com/t/zGQ0YJsVIV2";
const TRIP_AD_IMG = "trip_ad_banner.png";

function insertAds() {
  if (isPremium) return;

  const adHTML = `
    <div class="ad-section">
      <a href="${TRIP_AD_LINK}" target="_blank">
        <img src="${TRIP_AD_IMG}" class="ad-banner">
      </a>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", adHTML);
}

window.addEventListener("DOMContentLoaded", insertAds);
