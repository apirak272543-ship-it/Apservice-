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

      /* The admin mobile patch gives every section-head child a 220px flex basis.
         That is useful for admin toolbars but creates a large blank block in Customer views. */
      .view:not(#view-admin):not(#view-login):not(#view-register) .section-head>div,
      .view:not(#view-admin):not(#view-login):not(#view-register) .section-head>.section-head-copy{
        flex:0 1 auto!important;
        min-height:0!important;
        height:auto!important;
      }
      .view:not(#view-admin):not(#view-login):not(#view-register) .section-head{
        margin-top:18px;
        margin-bottom:10px;
        gap:8px;
      }
      .view:not(#view-admin):not(#view-login):not(#view-register) .section-head h2{margin:0}
      .view:not(#view-admin):not(#view-login):not(#view-register) .section-head p{margin-top:3px}
      .view:not(#view-admin):not(#view-login):not(#view-register) .section-head>input,
      .view:not(#view-admin):not(#view-login):not(#view-register) .section-head>select,
      .view:not(#view-admin):not(#view-login):not(#view-register) .section-head>.table-input{
        width:100%!important;
        max-width:100%;
        margin-top:0;
      }
      .view:not(#view-admin):not(#view-login):not(#view-register)>.grid-2,
      .view:not(#view-admin):not(#view-login):not(#view-register)>.form-grid{gap:10px}
      .view:not(#view-admin):not(#view-login):not(#view-register)>.panel{padding:14px}
      #view-home .section-head{margin-top:18px;margin-bottom:10px}
      #view-home .services{gap:8px}
      #view-home .support-center{margin-top:18px}
      #view-stores .section-head,
      #view-marketplace .section-head,
      #view-orders .section-head,
      #view-errand .section-head{margin-top:18px;margin-bottom:10px}
      #view-storefront .section-head{margin-top:0;margin-bottom:10px}
    }
  `;
  document.head.appendChild(style);

  window.APServiceServiceRouting = { clearSupermarketRoute, applySupermarketRoute };
})();
