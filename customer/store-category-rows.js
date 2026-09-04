(() => {
  'use strict';

  const PAGE_NAME = 'stores';
  const MAX_TIER = 5;
  const storeFields = '*';
  const escapeHtml = value => window.APServiceMPA?.ui?.escapeHtml(String(value ?? '')) ?? String(value ?? '');
  const numeric = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const imageUrl = value => {
    const raw = String(value || '').trim();
    return /^(https?:|data:image\/)/i.test(raw) ? raw : '';
  };
  const tierLabel = tier => tier > 0 ? `Tier ${tier}` : '';
  const noMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

  const categoryFromStore = store => ({
    id: String(store.category_id || store.category_name || 'uncategorized'),
    name: String(store.category_name || 'ร้านค้าอื่น ๆ'),
    icon: String(store.category_icon || '🏪'),
  });

  const categoryFromCatalog = category => {
    const id = category?.id ?? category?.category_id;
    const name = category?.name ?? category?.category_name ?? category?.title;
    if (!id || !name) return null;
    return { id: String(id), name: String(name), icon: String(category.icon || category.category_icon || '🏷️') };
  };

  const isStoreReady = store => {
    if (store.is_open === false || store.is_available === false || store.active === false) return false;
    const status = String(store.status || '').trim().toLowerCase();
    return !['closed', 'inactive', 'offline', 'unavailable'].includes(status);
  };

  const qualityComparator = (left, right) => {
    const readyDelta = Number(isStoreReady(right)) - Number(isStoreReady(left));
    if (readyDelta) return readyDelta;
    const ratingDelta = numeric(right.rating) - numeric(left.rating);
    if (ratingDelta) return ratingDelta;
    const reviewDelta = numeric(right.review_count) - numeric(left.review_count);
    if (reviewDelta) return reviewDelta;
    const orderDelta = numeric(right.order_count) - numeric(left.order_count);
    if (orderDelta) return orderDelta;
    return String(left.name || '').localeCompare(String(right.name || ''), 'th');
  };

  const tierForIndex = index => index < MAX_TIER ? index + 1 : 0;

  const storeCard = (store, tier) => {
    const background = imageUrl(store.background_url);
    const icon = imageUrl(store.icon_url) || imageUrl(store.emoji);
    const emoji = icon ? '🏪' : String(store.emoji || '🏪').slice(0, 12);
    const rating = numeric(store.rating);
    const reviews = numeric(store.review_count);
    const availability = isStoreReady(store) ? 'พร้อมให้บริการ' : 'ปิดชั่วคราว';
    const href = `store.html?id=${encodeURIComponent(store.id)}`;
    const tierMarkup = tier
      ? `<span class="store-category-row-card__tier store-category-row-card__tier--${tier}" aria-label="ร้านระดับ ${escapeHtml(tierLabel(tier))}"><span aria-hidden="true">★</span><b>${tier}</b></span>`
      : '';

    return `<a class="store-category-row-card${tier ? ` store-category-row-card--tier-${tier}` : ''}" href="${escapeHtml(href)}" data-tier="${tier || ''}" aria-label="ดูเมนูร้าน ${escapeHtml(store.name)}${tier ? ` ร้านระดับ ${escapeHtml(tierLabel(tier))}` : ''}"><span class="store-category-row-card__visual${background ? ' has-background' : ''}">${background ? `<img class="store-category-row-card__background" src="${escapeHtml(background)}" alt="" loading="lazy" decoding="async" onerror="this.closest('.store-category-row-card__visual')?.classList.remove('has-background');this.remove()">` : ''}${icon ? `<img class="store-category-row-card__icon" src="${escapeHtml(icon)}" alt="โลโก้ ${escapeHtml(store.name)}" loading="lazy" decoding="async" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'store-category-row-card__emoji',textContent:'${escapeHtml(emoji)}'}))">` : `<span class="store-category-row-card__emoji">${escapeHtml(emoji)}</span>`}${tierMarkup}</span><span class="store-category-row-card__copy"><strong>${escapeHtml(store.name)}</strong><span class="store-category-row-card__meta"><span>${rating > 0 ? `★ ${rating.toFixed(1)}` : 'ยังไม่มีคะแนน'}</span><span>${reviews > 0 ? `${reviews.toLocaleString('th-TH')} รีวิว` : availability}</span></span></span></a>`;
  };

  const section = (category, stores) => {
    const slug = String(category.id).replace(/[^a-z0-9_-]/gi, '-').slice(0, 36) || 'catalog';
    const titleId = `storeCategoryRowTitle-${slug}`;
    const cards = stores.map((store, index) => storeCard(store, tierForIndex(index))).join('');
    return `<section class="store-category-row" aria-labelledby="${escapeHtml(titleId)}"><div class="store-category-row__heading"><div><p class="store-category-row__eyebrow">${escapeHtml(category.icon)} CATEGORY</p><h2 id="${escapeHtml(titleId)}">${escapeHtml(category.name)}</h2><p>ร้านคุณภาพสูงจะแสดงก่อนตามข้อมูลล่าสุด</p></div>${stores.length ? '<span class="store-category-row__hint" aria-hidden="true">เลื่อนเพื่อดูเพิ่ม <b>→</b></span>' : ''}</div>${stores.length ? `<div class="store-category-row__rail" aria-label="ร้านค้าในหมวด ${escapeHtml(category.name)}">${cards}</div>` : '<div class="store-category-row__empty">ยังไม่มีร้านค้าที่พร้อมแสดงในหมวดนี้</div>'}</section>`;
  };

  const render = (host, categoryRows, grouped) => {
    const ordered = categoryRows
      .map(category => ({ category, stores: (grouped.get(category.id) || []).slice().sort(qualityComparator) }))
      .sort((left, right) => right.stores.length - left.stores.length || left.category.name.localeCompare(right.category.name, 'th'));
    const populated = ordered.filter(item => item.stores.length);
    host.innerHTML = `<section class="store-category-rows" aria-labelledby="storeCategoryRowsTitle"><div class="store-category-rows__intro"><p class="store-category-rows__eyebrow">EXPLORE BY CATEGORY</p><h2 id="storeCategoryRowsTitle">เลือกร้านตามหมวดหมู่</h2><p>เลือกร้านที่เปิดให้บริการและดูเมนูที่เหมาะกับคุณได้ง่ายขึ้น</p></div>${populated.length ? ordered.map(item => section(item.category, item.stores)).join('') : '<div class="store-category-rows__empty">ยังไม่มีร้านค้าที่พร้อมแสดงตามหมวดหมู่ในขณะนี้</div>'}</section>`;
  };

  const activateTierMoments = host => {
    const cards = [...host.querySelectorAll('.store-category-row-card[data-tier]')].filter(card => card.dataset.tier);
    if (!cards.length) return;
    cards.forEach(card => {
      card.classList.add('has-tier-sparkle');
      card.addEventListener('pointerdown', event => {
        if (noMotion()) return;
        const pressed = event.currentTarget;
        pressed.classList.remove('is-tier-pressed');
        void pressed.offsetWidth;
        pressed.classList.add('is-tier-pressed');
        window.setTimeout(() => pressed.classList.remove('is-tier-pressed'), 460);
      }, { passive: true });
    });
  };

  async function initialise() {
    if (document.body?.dataset?.page !== PAGE_NAME || document.getElementById('storeCategoryRowsMount')) return;
    const M = window.APServiceMPA;
    const target = document.querySelector('.customer-filters');
    if (!M?.request || !target) return;

    const host = document.createElement('div');
    host.id = 'storeCategoryRowsMount';
    host.innerHTML = '<section class="store-category-rows store-category-rows--loading" aria-live="polite"><div class="store-category-rows__intro"><p class="store-category-rows__eyebrow">EXPLORE BY CATEGORY</p><h2>เลือกร้านตามหมวดหมู่</h2><p>กำลังจัดอันดับร้านจากข้อมูลล่าสุด…</p></div></section>';
    target.before(host);

    try {
      const [stores, catalogCategories] = await Promise.all([
        M.request(`catalog_stores?select=${storeFields}&order=rating.desc&limit=300`, { cacheTtlMs: 30_000, cacheKey: 'customer-store-category-rows' }),
        M.request('store_categories?select=*&limit=100', { cacheTtlMs: 120_000, cacheKey: 'customer-store-category-catalog' }).catch(() => []),
      ]);
      const categories = new Map((catalogCategories || []).map(categoryFromCatalog).filter(Boolean).map(category => [category.id, category]));
      const grouped = new Map();
      (stores || []).forEach(store => {
        const category = categoryFromStore(store);
        if (!categories.has(category.id)) categories.set(category.id, category);
        if (!grouped.has(category.id)) grouped.set(category.id, []);
        grouped.get(category.id).push(store);
      });
      render(host, [...categories.values()], grouped);
      activateTierMoments(host);
    } catch (error) {
      console.warn('ไม่สามารถโหลดร้านค้าแยกตามหมวดหมู่ได้', error);
      host.innerHTML = '<section class="store-category-rows"><div class="store-category-rows__empty">ยังโหลดร้านค้าแยกตามหมวดหมู่ไม่ได้ กรุณาลองใหม่อีกครั้ง</div></section>';
    }
  }

  const start = () => {
    if (document.body?.dataset?.page !== PAGE_NAME) return;
    const observer = new MutationObserver(() => {
      if (document.querySelector('.customer-filters')) {
        observer.disconnect();
        void initialise();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    void initialise();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
