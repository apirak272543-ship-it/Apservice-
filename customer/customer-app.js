(() => {
  'use strict';
  const M = window.APServiceMPA;
  const C = window.APServiceCore;
  const $ = selector => document.querySelector(selector);
  const q = new URLSearchParams(location.search);
  const h = M.ui.escapeHtml;
  const nav = active => `<header class="mpa-topbar"><a class="mpa-brand" href="index.html">AP Service · ลูกค้า</a><nav class="mpa-nav"><a class="${active==='home'?'active':''}" href="index.html">หน้าแรก</a><a class="${active==='stores'?'active':''}" href="stores.html">ร้านค้า</a><a class="${active==='orders'?'active':''}" href="orders.html">ออร์เดอร์</a><a class="${active==='profile'?'active':''}" href="profile.html">โปรไฟล์</a></nav></header>`;
  const app = (active, content) => { document.body.innerHTML = `${nav(active)}<main class="mpa-shell" data-page-content>${content}</main>`; };
  const storeCard = store => `<article class="mpa-card"><div style="display:flex;gap:12px;align-items:center"><div style="width:54px;height:54px;border-radius:16px;background:#e6f6f3;display:grid;place-items:center;font-size:27px;overflow:hidden">${store.icon_url ? `<img src="${h(store.icon_url)}" alt="" style="width:100%;height:100%;object-fit:cover">` : h(store.emoji || '🍽️')}</div><div><h3 style="margin:0">${h(store.name)}</h3><p class="mpa-muted" style="margin:5px 0 0">${h(store.description || 'ร้านค้าใน AP Service')}</p></div></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px"><span class="mpa-badge">★ ${Number(store.rating || 0).toFixed(1)} · ${h(store.eta || 'พร้อมให้บริการ')}</span><a class="mpa-button" href="store.html?id=${encodeURIComponent(store.id)}">ดูเมนู</a></div></article>`;
  async function stores(limit = 12) { return M.request(`catalog_stores?select=id,name,emoji,description,rating,eta,icon_url,background_url&order=name.asc&limit=${limit}`); }
  async function promotions() { const rows = await M.request('platform_configs?select=value&key=eq.customer_promotions&limit=1'); const value = rows?.[0]?.value; const items = Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : []; return items.filter(item => item?.active !== false && /^https:\/\//i.test(String(item?.image_url || ''))); }
  function renderPromotions(items) { const host = $('#promotionList'); if (!host || !items.length) { if (host) host.closest('.customer-promotions').hidden = true; return; } host.innerHTML = items.map((item, index) => `<article class="customer-promotion"><img src="${h(item.image_url)}" alt="${h(item.title || 'ภาพโฆษณา')}" loading="${index ? 'lazy' : 'eager'}"><div class="customer-promotion__copy"><small>${h(item.badge || 'AD')}</small><h2>${h(item.title || 'บริการพิเศษจาก AP Service')}</h2>${item.description ? `<p>${h(item.description)}</p>` : ''}</div></article>`).join(''); if (items.length > 1) { let current = 0; setInterval(() => { if (document.hidden) return; current = (current + 1) % items.length; host.children[current]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' }); }, 5000); } }

  async function home() {
    app('home', `<section class="customer-promotions" aria-label="โฆษณาและข้อเสนอพิเศษ"><div id="promotionList" class="customer-promotions__track">${M.ui.loading('กำลังโหลดข้อเสนอพิเศษ…')}</div></section><section class="mpa-hero"><h1>อร่อยถึงบ้าน ทุกบริการถึงใจ</h1><p>เลือกอาหารจากร้านใกล้คุณ ติดตามออร์เดอร์ และใช้บริการ AP Service ได้ในไม่กี่ขั้นตอน</p><a class="mpa-button mpa-button-secondary" href="stores.html" style="margin-top:18px">เลือกร้านค้า</a></section><section><div class="mpa-page-head"><div><h2>ร้านค้ายอดนิยม</h2><p>ข้อมูลร้านโหลดแบบ lazy เฉพาะหน้านี้</p></div><a class="mpa-button mpa-button-secondary" href="stores.html">ดูทั้งหมด</a></div><div id="storeList" class="mpa-grid cards">${M.ui.loading('กำลังค้นหาร้านค้า…')}</div></section>`);
    const [promotionResult, storeResult] = await Promise.allSettled([promotions(), stores(6)]);
    if (promotionResult.status === 'fulfilled') renderPromotions(promotionResult.value); else $('#promotionList').closest('.customer-promotions').hidden = true;
    $('#storeList').innerHTML = storeResult.status === 'fulfilled' ? (storeResult.value || []).map(storeCard).join('') || M.ui.empty('ยังไม่มีร้านค้าที่เปิดบริการ') : M.ui.error('โหลดร้านค้าไม่สำเร็จ', storeResult.reason?.message || 'กรุณาลองใหม่');
  }

  async function storesPage() {
    app('stores', `<div class="mpa-page-head"><div><h1>เลือกร้านค้า</h1><p>เลือกดูเมนูและเพิ่มสินค้าในตะกร้าได้</p></div><a class="mpa-button mpa-button-secondary" href="checkout.html">ตะกร้า <span id="cartCount"></span></a></div><div id="storeList" class="mpa-grid cards">${M.ui.loading('กำลังโหลดร้านค้า…')}</div>`);
    const setCount = () => { const count = M.cart.read().reduce((sum, item) => sum + item.qty, 0); const el = $('#cartCount'); if (el) el.textContent = count ? `(${count})` : ''; };
    setCount(); addEventListener('apservice:cart', setCount);
    try { $('#storeList').innerHTML = (await stores()).map(storeCard).join('') || M.ui.empty('ยังไม่มีร้านค้าที่เปิดบริการ'); } catch (err) { $('#storeList').innerHTML = M.ui.error('โหลดร้านค้าไม่สำเร็จ', err.message); }
  }

  async function storePage() {
    const id = q.get('id');
    if (!id) { app('stores', M.ui.error('ไม่พบรหัสร้านค้า', 'กรุณากลับไปเลือกร้านค้าใหม่')); return; }
    app('stores', `<div id="storePage">${M.ui.loading('กำลังโหลดร้านและเมนู…')}</div>`);
    try {
      const [storeRows, items] = await Promise.all([
        M.request(`catalog_stores?select=id,name,emoji,description,rating,eta,icon_url,background_url&id=eq.${encodeURIComponent(id)}&limit=1`),
        M.request(`menu_items?select=id,name,emoji,description,price,available&store_id=eq.${encodeURIComponent(id)}&available=eq.true&order=name.asc`),
      ]);
      const store = storeRows?.[0];
      if (!store) throw new Error('ไม่พบร้านค้าที่เลือก');
      $('#storePage').innerHTML = `<div class="mpa-page-head"><div><a href="stores.html" class="mpa-muted">← กลับไปร้านค้า</a><h1 style="margin-top:7px">${h(store.emoji || '🍽️')} ${h(store.name)}</h1><p>${h(store.description || '')}</p></div><a class="mpa-button mpa-button-secondary" href="checkout.html">ไปตะกร้า</a></div><div class="mpa-grid cards">${(items || []).map(item => `<article class="mpa-card"><div style="font-size:30px">${h(item.emoji || '🍜')}</div><h3 style="margin:9px 0 4px">${h(item.name)}</h3><p class="mpa-muted">${h(item.description || 'เมนูอร่อยพร้อมจัดส่ง')}</p><div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px"><strong>${M.ui.baht(item.price)}</strong><button class="mpa-button" data-add="${h(item.id)}">เพิ่ม</button></div></article>`).join('') || M.ui.empty('ร้านนี้ยังไม่มีเมนูพร้อมขาย')}</div>`;
      document.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => {
        const item = items.find(row => row.id === button.dataset.add); M.cart.add({ id: item.id, name: item.name, emoji: item.emoji || '🍜', price: Number(item.price || 0), storeId: store.id, storeName: store.name }); M.ui.setNotice(`เพิ่ม ${item.name} ลงตะกร้าแล้ว`);
      }));
    } catch (err) { $('#storePage').innerHTML = M.ui.error('โหลดเมนูไม่สำเร็จ', err.message); }
  }

  function cartRows(items) { return items.map(item => `<tr><td>${h(item.emoji)} ${h(item.name)}</td><td>${M.ui.baht(item.price)}</td><td><button class="mpa-button mpa-button-secondary" data-minus="${h(item.id)}">−</button> ${item.qty} <button class="mpa-button mpa-button-secondary" data-plus="${h(item.id)}">+</button></td><td>${M.ui.baht(item.price * item.qty)}</td></tr>`).join(''); }
  async function checkout() {
    const items = M.cart.read();
    app('stores', `<div class="mpa-page-head"><div><h1>ตรวจสอบและสั่งซื้อ</h1><p>ล็อกอินก่อนยืนยันออร์เดอร์ ระบบจะบันทึกตาม RLS ของลูกค้า</p></div><a class="mpa-button mpa-button-secondary" href="stores.html">เพิ่มสินค้า</a></div><div class="mpa-grid" style="grid-template-columns:minmax(0,1.25fr) minmax(290px,.75fr)"><section class="mpa-card"><div class="mpa-table-wrap"><table class="mpa-table"><thead><tr><th>รายการ</th><th>ราคา</th><th>จำนวน</th><th>รวม</th></tr></thead><tbody id="cartRows">${items.length ? cartRows(items) : `<tr><td colspan="4">ตะกร้ายังว่าง</td></tr>`}</tbody></table></div></section><aside class="mpa-card"><h2 style="margin-top:0">รายละเอียดจัดส่ง</h2><form id="checkoutForm"><div class="mpa-field"><label>ที่อยู่จัดส่ง</label><textarea id="deliveryAddress" required rows="3" placeholder="บ้านเลขที่ ถนน ตำบล อำเภอ"></textarea></div><div class="mpa-field"><label>วิธีชำระเงิน</label><select id="paymentMethod"><option>เงินสดปลายทาง (COD)</option><option>โอนผ่าน QR / แนบสลิป</option></select></div><p class="mpa-muted">ยอดรวมสินค้า <strong id="cartTotal">${M.ui.baht(M.cart.total())}</strong></p><button class="mpa-button" type="submit" style="width:100%">ยืนยันออร์เดอร์</button></form></aside></div>`);
    const update = () => { const current = M.cart.read(); $('#cartRows').innerHTML = current.length ? cartRows(current) : `<tr><td colspan="4">ตะกร้ายังว่าง</td></tr>`; $('#cartTotal').textContent = M.ui.baht(M.cart.total()); document.querySelectorAll('[data-plus]').forEach(btn => btn.onclick = () => changeQty(btn.dataset.plus, 1)); document.querySelectorAll('[data-minus]').forEach(btn => btn.onclick = () => changeQty(btn.dataset.minus, -1)); };
    const changeQty = (id, amount) => { const current = M.cart.read(); const item = current.find(row => row.id === id); if (!item) return; item.qty += amount; M.cart.write(current.filter(row => row.qty > 0)); update(); };
    update();
    $('#checkoutForm').addEventListener('submit', async event => {
      event.preventDefault(); const current = M.cart.read(); if (!current.length) return M.ui.setNotice('กรุณาเพิ่มสินค้าก่อนยืนยันออร์เดอร์', 'error');
      const user = await M.auth.currentUser(); if (!user) { M.ui.setNotice('กรุณาเข้าสู่ระบบก่อนยืนยันออร์เดอร์', 'error'); location.assign(`profile.html?next=${encodeURIComponent('checkout.html')}`); return; }
      const address = $('#deliveryAddress').value.trim(), paymentMethod = $('#paymentMethod').value;
      const groups = Object.values(current.reduce((all, row) => { (all[row.storeId] ||= []).push(row); return all; }, {}));
      try {
        for (const group of groups) {
          const total = group.reduce((sum, row) => sum + row.price * row.qty, 0);
          const order = { customer_id: user.id, customer_email: user.email || '', customer_name: user.user_metadata?.display_name || '', store_id: group[0].storeId, store_name: group[0].storeName, service_type: 'food', status: C.contracts.orderStatus.PAYMENT_REVIEW, total, payable: total, delivery_fee: 0, payment_method: paymentMethod, delivery_address: address, ordered_at: M.ui.nowIso() };
          const rows = await M.request('delivery_orders', { method: 'POST', private: true, headers: { Prefer: 'return=representation' }, body: JSON.stringify(order) });
          const orderId = rows?.[0]?.id; if (!orderId) throw new Error('ระบบสร้างออร์เดอร์ไม่สำเร็จ');
          await M.request('delivery_order_items', { method: 'POST', private: true, headers: { Prefer: 'return=minimal' }, body: JSON.stringify(group.map(item => ({ order_id: orderId, item_id: item.id, name: item.name, emoji: item.emoji, unit_price: item.price, quantity: item.qty, options: {} }))) });
        }
        M.cart.clear(); M.ui.setNotice('ส่งออร์เดอร์เข้าสู่ระบบแล้ว รอการตรวจสอบการชำระเงิน'); location.assign('orders.html');
      } catch (err) { M.ui.setNotice(err.message, 'error'); }
    });
  }

  async function orders() {
    app('orders', `<div class="mpa-page-head"><div><h1>ออร์เดอร์ของฉัน</h1><p>ดูเฉพาะออร์เดอร์ของบัญชีที่กำลังเข้าสู่ระบบ</p></div><a class="mpa-button" href="stores.html">สั่งอาหาร</a></div><section id="orders" class="mpa-card">${M.ui.loading('กำลังตรวจสอบออร์เดอร์…')}</section>`);
    const user = await M.auth.currentUser(); if (!user) { $('#orders').innerHTML = `<div class="mpa-state"><p>กรุณาเข้าสู่ระบบเพื่อดูออร์เดอร์ของคุณ</p><a class="mpa-button" href="profile.html?next=orders.html">เข้าสู่ระบบ</a></div>`; return; }
    try { const rows = await M.request(`delivery_orders?select=id,store_name,status,total,payable,ordered_at,delivery_address&customer_id=eq.${encodeURIComponent(user.id)}&order=ordered_at.desc&limit=100`, { private: true }); $('#orders').innerHTML = rows?.length ? `<div class="mpa-table-wrap"><table class="mpa-table"><thead><tr><th>เวลา</th><th>ร้านค้า</th><th>สถานะ</th><th>ยอดรวม</th></tr></thead><tbody>${rows.map(row => `<tr><td>${new Date(row.ordered_at).toLocaleString('th-TH')}</td><td>${h(row.store_name || '-')}</td><td><span class="mpa-badge">${h(row.status)}</span></td><td>${M.ui.baht(row.payable ?? row.total)}</td></tr>`).join('')}</tbody></table></div>` : M.ui.empty('ยังไม่มีออร์เดอร์'); } catch (err) { $('#orders').innerHTML = M.ui.error('โหลดออร์เดอร์ไม่สำเร็จ', err.message); }
  }

  async function profile() {
    app('profile', `<div class="mpa-page-head"><div><h1>โปรไฟล์ลูกค้า</h1><p>ข้อมูลนี้เชื่อมกับบัญชี Supabase ของคุณ</p></div></div><section id="profile" class="mpa-card">${M.ui.loading('กำลังตรวจสอบบัญชี…')}</section>`);
    const user = await M.auth.currentUser();
    if (!user) { $('#profile').innerHTML = `<form id="loginForm" style="max-width:420px"><h2>เข้าสู่ระบบ</h2><div class="mpa-field"><label>อีเมล</label><input id="email" type="email" required></div><div class="mpa-field"><label>รหัสผ่าน</label><input id="password" type="password" required></div><button class="mpa-button" type="submit">เข้าสู่ระบบ</button></form>`; $('#loginForm').onsubmit = async event => { event.preventDefault(); try { await M.auth.signIn($('#email').value.trim(), $('#password').value); const next = q.get('next') || 'index.html'; location.assign(next); } catch (err) { M.ui.setNotice(err.message, 'error'); } }; return; }
    try { const rows = await M.request(`user_profiles?select=display_name,phone,email&user_id=eq.${encodeURIComponent(user.id)}&limit=1`, { private: true }); const profile = rows?.[0] || {}; $('#profile').innerHTML = `<form id="profileForm" style="max-width:520px"><div class="mpa-field"><label>อีเมล</label><input value="${h(profile.email || user.email || '')}" disabled></div><div class="mpa-field"><label>ชื่อที่แสดง</label><input id="displayName" value="${h(profile.display_name || user.user_metadata?.display_name || '')}" required></div><div class="mpa-field"><label>เบอร์โทรศัพท์</label><input id="phone" value="${h(profile.phone || '')}" inputmode="tel"></div><button class="mpa-button" type="submit">บันทึกข้อมูล</button><button class="mpa-button mpa-button-secondary" type="button" id="signOut" style="margin-left:8px">ออกจากระบบ</button></form>`; $('#profileForm').onsubmit = async event => { event.preventDefault(); try { await M.request('user_profiles?on_conflict=user_id', { method: 'POST', private: true, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: user.id, email: user.email, display_name: $('#displayName').value.trim(), phone: $('#phone').value.trim() }) }); M.ui.setNotice('บันทึกโปรไฟล์แล้ว'); } catch (err) { M.ui.setNotice(err.message, 'error'); } }; $('#signOut').onclick = () => M.auth.signOut('index.html'); } catch (err) { $('#profile').innerHTML = M.ui.error('โหลดโปรไฟล์ไม่สำเร็จ', err.message); }
  }

  const page = document.body.dataset.page;
  if (page === 'home') home(); else if (page === 'stores') storesPage(); else if (page === 'store') storePage(); else if (page === 'checkout') checkout(); else if (page === 'orders') orders(); else if (page === 'profile') profile();
})();
