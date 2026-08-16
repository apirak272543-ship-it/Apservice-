/* AP Service — customer service routing and compact mobile layout patch */
(function () {
  'use strict';

  const getCategoryUx = () => {
    try {
      return window.CategoryUX || (typeof CategoryUX !== 'undefined' ? CategoryUX : null);
    } catch (_) {
      return window.CategoryUX || null;
    }
  };

  function clearSupermarketRoute() {
    const ux = getCategoryUx();
    if (!ux) return;
    ux.activeStoreCategory = 'all';
    ux.activeMenuCategory = 'all';
    try { sessionStorage.removeItem('ap_open_supermarkets'); } catch (_) {}
    ux.mountStoreFilters?.();
    ux.renderStoreTargets?.();
  }

  function applySupermarketRoute() {
    const ux = getCategoryUx();
    if (!ux) return;
    ux.activeStoreCategory = 'store-supermarket';
    ux.activeMenuCategory = 'all';
    ux.mountStoreFilters?.();
    ux.renderStoreTargets?.();
    setTimeout(() => {
      const button = document.querySelector('#allStoreCategoryFilters button[data-supermarket-filter="true"]')
        || [...document.querySelectorAll('#allStoreCategoryFilters button')].find((item) => /ซูเปอร์มาร์เก็ต|ซุปเปอร์มาร์เก็ต|grocery|supermarket/i.test(item.textContent || ''));
      button?.classList.add('active');
    }, 0);
  }

  const originalRequireLoginThen = window.requireLoginThen;
  if (typeof originalRequireLoginThen === 'function' && !originalRequireLoginThen.__serviceRoutePatched) {
    const wrappedRequireLoginThen = function (target, ...args) {
      if (target === 'stores') clearSupermarketRoute();
      return originalRequireLoginThen.call(this, target, ...args);
    };
    wrappedRequireLoginThen.__serviceRoutePatched = true;
    window.requireLoginThen = wrappedRequireLoginThen;
  }

  const originalShowView = window.showView;
  if (typeof originalShowView === 'function' && !originalShowView.__serviceRoutePatched) {
    const wrappedShowView = function (name, ...args) {
      const result = originalShowView.call(this, name, ...args);
      if (name === 'stores') {
        let supermarketPending = false;
        try { supermarketPending = sessionStorage.getItem('ap_open_supermarkets') === '1'; } catch (_) {}
        if (!supermarketPending) clearSupermarketRoute();
      }
      return result;
    };
    wrappedShowView.__serviceRoutePatched = true;
    window.showView = wrappedShowView;
  }

  const originalOpenSupermarkets = window.openSupermarkets;
  if (typeof originalOpenSupermarkets === 'function' && !originalOpenSupermarkets.__serviceRoutePatched) {
    const wrappedOpenSupermarkets = function (...args) {
      const result = originalOpenSupermarkets.apply(this, args);
      if (window.AppState?.user?.email) applySupermarketRoute();
      return result;
    };
    wrappedOpenSupermarkets.__serviceRoutePatched = true;
    window.openSupermarkets = wrappedOpenSupermarkets;
  }

  const style = document.createElement('style');
  style.id = 'service-routing-layout-patch';
  style.textContent = `
    /* Keep the customer service chooser compact without changing desktop density. */
    #view-home .services{row-gap:10px}
    @media (max-width:720px){
      #view-home .section-head{margin-top:18px;margin-bottom:10px;gap:7px}
      #view-home .services{gap:8px;margin-top:0}
      #view-home .service{padding:12px;min-height:0}
      #view-home .service h3{margin:8px 0 3px}
      #view-home .service p{line-height:1.35}
      #view-home .hero + .section-head{margin-top:20px}
      #view-home .promo-rail + .section-head{margin-top:18px}
      #view-home .services + .section-head{margin-top:20px}
    }
  `;
  document.head.appendChild(style);

  window.APServiceServiceRouting = { clearSupermarketRoute, applySupermarketRoute };
})();
