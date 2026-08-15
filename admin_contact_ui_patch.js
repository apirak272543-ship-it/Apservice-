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
    .media-source-actions label.btn{display:inline-flex;align-items:center;justify-content:center;cursor:pointer;text-align:center}.account-recovery-tools{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:7px}.account-recovery-tools .btn{min-height:32px;padding:6px 9px;font-size:10px}.account-recovery-note{display:block;margin-top:6px;font-size:10px;line-height:1.45;color:#786231}.account-temp-status{font-size:10px;font-weight:800;color:#087d68}.promotion-deep-hint{margin:3px 0 0;color:var(--muted);font-size:10px;line-height:1.45}.promotion-image-input{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}.store-moderation-actions{display:flex;gap:5px;flex-wrap:wrap;margin-top:7px}.store-moderation-actions .btn{min-height:31px;padding:6px 8px;font-size:10px}.store-moderation-status{display:block;margin-top:5px;font-size:10px;font-weight:850}.store-moderation-status.suspended{color:#b45309}.store-moderation-status.archived{color:#a44343}
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
    const passwordInput = q('#storeFormPassword'); const passwordField = passwordInput?.closest('.field');
    if (passwordInput && passwordField && !q('#storeTemporaryPasswordButton')) {
      const tools = document.createElement('div'); tools.className = 'account-recovery-tools';
      tools.innerHTML = '<button type="button" class="btn btn-plain btn-small" id="storeTemporaryPasswordButton">สร้างรหัสผ่านชั่วคราว</button><span class="account-temp-status" id="storeTemporaryPasswordStatus"></span>';
      const note = document.createElement('small'); note.className = 'account-recovery-note'; note.id = 'storePasswordSecurityNote';
      note.textContent = 'รหัสผ่านเดิมถูกเก็บเป็นค่าเข้ารหัส จึงไม่สามารถเปิดดูได้ เว้นว่างไว้เพื่อคงรหัสเดิม หรือสร้างรหัสผ่านชั่วคราวเมื่อเจ้าของร้านลืมรหัส';
      passwordField.insertAdjacentElement('afterend', tools); tools.insertAdjacentElement('afterend', note);
      q('#storeTemporaryPasswordButton').addEventListener('click', async () => {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'; const bytes = crypto.getRandomValues(new Uint32Array(14));
        const temporary = `AP-${[...bytes].map(value => alphabet[value % alphabet.length]).join('')}`;
        passwordInput.value = temporary; passwordInput.type = 'text'; passwordInput.dataset.temporaryPassword = 'true';
        q('#storeTemporaryPasswordStatus').textContent = 'สร้างแล้ว — คัดลอกรหัสและกดบันทึกเพื่อใช้งาน';
        try { await navigator.clipboard?.writeText(temporary); q('#storeTemporaryPasswordStatus').textContent = 'สร้างและคัดลอกรหัสชั่วคราวแล้ว — กดบันทึกเพื่อใช้งาน'; } catch (_) {}
      });
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
  const getEntityAccountDetails = async (role, entityId) => {
    const cfg = SupabaseSync.config(); const body = JSON.stringify({ action: 'get_entity_account', role, entity_id: entityId });
    const send = () => fetch(cfg.url + '/functions/v1/role-access', { method: 'POST', headers: SupabaseSync.headers(), body });
    let response = await send(); if (response.status === 401) { await SupabaseSync.refreshSession(true); response = await send(); }
    const data = await response.json(); if (!response.ok) throw new Error(data?.error || 'ไม่สามารถอ่านข้อมูลบัญชีร้านได้'); return data;
  };
  const applyStoreEditValues = store => {
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
    q('#storeFormPassword').value = ''; q('#storeFormPassword').type = 'password'; delete q('#storeFormPassword').dataset.temporaryPassword;
    if (q('#storeTemporaryPasswordStatus')) q('#storeTemporaryPasswordStatus').textContent = '';
    renderStoreLocationForm(store?.location || null);
  };
  const hydrateStoreForEdit = async store => {
    if (!store?.id || !Storage.isAdmin() || !SupabaseSync.session()?.user?.id) return store;
    try {
      const account = await getEntityAccountDetails('store_owner', store.id);
      const rows = await SupabaseSync.request(`stores?select=*&id=eq.${encodeURIComponent(store.id)}&limit=1`);
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) return { ...store, owner: account.email || store.owner || '', loginId: account.login_id || store.loginId || '', phone: account.phone || store.phone || '' };
      let profile = null;
      if (row.owner_id) {
        const profiles = await SupabaseSync.request(`user_profiles?select=email,login_id,phone&user_id=eq.${encodeURIComponent(row.owner_id)}&limit=1`).catch(() => []);
        profile = Array.isArray(profiles) ? profiles[0] : null;
      }
      return {
        ...store, name: row.name || store.name, emoji: row.emoji || store.emoji, desc: row.description ?? store.desc ?? '',
        imageUrl: row.image_url ?? store.imageUrl ?? '', backgroundUrl: row.background_url ?? store.backgroundUrl ?? '', rating: Number(row.rating ?? store.rating ?? 0),
        eta: row.eta ?? store.eta ?? '', phone: account.phone || row.phone || profile?.phone || store.phone || '', owner: account.email || row.owner_email || profile?.email || store.owner || '',
        loginId: account.login_id || profile?.login_id || store.loginId || '', location: row.location ?? store.location ?? null,
        openTime: String(row.open_time || store.openTime || '08:00').slice(0, 5), closeTime: String(row.close_time || store.closeTime || '20:00').slice(0, 5),
        cutoffMinutes: Number(row.order_cutoff_minutes ?? store.cutoffMinutes ?? 30), emergencyClosed: Boolean(row.emergency_closed ?? store.emergencyClosed),
        emergencyNote: row.emergency_note ?? store.emergencyNote ?? '', categoryId: row.category_id || store.categoryId || 'store-other'
      };
    } catch (error) { console.warn('ไม่สามารถโหลดรายละเอียดร้านสำหรับแก้ไข', error); return store; }
  };
  window.openStoreModal = async id => {
    const store = id ? AppState.stores.find(item => item.id === id) : null;
    if (id && !store) return UI.toast('ไม่พบข้อมูลร้านเดิม กรุณารีเฟรชรายการร้านค้าแล้วลองใหม่', 'error');
    priorOpenStoreModal(id); ensureStoreContactFields();
    applyStoreEditValues(store); repairImageSourceButtons(q('#storeModal'));
    if (!store) return;
    const hydrated = await hydrateStoreForEdit(store);
    if (q('#storeEditId')?.value !== store.id) return;
    Object.assign(store, hydrated); Storage.save(); applyStoreEditValues(hydrated);
  };
  SupabaseAdminSync.publishCatalog = async function () {
    await this.ensureAdminSession();
    const stores = AppState.stores.filter(store => String(store?.id || '').trim() && String(store?.name || '').trim()).map(store => ({
      id: store.id, name: String(store.name).trim(), emoji: store.emoji || '🍽️', image_url: store.imageUrl || null, background_url: store.backgroundUrl || null,
      description: store.desc || '', rating: Number(store.rating || 0), eta: store.eta || '', location: store.location || null, active: store.active !== false,
      open_time: store.openTime || '00:00', close_time: store.closeTime || '23:59', order_cutoff_minutes: Number(store.cutoffMinutes ?? 30), emergency_closed: !!store.emergencyClosed,
      emergency_note: store.emergencyNote || null, owner_email: store.owner || null, phone: String(store.phone || '').trim(), category_id: store.categoryId || null,
      moderation_status: store.moderationStatus || (store.active === false ? 'suspended' : 'active'), moderation_reason: store.moderationReason || null
    }));
    if (!stores.length) throw new Error('ไม่พบข้อมูลร้านค้าที่มีชื่อสำหรับซิงก์');
    await SupabaseSync.request('stores?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(stores) });
    const allowedStoreIds = new Set(stores.map(store => store.id));
    const foods = AppState.stores.filter(store => allowedStoreIds.has(store.id)).flatMap(store => (store.foods || []).filter(food => String(food?.id || '').trim() && String(food?.name || '').trim()).map(food => ({
      id: food.id, store_id: store.id, name: String(food.name).trim(), emoji: food.emoji || '🍜', image_url: food.imageUrl || null, description: food.desc || '',
      price: Number(food.price || 0), cost: Number(food.cost || 0), stock: Number(food.stock || 0), available: food.available !== false, promo: !!food.promo
    })));
    if (foods.length) await SupabaseSync.request('menu_items?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(foods) });
    const riders = AppState.riders.filter(rider => String(rider?.id || '').trim() && String(rider?.name || '').trim()).map(rider => ({ id: rider.id, name: rider.name, emoji: rider.emoji || '🛵', phone: rider.phone || '', vehicle: rider.vehicle || 'มอเตอร์ไซค์', status: rider.status || 'พร้อมรับงาน', last_location: rider.lastLocation || null }));
    if (riders.length) await SupabaseSync.request('riders?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(riders) });
    return { stores: stores.length, foods: foods.length, riders: riders.length };
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

  const promotionActions = [['stores', 'ร้านอาหารทั้งหมด'], ['store', 'เลือกร้านเฉพาะ'], ['menu', 'เลือกเมนู/สินค้าในร้าน'], ['errand', 'ส่งพัสดุ / ฝากซื้อ'], ['marketplace', 'ตลาดสินค้าทั้งหมด'], ['listing', 'เลือกสินค้าตลาดเฉพาะ'], ['orders', 'ออร์เดอร์ของฉัน'], ['link', 'ลิงก์ภายนอก'], ['none', 'แสดงรายละเอียดอย่างเดียว']];
  const promotionStoreOptions = selected => `<option value="">— เลือกร้าน —</option>${AppState.stores.filter(store => store.active !== false).map(store => `<option value="${esc(store.id)}" ${store.id === selected ? 'selected' : ''}>${esc(store.name)}</option>`).join('')}`;
  const promotionMenuOptions = (storeId, selected) => { const store = AppState.stores.find(item => item.id === storeId); return `<option value="">— เลือกเมนู —</option>${(store?.foods || []).filter(food => food.available !== false).map(food => `<option value="${esc(food.id)}" ${food.id === selected ? 'selected' : ''}>${esc(food.name)} · ${Number(food.price || 0).toLocaleString('th-TH')} บาท</option>`).join('')}`; };
  const promotionListingOptions = selected => `<option value="">— เลือกสินค้าตลาด —</option>${(Marketplace.listings || []).filter(item => item.status !== 'hidden').map(item => `<option value="${esc(item.id)}" ${item.id === selected ? 'selected' : ''}>${esc(item.title)} · ${Number(item.price || 0).toLocaleString('th-TH')} บาท</option>`).join('')}`;
  const promotionTargetFields = promo => {
    if (promo.action === 'store') return `<div class="field full"><label>เลือกร้านปลายทาง</label><select onchange="setPromotionTarget('${esc(promo.id)}','targetStoreId',this.value)">${promotionStoreOptions(promo.targetStoreId)}</select><p class="promotion-deep-hint">เมื่อลูกค้ากดโฆษณา ระบบจะเปิดหน้าร้านที่เลือกทันที</p></div>`;
    if (promo.action === 'menu') return `<div class="field"><label>เลือกร้านของเมนู</label><select onchange="setPromotionTarget('${esc(promo.id)}','targetStoreId',this.value)">${promotionStoreOptions(promo.targetStoreId)}</select></div><div class="field"><label>เลือกเมนู/สินค้า</label><select onchange="setPromotionTarget('${esc(promo.id)}','targetMenuId',this.value)">${promotionMenuOptions(promo.targetStoreId, promo.targetMenuId)}</select></div><div class="field full"><p class="promotion-deep-hint">ลูกค้าจะถูกพาเข้าหน้าร้านและเลื่อนไปที่เมนูที่เลือก</p></div>`;
    if (promo.action === 'listing') return `<div class="field full"><label>เลือกสินค้าตลาด</label><select onchange="setPromotionTarget('${esc(promo.id)}','targetListingId',this.value)">${promotionListingOptions(promo.targetListingId)}</select><p class="promotion-deep-hint">ลูกค้าจะถูกพาไปหน้ารายละเอียดสินค้าตลาดที่เลือก</p></div>`;
    if (promo.action === 'link') return `<div class="field full"><label>URL ปลายทางภายนอก</label><input value="${esc(promo.linkUrl || '')}" placeholder="https://..." onchange="setPromotionTarget('${esc(promo.id)}','linkUrl',this.value)" /></div>`;
    return '';
  };
  const bindPromotionImage = promo => {
    const input = q(`#promotionImageFile-${promo.id}`); if (!input || input.dataset.bound) return; input.dataset.bound = 'true';
    input.addEventListener('change', async () => { const file = input.files?.[0]; if (!file) return; try { UI.toast('กำลังบีบอัดภาพโฆษณา…'); const result = await compressImageForUpload(file); promo.imageUrl = result.dataUrl; Storage.save(); renderHome(); window.renderPromotionEditor(); UI.toast('เตรียมภาพโฆษณาแล้ว กดบันทึกหน้าเว็บและสื่อเพื่อยืนยัน', 'success'); } catch (error) { input.value = ''; UI.toast(error.message, 'error'); } finally { input.removeAttribute('capture'); } });
  };
  window.renderPromotionEditor = () => {
    const target = q('#promotionEditor'); if (!target) return; const items = AppState.config.content.promotions || [];
    target.innerHTML = items.length ? items.map((promo, index) => `<div class="promotion-editor-card"><div class="promotion-editor-head"><div><strong>ช่องโฆษณาที่ ${index + 1}</strong><small>แสดงที่หน้าแรกของลูกค้า</small></div><div class="promotion-editor-actions"><label style="font-size:10px;font-weight:850"><input type="checkbox" ${promo.active !== false ? 'checked' : ''} onchange="setPromotionTarget('${esc(promo.id)}','active',this.checked)" /> เปิดแสดง</label><button type="button" class="icon-btn" title="ลบโฆษณา" onclick="removePromotion('${esc(promo.id)}')">×</button></div></div><div class="form-grid"><div class="field"><label>ป้ายกำกับ</label><input value="${esc(promo.badge || '')}" onchange="setPromotionTarget('${esc(promo.id)}','badge',this.value)" /></div><div class="field"><label>สัญลักษณ์ / Emoji</label><input value="${esc(promo.icon || '')}" onchange="setPromotionTarget('${esc(promo.id)}','icon',this.value)" /></div><div class="field full"><label>หัวข้อโฆษณา</label><input value="${esc(promo.title || '')}" onchange="setPromotionTarget('${esc(promo.id)}','title',this.value)" /></div><div class="field full"><label>รายละเอียด</label><textarea rows="2" onchange="setPromotionTarget('${esc(promo.id)}','description',this.value)">${esc(promo.description || '')}</textarea></div><div class="field"><label>ข้อความบนปุ่ม</label><input value="${esc(promo.buttonText || '')}" onchange="setPromotionTarget('${esc(promo.id)}','buttonText',this.value)" /></div><div class="field"><label>ปลายทางเมื่อกด</label><select onchange="setPromotionTarget('${esc(promo.id)}','action',this.value)">${promotionActions.map(([key, label]) => `<option value="${key}" ${promo.action === key ? 'selected' : ''}>${label}</option>`).join('')}</select></div>${promotionTargetFields(promo)}<div class="field full"><label>ภาพโฆษณา (URL หรืออัปโหลดจากมือถือ)</label><input value="${esc(promo.imageUrl || '')}" placeholder="https://.../promotion.jpg" onchange="setPromotionTarget('${esc(promo.id)}','imageUrl',this.value)" /><input class="promotion-image-input" id="promotionImageFile-${esc(promo.id)}" type="file" accept="image/*" /><div class="media-source-actions" style="margin-top:8px"><label class="btn btn-plain btn-small" for="promotionImageFile-${esc(promo.id)}" onpointerdown="document.getElementById('promotionImageFile-${esc(promo.id)}').removeAttribute('capture')">เลือกจากคลังไฟล์</label><label class="btn btn-main btn-small" for="promotionImageFile-${esc(promo.id)}" onpointerdown="document.getElementById('promotionImageFile-${esc(promo.id)}').setAttribute('capture','environment')">ถ่ายรูปด้วยกล้อง</label></div></div><div class="field"><label>สีเน้นของกรอบ</label><input type="color" value="${safePromoColor(promo.color)}" onchange="setPromotionTarget('${esc(promo.id)}','color',this.value)" /></div></div></div>`).join('') : '<p class="sub">ยังไม่มีโฆษณา กดปุ่มด้านล่างเพื่อสร้างรายการแรก</p>';
    items.forEach(bindPromotionImage); if (!window.__promotionListingsRequested && !(Marketplace.listings || []).length) { window.__promotionListingsRequested = true; Marketplace.refresh().then(() => window.renderPromotionEditor()).catch(() => {}); }
  };
  window.setPromotionTarget = (id, key, value) => { if (!requireAdminAction()) return; const promo = (AppState.config.content.promotions || []).find(item => item.id === id); if (!promo) return; promo[key] = key === 'active' ? Boolean(value) : value; if (key === 'action') { promo.targetStoreId = ''; promo.targetMenuId = ''; promo.targetListingId = ''; } if (key === 'targetStoreId') promo.targetMenuId = ''; Storage.save(); renderHome(); window.renderPromotionEditor(); };
  const baseOpenPromotion = window.openPromotion;
  window.openPromotion = async id => {
    const promo = (AppState.config.content.promotions || []).find(item => item.id === id); if (!promo) return;
    if (promo.action === 'store' || promo.action === 'menu') { const store = AppState.stores.find(item => item.id === promo.targetStoreId && item.active !== false); if (!store) return UI.toast('ร้านค้าที่ตั้งไว้สำหรับโฆษณานี้ไม่พร้อมให้บริการ', 'warning'); window.openStore(store.id); if (promo.action === 'menu') requestAnimationFrame(() => { const food = (store.foods || []).find(item => item.id === promo.targetMenuId); const card = [...document.querySelectorAll('#foodGrid .food')].find(item => item.querySelector('h3')?.textContent === food?.name); card?.scrollIntoView({ behavior: 'smooth', block: 'center' }); if (card) { card.style.outline = '3px solid var(--brand)'; setTimeout(() => { card.style.outline = ''; }, 1800); } }); return; }
    if (promo.action === 'listing') { try { await Marketplace.refresh(); const listing = (Marketplace.listings || []).find(item => item.id === promo.targetListingId && item.status !== 'hidden'); if (!listing) return UI.toast('สินค้าตลาดที่ตั้งไว้สำหรับโฆษณานี้ไม่พร้อมแสดง', 'warning'); return window.openListing(listing.id); } catch (error) { return UI.toast(error.message, 'error'); } }
    return baseOpenPromotion(id);
  };

  const callRoleAccess = async payload => { const cfg = SupabaseSync.config(); const body = JSON.stringify(payload); const send = () => fetch(cfg.url + '/functions/v1/role-access', { method: 'POST', headers: SupabaseSync.headers(), body }); let response = await send(); if (response.status === 401) { await SupabaseSync.refreshSession(true); response = await send(); } const data = await response.json(); if (!response.ok) throw new Error(data?.error || 'ไม่สามารถจัดการร้านค้าได้'); return data; };
  const StoreModeration = { loading: false, async refresh() { if (this.loading || !Storage.isAdmin() || !SupabaseSync.session()?.user?.id) return; this.loading = true; try { const data = await callRoleAccess({ action: 'list_store_accounts' }); (data.stores || []).forEach(row => { const store = AppState.stores.find(item => item.id === row.id); if (!store) return; Object.assign(store, { name: row.name || store.name, emoji: row.emoji || store.emoji, desc: row.description ?? store.desc ?? '', rating: Number(row.rating ?? store.rating ?? 0), eta: row.eta ?? store.eta ?? '', phone: row.account?.phone || row.phone || store.phone || '', owner: row.account?.email || row.owner_email || store.owner || '', loginId: row.account?.login_id || store.loginId || '', location: row.location ?? store.location ?? null, imageUrl: row.image_url ?? store.imageUrl ?? '', backgroundUrl: row.background_url ?? store.backgroundUrl ?? '', active: row.active !== false, moderationStatus: row.moderation_status || 'active', moderationReason: row.moderation_reason || '', moderationChangedAt: row.moderation_changed_at || null }); }); Storage.save(); renderAdminStores(); } catch (error) { console.warn('ไม่สามารถโหลดสถานะการจัดการร้าน', error); } finally { this.loading = false; } } };
  window.moderateStore = (id, action) => { const store = AppState.stores.find(item => item.id === id); if (!store) return; const labels = { active: 'เปิดร้านกลับมาแสดง', suspended: 'ระงับ/แบนร้าน', archived: 'เก็บร้านออกจากหน้าสาธารณะ' }; const reason = action === 'active' ? '' : window.prompt(`ระบุเหตุผลสำหรับ “${labels[action]}” ของร้าน ${store.name}`, store.moderationReason || ''); if (reason === null || (action !== 'active' && reason.trim().length < 3)) return UI.toast('กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร', 'warning'); openActionConfirmation({ title: labels[action], message: action === 'active' ? 'ร้านจะกลับมาแสดงต่อผู้ใช้ตามเวลาทำการ' : 'ร้านจะไม่แสดงต่อผู้ใช้ใหม่ทันที แต่ประวัติออร์เดอร์และการเงินยังคงอยู่', body: `<b>ร้าน:</b> ${esc(store.name)}<br><b>สถานะใหม่:</b> ${esc(labels[action])}${reason ? `<br><b>เหตุผล:</b> ${esc(reason)}` : ''}`, confirmText: 'ยืนยันดำเนินการ', onConfirm: async () => { try { await callRoleAccess({ action: 'moderate_store', entity_id: id, moderation_action: action, reason: reason.trim() }); Object.assign(store, { active: action === 'active', moderationStatus: action, moderationReason: reason.trim() }); await StoreModeration.refresh(); renderHome(); UI.toast('บันทึกการจัดการร้านและประวัติแล้ว', 'success'); } catch (error) { UI.toast(error.message, 'error'); } } }); };
  const ensureModerationHistoryModal = () => { if (q('#storeModerationHistoryModal')) return; const modal = document.createElement('div'); modal.className = 'modal-overlay'; modal.id = 'storeModerationHistoryModal'; modal.setAttribute('aria-hidden', 'true'); modal.innerHTML = '<div class="modal"><div class="modal-head"><div><h2>ประวัติการจัดการร้าน</h2><p id="storeModerationHistoryTitle"></p></div><button type="button" class="modal-close" onclick="closeModal(\'storeModerationHistoryModal\')">×</button></div><div id="storeModerationHistoryBody"></div></div>'; document.body.insertBefore(modal, q('#toast')); };
  window.showStoreModerationHistory = async id => { ensureModerationHistoryModal(); const store = AppState.stores.find(item => item.id === id); q('#storeModerationHistoryTitle').textContent = store?.name || ''; q('#storeModerationHistoryBody').innerHTML = '<p class="sub">กำลังโหลดประวัติ…</p>'; q('#storeModerationHistoryModal').classList.add('open'); try { const data = await callRoleAccess({ action: 'get_store_moderation_events', entity_id: id }); q('#storeModerationHistoryBody').innerHTML = data.events?.length ? data.events.map(event => `<div class="panel" style="margin:0 0 8px;padding:11px"><strong>${esc({ active: 'เปิดใช้งาน', suspended: 'ระงับ/แบน', archived: 'เก็บออกจากหน้าสาธารณะ' }[event.action] || event.action)}</strong><br><small>${new Date(event.created_at).toLocaleString('th-TH')}</small><p style="margin:7px 0 0">${esc(event.reason || '—')}</p></div>`).join('') : '<p class="sub">ยังไม่มีประวัติการจัดการร้าน</p>'; } catch (error) { q('#storeModerationHistoryBody').innerHTML = `<p style="color:#b04b4b">${esc(error.message)}</p>`; } };
  const renderStoreWithContacts = renderAdminStores;
  renderAdminStores = () => { renderStoreWithContacts(); [...(q('#adminStoreTable')?.rows || [])].forEach((row, index) => { const store = AppState.stores[index]; const cell = row.cells?.[4]; if (!store || !cell || cell.querySelector('.store-moderation-actions')) return; const status = store.moderationStatus || (store.active === false ? 'suspended' : 'active'); const label = status === 'archived' ? 'เก็บออกจากหน้าเว็บ' : status === 'suspended' ? 'ระงับ/แบนอยู่' : 'ปกติ'; cell.insertAdjacentHTML('beforeend', `<span class="store-moderation-status ${esc(status)}">สถานะกำกับ: ${esc(label)}${store.moderationReason ? ` · ${esc(store.moderationReason)}` : ''}</span><div class="store-moderation-actions">${status === 'active' ? `<button class="btn btn-danger btn-small" onclick="moderateStore('${esc(store.id)}','suspended')">ระงับ/แบน</button><button class="btn btn-plain btn-small" onclick="moderateStore('${esc(store.id)}','archived')">เก็บร้าน</button>` : `<button class="btn btn-main btn-small" onclick="moderateStore('${esc(store.id)}','active')">เปิดกลับ</button>`}<button class="btn btn-plain btn-small" onclick="showStoreModerationHistory('${esc(store.id)}')">ประวัติ</button></div>`); }); };

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
  renderAdmin = () => { priorAdminRender(); groupAdminNavigation(); ContactDirectory.refresh().catch(error => console.warn('โหลดข้อมูลติดต่อร้านค้าไม่สำเร็จ', error)); StoreModeration.refresh().catch(error => console.warn('โหลดสถานะกำกับร้านไม่สำเร็จ', error)); };
  repairImageSourceButtons(); new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => { if (node.nodeType === 1) repairImageSourceButtons(node); }))).observe(document.body, { childList: true, subtree: true });
  new MutationObserver(() => groupAdminNavigation()).observe(q('#adminTabs'), { childList: true });
  ensureStoreContactFields(); groupAdminNavigation(); if (Storage.isAdmin()) { ContactDirectory.refresh().catch(() => {}); CustomerDirectory.load({ quiet: true }).catch(() => {}); }
})();
