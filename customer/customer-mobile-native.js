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
  const safeImage = value => /^https:\/\//i.test(String(value || '').trim()) ? String(value).trim() : '';
  const crossSystem = { loaded: false, recognitionByStore: new Map(), campaigns: [], campaignByStore: new Map() };
  const campaignIsCurrent = row => { const now = Date.now(); const starts = row?.starts_at ? Date.parse(row.starts_at) : NaN; const ends = row?.ends_at ? Date.parse(row.ends_at) : NaN; return row?.active === true && (!Number.isFinite(starts) || starts <= now) && (!Number.isFinite(ends) || ends >= now); };
  const campaignTypeLabel = row => { const type = String(row?.campaign_type || ''); const amount = Number(row?.discount_amount || 0); if (type === 'free_delivery') return 'ส่งฟรี'; if (type === 'delivery_discount') return amount > 0 ? `ลดค่าส่ง ${amount.toLocaleString('th-TH')} บาท` : 'ลดค่าส่ง'; if (type === 'store_sponsored') return 'ร้านแนะนำ'; return ''; };
  const campaignHref = row => { const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {}; const raw = metadata.link_url || metadata.linkUrl || metadata.destination_url || metadata.href; try { const url = new URL(String(raw || 'stores.html'), location.href); return url.protocol === 'https:' || url.origin === location.origin ? url.href : 'stores.html'; } catch (_) { return 'stores.html'; } };
  function decorateCrossSystem() {
    const M = window.APServiceMPA;
    crossSystem.recognitionByStore.forEach((recognition, storeId) => document.querySelectorAll(`[data-store-id="${CSS.escape(String(storeId))}"]`).forEach(card => {
      if (!card.querySelector('.customer-native-tier-badge')) { const host = card.querySelector('.customer-store-copy,.featured-store-carousel-card__copy') || card; const badge = document.createElement('span'); badge.className = `customer-native-tier-badge customer-native-tier-badge--${String(recognition.badge_variant || 'neutral').replace(/[^a-z0-9_-]/gi, '')}`; badge.textContent = recognition.label || `Tier ${recognition.tier}`; host.prepend(badge); }
    }));
    crossSystem.campaignByStore.forEach((campaign, storeId) => document.querySelectorAll(`[data-store-id="${CSS.escape(String(storeId))}"]`).forEach(card => { if (!card.querySelector('.customer-native-campaign-badge')) { const badge = document.createElement('span'); badge.className = 'customer-native-campaign-badge'; badge.textContent = campaignTypeLabel(campaign) || 'โปรโมชัน'; (card.querySelector('.customer-store-visual,.featured-store-carousel-card__visual') || card).append(badge); } }));
    if (page !== 'home' || !crossSystem.campaigns.length || document.querySelector('.customer-native-campaign-strip')) return;
    const anchor = document.querySelector('.customer-native-quick-actions') || document.querySelector('.customer-home-tools');
    if (!anchor) return;
    const strip = document.createElement('section');
    strip.className = 'customer-native-campaign-strip';
    strip.innerHTML = `<div class="customer-native-campaign-heading"><div><small>AP SERVICE PROMOTIONS</small><h2>โปรโมชันสำหรับคุณ</h2></div><a href="stores.html">ดูร้านค้า <span aria-hidden="true">›</span></a></div><div class="customer-native-campaign-rail">${crossSystem.campaigns.slice(0, 4).map(campaign => { const metadata = campaign.metadata && typeof campaign.metadata === 'object' ? campaign.metadata : {}; const image = safeImage(metadata.image_url || metadata.imageUrl || metadata.banner_url || metadata.bannerUrl); const label = campaignTypeLabel(campaign) || 'โปรโมชัน'; return `<a class="customer-native-campaign-card" href="${esc(campaignHref(campaign))}">${image ? `<img src="${esc(image)}" alt="" loading="lazy" onerror="this.remove()">` : '<span class="customer-native-campaign-icon" aria-hidden="true">✦</span>'}<div><small>${esc(label)}</small><strong>${esc(campaign.name || 'ข้อเสนอพิเศษ')}</strong>${campaign.min_order_amount > 0 ? `<span>เมื่อสั่งขั้นต่ำ ${M?.ui?.baht?.(campaign.min_order_amount) || `${campaign.min_order_amount} บาท`}</span>` : ''}</div></a>`; }).join('')}</div>`;
    anchor.insertAdjacentElement('afterend', strip);
  }
  async function hydrateCrossSystemData() {
    const M = window.APServiceMPA;
    if (!M?.request) return;
    if (!crossSystem.loaded) {
      crossSystem.loaded = true;
      try { const rows = await M.request('rpc/customer_public_store_recognition', { method: 'POST', private: false, body: JSON.stringify({ p_store_ids: null }), cacheTtlMs: 60_000, cacheKey: 'customer-public-store-recognition' }); (rows || []).forEach(row => crossSystem.recognitionByStore.set(String(row.store_id), row)); } catch (error) { console.info('Customer public store recognition unavailable', error?.message || error); }
      try { const [campaigns, links] = await Promise.all([M.request('campaigns?select=id,name,description,campaign_type,active,starts_at,ends_at,min_order_amount,discount_amount,metadata&active=eq.true&order=starts_at.desc&limit=50', { cacheTtlMs: 60_000, cacheKey: 'customer-public-campaigns' }), M.request('campaign_stores?select=campaign_id,store_id,active&active=eq.true', { cacheTtlMs: 60_000, cacheKey: 'customer-public-campaign-stores' })]); crossSystem.campaigns = (campaigns || []).filter(campaignIsCurrent).filter(row => campaignTypeLabel(row)); const byId = new Map(crossSystem.campaigns.map(row => [String(row.id), row])); (links || []).forEach(link => { const campaign = byId.get(String(link.campaign_id)); if (campaign && link.store_id) crossSystem.campaignByStore.set(String(link.store_id), campaign); }); } catch (error) { console.info('Customer public campaigns unavailable', error?.message || error); }
    }
    decorateCrossSystem();
  }
  const navIcons = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 10.8 12 3l9 7.8v9.2a1 1 0 0 1-1 1h-5.5v-6h-5v6H4a1 1 0 0 1-1-1v-9.2Z"/></svg>',
    stores: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>',
    orders: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="4.5" width="14" height="16" rx="2"/><path d="M9 4.5h6v2H9zM9 11h6M9 15h6M9 18h3"/></svg>',
    notifications: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 9.8a6 6 0 0 0-12 0c0 7-3 7-3 8.2h18c0-1.2-3-1.2-3-8.2Z"/><path d="M10 21h4"/></svg>',
    profile: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="3.5"/><path d="M4.5 20c.8-3.5 3.2-5.5 7.5-5.5s6.7 2 7.5 5.5"/></svg>'
  };
  const navItems = [
    ['home', 'index.html', 'หน้าแรก'],
    ['stores', 'stores.html', 'ค้นหา'],
    ['orders', 'orders.html', 'ออร์เดอร์'],
    ['notifications', 'notifications.html', 'แจ้งเตือน'],
    ['profile', 'profile.html', 'โปรไฟล์']
  ];
  const activeNav = page === 'store' || page === 'retail' || page === 'retail-checkout' || page === 'checkout' ? 'stores' : page === 'order' ? 'orders' : navItems.some(item => item[0] === page) ? page : 'home';
  const currentRoot = () => document.querySelector('.customer-page');

  function setPageState() {
    document.body.classList.add('customer-native-mode');
    document.body.dataset.nativePage = page;
    if (!document.body.dataset.page) document.body.dataset.page = page;
  }

  function enhanceHeader() {
    const topbar = document.querySelector('.customer-topbar');
    if (!topbar || topbar.dataset.nativeHeader) return;
    topbar.dataset.nativeHeader = 'true';
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
    nav.innerHTML = navItems.map(([key, href, label]) => `<a class="customer-native-nav-item${key === activeNav ? ' is-active' : ''}" href="${href}" data-native-nav="${key}" aria-label="${label}"${key === activeNav ? ' aria-current="page"' : ''}><span class="customer-native-nav-icon">${navIcons[key]}</span><span>${label}</span></a>`).join('');
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

  function decorateCartRows() {
    const host = document.querySelector('#cartRows');
    const M = window.APServiceMPA;
    if (!host || !M?.cart?.read) return;
    const items = M.cart.read();
    [...host.querySelectorAll('tr')].forEach((row, index) => {
      const item = items[index];
      const cell = row.cells?.[0];
      if (!item || !cell || row.dataset.nativeCartRow) return;
      const image = safeImage(item.image_url);
      const fallback = String(item.emoji || '🛍️').slice(0, 8);
      cell.innerHTML = `<div class="customer-native-cart-item"><span class="customer-native-cart-image">${image ? `<img src="${esc(image)}" alt="" loading="lazy" onerror="this.remove()">` : fallback}</span><span><strong>${esc(item.name || cell.textContent.trim())}</strong><small>${esc(item.description || '')}</small></span></div>`;
      row.dataset.nativeCartRow = 'true';
    });
  }

  function addCheckoutTotalMirror() {
    const form = document.querySelector('#checkoutForm');
    const total = document.querySelector('#cartTotal');
    const aside = form?.closest('aside');
    if (!form || !total || !aside) return;
    form.classList.add('customer-native-checkout-form');
    aside.classList.add('customer-native-checkout-summary');
    if (!aside.querySelector('.customer-native-total-bar')) {
      const bar = document.createElement('div');
      bar.className = 'customer-native-total-bar';
      bar.innerHTML = `<span>ยอดที่ต้องชำระทั้งหมด</span><strong id="customerNativeTotalMirror">${esc(total.textContent)}</strong>`;
      aside.append(bar);
    }
    const mirror = aside.querySelector('#customerNativeTotalMirror');
    if (mirror) mirror.textContent = total.textContent;
    if (!total.dataset.nativeMirror) {
      total.dataset.nativeMirror = 'true';
      new MutationObserver(() => { if (mirror) mirror.textContent = total.textContent; }).observe(total, { childList: true, characterData: true, subtree: true });
    }
  }

  function enhanceCheckout() {
    if (page !== 'checkout') return;
    const grid = currentRoot()?.querySelector('.mpa-grid');
    const form = document.querySelector('#checkoutForm');
    if (!grid || !form) return;
    grid.classList.add('customer-native-checkout-grid');
    grid.querySelector('.mpa-table-wrap')?.classList.add('customer-native-cart-table');
    grid.querySelector('section')?.classList.add('customer-native-cart-section');
    form.closest('aside')?.classList.add('customer-native-checkout-summary');
    if (!document.querySelector('.customer-native-checkout-store')) {
      const cart = window.APServiceMPA?.cart?.read?.() || [];
      const storeNames = [...new Set(cart.map(item => item.storeName).filter(Boolean))];
      const storeName = storeNames[0] || 'รายการสั่งซื้อของคุณ';
      const count = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
      const context = document.createElement('section');
      context.className = 'customer-native-checkout-store';
      context.innerHTML = `<div class="customer-native-store-mark" aria-hidden="true">🛍️</div><div><strong>${esc(storeName)}</strong><small>จัดส่งโดย AP Service · ${count || 0} รายการ</small></div><a href="stores.html" class="customer-native-inline-action">แก้ไข</a>`;
      grid.parentNode.insertBefore(context, grid);
    }
    decorateCartRows();
    addCheckoutTotalMirror();
  }

  function enhanceStores() {
    if (page !== 'stores') return;
    const list = document.querySelector('#storeList');
    const filters = document.querySelector('.customer-filters');
    if (!list || !filters) return;
    list.classList.add('customer-native-store-list');
    filters.classList.add('customer-native-store-filters');
    if (!filters.querySelector('.customer-native-filter-link')) {
      const link = document.createElement('a');
      link.className = 'customer-native-filter-link';
      link.href = '#categoryChips';
      link.setAttribute('aria-label', 'เปิดตัวกรองหมวดหมู่');
      link.textContent = '☷';
      filters.append(link);
    }
    document.querySelector('#categoryChips')?.classList.add('customer-native-category-chips');
  }

  function createTrackingMap(root) {
    if (root.querySelector('.customer-native-map-card')) return;
    const cards = [...root.querySelectorAll('.mpa-grid > .mpa-card')];
    const sourceCard = cards[0];
    if (!sourceCard) return;
    const store = sourceCard.querySelector('h2')?.textContent?.trim() || 'ร้านค้า';
    const address = [...sourceCard.querySelectorAll('p')].find(p => p.textContent.includes('จุดส่ง'))?.textContent.replace(/^จุดส่ง:\s*/, '').trim() || 'ยังไม่มีข้อมูลจุดส่ง';
    const mapLink = sourceCard.querySelector('a[target="_blank"]')?.getAttribute('href') || '';
    const map = document.createElement('section');
    map.className = 'customer-native-map-card';
    map.innerHTML = `<div class="customer-native-map-art" aria-label="บริบทตำแหน่งจัดส่ง"><span class="customer-native-map-crosshair" aria-hidden="true">⌖</span><small>บริบทจุดรับ–จุดส่งจากระบบ</small></div><div class="customer-native-map-copy"><div><small>จุดรับ</small><strong>${esc(store)}</strong></div><div><small>จุดส่ง</small><strong>${esc(address)}</strong></div></div>${mapLink ? `<a class="mpa-button mpa-button-secondary" target="_blank" rel="noopener" href="${esc(mapLink)}">เปิดแผนที่</a>` : ''}`;
    root.querySelector('.mpa-grid')?.insertAdjacentElement('afterend', map);
  }

  function enhanceTracking() {
    if (page !== 'order') return;
    const root = document.querySelector('#orderDetail');
    if (!root) return;
    root.classList.add('customer-native-tracking-root');
    const badge = root.querySelector('.customer-section-head .mpa-badge');
    const statusText = badge?.textContent?.trim() || 'กำลังอัปเดตสถานะ';
    if (!root.querySelector('.customer-native-status-hero')) {
      const hero = document.createElement('section');
      hero.className = 'customer-native-status-hero';
      hero.innerHTML = `<div><small>สถานะล่าสุด</small><h2>${esc(statusText)}</h2><p>ระบบจะอัปเดตความคืบหน้าออร์เดอร์จากข้อมูลจริง</p></div><span class="customer-native-status-hero-icon" aria-hidden="true">▣</span>`;
      root.querySelector('.mpa-grid')?.insertAdjacentElement('beforebegin', hero);
    } else {
      const title = root.querySelector('.customer-native-status-hero h2');
      if (title) title.textContent = statusText;
    }
    createTrackingMap(root);
    const journey = root.querySelector('#customerTrackingJourney, .customer-tracking-journey');
    if (journey) {
      journey.classList.add('customer-native-tracking-card');
      journey.querySelector('.customer-tracker')?.classList.add('customer-native-status-timeline');
    }
    root.querySelectorAll('.mpa-card').forEach(card => {
      const text = card.textContent || '';
      if (text.includes('สรุปยอด')) card.classList.add('customer-native-payment-card');
      if (text.includes('รายการสินค้า')) card.classList.add('customer-native-items-card');
      if (text.includes('ลำดับสถานะ')) card.classList.add('customer-native-events-card');
    });
  }

  function enhanceOrders() {
    if (page !== 'orders') return;
    const root = document.querySelector('#orders');
    const table = root?.querySelector('table');
    if (!root || !table) return;
    root.classList.add('customer-native-orders-root');
    if (root.querySelector('.customer-native-order-cards')) return;
    const rows = [...table.querySelectorAll('tbody tr')];
    if (!rows.length) return;
    const cards = document.createElement('div');
    cards.className = 'customer-native-order-cards';
    cards.innerHTML = rows.map(row => {
      const cells = row.cells || [];
      const time = cells[0]?.textContent?.trim() || '-';
      const store = cells[1]?.textContent?.trim() || 'ออร์เดอร์ AP Service';
      const status = cells[2]?.textContent?.trim() || 'กำลังดำเนินการ';
      const total = cells[3]?.textContent?.trim() || '-';
      const link = cells[4]?.querySelector('a')?.getAttribute('href') || '#';
      return `<article class="customer-native-order-card"><div class="customer-native-order-card-top"><span class="customer-native-order-icon" aria-hidden="true">▣</span><div><strong>${esc(store)}</strong><small>${esc(time)}</small></div><span class="mpa-badge">${esc(status)}</span></div><div class="customer-native-order-card-bottom"><strong>${esc(total)}</strong><a class="mpa-button mpa-button-secondary" href="${esc(link)}">ติดตามออร์เดอร์</a></div></article>`;
    }).join('');
    table.closest('.mpa-table-wrap')?.insertAdjacentElement('beforebegin', cards);
    table.closest('.mpa-table-wrap')?.setAttribute('hidden', '');
  }

  function boot() {
    setPageState();
    enhanceHeader();
    enhanceBottomNav();
    enhanceHome();
    enhanceStores();
    enhanceCheckout();
    enhanceTracking();
    enhanceOrders();
    void hydrateCrossSystemData();
  }

  let booting = false;
  const runBoot = () => {
    if (booting) return;
    booting = true;
    try { boot(); } finally { booting = false; }
  };
  // Customer app renders its shell synchronously and checkout helpers settle asynchronously.
  // A bounded retry is sufficient; observing the whole body can retrigger boot while decorators mutate the DOM.
  runBoot();
  setTimeout(runBoot, 250);
  setTimeout(runBoot, 900);
  setTimeout(runBoot, 1800);
})();
