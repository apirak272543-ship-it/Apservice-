(function(){
  'use strict';
  const $ = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const toast = (message, tone = 'success') => window.UI?.toast ? window.UI.toast(message, tone) : window.alert(message);
  const isPendingLocalId = id => /^(food|menu)-/.test(String(id || ''));
  const safeNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const makeUniqueMenuId = () => {
    const uuid = globalThis.crypto?.randomUUID?.();
    return uuid ? `menu-${uuid}` : `menu-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };
  const isDuplicateKeyError = error => /duplicate key|menu_items_pkey|23505/i.test(String(error?.message || error || ''));

  const AdminMenuSync = {
    payload(food, storeId) {
      return {
        id: String(food.id || makeUniqueMenuId()), store_id: storeId, name: String(food.name || '').trim(), emoji: String(food.emoji || '🍜'),
        image_url: food.imageUrl || null, description: String(food.desc || ''), price: Math.max(0, safeNumber(food.price)),
        cost: Math.max(0, safeNumber(food.cost)), stock: Math.max(0, safeNumber(food.stock)), available: food.available !== false,
        promo: Boolean(food.promo), category_id: food.categoryId || 'menu-other'
      };
    },
    map(row) {
      return {
        id: row.id, storeId: row.store_id, name: row.name, emoji: row.emoji || '🍜', imageUrl: row.image_url || '',
        desc: row.description || '', price: safeNumber(row.price), cost: safeNumber(row.cost), stock: safeNumber(row.stock),
        available: row.available !== false, promo: Boolean(row.promo), categoryId: row.category_id || 'menu-other', trackStock: false
      };
    },
    async load(store) {
      const rows = await SupabaseSync.request(`menu_items?store_id=eq.${encodeURIComponent(store.id)}&select=id,store_id,name,emoji,image_url,description,price,cost,stock,available,promo,category_id,updated_at&order=updated_at.desc&limit=500`);
      const remote = (Array.isArray(rows) ? rows : []).map(row => this.map(row));
      const remoteIds = new Set(remote.map(row => String(row.id)));
      const pending = (store.foods || []).filter(food => isPendingLocalId(food.id) && !remoteIds.has(String(food.id)));
      store.foods = [...remote, ...pending];
      return { remote, pending };
    },
    async findById(id) {
      if (!id) return null;
      const rows = await SupabaseSync.request(`menu_items?id=eq.${encodeURIComponent(id)}&select=id,store_id&limit=1`);
      return Array.isArray(rows) && rows[0] ? rows[0] : null;
    },
    async flushPending(store) {
      const pending = (store.foods || []).filter(food => isPendingLocalId(food.id));
      if (!pending.length) return toast('ไม่มีเมนูในเครื่องที่รอซิงก์', 'warning');
      let synced = 0;
      for (const original of pending) {
        if (!String(original.name || '').trim()) continue;
        const saved = await this.save(store, { ...original }, false);
        const index = (store.foods || []).findIndex(item => item.id === original.id);
        if (index >= 0) store.foods[index] = saved;
        synced += 1;
      }
      await this.load(store);
      toast(`ซิงก์เมนู ${synced} รายการขึ้นระบบกลางแล้ว`, 'success');
    },
    async save(store, food, editing) {
      const candidate = { ...food };
      let existing = await this.findById(candidate.id);
      if (existing && String(existing.store_id) !== String(store.id)) {
        candidate.id = makeUniqueMenuId();
        existing = null;
      }
      const payload = this.payload(candidate, store.id);
      if (!payload.name) throw new Error('กรุณาระบุชื่อเมนู');
      const shouldPatch = (editing && !isPendingLocalId(candidate.id)) || Boolean(existing && String(existing.store_id) === String(store.id));
      let rows = [];
      if (shouldPatch) rows = await SupabaseSync.request(`menu_items?id=eq.${encodeURIComponent(candidate.id)}&store_id=eq.${encodeURIComponent(store.id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
      if (!Array.isArray(rows) || !rows.length) {
        try {
          rows = await SupabaseSync.request('menu_items', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
        } catch (error) {
          if (!isDuplicateKeyError(error)) throw error;
          candidate.id = makeUniqueMenuId();
          rows = await SupabaseSync.request('menu_items', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(this.payload(candidate, store.id)) });
        }
      }
      return this.map(rows?.[0] || this.payload(candidate, store.id));
    },
    async remove(food) {
      if (isPendingLocalId(food.id)) return;
      await SupabaseSync.request(`menu_items?id=eq.${encodeURIComponent(food.id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
    }
  };

  function installMenuSyncButton(store) {
    const form = $('#menuForm'); if (!form || $('#adminMenuCloudSync')) return;
    const button = document.createElement('button'); button.type = 'button'; button.id = 'adminMenuCloudSync'; button.className = 'btn btn-plain btn-small'; button.textContent = '☁ ซิงก์เมนูในเครื่อง';
    button.title = 'ส่งเมนูเก่าที่อยู่ในเครื่องขึ้น Supabase';
    button.addEventListener('click', () => {
      const latest = AppState.stores.find(item => item.id === store.id); if (!latest) return;
      openActionConfirmation({ title: 'ซิงก์เมนูขึ้นระบบกลาง', message: 'เมนูที่เคยบันทึกเฉพาะในเบราว์เซอร์จะถูกสร้างใน Supabase เพื่อให้ลูกค้าทุกอุปกรณ์เห็น', confirmText: 'ซิงก์เมนู', onConfirm: async () => {
        try { await AdminMenuSync.flushPending(latest); window.openMenuModal(latest.id); } catch (error) { toast(`ซิงก์เมนูไม่สำเร็จ: ${error.message}`, 'error'); }
      }});
    });
    const actions = form.querySelector('div[style*="justify-content:flex-end"]');
    actions?.insertBefore(button, actions.firstChild);
  }

  function bindMenuForm() {
    const original = $('#menuForm'); if (!original || original.dataset.cloudBound) return;
    const form = original.cloneNode(true); form.dataset.cloudBound = 'true'; original.replaceWith(form);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const store = AppState.stores.find(item => item.id === $('#menuStoreId')?.value); if (!store) return;
      const editId = $('#menuEditId')?.value || '';
      const previous = editId ? (store.foods || []).find(food => food.id === editId) : null;
      const food = {
        ...(previous || {}), id: editId || `menu-${Date.now()}`, storeId: store.id,
        name: $('#menuFormName')?.value.trim() || '', emoji: $('#menuFormEmoji')?.value.trim() || '🍜',
        price: Math.max(0, safeNumber($('#menuFormPrice')?.value)), desc: $('#menuFormDesc')?.value.trim() || '',
        available: $('#menuFormAvailable')?.value === 'true', categoryId: previous?.categoryId || 'menu-other',
        stock: previous?.stock ?? 0, cost: previous?.cost ?? 0, promo: Boolean(previous?.promo), imageUrl: previous?.imageUrl || ''
      };
      if (!food.name) return toast('กรุณาระบุชื่อเมนู', 'warning');
      openActionConfirmation({ title: editId ? 'ยืนยันแก้ไขเมนู' : 'ยืนยันเพิ่มเมนู', message: 'เมนูจะบันทึกลง Supabase และซิงก์ให้หน้าร้านลูกค้าเห็นทันที', body: `<b>ร้าน:</b> ${esc(store.name)}<br><b>เมนู:</b> ${esc(food.name)}<br><b>ราคา:</b> ฿${safeNumber(food.price).toLocaleString('th-TH')}<br><b>สถานะ:</b> ${food.available ? 'พร้อมขาย' : 'ปิดการขาย'}`, confirmText: editId ? 'บันทึกและซิงก์' : 'เพิ่มและซิงก์', onConfirm: async () => {
        try {
          const saved = await AdminMenuSync.save(store, food, Boolean(editId));
          const index = (store.foods || []).findIndex(item => item.id === editId || item.id === saved.id);
          if (index >= 0) store.foods[index] = saved; else store.foods.push(saved);
          await AdminMenuSync.load(store); Storage.save(); window.openMenuModal(store.id); renderAdminStores(); renderHome(); toast(editId ? 'แก้ไขเมนูและซิงก์หน้าร้านแล้ว' : 'เพิ่มเมนูและซิงก์หน้าร้านแล้ว', 'success');
        } catch (error) { toast(`บันทึกเมนูไม่สำเร็จ: ${error.message}`, 'error'); }
      }});
    });
  }

  const legacyOpenMenuModal = window.openMenuModal;
  window.openMenuModal = async storeId => {
    const store = AppState.stores.find(item => item.id === storeId); if (!store) return;
    legacyOpenMenuModal(storeId); installMenuSyncButton(store);
    try { await AdminMenuSync.load(store); legacyOpenMenuModal(storeId); installMenuSyncButton(store); }
    catch (error) { console.warn('โหลดเมนูจาก Supabase ไม่สำเร็จ ใช้รายการในเครื่องชั่วคราว', error); toast('โหลดเมนูจากระบบกลางไม่สำเร็จ กำลังแสดงข้อมูลในเครื่องชั่วคราว', 'warning'); }
  };

  window.deleteMenuItem = (storeId, foodId) => {
    const store = AppState.stores.find(item => item.id === storeId); const food = store?.foods?.find(item => item.id === foodId); if (!store || !food) return;
    openActionConfirmation({ title: 'ยืนยันลบเมนู', message: `รายการ “${food.name}” จะถูกลบจากหน้าร้านและ Supabase`, confirmText: 'ลบเมนู', onConfirm: async () => {
      try { await AdminMenuSync.remove(food); store.foods = store.foods.filter(item => item.id !== foodId); Storage.save(); window.openMenuModal(storeId); renderAdminStores(); renderHome(); toast('ลบเมนูจากระบบกลางแล้ว', 'success'); }
      catch (error) { toast(`ลบเมนูไม่สำเร็จ: ${error.message}`, 'error'); }
    }});
  };

  const legacyRenderFood = CategoryUX.renderFood.bind(CategoryUX);
  CategoryUX.renderFood = function(store) {
    const restored = [];
    (store?.foods || []).forEach(food => {
      const usesTrackedStock = food.trackStock === true || food.track_stock === true;
      if (!usesTrackedStock && food.available !== false && safeNumber(food.stock) <= 0) { restored.push([food, food.stock]); food.stock = 1; }
    });
    try { return legacyRenderFood(store); } finally { restored.forEach(([food, stock]) => { food.stock = stock; }); }
  };

  const iconMap = [
    ['รายละเอียด', 'ⓘ'], ['เมนู', '🍽️'], ['แก้ไข', '✎'], ['ปิดร้าน', '⏸'], ['เปิดร้าน', '▶'],
    ['ระงับ', '⛔'], ['เก็บร้าน', '⌑'], ['ประวัติ', '◷']
  ];
  function normaliseAdminStoreActions() {
    document.querySelectorAll('#adminStoreTable tr').forEach(row => {
      const cell = row.cells?.[row.cells.length - 1]; if (!cell) return;
      const buttons = [...cell.querySelectorAll('button.btn')].filter(button => !button.closest('.admin-store-icon-actions'));
      if (!buttons.length) return;
      let toolbar = cell.querySelector('.admin-store-icon-actions');
      if (!toolbar) { toolbar = document.createElement('div'); toolbar.className = 'admin-store-icon-actions'; cell.appendChild(toolbar); }
      buttons.forEach(button => {
        const label = button.dataset.actionLabel || button.textContent.trim(); const icon = iconMap.find(([needle]) => label.includes(needle))?.[1] || '•';
        button.dataset.actionLabel = label; button.textContent = icon; button.title = label; button.setAttribute('aria-label', label); button.classList.add('admin-store-icon-button'); toolbar.appendChild(button);
      });
    });
  }
  const adminStyle = document.createElement('style'); adminStyle.textContent = `
    #adminStoreTable td:last-child{min-width:122px}.admin-store-icon-actions{display:grid;grid-template-columns:repeat(2,minmax(42px,1fr));gap:6px;align-items:stretch;width:100%;margin-top:7px}.admin-store-icon-actions .admin-store-icon-button{width:100%;min-width:42px;min-height:42px;padding:0!important;border-radius:10px;font-size:18px;line-height:1;justify-content:center}.admin-store-icon-actions+.store-moderation-actions{display:none}@media(max-width:720px){#adminStoreTable td:last-child{min-width:116px}.admin-store-icon-actions{grid-template-columns:repeat(2,minmax(44px,1fr));gap:7px}.admin-store-icon-actions .admin-store-icon-button{min-height:44px;font-size:19px}}
  `; document.head.appendChild(adminStyle);
  const table = $('#adminStoreTable'); if (table) new MutationObserver(() => normaliseAdminStoreActions()).observe(table, { childList: true, subtree: true });
  bindMenuForm(); normaliseAdminStoreActions();
  window.AdminMenuSync = AdminMenuSync;
})();
