(() => {
  const menuCss = document.createElement('style');
  menuCss.textContent = `
    .ap-menu-empty{grid-column:1/-1;padding:28px 20px;border:1px dashed #a9d9d0;border-radius:20px;background:linear-gradient(135deg,#fbfffe,#eefaf7);text-align:center;color:var(--muted)}
    .ap-menu-empty-icon{width:54px;height:54px;margin:0 auto 10px;display:grid;place-items:center;border-radius:17px;background:#dff5ef;font-size:28px}
    .ap-menu-empty strong{display:block;color:var(--ink);font-size:15px;margin-bottom:5px}
    .ap-menu-empty p{margin:0;font-size:11px;line-height:1.6}
    .ap-menu-status{display:inline-flex;align-items:center;gap:5px;margin-top:7px;padding:5px 8px;border-radius:999px;background:#fff2df;color:#9a6519;font-size:9px;font-weight:900}
    .ap-menu-status.ready{background:#e4f7ef;color:#177d5b}
    .ap-menu-section{grid-column:1/-1;border:1px solid var(--line);border-radius:19px;background:#fff;overflow:hidden;box-shadow:0 7px 20px rgba(27,70,65,.035)}
    .ap-menu-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 15px;background:linear-gradient(135deg,#fbfffe,#f0faf7);border-bottom:1px solid var(--line)}
    .ap-menu-section-title{display:flex;align-items:center;gap:8px}.ap-menu-section-title strong{font-size:13px}.ap-menu-section-title small{display:block;color:var(--muted);font-size:9px;margin-top:2px}
    .ap-menu-table{width:100%;border-collapse:collapse}.ap-menu-table th,.ap-menu-table td{padding:10px 12px;border-bottom:1px solid #edf3f1;text-align:left;vertical-align:middle}.ap-menu-table tr:last-child td{border-bottom:0}.ap-menu-table th{font-size:9px;color:var(--muted);font-weight:850;background:#fcfefd}.ap-menu-table td{font-size:11px}.ap-menu-table .ap-menu-item-cell{display:flex;align-items:center;gap:9px;min-width:180px}.ap-menu-thumb{width:43px;height:43px;flex:0 0 43px;display:grid;place-items:center;border-radius:13px;overflow:hidden;background:#fff1df;font-size:24px}.ap-menu-thumb img{width:100%;height:100%;object-fit:cover}.ap-menu-name{font-weight:900;color:var(--ink)}.ap-menu-desc{display:block;max-width:260px;margin-top:3px;color:var(--muted);font-size:10px;line-height:1.45}.ap-menu-price{color:var(--brand-deep);font-weight:950;white-space:nowrap}.ap-menu-row-unavailable{opacity:.66;background:#fbfcfc}.ap-menu-add-disabled{border:1px solid #d9e2e0;border-radius:9px;padding:7px 9px;background:#f1f4f3;color:#7b8b89;font-size:10px;font-weight:850;white-space:nowrap}.ap-menu-table .add{width:31px;height:31px}
    @media(max-width:580px){.ap-menu-section-head{padding:12px}.ap-menu-table{min-width:610px}.ap-menu-section{overflow:auto}.ap-menu-table th,.ap-menu-table td{padding:9px 10px}.ap-menu-desc{max-width:190px}}
  `;
  document.head.appendChild(menuCss);

  const emptyState = (title, detail) => `<div class="ap-menu-empty"><div class="ap-menu-empty-icon">🍽️</div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(detail)}</p></div>`;
  const stockValue = food => { const value = Number(food?.stock); return Number.isFinite(value) ? value : 1; };
  const categoryRows = store => {
    const categories = CategoryUX.menuCategories.filter(category => !category.store_id || category.store_id === store.id);
    const byId = new Map(categories.map(category => [category.id, category]));
    const grouped = new Map();
    (store.foods || []).forEach(food => {
      if (CategoryUX.activeMenuCategory !== 'all' && food.categoryId !== CategoryUX.activeMenuCategory) return;
      const category = byId.get(food.categoryId) || { id: food.categoryId || 'menu-other', name: food.categoryName || 'อื่น ๆ', icon: food.categoryIcon || '🍴', description: '' };
      if (!grouped.has(category.id)) grouped.set(category.id, { category, foods: [] });
      grouped.get(category.id).foods.push(food);
    });
    return Array.from(grouped.values()).sort((a, b) => Number(a.category.sort_order || 0) - Number(b.category.sort_order || 0) || String(a.category.name).localeCompare(String(b.category.name), 'th'));
  };
  const itemRow = (store, food) => {
    const ready = food.available !== false && stockValue(food) > 0;
    const status = ready ? '<span class="ap-menu-status ready">● พร้อมขาย</span>' : '<span class="ap-menu-status">● ยังไม่พร้อมขาย</span>';
    const action = ready ? `<button class="add" type="button" aria-label="เพิ่ม ${escapeHtml(food.name)}" onclick="addCart('${escapeHtml(store.id)}','${escapeHtml(food.id)}')">+</button>` : '<span class="ap-menu-add-disabled">หมดชั่วคราว</span>';
    return `<tr class="${ready ? '' : 'ap-menu-row-unavailable'}"><td><div class="ap-menu-item-cell"><div class="ap-menu-thumb">${StoreOps.image(food.imageUrl, food.emoji || '🍜')}</div><div><span class="ap-menu-name">${escapeHtml(food.name)}</span><span class="ap-menu-desc">${escapeHtml(food.desc || 'ยังไม่มีรายละเอียดเมนู')}</span>${status}</div></div></td><td class="ap-menu-price">${money(food.price)}</td><td>${action}</td></tr>`;
  };

  CategoryUX.renderFood = store => {
    const target = $('#foodGrid');
    if (!target) return;
    const allFoods = (store.foods || []).filter(food => CategoryUX.activeMenuCategory === 'all' || food.categoryId === CategoryUX.activeMenuCategory);
    let filter = $('#foodCategoryFilters');
    if (!filter) {
      filter = document.createElement('div');
      filter.id = 'foodCategoryFilters';
      filter.className = 'ap-category-filter';
      target.parentElement.insertBefore(filter, target);
    }
    const categories = CategoryUX.menuCategories.filter(category => !category.store_id || category.store_id === store.id);
    filter.innerHTML = `<small>เลือกหมวดเมนู</small>${CategoryUX.chips(categories, CategoryUX.activeMenuCategory, 'menu')}`;
    if (!allFoods.length) {
      target.innerHTML = emptyState('เมนูยังไม่พร้อมใช้งาน', 'ร้านค้านี้ยังไม่มีรายการเมนูในหมวดที่เลือก กรุณาลองดูหมวดอื่นหรือลองใหม่ภายหลัง');
      return;
    }
    const groups = categoryRows(store);
    const allUnavailable = allFoods.every(food => food.available === false || stockValue(food) < 1);
    const notice = allUnavailable ? `<div class="ap-menu-empty" style="margin-bottom:12px"><div class="ap-menu-empty-icon">⏳</div><strong>เมนูยังไม่พร้อมใช้งานในขณะนี้</strong><p>ร้านมีรายการเมนูแล้ว แต่ยังไม่มีรายการที่พร้อมรับออร์เดอร์</p></div>` : '';
    target.innerHTML = `${notice}${groups.map(group => `<section class="ap-menu-section"><div class="ap-menu-section-head"><div class="ap-menu-section-title"><span style="font-size:21px">${escapeHtml(group.category.icon || '🍴')}</span><div><strong>${escapeHtml(group.category.name || 'อื่น ๆ')}</strong><small>${escapeHtml(group.category.description || `${group.foods.length} รายการ`)}</small></div></div><span class="role-badge">${group.foods.length} รายการ</span></div><table class="ap-menu-table"><thead><tr><th>รายการเมนู</th><th>ราคา</th><th aria-label="เพิ่มลงตะกร้า"></th></tr></thead><tbody>${group.foods.map(food => itemRow(store, food)).join('')}</tbody></table></section>`).join('')}`;
  };

  const previousOpenStore = window.openStore;
  window.openStore = id => {
    previousOpenStore(id);
    const store = AppState.stores.find(item => item.id === id);
    if (store) CategoryUX.renderFood(store);
  };
  window.APServiceCustomerMenu = { render: store => CategoryUX.renderFood(store) };
})();
