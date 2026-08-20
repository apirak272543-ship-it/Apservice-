(() => {
  'use strict';
  const M = window.APServiceMPA;
  if (!M || window.APServiceCustomerAddressBook) return;
  const $ = selector => document.querySelector(selector);
  const safeText = value => String(value || '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const validPoint = point => {
    const lat = Number(point?.lat), lng = Number(point?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  };
  const state = { userId: '', addresses: [], selectedId: '', mounted: false };
  const status = text => { const node = $('#customerAddressBookStatus'); if (node) node.textContent = text; };
  const fields = () => ({
    label: $('#addressLabel')?.value.trim() || 'ที่อยู่จัดส่ง',
    recipientName: $('#deliveryRecipientName')?.value.trim() || '',
    recipientPhone: $('#deliveryRecipientPhone')?.value.trim() || '',
    addressLine: $('#deliveryAddress')?.value.trim() || '',
    deliveryNote: $('#deliveryNote')?.value.trim() || ''
  });
  const addressView = address => `${address.label || 'ที่อยู่จัดส่ง'} · ${address.recipient_name || '-'} · ${address.recipient_phone || '-'} · ${address.address_line || '-'}`;
  const addressOption = address => `<option value="${safeText(address.id)}"${address.id === state.selectedId ? ' selected' : ''}>${safeText(addressView(address))}${address.is_default ? ' (ค่าเริ่มต้น)' : ''}</option>`;

  const renderSelect = () => {
    const host = $('#savedAddressSelect');
    if (!host) return;
    host.innerHTML = `<option value="">ใช้รายละเอียดที่กำลังกรอก</option>${state.addresses.map(addressOption).join('')}`;
  };
  const applyAddress = address => {
    if (!address) return;
    state.selectedId = address.id;
    $('#addressLabel').value = address.label || 'ที่อยู่จัดส่ง';
    $('#deliveryRecipientName').value = address.recipient_name || '';
    $('#deliveryRecipientPhone').value = address.recipient_phone || '';
    $('#deliveryAddress').value = address.address_line || '';
    $('#deliveryNote').value = address.delivery_note || '';
    window.APServiceCustomerLocation?.setSelectedLocation?.(address.location);
    renderSelect();
    status(`เลือก ${address.label || 'ที่อยู่จัดส่ง'} แล้ว ระบบจะสร้าง snapshot ของข้อมูลนี้เมื่อยืนยันออร์เดอร์`);
  };
  const loadProfileDefaults = async user => {
    const rows = await M.request(`user_profiles?select=display_name,phone,address,location&user_id=eq.${encodeURIComponent(user.id)}&limit=1`, { private: true, cacheTtlMs: 10_000, cacheKey: `customer-address-profile:${user.id}` });
    const profile = rows?.[0] || {};
    if (!$('#deliveryRecipientName').value.trim()) $('#deliveryRecipientName').value = profile.display_name || user.user_metadata?.display_name || '';
    if (!$('#deliveryRecipientPhone').value.trim()) $('#deliveryRecipientPhone').value = profile.phone || '';
    if (!$('#deliveryAddress').value.trim()) $('#deliveryAddress').value = profile.address || '';
    return profile;
  };
  const loadAddresses = async (user, { forceFresh = false } = {}) => {
    const rows = await M.request(`customer_addresses?select=id,label,recipient_name,recipient_phone,address_line,delivery_note,location,is_default,updated_at&user_id=eq.${encodeURIComponent(user.id)}&archived_at=is.null&order=is_default.desc,updated_at.desc&limit=50`, { private: true, forceFresh, cacheTtlMs: 8_000, cacheKey: `customer-addresses:${user.id}` });
    state.addresses = rows || [];
    if (!state.addresses.some(row => row.id === state.selectedId)) state.selectedId = state.addresses.find(row => row.is_default)?.id || '';
    renderSelect();
    if (state.selectedId) applyAddress(state.addresses.find(row => row.id === state.selectedId));
    else status('กรอกที่อยู่ ผู้รับ และพิกัด แล้วระบบจะบันทึกเป็นที่อยู่แรกของคุณเมื่อยืนยันออร์เดอร์');
    return state.addresses;
  };
  const currentLocation = async user => {
    const location = await window.APServiceCustomerLocation?.ensureForCheckout?.({ user });
    if (!validPoint(location)) throw new Error('กรุณาระบุตำแหน่งจัดส่งก่อนบันทึกที่อยู่');
    return location;
  };
  const saveCurrent = async ({ user, forceDefault = false, location } = {}) => {
    if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนบันทึกที่อยู่');
    const data = fields();
    const point = location || await currentLocation(user);
    const payload = {
      p_address_id: state.selectedId || null,
      p_label: data.label,
      p_recipient_name: data.recipientName,
      p_recipient_phone: data.recipientPhone,
      p_address_line: data.addressLine,
      p_location: point,
      p_delivery_note: data.deliveryNote || null,
      p_is_default: forceDefault || !state.addresses.length
    };
    const result = await M.request('rpc/save_customer_address', { method: 'POST', private: true, body: JSON.stringify(payload) });
    const address = Array.isArray(result) ? result[0] : result;
    if (!address?.id) throw new Error('ไม่สามารถบันทึกที่อยู่จัดส่งได้');
    state.selectedId = address.id;
    await loadAddresses(user);
    applyAddress(state.addresses.find(row => row.id === state.selectedId) || address);
    return state.addresses.find(row => row.id === state.selectedId) || address;
  };
  const archiveSelected = async user => {
    if (!state.selectedId) throw new Error('กรุณาเลือกที่อยู่ที่ต้องการเก็บก่อน');
    const result = await M.request('rpc/archive_customer_address', { method: 'POST', private: true, body: JSON.stringify({ p_address_id: state.selectedId }) });
    const data = Array.isArray(result) ? result[0] : result;
    state.selectedId = data?.replacement_default_id || '';
    await loadAddresses(user);
    M.ui.setNotice('เก็บที่อยู่ออกจากรายการแล้ว');
  };
  const mountCheckout = async () => {
    const form = $('#checkoutForm');
    if (!form || state.mounted) return;
    state.mounted = true;
    $('#deliveryAddress')?.closest('.mpa-field')?.insertAdjacentHTML('afterend', `<section class="customer-address-book" aria-labelledby="customerAddressBookTitle"><h3 id="customerAddressBookTitle">ที่อยู่จัดส่งและผู้รับ</h3><p class="mpa-muted">เลือกที่อยู่เดิม หรือกรอกรายละเอียดใหม่ ระบบจะเก็บ snapshot ของผู้รับและจุดส่งไว้กับออร์เดอร์นี้</p><div class="mpa-field"><label for="savedAddressSelect">ที่อยู่ที่บันทึกไว้</label><select id="savedAddressSelect"><option value="">ใช้รายละเอียดที่กำลังกรอก</option></select></div><div class="mpa-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px"><div class="mpa-field"><label for="addressLabel">ชื่อเรียกที่อยู่</label><input id="addressLabel" maxlength="80" value="ที่อยู่จัดส่ง" placeholder="เช่น บ้าน / ที่ทำงาน"></div><div class="mpa-field"><label for="deliveryRecipientName">ชื่อผู้รับ</label><input id="deliveryRecipientName" maxlength="160" required autocomplete="name"></div><div class="mpa-field"><label for="deliveryRecipientPhone">เบอร์โทรผู้รับ</label><input id="deliveryRecipientPhone" maxlength="32" required inputmode="tel" autocomplete="tel"></div></div><div class="mpa-field"><label for="deliveryNote">รายละเอียดจุดส่ง</label><textarea id="deliveryNote" rows="2" maxlength="1000" placeholder="เช่น รอหน้าประตู หรือโทรก่อนถึง"></textarea></div><div class="customer-location-actions"><button class="mpa-button mpa-button-secondary" type="button" id="saveAddress">บันทึกที่อยู่นี้</button><button class="mpa-button mpa-button-secondary" type="button" id="setDefaultAddress">ตั้งเป็นที่อยู่หลัก</button><button class="mpa-button mpa-button-secondary" type="button" id="archiveAddress">เก็บที่อยู่</button></div><p id="customerAddressBookStatus" class="mpa-muted" aria-live="polite">กำลังโหลดที่อยู่ที่บันทึกไว้…</p></section>`);
    const user = await M.auth.currentUser();
    if (!user) {
      status('เข้าสู่ระบบก่อนเลือกหรือบันทึกที่อยู่จัดส่ง');
      const loginUrl = `profile.html?next=${encodeURIComponent('checkout.html')}`;
      const showLogin = () => { M.ui.setNotice('กรุณาเข้าสู่ระบบก่อนจัดการที่อยู่จัดส่ง', 'error'); location.assign(loginUrl); };
      $('#saveAddress').onclick = showLogin;
      $('#setDefaultAddress').onclick = showLogin;
      $('#archiveAddress').onclick = showLogin;
      return;
    }
    state.userId = user.id;
    try { await loadProfileDefaults(user); await loadAddresses(user); } catch (error) { status('ยังโหลดที่อยู่ที่บันทึกไว้ไม่ได้ คุณยังกรอกและบันทึกใหม่ได้เมื่อเชื่อมต่อแล้ว'); }
    $('#savedAddressSelect').onchange = event => { state.selectedId = event.target.value; applyAddress(state.addresses.find(row => row.id === state.selectedId)); };
    $('#saveAddress').setAttribute('aria-describedby', 'customerAddressBookStatus');
    $('#setDefaultAddress').setAttribute('aria-describedby', 'customerAddressBookStatus');
    $('#archiveAddress').setAttribute('aria-describedby', 'customerAddressBookStatus');
    $('#saveAddress').onclick = async () => { const button = $('#saveAddress'); button.disabled = true; status('กำลังบันทึกที่อยู่…'); try { const address = await saveCurrent({ user }); const message = `บันทึก ${address.label || 'ที่อยู่จัดส่ง'} แล้ว`; status(message); M.ui.setNotice(message); } catch (error) { status(error.message || 'บันทึกที่อยู่ไม่สำเร็จ'); M.ui.setNotice(error.message || 'บันทึกที่อยู่ไม่สำเร็จ', 'error'); } finally { button.disabled = false; } };
    $('#setDefaultAddress').onclick = async () => { const button = $('#setDefaultAddress'); button.disabled = true; status('กำลังตั้งที่อยู่หลัก…'); try { const address = await saveCurrent({ user, forceDefault: true }); const message = `ตั้ง ${address.label || 'ที่อยู่จัดส่ง'} เป็นที่อยู่หลักแล้ว`; status(message); M.ui.setNotice(message); } catch (error) { status(error.message || 'ตั้งที่อยู่หลักไม่สำเร็จ'); M.ui.setNotice(error.message || 'ตั้งที่อยู่หลักไม่สำเร็จ', 'error'); } finally { button.disabled = false; } };
    $('#archiveAddress').onclick = async () => { try { await archiveSelected(user); } catch (error) { M.ui.setNotice(error.message, 'error'); } };
  };
  const ensureForCheckout = async ({ user, location }) => {
    if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนยืนยันออร์เดอร์');
    const point = location || await currentLocation(user);
    if (state.userId !== user.id) { state.userId = user.id; await loadProfileDefaults(user); await loadAddresses(user); }
    const current = fields();
    const selected = state.addresses.find(row => row.id === state.selectedId);
    const differs = selected && (
      selected.label !== current.label || selected.recipient_name !== current.recipientName || selected.recipient_phone !== current.recipientPhone ||
      selected.address_line !== current.addressLine || (selected.delivery_note || '') !== current.deliveryNote ||
      !validPoint(selected.location) || Number(selected.location.lat) !== Number(point.lat) || Number(selected.location.lng) !== Number(point.lng)
    );
    if (!selected || differs) {
      try {
        return await saveCurrent({ user, location: point });
      } catch (error) {
        // A cached/archived selected id must not block checkout. Refresh the active address list,
        // keep the user's current form values, and retry once against the current active record.
        await loadAddresses(user, { forceFresh: true });
        const latest = state.addresses.find(row => row.id === state.selectedId) || state.addresses.find(row => row.is_default) || state.addresses[0];
        if (!latest) throw error;
        state.selectedId = latest.id;
        try { return await saveCurrent({ user, location: point }); } catch (_) { throw error; }
      }
    }
    return selected;
  };
  window.APServiceCustomerAddressBook = { mountCheckout, ensureForCheckout };
})();
