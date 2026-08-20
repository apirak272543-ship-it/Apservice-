(() => {
  'use strict';
  const M = window.APServiceMPA;
  if (!M || document.body.dataset.page !== 'home') return;
  const h = value => M.ui.escapeHtml(String(value ?? ''));
  const $ = selector => document.querySelector(selector);
  const safeHref = value => { try { const url = new URL(String(value || ''), location.href); return url.protocol === 'https:' || url.origin === location.origin ? url.href : ''; } catch (_) { return ''; } };
  const terminal = new Set(['สำเร็จ', 'ยกเลิก', 'cancelled', 'completed', 'delivered']);

  function renderCart() {
    const cart = $('.customer-cart-fab'); if (!cart) return;
    const count = M.cart.read().reduce((total, item) => total + Number(item.qty || 0), 0);
    cart.classList.add('customer-bottom-cart');
    cart.hidden = !count;
    cart.style.display = count ? 'flex' : 'none';
    cart.innerHTML = `<span aria-hidden="true">🛒</span><strong>ดูตะกร้าสินค้า</strong><b>${count}</b>`;
  }

  async function loadDelivery() {
    const label = $('#homeDeliveryLabel'); if (!label) return;
    try {
      const user = await M.auth.currentUser();
      if (!user) { label.textContent = 'เข้าสู่ระบบเพื่อเลือกที่อยู่จัดส่ง'; return; }
      const rows = await M.request(`user_profiles?select=address&user_id=eq.${encodeURIComponent(user.id)}&limit=1`, { private: true, cacheTtlMs: 20_000, cacheKey: `customer-home-address:${user.id}` });
      label.textContent = String(rows?.[0]?.address || '').trim() || 'ตั้งค่าที่อยู่จัดส่ง';
    } catch (_) { label.textContent = 'ตั้งค่าที่อยู่จัดส่ง'; }
  }

  async function loadActiveOrder() {
    const host = $('#homeOrderTracker'); if (!host) return;
    try {
      const user = await M.auth.currentUser(); if (!user) { host.hidden = true; return; }
      const rows = await M.request(`delivery_orders?select=id,store_name,status,ordered_at&customer_id=eq.${encodeURIComponent(user.id)}&order=ordered_at.desc&limit=10`, { private: true, cacheTtlMs: 12_000, cacheKey: `customer-home-active-order:${user.id}` });
      const order = (rows || []).find(row => !terminal.has(String(row.status || '').trim().toLowerCase()) && !terminal.has(String(row.status || '').trim()));
      if (!order) { host.hidden = true; return; }
      host.hidden = false;
      host.innerHTML = `<a class="customer-home-tracker" href="order.html?id=${encodeURIComponent(order.id)}"><span class="customer-home-tracker__icon" aria-hidden="true">🛵</span><span class="customer-home-tracker__copy"><small>ออร์เดอร์ที่กำลังดำเนินการ</small><strong>${h(order.store_name || 'ติดตามสถานะออร์เดอร์')}</strong><small>${h(order.status || 'กำลังอัปเดตสถานะ')}</small></span><span class="customer-home-tracker__go">ดู ›</span></a>`;
    } catch (_) { host.hidden = true; }
  }

  async function loadSponsored() {
    const section = $('.customer-sponsored'); const host = $('#sponsoredList'); if (!section || !host) return;
    try {
      const rows = await M.request('platform_configs?select=value&key=eq.customer_promotions&limit=1', { cacheTtlMs: 30_000, cacheKey: 'customer-home-sponsored' });
      const value = rows?.[0]?.value; const list = Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : []; const now = Date.now();
      const items = list.map((item, index) => { const starts = Date.parse(item?.starts_at || ''), ends = Date.parse(item?.ends_at || ''); const image = String(item?.image_url || item?.imageUrl || '').trim(); const href = safeHref(item?.link_url || item?.linkUrl || item?.href); if (item?.placement !== 'customer_home_sponsored' || item?.approval_status !== 'approved' || item?.active === false || !Number.isFinite(starts) || !Number.isFinite(ends) || starts > now || ends < now || !/^https:\/\//i.test(image) || !href) return null; return { id: String(item.id || index), image, href, title: String(item.title || 'ข้อเสนอพิเศษ'), description: String(item.description || ''), badge: String(item.badge || 'สปอนเซอร์'), priority: Number(item.priority || index + 1) }; }).filter(Boolean).sort((a, b) => a.priority - b.priority);
      if (!items.length) { section.hidden = true; return; }
      section.hidden = false; $('#sponsoredCount').textContent = `${items.length} รายการ`;
      host.innerHTML = items.map((item, index) => `<a class="customer-promotion" href="${h(item.href)}"><img src="${h(item.image)}" alt="${h(item.title)}" loading="${index ? 'lazy' : 'eager'}"><div class="customer-promotion__copy"><small>${h(item.badge)}</small><h2>${h(item.title)}</h2>${item.description ? `<p>${h(item.description)}</p>` : ''}<span class="mpa-button mpa-button-secondary">ดูรายละเอียด</span></div></a>`).join('');
    } catch (_) { section.hidden = true; }
  }

  function enhance() {
    const page = $('.customer-page'); const nav = $('.customer-nav-wrap .mpa-nav'); if (!page || !nav || page.dataset.homeMobileEnhanced) return false;
    page.dataset.homeMobileEnhanced = 'true';
    $('.customer-top-actions a[href*="mode=register"]')?.setAttribute('hidden', '');
    [...nav.querySelectorAll('a')].forEach(link => { link.dataset.homeNav = link.href.includes('stores.html') ? 'stores' : link.href.includes('orders.html') ? 'orders' : link.href.includes('profile.html') ? 'profile' : 'home'; });
    $('#storeList')?.closest('section')?.remove();
    $('#promotionList')?.closest('.customer-promotions')?.remove();
    page.insertAdjacentHTML('afterbegin', `<section class="customer-home-tools" aria-label="ค้นหาและที่อยู่จัดส่ง"><a class="customer-delivery-picker" href="profile.html?next=index.html"><span class="customer-delivery-picker__icon" aria-hidden="true">⌖</span><span class="customer-delivery-picker__copy"><small>ส่งไปที่</small><strong id="homeDeliveryLabel">กำลังตรวจสอบที่อยู่จัดส่ง…</strong></span><span class="customer-delivery-picker__chevron" aria-hidden="true">›</span></a><form class="customer-home-search" id="homeStoreSearch"><span aria-hidden="true">⌕</span><input id="homeStoreSearchInput" type="search" maxlength="100" placeholder="ค้นหาร้านค้า หรือเมนูอาหาร" autocomplete="off"><button type="submit" aria-label="ค้นหา">→</button></form></section>`);
    const services = $('.customer-services'); const serviceSection = services?.closest('section');
    if (serviceSection) serviceSection.insertAdjacentHTML('afterend', `<section id="homeOrderTracker" hidden></section><section class="customer-promotions customer-sponsored" aria-label="พื้นที่สปอนเซอร์หน้าแรก" hidden><div class="customer-section-head"><div><h2>ข้อเสนอจากร้านสปอนเซอร์</h2><p>โฆษณาที่ผ่านการอนุมัติจาก AP Service</p></div><span id="sponsoredCount" class="mpa-badge">กำลังโหลด</span></div><div id="sponsoredList" class="customer-promotions__track"></div></section>`);
    $('#homeStoreSearch')?.addEventListener('submit', event => { event.preventDefault(); const needle = $('#homeStoreSearchInput')?.value.trim(); location.assign(`stores.html${needle ? `?search=${encodeURIComponent(needle)}` : ''}`); });
    loadDelivery(); loadActiveOrder(); loadSponsored(); renderCart(); addEventListener('apservice:cart', renderCart);
    return true;
  }
  let attempts = 0;
  const boot = () => { if (!enhance() && attempts++ < 8) setTimeout(boot, 50); };
  boot();
})();
