/* AP Service Store Carousel + lightweight store media.
 * Keeps the existing store ids/openStore flow, but renders store lists as
 * horizontal snap rails. Store media is resolved from AppState only when a
 * card approaches the viewport, so large data URLs are not copied into DOM.
 */
(function () {
  'use strict';

  const root = window;
  const $ = selector => document.querySelector(selector);
  const escapeHtml = value => {
    if (typeof root.escapeHtml === 'function') return root.escapeHtml(value);
    return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  };
  const mediaUrl = value => {
    const text = String(value || '').trim();
    return /^(https?:\/\/|data:image\/)/i.test(text) ? text : '';
  };

  const style = document.createElement('style');
  style.textContent = `
    .ap-store-carousel {
      display: flex !important;
      flex-wrap: nowrap !important;
      gap: 14px;
      overflow-x: auto;
      overflow-y: hidden;
      padding: 3px 2px 12px;
      scroll-snap-type: x mandatory;
      scroll-behavior: smooth;
      overscroll-behavior-x: contain;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
    }
    .ap-store-carousel > .ap-store-card {
      flex: 0 0 min(84vw, 360px);
      min-width: min(84vw, 360px);
      scroll-snap-align: start;
      margin: 0 !important;
    }
    @media (min-width: 900px) {
      .ap-store-carousel > .ap-store-card { flex-basis: calc((100% - 28px) / 3); min-width: calc((100% - 28px) / 3); }
    }
    .ap-store-card { position: relative; overflow: hidden; }
    .ap-store-card .store-visual { position: relative; isolation: isolate; background: linear-gradient(135deg,#eff9f7,#d8efeb); }
    .ap-store-card .store-visual.has-background { background-size: cover; background-position: center; }
    .ap-store-card .store-visual::after { content: ''; position: absolute; inset: 0; z-index: -1; background: linear-gradient(135deg,rgba(4,55,51,.12),rgba(4,55,51,.38)); opacity: 0; transition: opacity .2s ease; }
    .ap-store-card .store-visual.has-background::after { opacity: 1; }
    .ap-store-card .store-icon-image { position: absolute; inset: 15%; width: 70%; height: 70%; object-fit: contain; border-radius: 20px; background: rgba(255,255,255,.92); box-shadow: 0 8px 22px rgba(0,44,40,.16); z-index: 2; }
    .ap-store-card .store-icon-image.is-loaded + .store-card-icon-fallback { display: none; }
    .ap-store-card .store-card-icon-fallback { position: absolute; inset: 0; display: grid; place-items: center; font-size: 44px; z-index: 1; }
    .ap-store-card .store-copy { position: relative; z-index: 3; }
    .ap-store-card .store-visual-overlay { position:absolute; left:12px; right:12px; bottom:10px; z-index:4; color:var(--ink); text-align:left; text-shadow:0 1px 8px rgba(255,255,255,.8); }
    .ap-store-card .store-visual.has-background .store-visual-overlay { color:#fff; text-shadow:0 1px 8px rgba(0,0,0,.8); }
    .ap-store-card .store-visual-overlay strong { display:block; font-size:18px; line-height:1.15; }
    .ap-store-card .store-visual-overlay span { display:block; margin-top:3px; font-size:10px; font-weight:800; opacity:.94; }
    .ap-store-carousel-controls { display:flex; align-items:center; justify-content:flex-end; gap:7px; margin: -2px 0 10px; }
    .ap-store-carousel-controls button { border:1px solid var(--line); background:#fff; color:var(--ink); border-radius:999px; padding:7px 11px; font-size:11px; font-weight:850; cursor:pointer; }
    .ap-store-carousel-controls button:active { transform:scale(.97); }
    .ap-store-carousel-controls small { color:var(--muted); margin-right:auto; font-size:10px; }
    .store-detail-media-picker [data-store-detail-download] { display:inline-flex; margin-top:8px; }
    .store-form-media-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
    .store-form-media-grid > div { display:grid; gap:5px; }
    .store-form-media-grid input[type="file"] { max-width:100%; font-size:10px; }
    @media (max-width:650px) { .store-form-media-grid { grid-template-columns:1fr; } }
  `;
  document.head.appendChild(style);

  const timers = new WeakMap();
  const observed = new WeakSet();
  let observer = null;

  function getStore(card) {
    const id = card?.dataset?.storeId;
    return id && root.AppState?.stores?.find(store => String(store.id) === String(id));
  }

  function safeCssImage(value) {
    const url = mediaUrl(value);
    return url ? `url(${JSON.stringify(url)})` : '';
  }

  function loadStoreMedia(card) {
    if (!card || card.dataset.mediaReady === 'true') return;
    const store = getStore(card);
    if (!store) return;
    card.dataset.mediaReady = 'true';
    const visual = card.querySelector('.store-visual');
    const icon = card.querySelector('.store-icon-image');
    const fallback = card.querySelector('.store-card-icon-fallback');
    const iconUrl = mediaUrl(store.iconUrl || store.icon_url || store.imageUrl || store.image_url);
    const backgroundUrl = mediaUrl(store.backgroundUrl || store.background_url);
    if (fallback && mediaUrl(fallback.textContent)) fallback.textContent = store.emoji || store.categoryIcon || '🏪';
    if (backgroundUrl && visual) {
      visual.classList.add('has-background');
      visual.style.backgroundImage = `linear-gradient(135deg,rgba(4,55,51,.12),rgba(4,55,51,.38)),${safeCssImage(backgroundUrl)}`;
    }
    if (iconUrl && icon) {
      icon.onload = () => { icon.classList.add('is-loaded'); if (fallback) fallback.hidden = true; };
      icon.onerror = () => { icon.removeAttribute('src'); icon.classList.remove('is-loaded'); if (fallback) fallback.hidden = false; };
      icon.src = iconUrl;
    }
  }

  function setupObserver() {
    if (observer || !('IntersectionObserver' in root)) return;
    observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting || entry.intersectionRatio > 0) loadStoreMedia(entry.target);
    }), { root: null, rootMargin: '0px 90% 0px 90%', threshold: 0.01 });
  }

  function ensureControls(target) {
    const parent = target?.parentElement;
    if (!parent) return null;
    let controls = parent.querySelector(`:scope > .ap-store-carousel-controls[data-for="${target.id}"]`);
    if (controls) return controls;
    controls = document.createElement('div');
    controls.className = 'ap-store-carousel-controls';
    controls.dataset.for = target.id;
    controls.innerHTML = `<small>เลื่อนซ้าย–ขวาเพื่อดูร้านเพิ่มเติม</small><button type="button" data-direction="prev" aria-label="ดูร้านก่อนหน้า">‹ ก่อนหน้า</button><button type="button" data-direction="next" aria-label="ดูร้านถัดไป">ถัดไป ›</button>`;
    target.insertAdjacentElement('afterend', controls);
    controls.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      const card = target.querySelector('.ap-store-card');
      const step = Math.max(220, Math.round((card?.getBoundingClientRect().width || target.clientWidth * .84) + 14));
      const max = Math.max(0, target.scrollWidth - target.clientWidth);
      const atEnd = target.scrollLeft >= max - 4;
      const next = button.dataset.direction === 'prev' ? Math.max(0, target.scrollLeft - step) : (atEnd ? 0 : Math.min(max, target.scrollLeft + step));
      target.scrollTo({ left: next, behavior: 'smooth' });
    }));
    return controls;
  }

  function startAutoSlide(target) {
    if (!target || timers.has(target)) return;
    const tick = () => {
      if (document.hidden || target.dataset.pauseAuto === 'true' || target.scrollWidth <= target.clientWidth + 8) return;
      const card = target.querySelector('.ap-store-card');
      const step = Math.max(220, Math.round((card?.getBoundingClientRect().width || target.clientWidth * .84) + 14));
      const max = target.scrollWidth - target.clientWidth;
      const atEnd = target.scrollLeft >= max - 4;
      const next = atEnd ? 0 : Math.min(max, target.scrollLeft + step);
      target.scrollTo({ left: next, behavior: 'smooth' });
    };
    const id = root.setInterval(tick, 2000);
    timers.set(target, id);
    target.addEventListener('pointerenter', () => { target.dataset.pauseAuto = 'true'; }, { passive: true });
    target.addEventListener('pointerleave', () => { target.dataset.pauseAuto = 'false'; }, { passive: true });
    target.addEventListener('touchstart', () => { target.dataset.pauseAuto = 'true'; }, { passive: true });
    target.addEventListener('touchend', () => { root.setTimeout(() => { target.dataset.pauseAuto = 'false'; }, 700); }, { passive: true });
    target.addEventListener('focusin', () => { target.dataset.pauseAuto = 'true'; });
    target.addEventListener('focusout', () => { target.dataset.pauseAuto = 'false'; });
  }

  function enhanceTarget(target) {
    if (!target) return;
    target.classList.add('ap-store-carousel');
    target.setAttribute('aria-label', 'รายการร้านค้าแบบเลื่อนซ้ายขวา');
    ensureControls(target);
    setupObserver();
    target.querySelectorAll('.ap-store-card').forEach(card => {
      if (observer && !observed.has(card)) { observed.add(card); observer.observe(card); }
      else if (!observer) loadStoreMedia(card);
    });
    startAutoSlide(target);
  }

  function refreshTargets() {
    enhanceTarget($('#homeStores'));
    enhanceTarget($('#allStores'));
  }

  const storeOps = root.StoreOps;
  if (storeOps && typeof storeOps.storeCard === 'function') {
    storeOps.storeCard = store => {
      const state = storeOps.state(store);
      const reviewCount = Number((store.reviewCount ?? store.review_count) || 0);
      const fallbackCandidate = store.emoji || store.categoryIcon || '🏪';
      const fallback = mediaUrl(fallbackCandidate) ? '🏪' : fallbackCandidate;
      return `<button class="store ap-store-card" data-store-id="${escapeHtml(store.id)}" onclick="openStore('${escapeHtml(store.id)}')"><div class="store-visual"><span class="store-card-icon-fallback">${escapeHtml(fallback)}</span><img class="store-icon-image" alt="ไอคอนร้าน" decoding="async" referrerpolicy="no-referrer" /><div class="store-visual-overlay"><strong>${escapeHtml(store.name)}</strong><span>${escapeHtml(store.categoryName || 'ร้านค้า')}</span></div></div><div class="store-copy"><p>${escapeHtml(store.desc || store.description || '')}</p><div class="store-meta"><span>⭐ <b>${Number(store.rating || 0).toFixed(1)}</b>${reviewCount ? ` (${reviewCount} รีวิว)` : ''}</span><span>🛵 ${escapeHtml(typeof root.storeDeliveryEstimate === 'function' ? root.storeDeliveryEstimate(store) : 'ตั้งตำแหน่งเพื่อดูค่าส่ง')}</span></div><div class="store-meta" style="border-top:0;padding-top:6px"><span>🟢 ${escapeHtml(state.label)}</span></div></div></button>`;
    };
  }

  if (root.CategoryUX && typeof root.CategoryUX.renderStoreTargets === 'function' && !root.CategoryUX.renderStoreTargets.__carouselWrapped) {
    const baseRender = root.CategoryUX.renderStoreTargets.bind(root.CategoryUX);
    const enhancedRender = function (...args) {
      const result = baseRender(...args);
      root.requestAnimationFrame(refreshTargets);
      return result;
    };
    enhancedRender.__carouselWrapped = true;
    root.CategoryUX.renderStoreTargets = enhancedRender;
  }

  const baseOpenStore = root.openStore;
  if (typeof baseOpenStore === 'function' && !baseOpenStore.__storeMediaWrapped) {
    const enhancedOpen = function (id, ...args) {
      const result = baseOpenStore.call(this, id, ...args);
      root.requestAnimationFrame(() => {
        const store = root.AppState?.stores?.find(item => String(item.id) === String(id));
        const banner = document.querySelector('#view-storefront > .panel');
        if (banner && store) {
          const backgroundUrl = mediaUrl(store.backgroundUrl || store.background_url);
          banner.style.backgroundImage = backgroundUrl ? `linear-gradient(135deg,rgba(4,63,59,.88),rgba(8,119,108,.72)),${safeCssImage(backgroundUrl)}` : '';
          banner.style.backgroundSize = backgroundUrl ? 'cover' : '';
          banner.style.backgroundPosition = backgroundUrl ? 'center' : '';
        }
      });
      return result;
    };
    enhancedOpen.__storeMediaWrapped = true;
    root.openStore = enhancedOpen;
  }

  // Re-render once so the initial store lists use the same lightweight carousel markup.
  try { root.CategoryUX?.renderStoreTargets?.(); } catch (error) { console.warn('ติดตั้งคารูเซลร้านไม่สำเร็จในรอบแรก', error); }
  // Resolve the current page after the initial renderer and after every category/search refresh.
  root.setTimeout(refreshTargets, 0);
  root.addEventListener('load', refreshTargets, { once: true });
  root.addEventListener('resize', () => root.requestAnimationFrame(refreshTargets), { passive: true });
})();

//# sourceURL=store_carousel_icon_patch.js
/* end */
