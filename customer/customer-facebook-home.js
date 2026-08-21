(() => {
  'use strict';
  const M = window.APServiceMPA;
  if (!M || document.body.dataset.page !== 'home') return;

  const esc = value => M.ui.escapeHtml(String(value ?? ''));
  const safeHref = value => {
    try {
      const url = new URL(String(value || ''), location.href);
      return url.protocol === 'https:' || url.origin === location.origin ? url.href : '';
    } catch (_) { return ''; }
  };
  const state = { home: window.__APServiceCustomerHomeConfig || null };
  const navLabels = { home: 'หน้าแรก', stores: 'ร้านค้า', orders: 'ออร์เดอร์', notifications: 'แจ้งเตือน', profile: 'โปรไฟล์', support: 'ช่วยเหลือ' };
  const navIcons = { home: '⌂', stores: '⌕', orders: '▣', notifications: '♧', profile: '◯', support: '?' };

  function navKey(link) {
    const href = String(link?.getAttribute('href') || '');
    if (href.includes('stores.html')) return 'stores';
    if (href.includes('orders.html')) return 'orders';
    if (href.includes('notifications.html')) return 'notifications';
    if (href.includes('profile.html')) return 'profile';
    if (href.includes('support.html')) return 'support';
    return 'home';
  }

  function decorateLegacyNav() {
    const nav = document.querySelector('.customer-nav-wrap .mpa-nav');
    if (!nav) return;
    nav.querySelectorAll('a').forEach(link => {
      const key = navKey(link);
      link.dataset.facebookHomeNav = key;
      link.setAttribute('aria-label', navLabels[key]);
      if (!link.querySelector('.facebook-home-nav-icon')) {
        link.innerHTML = `<span class="facebook-home-nav-icon" aria-hidden="true">${navIcons[key]}</span><span>${esc(link.textContent.trim() || navLabels[key])}</span>`;
      }
    });
  }

  function decorateNativeNav() {
    const nav = document.querySelector('#customerNativeBottomNav');
    if (!nav) return;
    nav.querySelectorAll('a').forEach(link => {
      const key = String(link.dataset.nativeNav || navKey(link));
      link.dataset.facebookHomeNav = key;
      if (key === 'home') link.setAttribute('aria-label', navLabels.home);
    });
  }

  function applyNavigationConfig(home) {
    if (!home) return;
    const labels = home.navigation || {};
    const map = { support: labels.supportLabel, notifications: labels.notificationLabel, profile: labels.profileLabel };
    document.querySelectorAll('[data-facebook-home-nav]').forEach(link => {
      const key = link.dataset.facebookHomeNav;
      const label = map[key] || navLabels[key];
      const text = link.querySelector('span:last-child');
      if (text) text.textContent = label;
      link.setAttribute('aria-label', label);
    });
  }

  function applyCartConfig(home) {
    const cart = document.querySelector('.customer-cart-fab');
    const config = home?.floatingCart;
    if (!cart || !config) return;
    cart.href = safeHref(config.href) || 'checkout.html';
    cart.setAttribute('aria-label', config.label || 'ตะกร้าสินค้า');
    cart.dataset.facebookHomeCart = 'true';
    const icon = cart.querySelector('[data-facebook-cart-icon]');
    const label = cart.querySelector('[data-facebook-cart-label]');
    if (icon) icon.textContent = config.icon || '🛒';
    if (label) label.textContent = config.label || 'ดูตะกร้าสินค้า';
  }

  function decorateCart() {
    const cart = document.querySelector('.customer-cart-fab');
    if (!cart || cart.dataset.facebookHomeDecorated) return;
    cart.dataset.facebookHomeDecorated = 'true';
    const badge = cart.querySelector('[data-cart-count]') || cart.querySelector('.customer-cart-badge');
    const count = badge?.textContent || '0';
    cart.innerHTML = `<span data-facebook-cart-icon aria-hidden="true">🛒</span><strong data-facebook-cart-label>ดูตะกร้าสินค้า</strong><b data-cart-count>${esc(count)}</b>`;
    applyCartConfig(state.home);
  }

  function applyStoreSection(home) {
    const mount = document.querySelector('#homeDiscoveryMount');
    if (!mount || !home?.storeSection) return;
    const section = mount.querySelector('.customer-home-discovery');
    if (!section) return;
    section.hidden = home.storeSection.enabled === false;
    const head = section.querySelector('.customer-section-head');
    const title = head?.querySelector('h2');
    const description = head?.querySelector('p');
    const link = head?.querySelector('a');
    if (title) title.textContent = home.storeSection.title || 'ร้านค้ายอดนิยม';
    if (description) description.textContent = home.storeSection.description || 'ดีลดี อาหารอร่อย ส่งตรงถึงมือ';
    if (link) { link.textContent = `${home.storeSection.viewAllLabel || 'ดูทั้งหมด'} ›`; link.href = safeHref(home.storeSection.viewAllHref) || 'stores.html'; }
  }

  function applyHomeConfig(home) {
    if (!home) return;
    state.home = home;
    decorateLegacyNav();
    decorateNativeNav();
    applyNavigationConfig(home);
    decorateCart();
    applyCartConfig(home);
    applyStoreSection(home);
    document.body.dataset.facebookHomeReady = 'true';
  }

  function addHomeFeedLabels() {
    const discovery = document.querySelector('#homeDiscoveryMount');
    const sponsored = document.querySelector('.customer-sponsored');
    const tracker = document.querySelector('#homeOrderTracker');
    if (discovery) discovery.dataset.feedSection = 'stores';
    if (sponsored) sponsored.dataset.feedSection = 'sponsored';
    if (tracker) tracker.dataset.feedSection = 'active-order';
  }

  function mount() {
    decorateLegacyNav();
    decorateNativeNav();
    decorateCart();
    addHomeFeedLabels();
    applyHomeConfig(state.home);
    window.addEventListener('apservice:customer-home-config', event => applyHomeConfig(event.detail || null), { passive: true });
    window.addEventListener('apservice:cart', () => { decorateCart(); applyCartConfig(state.home); }, { passive: true });
    const discovery = document.querySelector('#homeDiscoveryMount');
    if (discovery) new MutationObserver(() => { addHomeFeedLabels(); applyStoreSection(state.home); }).observe(discovery, { childList: true, subtree: true });
    const navRoot = document.querySelector('.customer-nav-wrap');
    if (navRoot) new MutationObserver(decorateLegacyNav).observe(navRoot, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true }); else mount();
})();
