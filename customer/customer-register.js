(() => {
  'use strict';
  const M = window.APServiceMPA;
  if (!M) return;
  const q = new URLSearchParams(location.search);
  const h = M.ui.escapeHtml;
  const $ = selector => document.querySelector(selector);
  const safeNext = (value, fallback = 'index.html') => { const candidate = String(value || '').trim(); return /^[a-z0-9-]+\.html(?:\?[^#]*)?$/i.test(candidate) ? candidate : fallback; };
  const destination = safeNext(q.get('next'), 'index.html');
  const loginHref = `profile.html?next=${encodeURIComponent(destination)}`;
  document.body.innerHTML = `<main class="customer-register-shell"><a class="customer-register-back" href="${h(loginHref)}" aria-label="กลับไปหน้าเข้าสู่ระบบ"><span aria-hidden="true">←</span><span>กลับเข้าสู่ระบบ</span></a><header class="customer-register-head"><small>AP SERVICE · CUSTOMER</small><h1>สร้างบัญชีของคุณ</h1><p>กรอกข้อมูลครั้งเดียวเพื่อสั่งซื้อ ติดตามออร์เดอร์ และตั้งค่าการจัดส่งได้สะดวกขึ้น</p></header><section class="customer-register-card"><div class="customer-register-progress" aria-label="ขั้นตอนการสมัคร"><span class="is-active"></span><span class="is-active"></span><span class="is-active"></span></div><form id="customerRegisterForm" novalidate><section class="customer-register-section"><h2>ข้อมูลบัญชี</h2><p>ใช้สำหรับยืนยันตัวตนและแจ้งสถานะบริการ</p><div class="customer-register-grid"><label class="customer-register-field customer-register-wide"><span>ชื่อ–นามสกุล <b aria-hidden="true">*</b></span><input id="registerFullName" type="text" autocomplete="name" maxlength="120" minlength="2" placeholder="เช่น อภิรักษ์ ใจดี" required></label><label class="customer-register-field"><span>เบอร์โทรศัพท์ <b aria-hidden="true">*</b></span><input id="registerPhone" type="tel" inputmode="tel" autocomplete="tel" maxlength="16" placeholder="08x-xxx-xxxx" required><small>ใช้ติดต่อเกี่ยวกับออร์เดอร์เท่านั้น</small></label><label class="customer-register-field"><span>อีเมล <b aria-hidden="true">*</b></span><input id="registerEmail" type="email" autocomplete="email" maxlength="254" placeholder="name@example.com" required></label><label class="customer-register-field"><span>รหัสผ่าน <b aria-hidden="true">*</b></span><input id="registerPassword" type="password" autocomplete="new-password" minlength="8" placeholder="อย่างน้อย 8 ตัวอักษร" required></label><label class="customer-register-field"><span>ยืนยันรหัสผ่าน <b aria-hidden="true">*</b></span><input id="registerPasswordConfirm" type="password" autocomplete="new-password" minlength="8" placeholder="กรอกรหัสผ่านอีกครั้ง" required></label></div></section><section class="customer-register-section"><h2>ข้อมูลสำหรับจัดส่ง</h2><p>กรอกที่อยู่เริ่มต้นได้เลย หรือข้ามไปตั้งค่าจากโปรไฟล์ภายหลังได้</p><label class="customer-register-field"><span>ที่อยู่จัดส่งหลัก <em>(ไม่บังคับ)</em></span><textarea id="registerAddress" autocomplete="street-address" maxlength="500" placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด และรหัสไปรษณีย์"></textarea><small>ตำแหน่ง GPS จะขอเมื่อคุณเลือกใช้จากโปรไฟล์หรือขั้นตอนสั่งซื้อเท่านั้น</small></label></section><section class="customer-register-section"><h2>ความยินยอม</h2><label class="customer-register-check"><input id="registerConsent" type="checkbox" required><span>ฉันยอมรับ <a href="privacy.html" target="_blank" rel="noopener">นโยบายความเป็นส่วนตัว</a> และเงื่อนไขการใช้งานของ AP Service <b aria-hidden="true">*</b></span></label><label class="customer-register-check"><input id="registerMarketing" type="checkbox"><span>ฉันต้องการรับข่าวสารและสิทธิพิเศษจาก AP Service <em>(เลือกได้)</em></span></label></section><button class="customer-register-submit" type="submit">สร้างบัญชี Customer</button><p id="customerRegisterStatus" class="customer-register-status" role="status" aria-live="polite"></p></form><p class="customer-register-login">มีบัญชีอยู่แล้ว? <a href="${h(loginHref)}">เข้าสู่ระบบ</a></p></section></main>`;
  const form = $('#customerRegisterForm');
  const status = $('#customerRegisterStatus');
  const setStatus = (message, kind = '') => { status.textContent = message || ''; status.dataset.kind = kind; };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const name = $('#registerFullName').value.trim();
    const phone = $('#registerPhone').value.trim().replace(/[\s-]/g, '');
    const email = $('#registerEmail').value.trim().toLowerCase();
    const password = $('#registerPassword').value;
    const confirmation = $('#registerPasswordConfirm').value;
    const address = $('#registerAddress').value.trim();
    const consent = $('#registerConsent').checked;
    const marketing = $('#registerMarketing').checked;
    if (!name || !phone || !email || !password || !consent) return setStatus('กรุณากรอกข้อมูลที่มีเครื่องหมาย * และยอมรับนโยบายความเป็นส่วนตัว', 'error');
    if (!/^(?:0\d{8,9}|\+66\d{8,9})$/.test(phone)) return setStatus('กรุณากรอกเบอร์โทรศัพท์ให้ถูกต้อง', 'error');
    if (password !== confirmation) return setStatus('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน', 'error');
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true; setStatus('กำลังสร้างบัญชี…');
    try {
      const registrationMeta = { display_name: name, full_name: name, phone, address, registration_consent_version: '2026-08-21', registration_consent_granted_at: M.ui.nowIso(), marketing_opt_in: marketing };
      const result = await M.auth.signUp({ email, password, data: registrationMeta });
      if (!result?.user?.id) throw new Error('ระบบยังสร้างบัญชีไม่สำเร็จ กรุณาลองใหม่');
      if (!result.access_token) { setStatus('สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี แล้วเข้าสู่ระบบอีกครั้ง', 'success'); location.assign(`profile.html?registered=pending&next=${encodeURIComponent(destination)}`); return; }
      let roles = [];
      for (let attempt = 0; attempt < 5; attempt += 1) { roles = await M.auth.rolesFor(result.user.id); if (roles.includes('customer')) break; await new Promise(resolve => setTimeout(resolve, 120)); }
      if (!roles.includes('customer') || roles.some(role => ['admin', 'rider', 'store_owner'].includes(role))) { M.auth.signOut(loginHref); throw new Error('ระบบสร้างบัญชีแล้ว แต่ยังยืนยันสิทธิ์ Customer ไม่สำเร็จ กรุณาติดต่อผู้ดูแล'); }
      await M.request('user_profiles?on_conflict=user_id', { method: 'POST', private: true, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: result.user.id, email, display_name: name, phone, address, updated_at: M.ui.nowIso() }) });
      await M.request('user_consents', { method: 'POST', private: true, headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: result.user.id, consent_type: 'terms_privacy', policy_version: '2026-08-21', granted: true, granted_at: M.ui.nowIso(), source: 'customer_registration_page', evidence: { registration_route: 'customer/register.html', marketing_opt_in: marketing }, created_at: M.ui.nowIso(), updated_at: M.ui.nowIso() }) }).catch(() => null);
      setStatus('สร้างบัญชี Customer สำเร็จ กำลังพาคุณไปเริ่มใช้งาน…', 'success'); location.assign(destination);
    } catch (error) { setStatus(error?.message || 'สมัครสมาชิกไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองใหม่', 'error'); M.ui.setNotice(error?.message || 'สมัครสมาชิกไม่สำเร็จ', 'error'); submit.disabled = false; }
  });
})();
