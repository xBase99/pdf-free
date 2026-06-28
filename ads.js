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

  document.body.insertAdjacentHTML('beforeend', adHTML);
}

window.addEventListener('DOMContentLoaded', insertAds);
