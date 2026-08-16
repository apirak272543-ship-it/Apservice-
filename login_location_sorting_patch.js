/**
 * AP Service — Login Location Onboarding & Distance-Rating Store Sorting Patch
 * 1. Automatically requests customer location prompt upon opening the login view.
 * 2. Provides a persistent status banner with a retry button if permission is pending/denied.
 * 3. Sorts available stores by a combination of store rating and distance from current location.
 */
(function () {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);

  const validPoint = (point) => {
    const lat = Number(point?.lat);
    const lng = Number(point?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  };

  function distanceKm(origin, destination) {
    if (!validPoint(origin) || !validPoint(destination)) return null;
    const earthRadiusKm = 6371;
    const toRadians = (value) => (Number(value) * Math.PI) / 180;
    const dLat = toRadians(Number(destination.lat) - Number(origin.lat));
    const dLng = toRadians(Number(destination.lng) - Number(origin.lng));
    const lat1 = toRadians(origin.lat);
    const lat2 = toRadians(destination.lat);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  }

  function getCustomerLocation() {
    if (validPoint(window.AppState?.user?.location)) return window.AppState.user.location;
    if (validPoint(window.AppState?.draftLocations?.foodDelivery)) return window.AppState.draftLocations.foodDelivery;
    if (validPoint(window.AppState?.draftLocations?.pickup)) return window.AppState.draftLocations.pickup;
    try {
      const saved = JSON.parse(localStorage.getItem('apcx_customer_location') || 'null');
      if (validPoint(saved)) return saved;
    } catch (_) {}
    return null;
  }

  function saveCustomerLocation(location) {
    if (!validPoint(location)) return;
    window.AppState = window.AppState || {};
    window.AppState.user = window.AppState.user || {};
    window.AppState.user.location = location;
    window.AppState.draftLocations = window.AppState.draftLocations || {};
    window.AppState.draftLocations.foodDelivery = location;
    try {
      localStorage.setItem('apcx_customer_location', JSON.stringify(location));
      if (typeof Storage?.save === 'function') Storage.save();
    } catch (_) {}
  }

  function requestLoginLocation(isRetry = false) {
    const statusEl = $('#loginLocationStatus');
    if (!navigator.geolocation) {
      if (statusEl) statusEl.textContent = 'เบราว์เซอร์ของคุณไม่รองรับการระบุตำแหน่งอัตโนมัติ';
      return;
    }

    if (statusEl && !isRetry) statusEl.textContent = 'กำลังขออนุญาตเข้าถึงตำแหน่งปัจจุบันของคุณ…';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy || 0,
          capturedAt: new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }),
          capturedAtIso: new Date().toISOString(),
          source: 'login-geolocation'
        };
        saveCustomerLocation(location);
        if (statusEl) {
          statusEl.innerHTML = '🟢 <b>บันทึกตำแหน่งปัจจุบันของคุณเรียบร้อยแล้ว</b> · ระบบพร้อมจัดเรียงร้านค้าใกล้คุณที่สุด';
          statusEl.style.color = 'var(--brand)';
        }
        const banner = $('#loginLocationBanner');
        if (banner) banner.classList.add('location-granted');
      },
      (error) => {
        console.warn('Geolocation prompt error/denial:', error.message);
        if (statusEl) {
          statusEl.innerHTML = '⚠️ <b>ยังไม่ได้อนุญาตตำแหน่ง</b> · กรุณากดปุ่มด้านล่างเพื่ออนุญาตให้เข้าถึงตำแหน่งสำหรับเรียงร้านค้าใกล้คุณ';
          statusEl.style.color = 'var(--danger)';
        }
      },
      { timeout: 12000, maximumAge: 60000, enableHighAccuracy: true }
    );
  }

  function ensureLoginLocationWidget() {
    const loginCard = $('#view-login .login-card') || $('#view-login form') || $('#view-login .panel');
    if (!loginCard || $('#loginLocationBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'loginLocationBanner';
    banner.className = 'location-onboarding-banner';
    banner.innerHTML = `
      <div style="display:flex;align-items:flex-start;gap:11px">
        <span style="font-size:24px">📍</span>
        <div style="flex:1;text-align:left">
          <b style="display:block;font-size:12px;margin-bottom:2px">เปิดใช้พิกัดเพื่อเรียงร้านใกล้คุณ</b>
          <p id="loginLocationStatus" style="font-size:10px;color:var(--muted);margin:0 0 8px;line-height:1.4">ระบบจะใช้พิกัดเพื่อแสดงร้านอาหารและซูเปอร์มาร์เก็ตที่ใกล้ที่สุดและเรตติ้งดีที่สุดให้คุณก่อน</p>
          <button type="button" class="btn btn-main btn-small" onclick="window.APServiceLoginLocation.requestPermission()">📍 อนุญาตตำแหน่งทันที</button>
        </div>
      </div>
    `;
    loginCard.insertBefore(banner, loginCard.firstChild);
  }

  function sortStoresByRatingAndDistance(stores) {
    const userLocation = getCustomerLocation();
    return [...stores].sort((a, b) => {
      const ratingA = Number(a.rating || 0);
      const ratingB = Number(b.rating || 0);
      const distA = userLocation && validPoint(a.location) ? distanceKm(userLocation, a.location) : 999;
      const distB = userLocation && validPoint(b.location) ? distanceKm(userLocation, b.location) : 999;

      // Scoring: Higher rating is better, lower distance is better.
      // Score = Rating * 10 - Distance (Weighting proximity and quality)
      const scoreA = (ratingA * 10) - (distA * 1.5);
      const scoreB = (ratingB * 10) - (distB * 1.5);
      return scoreB - scoreA;
    });
  }

  function patchStoreOrdering() {
    const originalRows = window.customerStoreRows;
    if (typeof originalRows === 'function' && !originalRows.__sortedByLocation) {
      const wrapped = function (...args) {
        const stores = originalRows.apply(this, args);
        return sortStoresByRatingAndDistance(stores);
      };
      wrapped.__sortedByLocation = true;
      window.customerStoreRows = wrapped;
    }
  }

  function observe() {
    ensureLoginLocationWidget();
    patchStoreOrdering();
  }

  const style = document.createElement('style');
  style.textContent = `
    .location-onboarding-banner{border:1px solid #bce8e0;background:linear-gradient(135deg,#f3fdfb,#e7f8f4);border-radius:16px;padding:14px;margin-bottom:18px;box-shadow:0 4px 14px rgba(5,96,86,.08)}
    .location-onboarding-banner.location-granted{border-color:#a7e5db;background:#f9fffd}
  `;
  document.head.appendChild(style);

  const observer = new MutationObserver(observe);
  observer.observe(document.body, { childList: true, subtree: true });
  [0, 300, 1000].forEach((d) => setTimeout(observe, d));

  // Auto request on login view show if location not present yet
  const originalShowView = window.showView;
  if (typeof originalShowView === 'function' && !originalShowView.__loginLocationPatched) {
    window.showView = function (name, ...args) {
      const result = originalShowView.call(this, name, ...args);
      if (name === 'login') {
        ensureLoginLocationWidget();
        if (!getCustomerLocation()) requestLoginLocation(false);
      }
      return result;
    };
    window.showView.__loginLocationPatched = true;
  }

  window.APServiceLoginLocation = {
    requestPermission: () => requestLoginLocation(true),
    getCustomerLocation,
    sortStoresByRatingAndDistance
  };
})();
