(() => {
  'use strict';
  const file = (location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
  const routePage = {
    index: 'home', stores: 'stores', store: 'store', checkout: 'checkout', orders: 'orders', order: 'order',
    parcel: 'parcel', notifications: 'notifications', profile: 'profile', privacy: 'privacy', support: 'support',
    retail: 'retail', 'retail-checkout': 'retail-checkout', marketplace: 'marketplace', 'marketplace-item': 'marketplace-item',
    'marketplace-new': 'marketplace-new', 'marketplace-profile': 'marketplace-profile', 'marketplace-chat': 'marketplace-chat'
  };
  const page = routePage[file] || document.body.dataset.page || 'home';
  const pageTitle = {
    stores: 'ค้นหาร้านค้า', store: 'ร้านค้าและเมนู', checkout: 'ตรวจสอบคำสั่งซื้อ', orders: 'ออร์เดอร์ของฉัน',
    order: 'ติดตามออร์เดอร์', parcel: 'ส่งของ A → B', notifications: 'การแจ้งเตือน', profile: 'โปรไฟล์', privacy: 'ความเป็นส่วนตัว',
    support: 'ช่วยเหลือ', retail: 'ซูเปอร์มาร์เก็ต', 'retail-checkout': 'ตรวจสอบรายการสินค้า', marketplace: 'ตลาดชุมชน',
    'marketplace-item': 'รายละเอียดสินค้า', 'marketplace-new': 'ลงประกาศ', 'marketplace-profile': 'โปรไฟล์ตลาด', 'marketplace-chat': 'แชต'
  };
  const backHref = page === 'checkout' || page === 'store' || page === 'order' || page === 'retail-checkout' ? 'stores.html' : 'index.html';
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  const navItems = [
    ['home', 'index.html', '⌂', 'หน้าแรก'],
    ['stores', 'stores.html', '⌕', 'ค้นหา'],
    ['orders', 'orders.html', '▣', 'ออร์เดอร์'],
    ['notifications', 'notifications.html', '♧', 'แจ้งเตือน'],
    ['profile', 'profile.html', '○', 'โปรไฟล์']
  ];
  const activeNav = page === 'store' || page === 'retail' || page === 'retail-checkout' || page === 'checkout' ? 'stores' : page === 'order' ? 'orders' : navItems.some(item => item[0] === page) ? page : 'home';

  function setPageState() {
    document.body.classList.add('customer-native-mode');
    document.body.dataset.nativePage = page;
    if (!document.body.dataset.page) document.body.dataset.page = page;
  }

  function enhanceHeader() {
    const topbar = document.querySelector('.customer-topbar');
    if (!topbar || topbar.dataset.nativeHeader) return;
    topbar.dataset.nativeHeader = 'true';
    if (page === 'home' && !topbar.querySelector('.customer-native-header-search')) {
      const search = document.createElement('a');
      search.className = 'customer-native-header-search';
      search.href = 'stores.html';
      search.setAttribute('aria-label', 'ค้นหาร้านค้า');
      search.textContent = '⌕';
      const actions = topbar.querySelector('.customer-top-actions');
      topbar.insertBefore(search, actions || null);
    }
    if (page !== 'home') {
      const back = document.createElement('a');
      back.className = 'customer-native-back';
      back.href = backHref;
      back.setAttribute('aria-label', 'ย้อนกลับ');
      back.textContent = '‹';
      const title = document.createElement('strong');
      title.className = 'customer-native-title';
      title.textContent = pageTitle[page] || 'AP Service';
      topbar.insertBefore(back, topbar.firstChild);
      topbar.insertBefore(title, topbar.children[1] || null);
    }
  }

  function enhanceBottomNav() {
    if (document.getElementById('customerNativeBottomNav')) return;
    const nav = document.createElement('nav');
    nav.id = 'customerNativeBottomNav';
    nav.className = 'customer-native-bottom-nav';
    nav.setAttribute('aria-label', 'เมนูหลัก AP Service');
    nav.innerHTML = navItems.map(([key, href, icon, label]) => `<a class="customer-native-nav-item${key === activeNav ? ' is-active' : ''}" href="${href}" data-native-nav="${key}"><span class="customer-native-nav-icon" aria-hidden="true">${icon}</span><span>${label}</span></a>`).join('');
    document.body.append(nav);
  }

  function enhanceHome() {
    if (page !== 'home') return;
    const tools = document.querySelector('.customer-home-tools');
    if (!tools || document.querySelector('.customer-native-quick-actions')) return;
    const quick = document.createElement('div');
    quick.className = 'customer-native-quick-actions';
    quick.setAttribute('aria-label', 'บริการด่วน');
    quick.innerHTML = '<a href="stores.html?service=food"><span>🍜</span><strong>อาหาร</strong></a><a href="retail.html"><span>🛒</span><strong>ซูเปอร์มาร์เก็ต</strong></a><a href="parcel.html"><span>📦</span><strong>ส่งของ A → B</strong></a>';
    tools.insertAdjacentElement('afterend', quick);
  }

  function enhanceCheckout() {
    if (page !== 'checkout' || document.querySelector('.customer-native-checkout-store')) return;
    const cart = window.APServiceMPA?.cart?.read?.() || [];
    const storeNames = [...new Set(cart.map(item => item.storeName).filter(Boolean))];
    const storeName = storeNames[0] || 'รายการสั่งซื้อของคุณ';
    const count = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const grid = document.querySelector('.customer-page .mpa-grid');
    if (!grid) return;
    const context = document.createElement('section');
    context.className = 'customer-native-checkout-store';
    context.innerHTML = `<div class="customer-native-store-mark" aria-hidden="true">🛍️</div><div><strong>${esc(storeName)}</strong><small>จัดส่งโดย AP Service · ${count || 0} รายการ</small></div><a href="stores.html" class="customer-native-inline-action">แก้ไข</a>`;
    grid.parentNode.insertBefore(context, grid);
    grid.classList.add('customer-native-checkout-grid');
  }

  function boot() {
    setPageState();
    enhanceHeader();
    enhanceBottomNav();
    enhanceHome();
    enhanceCheckout();
  }

  const observer = new MutationObserver(() => boot());
  observer.observe(document.body, { childList: true, subtree: true });
  boot();
  setTimeout(boot, 250);
  setTimeout(boot, 900);
})();
