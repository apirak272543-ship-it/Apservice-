/**
 * AP Service — Supermarket category + coordinate distance patch
 *
 * Supermarkets use the existing Store / menu / cart / order flow. The only
 * difference is their store category (store-supermarket), so Admin can create
 * and manage them like normal stores while Customer gets a dedicated entry.
 */
(function () {
  'use strict';

  const SUPERMARKET_CATEGORY = 'store-supermarket';
  const SUPERMARKET_LABEL = 'ซูเปอร์มาร์เก็ต';
  const SUPERMARKET_ICON = '🛒';

  const $ = (selector) => document.querySelector(selector);
  const validPoint = (point) => {
    const lat = Number(point?.lat);
    const lng = Number(point?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  };

  function distanceKmBetweenPoints(origin, destination) {
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

  function storeCategoryText(store) {
    return `${store?.categoryId || ''} ${store?.category_id || ''} ${store?.categoryName || ''} ${store?.category_name || ''} ${store?.type || ''}`.toLowerCase();
  }

  function isSupermarket(store) {
    const raw = storeCategoryText(store);
    return raw.includes(SUPERMARKET_CATEGORY) || raw.includes('supermarket') || raw.includes('grocery') || raw.includes('ซูเปอร์มาร์เก็ต') || raw.includes('ซุปเปอร์มาร์เก็ต') || raw.includes('ร้านสะดวกซื้อ');
  }

  function ensureSupermarketAdminOption() {
    const select = $('#storeFormCategory');
    if (!select || select.querySelector(`option[value="${SUPERMARKET_CATEGORY}"]`)) return;
    const option = document.createElement('option');
    option.value = SUPERMARKET_CATEGORY;
    option.textContent = `${SUPERMARKET_ICON} ${SUPERMARKET_LABEL}`;
    select.appendChild(option);
  }

  function addHomeService() {
    const services = document.querySelector('.services');
    if (!services || $('#service-supermarket')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'service-supermarket';
    button.className = 'service';
    button.setAttribute('data-feature', 'supermarket');
    button.innerHTML = `<div class="service-icon">${SUPERMARKET_ICON}</div><h3>ซูเปอร์มาร์เก็ต</h3><p>เลือกซื้อสินค้าจากร้านซูเปอร์มาร์เก็ตเหมือนสั่งอาหาร</p>`;
    button.addEventListener('click', () => window.openSupermarkets?.());
    services.appendChild(button);
  }

  function addStoreCategoryCard() {
    const allStores = $('#allStores');
    if (!allStores || $('#supermarketCategoryCard')) return;
    const card = document.createElement('div');
    card.id = 'supermarketCategoryCard';
    card.className = 'panel supermarket-category-card';
    card.innerHTML = `<div class="service-icon">${SUPERMARKET_ICON}</div><div><h3>ซูเปอร์มาร์เก็ต</h3><p>เลือกร้านและสินค้าแบบเดียวกับร้านอาหาร</p></div><button type="button" class="btn btn-main btn-small">ดูร้านซูเปอร์มาร์เก็ต</button>`;
    card.querySelector('button').addEventListener('click', () => window.openSupermarkets?.());
    allStores.parentElement?.insertBefore(card, allStores);
  }

  function mountDistanceField() {
    const field = $('#errandDistance');
    if (!field) return;
    field.readOnly = true;
    field.setAttribute('aria-readonly', 'true');
    field.setAttribute('inputmode', 'none');
    field.title = 'ระบบคำนวณจากพิกัดจุดรับและจุดส่งอัตโนมัติ';
    field.closest('.field')?.classList.add('system-calculated-field');
    const label = field.closest('.field')?.querySelector('label');
    if (label) label.textContent = 'ระยะทางที่ระบบคำนวณ (กม.)';
    let hint = field.parentElement?.querySelector('.distance-system-hint');
    if (!hint) {
      hint = document.createElement('small');
      hint.className = 'distance-system-hint';
      hint.textContent = 'คำนวณจากพิกัดจุดรับและจุดส่ง ไม่สามารถแก้ไขเองได้';
      field.parentElement?.appendChild(hint);
    }
    let status = $('#errandDistanceStatus');
    if (!status) {
      status = document.createElement('small');
      status.id = 'errandDistanceStatus';
      status.className = 'distance-system-status';
      field.parentElement?.appendChild(status);
    }
  }

  function updateDistanceAndQuote() {
    const pickup = window.AppState?.draftLocations?.pickup;
    const delivery = window.AppState?.draftLocations?.delivery;
    const field = $('#errandDistance');
    const status = $('#errandDistanceStatus');
    const km = distanceKmBetweenPoints(pickup, delivery);
    let fieldValueChanged = false;
    if (field) {
      const nextValue = km === null ? '' : km.toFixed(2);
      fieldValueChanged = field.value !== nextValue;
      if (fieldValueChanged) field.value = nextValue;
      field.readOnly = true;
    }
    if (status) {
      const nextStatus = km === null ? 'เลือกพิกัดจุดรับและจุดส่งก่อน ระบบจึงจะคำนวณระยะทาง' : `ระบบคำนวณได้ ${km.toFixed(2)} กม.`;
      if (status.textContent !== nextStatus) status.textContent = nextStatus;
    }
    // The original classic script owns updateErrandEstimate; trigger it only when the computed value changed.
    if (fieldValueChanged) field?.dispatchEvent(new Event('input', { bubbles: true }));
    if (km === null) {
      const ruleCopy = $('#deliveryRuleCopy');
      if (ruleCopy) ruleCopy.textContent = 'รอพิกัดจุดรับและจุดส่งเพื่อคำนวณค่าบริการ';
      if ($('#distanceFee')) $('#distanceFee').textContent = '—';
      if ($('#errandTotal')) $('#errandTotal').textContent = '—';
    }
  }

  function patchLocationActions() {
    const originalCapture = window.captureErrandLocation;
    if (typeof originalCapture === 'function' && !originalCapture.__distancePatched) {
      const wrapped = async function (...args) {
        const result = await originalCapture.apply(this, args);
        updateDistanceAndQuote();
        return result;
      };
      wrapped.__distancePatched = true;
      window.captureErrandLocation = wrapped;
    }
    const originalMapSave = window.saveMapPicker;
    if (typeof originalMapSave === 'function' && !originalMapSave.__distancePatched) {
      const wrapped = function (...args) {
        const result = originalMapSave.apply(this, args);
        updateDistanceAndQuote();
        return result;
      };
      wrapped.__distancePatched = true;
      window.saveMapPicker = wrapped;
    }
  }

  function installDistanceGate() {
    const originalSubmit = window.submitErrand;
    if (typeof originalSubmit === 'function' && !originalSubmit.__distancePatched) {
      const wrapped = function (...args) {
        updateDistanceAndQuote();
        const pickup = window.AppState?.draftLocations?.pickup;
        const delivery = window.AppState?.draftLocations?.delivery;
        if (distanceKmBetweenPoints(pickup, delivery) === null) {
          window.UI?.toast?.('กรุณาเลือกพิกัดจุดรับและจุดส่งก่อน ระบบจึงจะคำนวณค่าส่งได้');
          return null;
        }
        return originalSubmit.apply(this, args);
      };
      wrapped.__distancePatched = true;
      window.submitErrand = wrapped;
    }
  }

  window.openSupermarkets = function () {
    if (!window.AppState?.user?.email) {
      try { sessionStorage.setItem('ap_open_supermarkets', '1'); } catch (_) {}
      window.AppState.afterLogin = 'stores';
      window.showView?.('login');
      return;
    }
    window.showView?.('stores');
    setTimeout(() => {
      const filterButton = document.querySelector(`#allStoreCategoryFilters button[data-supermarket-filter="true"]`);
      if (filterButton) filterButton.click();
      else {
        const categoryButtons = [...document.querySelectorAll('#allStoreCategoryFilters button')];
        const target = categoryButtons.find((button) => /ซูเปอร์มาร์เก็ต|ซุปเปอร์มาร์เก็ต|grocery|supermarket/i.test(button.textContent || ''));
        target?.click();
      }
      addStoreCategoryCard();
    }, 80);
  };

  function registerSupermarketCategory() {
    const category = { id: SUPERMARKET_CATEGORY, name: SUPERMARKET_LABEL, icon: SUPERMARKET_ICON, active: true };
    const ux = window.CategoryUX;
    if (ux?.storeCategories && !ux.storeCategories.some((item) => item.id === SUPERMARKET_CATEGORY)) ux.storeCategories.push(category);
    const stores = window.AppState?.stores || [];
    stores.forEach((store) => {
      if (isSupermarket(store)) {
        store.categoryId = SUPERMARKET_CATEGORY;
        store.categoryName = SUPERMARKET_LABEL;
        store.categoryIcon = SUPERMARKET_ICON;
      }
    });
  }

  function patchCategoryFilters() {
    ['#homeStoreCategoryFilters', '#allStoreCategoryFilters'].forEach((selector) => {
      const filter = $(selector);
      if (!filter) return;
      let button = filter.querySelector('button[data-supermarket-filter="true"]');
      if (!button) {
        button = [...filter.querySelectorAll('button')].find((item) => /ซูเปอร์มาร์เก็ต|ซุปเปอร์มาร์เก็ต|grocery|supermarket/i.test(item.textContent || ''));
      }
      if (!button) {
        const chips = filter.querySelector('.ap-category-chips');
        if (!chips) return;
        button = document.createElement('button');
        button.type = 'button';
        button.textContent = `${SUPERMARKET_ICON} ${SUPERMARKET_LABEL}`;
        button.addEventListener('click', () => window.setAPCategory?.('store', SUPERMARKET_CATEGORY));
        chips.appendChild(button);
      }
      button.dataset.supermarketFilter = 'true';
    });
  }

  function observe() {
    addHomeService();
    registerSupermarketCategory();
    ensureSupermarketAdminOption();
    mountDistanceField();
    updateDistanceAndQuote();
    patchLocationActions();
    installDistanceGate();
    patchCategoryFilters();
    addStoreCategoryCard();
    try {
      if (sessionStorage.getItem('ap_open_supermarkets') === '1' && window.AppState?.user?.email && $('#allStores')) {
        sessionStorage.removeItem('ap_open_supermarkets');
        const button = $('#allStoreCategoryFilters button[data-supermarket-filter="true"]');
        if (button) button.click();
      }
    } catch (_) {}
  }

  const style = document.createElement('style');
  style.textContent = `
    .supermarket-category-card{display:flex;align-items:center;gap:12px;margin:12px 0;padding:14px;justify-content:space-between}
    .supermarket-category-card h3{margin:0 0 3px;font-size:15px}
    .supermarket-category-card p{margin:0;color:var(--muted);font-size:10px}
    .supermarket-category-card .service-icon{flex:0 0 44px}
    .system-calculated-field input{background:#f2fbf9;color:var(--brand-deep);font-weight:900;cursor:not-allowed}
    .distance-system-hint{display:block;color:var(--muted);font-size:10px;line-height:1.45;margin-top:4px}
    .distance-system-status{display:block;color:var(--brand-deep);font-size:10px;font-weight:850;line-height:1.45;margin-top:3px}
    @media(max-width:560px){.supermarket-category-card{align-items:flex-start;flex-wrap:wrap}.supermarket-category-card button{width:100%}}
  `;
  document.head.appendChild(style);
  let observeScheduled = false;
  const observer = new MutationObserver(() => {
    if (observeScheduled) return;
    observeScheduled = true;
    setTimeout(() => {
      observeScheduled = false;
      observe();
    }, 0);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  [0, 250, 900, 1800].forEach((delay) => setTimeout(observe, delay));

  // Keep legacy inline onclick behavior, but turn unexpected render errors into a visible toast instead of a frozen-looking screen.
  const originalOpenStore = window.openStore;
  if (typeof originalOpenStore === 'function' && !originalOpenStore.__safeStoreOpen) {
    const safeOpenStore = function (...args) {
      try {
        return originalOpenStore.apply(this, args);
      } catch (error) {
        console.error('AP Service store opening failed', error);
        window.UI?.toast?.('เปิดหน้าร้านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
        return null;
      }
    };
    safeOpenStore.__safeStoreOpen = true;
    window.openStore = safeOpenStore;
  }

  window.APServiceSupermarket = { categoryId: SUPERMARKET_CATEGORY, isSupermarket, distanceKmBetweenPoints, updateDistanceAndQuote };
})();

if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('apservice:supermarket-category-ready'));
