(() => {
  const q = selector => document.querySelector(selector);
  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const phoneHref = value => {
    const phone = String(value || '').replace(/[^0-9+]/g, '');
    return phone ? `tel:${phone}` : '';
  };
  const phoneIsValid = value => /^\+?[0-9][0-9\-\s()]{7,18}$/.test(String(value || '').trim());
  const validPoint = point => Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng)) && Number(point.lat) !== 0 && Number(point.lng) !== 0;

  const style = document.createElement('style');
  style.textContent = `
    #adminTabs.admin-grouped{display:flex;flex-direction:column;gap:9px;background:transparent;padding:0;border:0}
    .admin-nav-group{margin:0;border:1px solid var(--line);border-radius:16px;background:#fff;box-shadow:0 5px 16px rgba(4,55,50,.05);overflow:hidden}
    .admin-nav-group summary{display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;list-style:none;padding:13px 14px;color:var(--ink);font-size:12px;font-weight:900}
    .admin-nav-group summary::-webkit-details-marker{display:none}.admin-nav-group summary::after{content:'⌄';font-size:16px;color:var(--muted);transition:transform .18s cubic-bezier(.23,1,.32,1)}
    .admin-nav-group[open] summary::after{transform:rotate(180deg)}.admin-nav-group-note{display:block;margin-top:3px;color:var(--muted);font-size:9px;font-weight:700}
    .admin-nav-group-body{display:grid;gap:4px;padding:0 8px 9px}.admin-nav-group-body button{margin:0;text-align:left;border-radius:11px;min-height:39px}
    .admin-call-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.admin-call-actions .btn{min-height:32px;padding:6px 9px;font-size:10px;text-decoration:none}.admin-phone-empty{display:block;margin-top:5px;color:var(--muted);font-size:10px}
    .media-source-actions label.btn{display:inline-flex;align-items:center;justify-content:center;cursor:pointer;text-align:center}
    @media (max-width:720px){.admin-nav-group summary{padding:14px}.admin-nav-group-body{padding-bottom:10px}.admin-nav-group-body button{font-size:12px}.admin-call-actions .btn{flex:1 1 128px}}
  `;
  document.head.appendChild(style);

  const GROUPS = [
    ['operations', 'ออร์เดอร์และลูกค้า', 'ติดตามงานและดูแลลูกค้า', ['overview', 'orders', 'customers']],
    ['catalog', 'ร้านค้า สินค้า และสื่อ', 'ข้อมูลร้าน เมนู และหน้าลูกค้า', ['stores', 'inventory', 'content']],
    ['finance', 'การเงินและรอบจ่าย', 'เครดิต รายรับ และการจ่ายเงิน', ['finance', 'withdrawals', 'rider-income']],
    ['people', 'ไรเดอร์และทีมงาน', 'ไรเดอร์ ใบสมัคร และผู้ดูแล', ['riders', 'rider-applications', 'admins']],
    ['platform', 'ตั้งค่าและเครื่องมือระบบ', 'การเชื่อมต่อ ความปลอดภัย และการตรวจสอบ', ['settings', 'mapping', 'support', 'error-monitor']],
  ];
  function groupFor(name) { return GROUPS.find(([, , , items]) => items.includes(name)) || ['more', 'เครื่องมือเพิ่มเติม', 'ฟังก์ชันจัดการอื่น ๆ', []]; }
  function groupAdminNavigation() {
    const tabs = q('#adminTabs');
    if (!tabs) return;
    const loose = [...tabs.children].filter(node => node.matches?.('button[data-admin]'));
    if (!loose.length && tabs.classList.contains('admin-grouped')) return;
    tabs.classList.add('admin-grouped');
    const known = new Map([...tabs.querySelectorAll('.admin-nav-group')].map(group => [group.dataset.groupId, group]));
    loose.forEach(button => {
      const [id, title, note] = groupFor(button.dataset.admin || '');
      let group = known.get(id);
      if (!group) {
        group = document.createElement('details');
        group.className = 'admin-nav-group'; group.dataset.groupId = id; group.open = id === 'operations';
        group.innerHTML = `<summary><span>${esc(title)}<small class="admin-nav-group-note">${esc(note)}</small></span></summary><div class="admin-nav-group-body"></div>`;
        tabs.appendChild(group); known.set(id, group);
      }
      group.querySelector('.admin-nav-group-body')?.appendChild(button);
    });
    tabs.querySelectorAll('button[data-admin].active').forEach(button => { const group = button.closest('.admin-nav-group'); if (group) group.open = true; });
    if (!tabs.dataset.groupListener) {
      tabs.dataset.groupListener = 'true';
      tabs.addEventListener('click', event => { const group = event.target.closest('button[data-admin]')?.closest('.admin-nav-group'); if (group) group.open = true; });
    }
  }

  function repairImageSourceButtons(root = document) {
    root.querySelectorAll?.('.media-source-actions').forEach(actions => {
      const input = actions.previousElementSibling;
      if (!(input instanceof HTMLInputElement) || input.type !== 'file' || actions.dataset.repaired) return;
      actions.dataset.repaired = 'true';
      if (!input.id) input.id = `image-input-${crypto.randomUUID().slice(0, 8)}`;
      input.style.pointerEvents = 'auto'; input.removeAttribute('capture');
      [...actions.querySelectorAll('button')].forEach((button, index) => {
        const useCamera = index === 1;
        const label = document.createElement('label');
        label.className = button.className; label.htmlFor = input.id; label.tabIndex = 0; label.setAttribute('role', 'button');
        label.textContent = useCamera ? 'ถ่ายรูปด้วยกล้อง' : 'เลือกจากคลังไฟล์';
        const prepare = () => useCamera ? input.setAttribute('capture', 'environment') : input.removeAttribute('capture');
        label.addEventListener('pointerdown', prepare); label.addEventListener('touchstart', prepare, { passive: true });
        label.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); prepare(); input.click(); } });
        button.replaceWith(label);
      });
      input.addEventListener('change', () => input.removeAttribute('capture'));
    });
  }

  function ensureStoreContactFields() {
    const ownerField = q('#storeFormOwner')?.closest('.field');
    if (ownerField && !q('#storeFormPhone')) {
      const field = document.createElement('div'); field.className = 'field';
      field.innerHTML = '<label>เบอร์โทรติดต่อร้าน</label><input id="storeFormPhone" type="tel" inputmode="tel" autocomplete="tel" required maxlength="24" placeholder="เช่น 081-234-5678" /><small style="color:var(--muted)">ใช้ให้แอดมินติดต่อยืนยันออร์เดอร์หรือสอบถามสินค้า</small>';
      ownerField.insertAdjacentElement('afterend', field);
    }
    if (typeof ensureStoreLocationControls === 'function') ensureStoreLocationControls();
    const actions = q('#storeLocationStatus')?.parentElement?.querySelector('.location-actions');
    if (actions && !q('#storeMapPickerButton')) {
      const button = document.createElement('button'); button.id = 'storeMapPickerButton'; button.type = 'button'; button.className = 'btn btn-plain btn-small'; button.textContent = '🗺️ เลือกจุดบนแผนที่';
      button.addEventListener('click', () => window.openStoreLocationPicker()); actions.insertBefore(button, actions.querySelector('a'));
    }
  }
  window.openStoreLocationPicker = () => {
    if (typeof requireAdminAction === 'function' && !requireAdminAction()) return;
    const current = { lat: Number(q('#storeLocationLat')?.value), lng: Number(q('#storeLocationLng')?.value) };
    const configured = { lat: Number(AppState.config.maps?.defaultLat), lng: Number(AppState.config.maps?.defaultLng) };
    AppState.draftLocations = AppState.draftLocations || {};
    if (validPoint(current)) AppState.draftLocations.storeLocation = current; else if (validPoint(configured)) AppState.draftLocations.storeLocation = configured;
    window.openMapPicker('storeLocation');
  };
  const priorSaveMapPicker = window.saveMapPicker;
  window.saveMapPicker = () => {
    if (typeof pickerTarget === 'undefined' || pickerTarget !== 'storeLocation') return priorSaveMapPicker();
    const manual = { lat: Number(q('#mapManualLat')?.value), lng: Number(q('#mapManualLng')?.value) };
    const point = (typeof pickerMarker !== 'undefined' && pickerMarker && window.L ? pickerMarker.getLatLng() : null) || (typeof apManualPoint !== 'undefined' ? apManualPoint : null) || manual;
    if (!validPoint(point)) return UI.toast('กรุณาเลือกหรือกรอกพิกัดร้านก่อนบันทึก', 'warning');
    const location = { lat: Number(point.lat), lng: Number(point.lng), accuracy: 0, capturedAt: nowLabel(), capturedAtIso: new Date().toISOString(), source: 'map-pin' };
    q('#storeLocationLat').value = location.lat; q('#storeLocationLng').value = location.lng; renderStoreLocationForm(location);
    if (AppState.draftLocations) delete AppState.draftLocations.storeLocation; closeMapPicker(); UI.toast('เลือกพิกัดร้านแล้ว กรุณากดบันทึกร้านค้าเพื่อยืนยัน', 'success');
  };

  const priorOpenStoreModal = window.openStoreModal;
  window.openStoreModal = id => {
    const store = id ? AppState.stores.find(item => item.id === id) : null;
    if (id && !store) return UI.toast('ไม่พบข้อมูลร้านเดิม กรุณารีเฟรชรายการร้านค้าแล้วลองใหม่', 'error');
    priorOpenStoreModal(id); ensureStoreContactFields();
    const values = {
      '#storeEditId': store?.id || '', '#storeFormName': store?.name || '', '#storeFormEmoji': store?.emoji || '🍽️',
      '#storeFormDesc': store?.desc || store?.description || '', '#storeFormRating': store?.rating ?? 4.5,
      '#storeFormEta': store?.eta || '25–35 นาที', '#storeFormOwner': store?.owner || store?.ownerEmail || '',
      '#storeFormLoginId': store?.loginId || '', '#storeFormPhone': store?.phone || '', '#storeFormOpenTime': store?.openTime || '08:00',
      '#storeFormCloseTime': store?.closeTime || '20:00', '#storeFormCutoff': store?.cutoffMinutes ?? 30,
      '#storeFormEmergency': String(Boolean(store?.emergencyClosed)), '#storeFormEmergencyNote': store?.emergencyNote || '',
      '#storeFormImageUrl': store?.imageUrl || '', '#storeFormBackgroundUrl': store?.backgroundUrl || '', '#storeFormCategory': store?.categoryId || 'store-other'
    };
    Object.entries(values).forEach(([selector, value]) => { const input = q(selector); if (input) input.value = String(value); });
    q('#storeFormPassword').value = '';
    renderStoreLocationForm(store?.location || null); repairImageSourceButtons(q('#storeModal'));
  };
  const priorPublishCatalog = SupabaseAdminSync.publishCatalog.bind(SupabaseAdminSync);
  SupabaseAdminSync.publishCatalog = async function () {
    const result = await priorPublishCatalog();
    const contacts = AppState.stores.map(store => ({ id: store.id, phone: String(store.phone || '').trim() }));
    if (contacts.length) await SupabaseSync.request('stores?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(contacts) });
    return result;
  };
  SupabaseAdminSync.provisionRole = async function (role, entityId, account) {
    const entity = role === 'rider' ? AppState.riders.find(item => item.id === entityId) : AppState.stores.find(item => item.id === entityId);
    if (!entity) throw new Error('ไม่พบข้อมูลร้านหรือ Rider ที่ต้องการบันทึก');
    const cfg = SupabaseSync.config();
    const body = JSON.stringify({ action: 'provision', role, entity_id: entityId, email: account.email, login_id: account.loginId, display_name: account.displayName, password: account.password, phone: account.phone || '', entity });
    const send = () => fetch(cfg.url + '/functions/v1/role-access', { method: 'POST', headers: SupabaseSync.headers(), body });
    let response = await send(); if (response.status === 401) { await SupabaseSync.refreshSession(true); response = await send(); }
    const data = await response.json(); if (!response.ok) throw new Error(data?.error || 'ไม่สามารถออกบัญชีได้');
    await this.publishCatalog();
    return data;
  };
  document.addEventListener('submit', event => {
    if (event.target?.id !== 'storeForm') return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (typeof requireAdminAction === 'function' && !requireAdminAction()) return;
    const id = q('#storeEditId').value; const existing = id ? AppState.stores.find(store => store.id === id) : null; const password = q('#storeFormPassword').value;
    const open = q('#storeFormOpenTime')?.value || '08:00'; const close = q('#storeFormCloseTime')?.value || '20:00';
    if (id && !existing) return UI.toast('ไม่พบแถวร้านเดิม จึงยกเลิกการบันทึกเพื่อป้องกันการสร้างข้อมูลซ้ำ', 'error');
    const data = { name: q('#storeFormName').value.trim(), emoji: q('#storeFormEmoji').value.trim() || '🍽️', desc: q('#storeFormDesc').value.trim(), imageUrl: q('#storeFormImageUrl')?.value.trim() || '', backgroundUrl: q('#storeFormBackgroundUrl')?.value.trim() || '', rating: Number(q('#storeFormRating').value), eta: q('#storeFormEta').value.trim(), owner: q('#storeFormOwner').value.trim().toLowerCase(), phone: q('#storeFormPhone').value.trim(), loginId: q('#storeFormLoginId').value.trim().toLowerCase(), location: storeLocationFromForm(existing?.location || null), openTime: open, closeTime: close, cutoffMinutes: Number(q('#storeFormCutoff')?.value) || 30, emergencyClosed: q('#storeFormEmergency')?.value === 'true', emergencyNote: q('#storeFormEmergencyNote')?.value.trim() || '', categoryId: q('#storeFormCategory')?.value || existing?.categoryId || 'store-other' };
    const currentEmail = String(SupabaseSync.session()?.user?.email || AppState.user?.email || '').trim().toLowerCase();
    const reuseAdminAccount = data.owner === currentEmail;
    const issues = [!data.name && 'ชื่อร้านค้า', !data.desc && 'คำอธิบายร้าน', !data.eta && 'เวลาจัดส่งโดยประมาณ', !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.owner) && 'อีเมลเจ้าของร้าน', !phoneIsValid(data.phone) && 'เบอร์โทรติดต่อร้าน', !/^[a-z0-9][a-z0-9._-]{2,31}$/.test(data.loginId) && 'Login ID', !id && !password && !reuseAdminAccount && 'รหัสผ่านบัญชีร้านค้า', password && password.length < 8 && 'รหัสผ่านอย่างน้อย 8 ตัวอักษร'].filter(Boolean);
    if (issues.length) return UI.toast('กรุณากรอกหรือแก้ไข: ' + issues.join(' · '), 'error'); if (!open || !close || close <= open) return UI.toast('เวลาเปิด–ปิดร้านไม่ถูกต้อง', 'error');
    openActionConfirmation({ title: id ? 'ยืนยันแก้ไขร้านเดิม' : 'ยืนยันสร้างร้านค้าและบัญชี', message: reuseAdminAccount ? 'ร้านนี้จะใช้บัญชีผู้ดูแลที่เข้าสู่ระบบอยู่เป็นเจ้าของร้าน โดยเพิ่มบทบาท Store Owner ให้บัญชีเดิม' : 'บันทึกข้อมูลติดต่อ พิกัดร้าน และสิทธิ์ Store App หลังยืนยัน', body: `<b>ร้าน:</b> ${esc(data.name)}<br><b>โทร:</b> ${esc(data.phone)}<br><b>อีเมล:</b> ${esc(data.owner)}<br><b>เวลา:</b> ${esc(open)}–${esc(close)}`, confirmText: id ? 'ยืนยันแก้ไขร้านเดิม' : 'ยืนยันบันทึก', onConfirm: async () => {
      const before = existing ? { ...existing } : null; let store = existing;
      if (store) Object.assign(store, data); else { store = { id: 'store-' + Date.now(), ...data, active: true, foods: [] }; AppState.stores.push(store); } Storage.save();
      try { await SupabaseAdminSync.provisionRole('store_owner', store.id, { email: data.owner, loginId: data.loginId, displayName: data.name, password, phone: data.phone }); closeModal('storeModal'); renderAdminStores(); renderHome(); renderOverview(); UI.toast(id ? 'แก้ไขร้านเดิมและซิงก์ข้อมูลแล้ว' : 'บันทึกร้านค้า ข้อมูลติดต่อ และบัญชี Store App แล้ว', 'success'); }
      catch (error) { if (before) Object.assign(store, before); else AppState.stores = AppState.stores.filter(item => item.id !== store.id); Storage.save(); renderAdminStores(); renderHome(); renderOverview(); UI.toast('บันทึกบัญชีร้านไม่สำเร็จ: ' + error.message, 'error'); }
    }});
  }, true);

  const ContactDirectory = { loading: false, async refresh() {
    if (this.loading || !Storage.isAdmin() || !SupabaseSync.session()?.user?.id) return; this.loading = true;
    try { const rows = await SupabaseSync.request('stores?select=id,phone,owner_email&order=name.asc&limit=500'); if (Array.isArray(rows)) rows.forEach(row => { const store = AppState.stores.find(item => item.id === row.id); if (store) Object.assign(store, { phone: row.phone || store.phone || '', owner: row.owner_email || store.owner || '' }); }); renderAdminStores(); renderOperationsOrders(); }
    catch (error) { console.warn('ไม่สามารถโหลดเบอร์ติดต่อร้านค้า', error); } finally { this.loading = false; }
  }};
  const priorStoreRenderer = renderAdminStores;
  renderAdminStores = () => { priorStoreRenderer(); [...(q('#adminStoreTable')?.rows || [])].forEach((row, index) => { const store = AppState.stores[index]; const cell = row.cells?.[0]; if (!store || !cell || cell.querySelector('.admin-store-phone')) return; cell.insertAdjacentHTML('beforeend', store.phone ? `<div class="admin-store-phone"><a class="btn btn-plain btn-small" href="${esc(phoneHref(store.phone))}">☎ โทร ${esc(store.phone)}</a></div>` : '<small class="admin-phone-empty admin-store-phone">ยังไม่มีเบอร์โทรติดต่อร้าน</small>'); }); };
  const priorOrderRenderer = renderOperationsOrders;
  renderOperationsOrders = () => { priorOrderRenderer(); [...(q('#operationsOrderTable')?.rows || [])].forEach((row, index) => { const order = AppState.orders[index]; const cell = row.cells?.[1]; if (!order || !cell || cell.querySelector('.admin-call-actions')) return; const customer = AppState.customers.find(item => String(item.email || '').toLowerCase() === String(order.customerEmail || '').toLowerCase()); const store = AppState.stores.find(item => item.id === order.storeId); cell.insertAdjacentHTML('beforeend', `<div class="admin-call-actions">${customer?.phone ? `<a class="btn btn-plain btn-small" href="${esc(phoneHref(customer.phone))}">☎ โทรลูกค้า</a>` : '<span class="admin-phone-empty">ยังไม่มีเบอร์ลูกค้า</span>'}${store?.phone ? `<a class="btn btn-main btn-small" href="${esc(phoneHref(store.phone))}">☎ โทรร้าน</a>` : '<span class="admin-phone-empty">ยังไม่มีเบอร์ร้าน</span>'}</div>`); }); };
  const priorCustomerLoad = CustomerDirectory.load.bind(CustomerDirectory);
  CustomerDirectory.load = async options => { const result = await priorCustomerLoad(options); renderOperationsOrders(); return result; };
  const priorAdminRender = renderAdmin;
  renderAdmin = () => { priorAdminRender(); groupAdminNavigation(); ContactDirectory.refresh().catch(error => console.warn('โหลดข้อมูลติดต่อร้านค้าไม่สำเร็จ', error)); };
  repairImageSourceButtons(); new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => { if (node.nodeType === 1) repairImageSourceButtons(node); }))).observe(document.body, { childList: true, subtree: true });
  new MutationObserver(() => groupAdminNavigation()).observe(q('#adminTabs'), { childList: true });
  ensureStoreContactFields(); groupAdminNavigation(); if (Storage.isAdmin()) { ContactDirectory.refresh().catch(() => {}); CustomerDirectory.load({ quiet: true }).catch(() => {}); }
})();
