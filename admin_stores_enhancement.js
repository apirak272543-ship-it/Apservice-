(() => {
  'use strict';

  const state = {
    initialized: false,
    baseRenderer: null,
    categories: [],
    search: '',
    category: 'all',
    status: 'all',
    loadingCategories: false,
  };

  const q = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const money = value => `${Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ฿`;
  const stores = () => Array.isArray(window.AppState?.stores) ? window.AppState.stores : [];
  const categoryFor = store => {
    const id = String(store?.categoryId || store?.category_id || 'store-other');
    const found = state.categories.find(item => String(item.id) === id);
    return {
      id,
      name: store?.categoryName || store?.category_name || found?.name || 'อื่น ๆ',
      icon: store?.categoryIcon || store?.category_icon || found?.icon || '🏪',
    };
  };
  const moderationStatus = store => String(store?.moderationStatus || store?.moderation_status || (store?.active === false ? 'suspended' : 'active'));
  const moderationLabel = status => ({ active: 'ปกติ', suspended: 'ระงับ/แบน', archived: 'เก็บออกจากหน้าเว็บ' }[status] || status || 'ไม่ระบุ');
  const openLabel = store => {
    if (store?.emergencyClosed) return 'ปิดฉุกเฉิน';
    if (store?.active === false) return 'ปิดร้าน';
    const source = typeof window.StoreOps?.state === 'function' ? window.StoreOps.state(store) : null;
    return source?.label || 'เปิดรับออเดอร์';
  };
  const imageMarkup = store => {
    const url = String(store?.imageUrl || store?.image_url || '').trim();
    return url ? `<img src="${esc(url)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span>${esc(store?.emoji || '🍽️')}</span>` : `<span>${esc(store?.emoji || '🍽️')}</span>`;
  };

  function ensureStyle() {
    if (q('#adminStoreGridStyle')) return;
    const style = document.createElement('style');
    style.id = 'adminStoreGridStyle';
    style.textContent = `
      #adminStoreGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-top:14px}
      .admin-store-toolbar{display:grid;grid-template-columns:minmax(180px,1.4fr) minmax(150px,1fr) minmax(130px,.8fr);gap:8px;align-items:end;margin:0 0 12px}
      .admin-store-toolbar .field{margin:0}.admin-store-toolbar input,.admin-store-toolbar select{width:100%}
      .admin-store-summary{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:0 0 10px;color:var(--muted);font-size:11px}
      .admin-store-summary strong{color:var(--ink);font-size:13px}
      .admin-store-category-chips{display:flex;gap:7px;overflow-x:auto;padding:2px 0 5px;scrollbar-width:thin}
      .admin-store-category-chips button{white-space:nowrap;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--ink);padding:7px 10px;font-size:10px;font-weight:850;cursor:pointer}
      .admin-store-category-chips button.active{background:var(--primary);border-color:var(--primary);color:#fff}
      .admin-store-card{min-width:0;border:1px solid var(--line);border-radius:16px;background:#fff;box-shadow:0 5px 16px rgba(4,55,50,.06);padding:12px;display:flex;flex-direction:column;gap:9px}
      .admin-store-card-head{display:flex;gap:10px;align-items:center;min-width:0}.admin-store-icon{width:54px;height:54px;flex:0 0 54px;border-radius:15px;background:linear-gradient(135deg,#e3f7f1,#f6fcfa);border:1px solid #cce8df;display:grid;place-items:center;overflow:hidden;font-size:28px}.admin-store-icon img{display:block;width:100%;height:100%;object-fit:cover}.admin-store-icon img[hidden]{display:none}.admin-store-card-title{min-width:0}.admin-store-card-title h3{margin:0;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.admin-store-card-title p{margin:3px 0 0;color:var(--muted);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .admin-store-meta{display:flex;gap:5px;flex-wrap:wrap}.admin-store-badge{display:inline-flex;align-items:center;gap:3px;border-radius:999px;padding:4px 7px;background:#f2f8f6;color:#216459;font-size:9px;font-weight:850}.admin-store-badge.warn{background:#fff5df;color:#8b5a03}.admin-store-badge.danger{background:#fff0ef;color:#a44343}.admin-store-card-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;padding:8px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.admin-store-card-stats div{min-width:0}.admin-store-card-stats span{display:block;color:var(--muted);font-size:9px}.admin-store-card-stats b{display:block;margin-top:2px;color:var(--ink);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.admin-store-card-actions{display:flex;gap:6px;flex-wrap:wrap}.admin-store-card-actions .btn{flex:1 1 88px;min-height:32px;padding:6px 8px;font-size:10px}.admin-store-empty{grid-column:1/-1;text-align:center;padding:30px 14px;border:1px dashed #b9d8d1;border-radius:15px;color:var(--muted);background:#f8fcfb}.admin-store-empty strong{display:block;margin-bottom:4px;color:var(--ink);font-size:13px}
      @media(max-width:720px){.admin-store-toolbar{grid-template-columns:1fr 1fr}.admin-store-toolbar .field:first-child{grid-column:1/-1}#adminStoreGrid{grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:9px}.admin-store-card{padding:10px}.admin-store-card-actions .btn{flex-basis:78px}}
    `;
    document.head.appendChild(style);
  }

  function ensureHost() {
    const table = q('#adminStoreTable');
    if (!table) return null;
    const section = table.closest('#admin-stores');
    if (!section) return null;
    const tableWrap = table.closest('.table-wrap');
    if (tableWrap) tableWrap.hidden = true;
    let host = q('#adminStoreGrid');
    if (!host) {
      host = document.createElement('div');
      host.id = 'adminStoreGrid';
      const anchor = tableWrap || table.parentElement;
      anchor?.insertAdjacentElement('afterend', host);
    }
    let toolbar = q('#adminStoreToolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.id = 'adminStoreToolbar';
      toolbar.className = 'admin-store-toolbar';
      toolbar.innerHTML = `
        <div class="field"><label for="adminStoreSearch">ค้นหาร้าน</label><input id="adminStoreSearch" type="search" autocomplete="off" placeholder="ชื่อร้าน บัญชี หรือรหัสร้าน"></div>
        <div class="field"><label for="adminStoreCategory">หมวดหมู่ร้าน</label><select id="adminStoreCategory"></select></div>
        <div class="field"><label for="adminStoreStatus">สถานะกำกับ</label><select id="adminStoreStatus"><option value="all">ทุกสถานะ</option><option value="active">ปกติ</option><option value="suspended">ระงับ/แบน</option><option value="archived">เก็บออกจากหน้าเว็บ</option></select></div>`;
      (tableWrap || table.parentElement)?.insertAdjacentElement('beforebegin', toolbar);
      q('#adminStoreSearch').addEventListener('input', event => { state.search = event.target.value; renderGrid(); });
      q('#adminStoreCategory').addEventListener('change', event => { state.category = event.target.value; renderGrid(); });
      q('#adminStoreStatus').addEventListener('change', event => { state.status = event.target.value; renderGrid(); });
    }
    return host;
  }

  function ensureCategories() {
    const select = q('#adminStoreCategory');
    if (!select) return;
    const unique = new Map();
    state.categories.forEach(category => unique.set(String(category.id), category));
    stores().forEach(store => { const category = categoryFor(store); if (!unique.has(category.id)) unique.set(category.id, category); });
    const previous = state.category;
    select.innerHTML = `<option value="all">ทุกหมวดหมู่</option>${[...unique.values()].sort((a, b) => String(a.name).localeCompare(String(b.name), 'th')).map(category => `<option value="${esc(category.id)}">${esc(category.icon || '🏪')} ${esc(category.name)}</option>`).join('')}`;
    select.value = [...select.options].some(option => option.value === previous) ? previous : 'all';
    state.category = select.value;
  }

  function renderCategoryChips() {
    const toolbar = q('#adminStoreToolbar');
    if (!toolbar) return;
    let chips = q('#adminStoreCategoryChips');
    if (!chips) {
      chips = document.createElement('div');
      chips.id = 'adminStoreCategoryChips';
      chips.className = 'admin-store-category-chips';
      toolbar.insertAdjacentElement('afterend', chips);
    }
    const all = [{ id: 'all', name: 'ทั้งหมด', icon: '▦' }, ...state.categories.filter(category => category.active !== false)];
    chips.innerHTML = all.map(category => `<button type="button" class="${state.category === String(category.id) ? 'active' : ''}" onclick="setAdminStoreCategory('${esc(category.id)}')">${esc(category.icon || '🏪')} ${esc(category.name)}</button>`).join('');
  }

  function filteredStores() {
    const query = state.search.trim().toLowerCase();
    return stores().filter(store => {
      const category = categoryFor(store);
      const status = moderationStatus(store);
      const searchable = [store.id, store.name, store.owner, store.loginId, store.owner_email, store.ownerEmail, category.name].map(value => String(value || '').toLowerCase()).join(' ');
      return (!query || searchable.includes(query)) && (state.category === 'all' || category.id === state.category) && (state.status === 'all' || status === state.status);
    });
  }

  function card(store) {
    const category = categoryFor(store);
    const status = moderationStatus(store);
    const statusClass = status === 'suspended' || status === 'archived' ? 'danger' : 'active';
    const owner = store.owner || store.ownerEmail || store.owner_email || 'ยังไม่มีบัญชีเจ้าของร้าน';
    const ready = Boolean(store.loginId || store.login_id || store.owner || store.ownerEmail || store.owner_email);
    return `<article class="admin-store-card" data-store-id="${esc(store.id)}">
      <div class="admin-store-card-head"><div class="admin-store-icon">${imageMarkup(store)}</div><div class="admin-store-card-title"><h3 title="${esc(store.name)}">${esc(store.name || 'ร้านไม่มีชื่อ')}</h3><p>${esc(category.icon)} ${esc(category.name)} · #${esc(store.id)}</p></div></div>
      <div class="admin-store-meta"><span class="admin-store-badge ${statusClass}">${esc(moderationLabel(status))}</span><span class="admin-store-badge">${esc(openLabel(store))}</span><span class="admin-store-badge">${ready ? 'บัญชีพร้อมใช้' : 'ยังไม่มีบัญชี'}</span></div>
      <div class="admin-store-card-stats"><div><span>เรตติ้ง</span><b>⭐ ${Number(store.rating || 0).toFixed(1)}</b></div><div><span>รีวิว</span><b>${Number(store.reviewCount || store.review_count || 0).toLocaleString('th-TH')}</b></div><div><span>เจ้าของ</span><b title="${esc(owner)}">${esc(owner)}</b></div></div>
      <div class="admin-store-card-actions"><button type="button" class="btn btn-main btn-small" onclick="openStoreDetail('${esc(store.id)}')">รายละเอียด</button><button type="button" class="btn btn-plain btn-small" onclick="openMenuModal('${esc(store.id)}')">เมนู</button></div>
    </article>`;
  }

  function renderGrid() {
    const host = ensureHost();
    if (!host) return;
    ensureCategories();
    renderCategoryChips();
    const rows = filteredStores();
    const all = stores().length;
    host.innerHTML = rows.length ? rows.map(card).join('') : `<div class="admin-store-empty"><strong>${all ? 'ไม่พบร้านตามตัวกรอง' : 'ยังไม่มีร้านค้า'}</strong><span>${all ? 'ลองเปลี่ยนหมวดหมู่ สถานะ หรือคำค้นหา' : 'กด “เพิ่มร้านค้าและบัญชี” เพื่อเริ่มต้น'}</span></div>`;
    const toolbar = q('#adminStoreToolbar');
    if (toolbar) {
      let summary = q('#adminStoreSummary');
      if (!summary) { summary = document.createElement('div'); summary.id = 'adminStoreSummary'; summary.className = 'admin-store-summary'; toolbar.insertAdjacentElement('afterend', summary); }
      summary.innerHTML = `<span>แสดง <strong>${rows.length}</strong> จาก ${all} ร้านค้า</span><span>กดไอคอนร้านเพื่อดูรายละเอียดและจัดการเป็นรายร้าน</span>`;
      const chips = q('#adminStoreCategoryChips');
      if (chips) summary.insertAdjacentElement('afterend', chips);
    }
  }

  async function loadCategories() {
    if (state.loadingCategories || !window.SupabaseSync?.request) return;
    state.loadingCategories = true;
    try {
      const rows = await window.SupabaseSync.request('store_categories?select=id,name,icon,active,sort_order&order=sort_order.asc,name.asc&limit=200');
      if (Array.isArray(rows)) state.categories = rows;
    } catch (error) {
      const fallback = window.CategoryAdmin?.storeRows;
      if (Array.isArray(fallback)) state.categories = fallback;
      console.warn('ไม่สามารถโหลดหมวดหมู่ร้านสำหรับ Admin grid', error);
    } finally {
      state.loadingCategories = false;
      renderGrid();
    }
  }

  window.setAdminStoreCategory = category => {
    state.category = String(category || 'all');
    const select = q('#adminStoreCategory');
    if (select) select.value = state.category;
    renderGrid();
  };
  window.refreshAdminStoreGrid = () => { renderGrid(); loadCategories(); };

  function install() {
    if (state.initialized || !q('#adminStoreTable')) return false;
    ensureStyle();
    ensureHost();
    state.baseRenderer = window.renderAdminStores;
    window.renderAdminStores = () => {
      if (typeof state.baseRenderer === 'function') state.baseRenderer();
      renderGrid();
    };
    state.initialized = true;
    renderGrid();
    loadCategories();
    return true;
  }

  const tryInstall = () => { if (!install()) window.setTimeout(tryInstall, 120); };
  window.setTimeout(tryInstall, 0);
})();
