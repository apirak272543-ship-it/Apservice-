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
  const detailStyle = document.createElement('style');
  detailStyle.textContent = `
    .store-detail-modal{align-items:stretch!important;justify-content:stretch!important;padding:0!important;background:#f4f8f7!important}.store-detail-modal .modal{width:100vw!important;max-width:none!important;height:100dvh;min-height:100dvh;border-radius:0!important;padding:0!important;overflow:hidden;display:flex;flex-direction:column;box-shadow:none}.store-detail-head{position:sticky;top:0;z-index:2;padding:17px 18px 14px;background:linear-gradient(135deg,#075c52,#129b87);color:#fff;box-shadow:0 4px 14px rgba(4,79,69,.2)}.store-detail-head h2{margin:0;font-size:22px}.store-detail-head p{margin:5px 0 0;color:rgba(255,255,255,.84);font-size:12px}.store-detail-back{display:inline-flex;align-items:center;gap:4px;min-height:34px;margin:0 0 9px;padding:6px 9px;border:0;border-radius:9px;background:rgba(255,255,255,.16);color:#fff;font-size:12px;font-weight:850}.store-detail-tabs{display:flex;flex:0 0 auto;gap:7px;overflow:auto;padding:11px 14px;background:#f4fbf9;border-bottom:1px solid #dceeea;scrollbar-width:none}.store-detail-tabs button{white-space:nowrap;min-height:36px;border:1px solid #cde5df;border-radius:999px;background:#fff;color:#175a51;font-size:12px;font-weight:850;padding:7px 11px}.store-detail-tabs button.active{background:#087d68;color:#fff;border-color:#087d68}.store-detail-body{flex:1;padding:20px max(18px,calc((100vw - 920px)/2));max-height:none;overflow:auto;background:#fff}.store-reference-card{padding:13px;border:1px dashed #bbd9d3;border-radius:13px;background:#f7fcfa;margin-bottom:16px}.store-reference-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.store-reference-grid span{display:block;font-size:10px;color:var(--muted)}.store-reference-grid b{display:block;overflow-wrap:anywhere;color:var(--ink);font-size:13px;margin-top:2px}.store-detail-section-title{margin:0 0 4px;font-size:18px}.store-detail-section-note{margin:0 0 16px;color:var(--muted);font-size:12px;line-height:1.55}.store-detail-form{display:grid;gap:13px}.store-detail-form .form-grid{margin:0}.store-detail-action-row{position:sticky;bottom:0;display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;padding:12px 0 max(10px,env(safe-area-inset-bottom));background:linear-gradient(transparent,#fff 22%)}.store-detail-empty{padding:18px;text-align:center;color:var(--muted)}.store-detail-moderation{display:grid;gap:10px;max-width:520px}.store-detail-moderation .btn{justify-content:center}.store-detail-warning{padding:11px;border-radius:12px;background:#fff5df;color:#8b5a03;font-size:12px;line-height:1.5}.store-detail-media-picker{padding:11px;border:1px solid #d7e9e5;border-radius:13px;background:#f9fdfc}.store-detail-media-picker+.store-detail-media-picker{margin-top:9px}.store-detail-media-picker label{display:block;margin-bottom:6px;font-size:12px;font-weight:850}.store-detail-media-picker .media-source-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.store-detail-media-picker .media-source-actions .btn{min-height:40px;font-size:12px}.store-detail-image-preview{display:none;margin-top:9px;max-width:180px;max-height:112px;overflow:hidden;border-radius:10px;border:1px solid #cde5df;background:#edf8f5}.store-detail-image-preview.has-image{display:block}.store-detail-image-preview img{display:block;width:100%;height:112px;object-fit:cover}@media(max-width:640px){.store-detail-head{padding:14px 15px 12px}.store-detail-head h2{font-size:19px}.store-detail-tabs{padding:9px 12px}.store-detail-tabs button{font-size:11px;padding:7px 10px}.store-detail-body{padding:15px 14px max(20px,env(safe-area-inset-bottom))}.store-reference-grid{grid-template-columns:1fr}.store-detail-action-row{justify-content:stretch}.store-detail-action-row .btn{flex:1 1 145px}.store-detail-media-picker .media-source-actions{grid-template-columns:1fr}.store-detail-media-picker .media-source-actions .btn{width:100%}}
  `;
  document.head.appendChild(detailStyle);

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
    if (typeof pickerTarget === 'undefined' || !['storeLocation', 'storeDetailLocation'].includes(pickerTarget)) return priorSaveMapPicker();
    const manual = { lat: Number(q('#mapManualLat')?.value), lng: Number(q('#mapManualLng')?.value) };
    const point = (typeof pickerMarker !== 'undefined' && pickerMarker && window.L ? pickerMarker.getLatLng() : null) || (typeof apManualPoint !== 'undefined' ? apManualPoint : null) || manual;
    if (!validPoint(point)) return UI.toast('กรุณาเลือกหรือกรอกพิกัดร้านก่อนบันทึก', 'warning');
    const location = { lat: Number(point.lat), lng: Number(point.lng), accuracy: 0, capturedAt: nowLabel(), capturedAtIso: new Date().toISOString(), source: 'map-pin' };
    if (pickerTarget === 'storeDetailLocation') { q('#storeDetailLocationLat').value = location.lat; q('#storeDetailLocationLng').value = location.lng; closeMapPicker(); UI.toast('เลือกพิกัดใหม่แล้ว กดบันทึกเฉพาะหมวดการดำเนินงานเพื่อยืนยัน', 'success'); return; }
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
  const storeDetailTabs = [['overview', 'ภาพรวม'], ['general', 'ข้อมูลร้าน'], ['appearance', 'รูปและสื่อ'], ['operations', 'เวลา/โลเคชัน'], ['account', 'บัญชี Store'], ['moderation', 'สถานะร้าน']];
  const detailInput = (name, label, value, attrs = '') => `<div class="field"><label>${esc(label)}</label><input name="${esc(name)}" value="${esc(value ?? '')}" ${attrs} /></div>`;
  const detailTextarea = (name, label, value) => `<div class="field full"><label>${esc(label)}</label><textarea rows="3" name="${esc(name)}">${esc(value ?? '')}</textarea></div>`;
  const detailImagePicker = (key, label, value) => { const inline = /^data:image\\//i.test(String(value || '').trim()); const displayValue = inline ? '' : String(value || ''); return `<div class="store-detail-media-picker"><label>${esc(label)}</label><input type="hidden" name="${esc(key)}" value="${esc(value || '')}" /><input data-store-detail-image-display="${esc(key)}" value="${esc(displayValue)}" placeholder="วาง URL รูปภาพ (ไม่บังคับ)" /><small id="storeDetailImageStatus-${esc(key)}" class="media-library-label">${inline ? 'มีรูปที่บันทึกไว้แล้ว · เลือกไฟล์ใหม่ได้เมื่อต้องการเปลี่ยน' : 'เลือกรูปจากคลังหรือกล้องเพื่อเตรียมภาพ'}</small><input id="storeDetailImage-${esc(key)}" class="promotion-image-input" data-store-detail-image-input="${esc(key)}" type="file" accept="image/*" /><div class="media-source-actions"><label class="btn btn-plain" for="storeDetailImage-${esc(key)}" onpointerdown="document.getElementById('storeDetailImage-${esc(key)}').removeAttribute('capture')">เลือกจากคลังไฟล์</label><label class="btn btn-main" for="storeDetailImage-${esc(key)}" onpointerdown="document.getElementById('storeDetailImage-${esc(key)}').setAttribute('capture','environment')">ถ่ายรูปด้วยกล้อง</label></div><div id="storeDetailPreview-${esc(key)}" class="store-detail-image-preview ${value ? 'has-image' : ''}">${value ? `<img src="${esc(value)}" alt="ตัวอย่าง${esc(label)}" />` : ''}</div></div>`; };
  const bindStoreDetailMediaInputs = root => { root?.querySelectorAll?.('[data-store-detail-image-display]').forEach(display => { if (display.dataset.displayBound) return; display.dataset.displayBound = 'true'; display.addEventListener('input', () => { const target = q(`#storeDetailForm-appearance [name="${display.dataset.storeDetailImageDisplay}"]`); if (target) target.value = display.value.trim(); }); }); root?.querySelectorAll?.('[data-store-detail-image-input]').forEach(input => {
    if (input.dataset.detailMediaBound) return; input.dataset.detailMediaBound = 'true';
    input.addEventListener('change', async () => { const file = input.files?.[0]; const field = input.dataset.storeDetailImageInput; if (!file || !field) return; try { UI.toast('กำลังบีบอัดภาพ…'); const result = await compressImageForUpload(file); const target = q(`#storeDetailForm-appearance [name="${field}"]`); const display = q(`#storeDetailForm-appearance [data-store-detail-image-display="${field}"]`); if (target) target.value = result.dataUrl; if (display) display.value = ''; const status = q(`#storeDetailImageStatus-${field}`); if (status) status.textContent = `เตรียมภาพใหม่แล้ว · ${Math.ceil(result.bytes / 1024)} KB`; const preview = q(`#storeDetailPreview-${field}`); if (preview) { preview.classList.add('has-image'); preview.innerHTML = `<img src="${esc(result.dataUrl)}" alt="ตัวอย่างภาพที่เลือก" />`; } UI.toast('เตรียมภาพแล้ว กดบันทึกรูปและสื่อเพื่อยืนยัน', 'success'); } catch (error) { input.value = ''; UI.toast(error.message, 'error'); } finally { input.removeAttribute('capture'); } });
  }); };
  const ensureStoreDetailModal = () => {
    if (q('#storeDetailModal')) return;
    const modal = document.createElement('div'); modal.id = 'storeDetailModal'; modal.className = 'modal-overlay store-detail-modal'; modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = '<div class="modal"><div id="storeDetailHead"></div><div id="storeDetailTabs" class="store-detail-tabs"></div><div id="storeDetailBody" class="store-detail-body"></div></div>';
    document.body.insertBefore(modal, q('#toast'));
  };
  const getStoreDetail = id => AppState.stores.find(store => store.id === id) || null;
  const formatStoreStatus = store => ({ active: 'เปิดใช้งาน', suspended: 'ระงับ/แบนอยู่', archived: 'เก็บออกจากหน้าสาธารณะ' }[store?.moderationStatus || (store?.active === false ? 'suspended' : 'active')] || 'เปิดใช้งาน');
  const storeReferenceCard = store => `<div class="store-reference-card"><b>ข้อมูลอ้างอิงบัญชี — อ่านอย่างเดียว</b><div class="store-reference-grid" style="margin-top:8px"><div><span>รหัสร้าน</span><b>${esc(store.id)}</b></div><div><span>สถานะ</span><b>${esc(formatStoreStatus(store))}</b></div><div><span>อีเมล Store App</span><b>${esc(store.owner || 'ยังไม่ผูกบัญชี')}</b></div><div><span>Login ID</span><b>${esc(store.loginId || 'ยังไม่มี')}</b></div></div></div>`;
  const storeDetailContent = (store, tab) => {
    const location = validPoint(store.location) ? store.location : {};
    if (tab === 'overview') return `${storeReferenceCard(store)}<h3 class="store-detail-section-title">${esc(store.name)}</h3><p class="store-detail-section-note">เลือกเมนูด้านบนเพื่อแก้ไขเฉพาะส่วนที่ต้องการ ข้อมูลจากส่วนอื่นจะไม่ถูกส่งทับ</p><div class="panel" style="margin:0"><b>ข้อมูลติดต่อ</b><p style="margin:6px 0 0">โทร ${esc(store.phone || 'ยังไม่มีเบอร์')} · เวลารับงาน ${esc(store.openTime || '00:00')}–${esc(store.closeTime || '23:59')}</p></div><div class="panel" style="margin:10px 0 0"><b>การดำเนินงาน</b><p style="margin:6px 0 0">${store.emergencyClosed ? 'ปิดฉุกเฉิน: ' + esc(store.emergencyNote || 'ไม่มีรายละเอียด') : 'เปิดตามเวลาปกติ'} · ${esc(formatStoreStatus(store))}</p></div>`;
    if (tab === 'general') return `${storeReferenceCard(store)}<h3 class="store-detail-section-title">ข้อมูลร้าน</h3><p class="store-detail-section-note">แก้เฉพาะชื่อ คำอธิบาย เบอร์โทร เรตติ้ง และเวลาจัดส่งโดยประมาณ</p><form class="store-detail-form" id="storeDetailForm-general" onsubmit="saveStoreDetailSection(event,'${esc(store.id)}','general')"><div class="form-grid">${detailInput('name', 'ชื่อร้านค้า', store.name, 'required')}${detailInput('phone', 'เบอร์โทรติดต่อร้าน', store.phone, 'type="tel" inputmode="tel" required')}${detailTextarea('description', 'คำอธิบายร้าน', store.desc || '')}${detailInput('eta', 'เวลาจัดส่งโดยประมาณ', store.eta, 'required')}${detailInput('rating', 'เรตติ้ง (0–5)', store.rating ?? 0, 'type="number" min="0" max="5" step="0.1"')}</div><div class="store-detail-action-row"><button type="submit" class="btn btn-main">บันทึกข้อมูลร้าน</button></div></form>`;
    if (tab === 'appearance') return `${storeReferenceCard(store)}<h3 class="store-detail-section-title">รูปและสื่อ</h3><p class="store-detail-section-note">เลือกรูปจากคลังไฟล์หรือถ่ายรูปด้วยกล้องได้ทั้งรูปหลักและภาพพื้นหลัง แล้วกดบันทึกเฉพาะหมวดนี้</p><form class="store-detail-form" id="storeDetailForm-appearance" onsubmit="saveStoreDetailSection(event,'${esc(store.id)}','appearance')"><div class="form-grid">${detailInput('emoji', 'Emoji ร้าน', store.emoji || '🍽️')}${detailImagePicker('image_url', 'รูปหลักร้าน', store.imageUrl || '')}${detailImagePicker('background_url', 'ภาพพื้นหลังร้าน', store.backgroundUrl || '')}</div><div class="store-detail-action-row"><button type="submit" class="btn btn-main">บันทึกรูปและสื่อ</button></div></form>`;
    if (tab === 'operations') return `${storeReferenceCard(store)}<h3 class="store-detail-section-title">เวลาเปิด–ปิดและโลเคชัน</h3><p class="store-detail-section-note">เลือกใช้ตำแหน่งปัจจุบันของโทรศัพท์ หรือปักหมุดด้วยมือบนแผนที่ แล้วกดบันทึกเฉพาะหมวดนี้</p><form class="store-detail-form" id="storeDetailForm-operations" onsubmit="saveStoreDetailSection(event,'${esc(store.id)}','operations')"><div class="form-grid">${detailInput('open_time', 'เวลาเปิด', String(store.openTime || '08:00').slice(0,5), 'type="time" required')}${detailInput('close_time', 'เวลาปิด', String(store.closeTime || '20:00').slice(0,5), 'type="time" required')}${detailInput('order_cutoff_minutes', 'ตัดรับก่อนปิด (นาที)', store.cutoffMinutes ?? 30, 'type="number" min="0" max="240"')}<div class="field"><label>ปิดฉุกเฉิน</label><select name="emergency_closed"><option value="false" ${store.emergencyClosed ? '' : 'selected'}>ไม่มีปิดฉุกเฉิน</option><option value="true" ${store.emergencyClosed ? 'selected' : ''}>ปิดฉุกเฉิน</option></select></div>${detailInput('emergency_note', 'รายละเอียดปิดฉุกเฉิน', store.emergencyNote || '')}${detailInput('location_lat', 'ละติจูด', location.lat || '', 'id="storeDetailLocationLat" inputmode="decimal"')}${detailInput('location_lng', 'ลองจิจูด', location.lng || '', 'id="storeDetailLocationLng" inputmode="decimal"')}</div><div class="store-detail-action-row"><button type="button" class="btn btn-plain" onclick="useStoreDetailCurrentLocation()">📍 ใช้ตำแหน่งปัจจุบัน</button><button type="button" class="btn btn-plain" onclick="pickStoreDetailLocation('${esc(store.id)}')">🗺️ เลือกพิกัดบนแผนที่</button><button type="submit" class="btn btn-main">บันทึกการดำเนินงาน</button></div></form>`;
    if (tab === 'account') return `${storeReferenceCard(store)}<h3 class="store-detail-section-title">บัญชี Store App</h3><p class="store-detail-section-note">อีเมลและ Login ID เป็นข้อมูลอ้างอิง จึงไม่ถูกแก้ไขจากหน้านี้ รหัสผ่านเดิมไม่สามารถอ่านได้ แต่แอดมินสร้างรหัสผ่านชั่วคราวใหม่ได้เมื่อจำเป็น</p><div class="panel" style="margin:0"><b>การกู้คืนรหัสผ่าน</b><div class="account-recovery-tools"><button type="button" class="btn btn-plain btn-small" onclick="generateStoreDetailPassword()">สร้างรหัสผ่านชั่วคราว</button><span class="account-temp-status" id="storeDetailPasswordStatus"></span></div><div class="form-grid" style="margin-top:10px">${detailInput('temporary_password', 'รหัสผ่านชั่วคราว', '', 'id="storeDetailTemporaryPassword" type="password" autocomplete="new-password" placeholder="สร้างอัตโนมัติหรือกรอกอย่างน้อย 8 ตัวอักษร"')}</div><div class="store-detail-action-row"><button type="button" class="btn btn-main" onclick="saveStoreDetailPassword('${esc(store.id)}')">บันทึกรหัสผ่านชั่วคราว</button></div></div>`;
    return `${storeReferenceCard(store)}<h3 class="store-detail-section-title">จัดการสถานะร้าน</h3><p class="store-detail-section-note">การระงับหรือเก็บร้านจะซ่อนร้านจากลูกค้า แต่เก็บประวัติออร์เดอร์และการเงินไว้ครบถ้วน</p><div class="store-detail-moderation"><div class="store-detail-warning">สถานะปัจจุบัน: <b>${esc(formatStoreStatus(store))}</b>${store.moderationReason ? `<br>เหตุผลล่าสุด: ${esc(store.moderationReason)}` : ''}</div>${(store.moderationStatus || (store.active === false ? 'suspended' : 'active')) === 'active' ? `<button type="button" class="btn btn-danger" onclick="moderateStore('${esc(store.id)}','suspended')">ระงับ/แบนร้าน</button><button type="button" class="btn btn-plain" onclick="moderateStore('${esc(store.id)}','archived')">เก็บร้านออกจากหน้าสาธารณะ</button>` : `<button type="button" class="btn btn-main" onclick="moderateStore('${esc(store.id)}','active')">เปิดร้านกลับมาใช้งาน</button>`}<button type="button" class="btn btn-plain" onclick="showStoreModerationHistory('${esc(store.id)}')">ดูประวัติการจัดการ</button></div>`;
  };
  window.renderStoreDetail = (id, preferredTab) => {
    const store = getStoreDetail(id); const modal = q('#storeDetailModal'); if (!store || !modal) return;
    const tab = preferredTab || modal.dataset.tab || 'overview'; modal.dataset.storeId = id; modal.dataset.tab = tab;
    q('#storeDetailHead').innerHTML = `<div class="store-detail-head"><button type="button" class="store-detail-back" onclick="closeModal('storeDetailModal')">← กลับหน้าจัดการร้าน</button><h2>${esc(store.name)}</h2><p>หน้ารายละเอียดร้าน · แก้ไขเป็นรายหมวด</p></div>`;
    q('#storeDetailTabs').innerHTML = storeDetailTabs.map(([key,label]) => `<button type="button" class="${key === tab ? 'active' : ''}" onclick="setStoreDetailTab('${esc(id)}','${esc(key)}')">${esc(label)}</button>`).join('');
    q('#storeDetailBody').innerHTML = storeDetailContent(store, tab);
    repairImageSourceButtons(q('#storeDetailBody')); bindStoreDetailMediaInputs(q('#storeDetailBody'));
  };
  window.setStoreDetailTab = (id, tab) => window.renderStoreDetail(id, tab);
  window.openStoreDetail = async id => {
    const store = getStoreDetail(id); if (!store) return UI.toast('ไม่พบข้อมูลร้านเดิม', 'error'); ensureStoreDetailModal(); q('#storeDetailModal').classList.add('open'); window.renderStoreDetail(id, 'overview');
    const hydrated = await hydrateStoreForEdit(store); Object.assign(store, hydrated); Storage.save(); window.renderStoreDetail(id, q('#storeDetailModal').dataset.tab || 'overview');
  };
  const legacyEditStoreModal = window.openStoreModal;
  window.openStoreModal = id => id ? window.openStoreDetail(id) : legacyEditStoreModal();
  window.pickStoreDetailLocation = id => {
    const store = getStoreDetail(id); if (!store) return; const current = { lat: Number(q('#storeDetailLocationLat')?.value), lng: Number(q('#storeDetailLocationLng')?.value) }; const fallback = validPoint(store.location) ? store.location : { lat: Number(AppState.config.maps?.defaultLat), lng: Number(AppState.config.maps?.defaultLng) };
    AppState.draftLocations = AppState.draftLocations || {}; AppState.draftLocations.storeDetailLocation = validPoint(current) ? current : fallback; window.openMapPicker('storeDetailLocation');
  };
  window.useStoreDetailCurrentLocation = () => {
    if (!navigator.geolocation) return UI.toast('อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับการใช้ตำแหน่งปัจจุบัน', 'error');
    UI.toast('กำลังขอใช้ตำแหน่งปัจจุบัน…');
    navigator.geolocation.getCurrentPosition(position => {
      const lat = Number(position.coords.latitude), lng = Number(position.coords.longitude); if (!validPoint({ lat, lng })) return UI.toast('ไม่พบพิกัดที่ใช้งานได้ โปรดลองเลือกจากแผนที่', 'warning');
      q('#storeDetailLocationLat').value = lat.toFixed(7); q('#storeDetailLocationLng').value = lng.toFixed(7); UI.toast('ใช้ตำแหน่งปัจจุบันแล้ว กดบันทึกการดำเนินงานเพื่อยืนยัน', 'success');
    }, error => { const message = error?.code === 1 ? 'กรุณาอนุญาตสิทธิ์ตำแหน่งในเบราว์เซอร์ แล้วลองใหม่อีกครั้ง' : error?.code === 3 ? 'ขอตำแหน่งนานเกินไป โปรดลองใหม่หรือเลือกจากแผนที่' : 'ไม่สามารถอ่านตำแหน่งปัจจุบันได้ โปรดลองเลือกจากแผนที่'; UI.toast(message, 'error'); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
  };
  window.saveStoreDetailSection = async (event, id, section) => {
    event.preventDefault(); const form = event.currentTarget; const value = name => form.elements.namedItem(name)?.value ?? '';
    const data = section === 'general' ? { name: value('name'), description: value('description'), eta: value('eta'), rating: Number(value('rating')), phone: value('phone') } : section === 'appearance' ? { emoji: value('emoji'), image_url: value('image_url'), background_url: value('background_url') } : { open_time: value('open_time'), close_time: value('close_time'), order_cutoff_minutes: Number(value('order_cutoff_minutes')), emergency_closed: value('emergency_closed') === 'true', emergency_note: value('emergency_note'), location: validPoint({ lat: Number(value('location_lat')), lng: Number(value('location_lng')) }) ? { lat: Number(value('location_lat')), lng: Number(value('location_lng')), accuracy: 0, capturedAt: nowLabel(), capturedAtIso: new Date().toISOString(), source: 'map-pin' } : null };
    try { const result = await callRoleAccess({ action: 'update_store_section', entity_id: id, section, data }); const store = getStoreDetail(id); const row = result.store || {}; Object.assign(store, { name: row.name ?? store.name, emoji: row.emoji ?? store.emoji, desc: row.description ?? store.desc, rating: Number(row.rating ?? store.rating), eta: row.eta ?? store.eta, phone: row.phone ?? store.phone, location: row.location ?? store.location, imageUrl: row.image_url ?? store.imageUrl, backgroundUrl: row.background_url ?? store.backgroundUrl, openTime: String(row.open_time ?? store.openTime).slice(0,5), closeTime: String(row.close_time ?? store.closeTime).slice(0,5), cutoffMinutes: Number(row.order_cutoff_minutes ?? store.cutoffMinutes), emergencyClosed: Boolean(row.emergency_closed ?? store.emergencyClosed), emergencyNote: row.emergency_note ?? store.emergencyNote }); Storage.save(); renderAdminStores(); renderHome(); window.renderStoreDetail(id, section); UI.toast('บันทึกเฉพาะหมวดนี้แล้ว ข้อมูลอ้างอิงส่วนอื่นไม่ถูกแก้ไข', 'success'); } catch (error) { UI.toast(error.message, 'error'); }
  };
  window.generateStoreDetailPassword = async () => { const input = q('#storeDetailTemporaryPassword'); if (!input) return; const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%'; const bytes = crypto.getRandomValues(new Uint32Array(14)); const password = `AP-${[...bytes].map(value => alphabet[value % alphabet.length]).join('')}`; input.value = password; input.type = 'text'; try { await navigator.clipboard?.writeText(password); q('#storeDetailPasswordStatus').textContent = 'สร้างและคัดลอกรหัสชั่วคราวแล้ว'; } catch (_) { q('#storeDetailPasswordStatus').textContent = 'สร้างรหัสชั่วคราวแล้ว'; } };
  window.saveStoreDetailPassword = async id => { const password = q('#storeDetailTemporaryPassword')?.value || ''; if (password.length < 8) return UI.toast('กรอกรหัสผ่านชั่วคราวอย่างน้อย 8 ตัวอักษร', 'warning'); openActionConfirmation({ title: 'ยืนยันเปลี่ยนรหัสผ่าน Store App', message: 'รหัสผ่านเดิมจะใช้ไม่ได้ทันทีหลังบันทึก โปรดแจ้งรหัสใหม่แก่เจ้าของร้าน', confirmText: 'บันทึกรหัสผ่านใหม่', onConfirm: async () => { try { await callRoleAccess({ action: 'reset_store_password', entity_id: id, password }); q('#storeDetailTemporaryPassword').value = ''; q('#storeDetailPasswordStatus').textContent = 'บันทึกรหัสผ่านใหม่แล้ว'; UI.toast('บันทึกรหัสผ่านชั่วคราวแล้ว', 'success'); } catch (error) { UI.toast(error.message, 'error'); } } }); };
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
  const storeDetailRenderer = renderAdminStores;
  renderAdminStores = () => { storeDetailRenderer(); [...(q('#adminStoreTable')?.rows || [])].forEach((row, index) => { const store = AppState.stores[index]; const cell = row.cells?.[row.cells.length - 1]; if (!store || !cell || cell.querySelector('.store-detail-entry')) return; cell.insertAdjacentHTML('afterbegin', `<button type="button" class="btn btn-main btn-small store-detail-entry" onclick="openStoreDetail('${esc(store.id)}')">รายละเอียด</button>`); }); };
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
