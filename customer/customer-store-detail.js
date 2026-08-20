(() => {
  'use strict';

  const M = window.APServiceMPA;
  const safeImage = value => {
    const image = String(value || '');
    return /^https:\/\//i.test(image) || (/^data:image\/(?:jpeg|png|webp);base64,/i.test(image) && image.length <= 1_400_000) ? image : '';
  };
  const compact = value => String(value || '').trim().slice(0, 180);

  const mount = async ({ id, app, pageScope, image: legacyImage, escape: h }) => {
    app('stores', `<main id="storeDetail" class="store-detail-shell" aria-live="polite">${M.ui.loading('กำลังโหลดร้านและเมนู…')}</main>`);
    const scope = pageScope('customer:store-detail');

    try {
      const [storeResult, menuResult, topResult] = await Promise.allSettled([
        scope.request(`catalog_stores?select=id,name,emoji,description,rating,eta,icon_url,background_url&id=eq.${encodeURIComponent(id)}&limit=1`, { cacheTtlMs: 30_000, cacheKey: `catalog-store:${id}` }),
        scope.request(`catalog_menu_items?select=id,store_id,name,emoji,description,price,available,promo,image_url,stock,category_id,category_name,category_icon&store_id=eq.${encodeURIComponent(id)}&order=category_id.asc,name.asc`, { cacheTtlMs: 30_000, cacheKey: `catalog-menu:${id}` }),
        scope.request('rpc/customer_store_top_menu_items', { method: 'POST', body: JSON.stringify({ p_store_id: id, p_limit: 10 }), cacheTtlMs: 30_000, cacheKey: `customer-store-top-menus:${id}` }),
      ]);
      if (storeResult.status !== 'fulfilled') throw storeResult.reason;
      const store = storeResult.value?.[0];
      if (!store) throw new Error('ไม่พบร้านค้าที่เลือก');

      const items = menuResult.status === 'fulfilled' && Array.isArray(menuResult.value) ? menuResult.value : [];
      const menuReadFailed = menuResult.status !== 'fulfilled';
      const itemById = new Map(items.map(item => [String(item.id), item]));
      const topRows = topResult.status === 'fulfilled' && Array.isArray(topResult.value) ? topResult.value : [];
      const topItems = topRows.map((row, index) => ({ ...itemById.get(String(row.item_id)), rank: index + 1, soldQuantity: Number(row.sold_quantity || 0) })).filter(item => item.id);
      const groups = new Map();
      items.forEach(item => {
        const key = String(item.category_id || item.category_name || 'uncategorized');
        if (!groups.has(key)) groups.set(key, { id: key, name: String(item.category_name || 'เมนูแนะนำ'), icon: String(item.category_icon || '🍽️'), items: [] });
        groups.get(key).items.push(item);
      });

      const storeLogo = legacyImage(store.icon_url) || legacyImage(store.emoji);
      const storeCover = safeImage(store.background_url);
      const fallbackStore = storeLogo ? '🏪' : String(store.emoji || '🍽️').slice(0, 12);
      const isReady = item => item.available !== false && (item.stock === null || item.stock === undefined || item.stock === '' || Number(item.stock) > 0);
      const card = (item, { rank = 0, soldQuantity = 0 } = {}) => {
        const ready = isReady(item);
        const image = legacyImage(item.image_url);
        const emoji = String(item.emoji || '🍜').slice(0, 12);
        const rankClass = rank === 1 ? ' is-gold' : rank === 2 ? ' is-silver' : rank === 3 ? ' is-bronze' : '';
        const visual = image ? `<img src="${h(image)}" alt="${h(item.name || 'รูปเมนู')}" loading="lazy" decoding="async" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>${h(emoji)}</span>` : `<span>${h(emoji)}</span>`;
        return `<article class="store-menu-card${ready ? '' : ' is-unavailable'}" data-menu-card="${h(item.id)}"><div class="store-menu-card__visual">${visual}${rank ? `<span class="store-menu-rank${rankClass}" aria-label="เมนูขายดีอันดับ ${rank}">#${rank}</span>` : ''}</div><div class="store-menu-card__body"><div class="store-menu-card__heading"><h3>${h(item.name || 'เมนูไม่ระบุชื่อ')}</h3>${item.promo ? `<small>${h(item.promo)}</small>` : ''}</div><p>${h(compact(item.description) || 'เมนูของร้านพร้อมจัดส่ง')}</p>${rank ? `<span class="store-menu-card__sold">ขายแล้ว ${Math.max(0, soldQuantity).toLocaleString('th-TH')} รายการ</span>` : ''}<div class="store-menu-card__footer"><strong>${M.ui.baht(item.price)}</strong>${ready ? `<button type="button" class="store-menu-add" data-store-add="${h(item.id)}" aria-label="เพิ่ม ${h(item.name)} ลงตะกร้า">＋</button>` : '<span class="store-menu-unavailable">ยังไม่พร้อมขาย</span>'}</div></div></article>`;
      };
      const categorySection = group => `<section class="store-category-section" data-store-category="${h(group.id)}"><div class="store-category-section__head"><div><p class="store-section-kicker">${h(group.icon)} หมวดเมนู</p><h2>${h(group.name)}</h2><span>${group.items.length} รายการ · เลื่อนเพื่อเลือกเมนู</span></div><span class="store-scroll-hint" aria-hidden="true">เลื่อนดู →</span></div><div class="store-menu-rail" role="list" aria-label="เมนูหมวด ${h(group.name)}">${group.items.map(item => card(item)).join('')}</div></section>`;
      const topSection = topItems.length ? `<section class="store-top-section" aria-labelledby="storeTopMenuTitle"><div class="store-category-section__head"><div><p class="store-section-kicker">✦ จัดอันดับจากยอดขายสำเร็จจริง</p><h2 id="storeTopMenuTitle">10 เมนูขายดีของร้าน</h2><span>เรียงจากจำนวนที่ขายได้ · ไม่มีการสร้างอันดับแทนข้อมูลจริง</span></div><span class="store-top-badge">TOP 10</span></div><div class="store-menu-rail store-menu-rail--top" role="list" aria-label="สิบเมนูขายดี">${topItems.map(item => card(item, item)).join('')}</div></section>` : '';
      const categoryContent = items.length ? [...groups.values()].map(categorySection).join('') : `<section class="store-detail-empty" role="status"><span aria-hidden="true">🍽️</span><div><h2>${menuReadFailed ? 'ยังโหลดรายการเมนูไม่ได้' : 'ร้านนี้ยังไม่มีเมนูพร้อมขาย'}</h2><p>${menuReadFailed ? 'กรุณาลองใหม่อีกครั้ง หรือติดต่อร้านค้าให้ตรวจสอบรายการเมนู' : 'ร้านค้ากำลังเตรียมรายการ เมนูจะแสดงที่นี่เมื่อพร้อมให้บริการ'}</p></div></section>`;
      const heroStyle = storeCover ? ` style="--store-cover:url('${h(storeCover)}')"` : '';
      document.querySelector('#storeDetail').innerHTML = `<section class="store-detail-hero"${heroStyle}><div class="store-detail-hero__cover" aria-hidden="true"></div><div class="store-detail-hero__content"><a href="stores.html" class="store-detail-back">← กลับไปร้านค้า</a><div class="store-detail-identity"><div class="store-detail-logo">${storeLogo ? `<img src="${h(storeLogo)}" alt="โลโก้ ${h(store.name)}" loading="eager" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>${h(fallbackStore)}</span>` : `<span>${h(fallbackStore)}</span>`}</div><div><p class="store-section-kicker">ร้านค้า AP SERVICE</p><h1>${h(store.name)}</h1><p class="store-detail-summary">${h(compact(store.description) || 'ร้านค้าใน AP Service')}</p><div class="store-detail-meta"><span>★ ${Number(store.rating) > 0 ? Number(store.rating).toFixed(1) : 'ยังไม่มีคะแนน'}</span><span>${h(store.eta || 'พร้อมให้บริการ')}</span></div></div></div></div><a class="store-detail-cart" href="checkout.html">ตะกร้าของฉัน <span data-store-cart-count>0</span></a></section>${topSection}<div class="store-category-stack">${categoryContent}</div>`;

      const syncStoreCart = () => {
        const count = M.cart.read().reduce((sum, row) => sum + Number(row.qty || 0), 0);
        document.querySelectorAll('[data-store-cart-count]').forEach(node => { node.textContent = count; });
      };
      const add = async itemId => {
        const user = await M.auth.currentUser();
        if (!user) {
          M.ui.setNotice('เข้าสู่ระบบก่อนเพิ่มเมนูลงตะกร้า เพื่อบันทึกรายการและเตรียมข้อมูลจัดส่ง');
          location.assign(`profile.html?next=${encodeURIComponent(`store.html?id=${store.id}`)}`);
          return;
        }
        const item = itemById.get(String(itemId));
        if (!item || !isReady(item)) return;
        M.cart.add({ id: item.id, name: item.name, emoji: item.emoji || '🍜', image_url: legacyImage(item.image_url), price: Number(item.price || 0), storeId: store.id, storeName: store.name });
        syncStoreCart();
        M.ui.setNotice(`เพิ่ม ${item.name} ลงตะกร้าแล้ว`);
      };
      document.querySelectorAll('[data-store-add]').forEach(button => { button.addEventListener('click', () => void add(button.dataset.storeAdd)); });
      syncStoreCart();
    } catch (error) {
      const host = document.querySelector('#storeDetail');
      if (host && error?.code !== M.network.STALE_RESPONSE) host.innerHTML = M.ui.error('โหลดร้านค้าไม่สำเร็จ', 'กรุณาลองใหม่อีกครั้ง');
    }
  };

  window.APServiceStoreDetail = { mount };
})();
