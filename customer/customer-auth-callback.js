(() => {
  'use strict';

  const M = window.APServiceMPA;
  if (!M) return;

  const $ = selector => document.querySelector(selector);
  const h = M.ui.escapeHtml;
  const q = new URLSearchParams(location.search);
  const destination = value => {
    const candidate = String(value || '').trim();
    return /^[a-z0-9-]+\.html(?:\?[^#]*)?$/i.test(candidate) ? candidate : 'index.html';
  };
  const next = destination(q.get('next'));
  const emailHint = String(q.get('email') || '').trim().toLowerCase();
  const normalizePhone = value => String(value || '').trim().replace(/[\s-]/g, '');
  const validPhone = value => /^(?:0\d{8,9}|\+66\d{8,9})$/.test(normalizePhone(value));
  const isPlaceholderName = (value, email) => {
    const name = String(value || '').trim().toLowerCase();
    const local = String(email || '').split('@')[0].trim().toLowerCase();
    return !name || name === local || name === String(email || '').trim().toLowerCase();
  };

  const appUrl = (path = 'profile.html') => {
    const url = new URL(path, document.baseURI);
    url.searchParams.set('next', next);
    return url.href;
  };

  const shell = content => {
    document.body.innerHTML = `<main class="customer-auth-callback-shell"><section class="customer-auth-callback-card">${content}</section></main>`;
  };
  const statusIcon = (icon, tone) => `<div class="customer-auth-callback-icon customer-auth-callback-icon--${tone}" aria-hidden="true">${icon}</div>`;
  const button = (label, href, secondary = false) => `<a class="customer-auth-callback-button${secondary ? ' is-secondary' : ''}" href="${h(href)}">${h(label)}</a>`;
  const setStatus = (message, kind = '') => {
    const node = $('#authCallbackStatus');
    if (node) { node.textContent = message; node.dataset.kind = kind; }
  };

  function loading() {
    shell(`${statusIcon('✦', 'loading')}<span class="customer-auth-callback-eyebrow">AP SERVICE · ยืนยันตัวตน</span><h1>กำลังยืนยันอีเมลของคุณ</h1><p>ระบบกำลังตรวจสอบลิงก์ที่ปลอดภัยและเตรียมบัญชีลูกค้าให้พร้อมใช้งาน</p><div class="customer-auth-callback-progress" aria-label="กำลังตรวจสอบ"><span></span><span></span><span></span></div><p id="authCallbackStatus" class="customer-auth-callback-status" role="status" aria-live="polite">กำลังตรวจสอบ…</p>`);
  }

  function errorState(error) {
    const raw = String(error?.message || error || '').toLowerCase();
    const expired = /expired|invalid|otp|token|confirmation|ลิงก์|หมดอายุ/.test(raw);
    const message = expired
      ? 'ลิงก์นี้หมดอายุ ถูกใช้ไปแล้ว หรือไม่สมบูรณ์ กรุณาขอลิงก์ใหม่จากหน้าเข้าสู่ระบบ'
      : /customer|role|สิทธิ์/.test(raw)
        ? 'บัญชีนี้ยังไม่ได้รับสิทธิ์สำหรับแอปลูกค้า กรุณาติดต่อผู้ดูแลระบบ'
        : 'ยังยืนยันอีเมลไม่สำเร็จ กรุณาลองขอลิงก์ใหม่อีกครั้ง';
    shell(`${statusIcon('!', 'error')}<span class="customer-auth-callback-eyebrow">AP SERVICE · ยังไปต่อได้</span><h1>ยืนยันอีเมลไม่สำเร็จ</h1><p>${h(message)}</p><div class="customer-auth-callback-actions">${button('กลับไปขอลิงก์ใหม่', appUrl())}${button('กลับหน้าแรก AP Service', new URL('index.html', document.baseURI).href, true)}</div><p class="customer-auth-callback-note">หากกดลิงก์จากอีเมลแล้วพบหน้านี้ซ้ำ ให้ตรวจสอบว่าเปิดลิงก์ล่าสุดและไม่ได้เปิดผ่านตัวอย่างลิงก์ของระบบอีเมล</p>`);
  }

  function completeState(user, message = 'ข้อมูลพร้อมแล้ว กำลังพาคุณเข้าใช้งาน') {
    shell(`${statusIcon('✓', 'success')}<span class="customer-auth-callback-eyebrow">AP SERVICE · ยืนยันสำเร็จ</span><h1>ยินดีต้อนรับสู่ AP Service</h1><p>${h(message)}</p><div class="customer-auth-callback-email">${h(user?.email || emailHint || 'อีเมลของคุณ')}</div><div class="customer-auth-callback-actions">${button('เข้าใช้งานแอป', next)}${button('ดูโปรไฟล์ของฉัน', appUrl('profile.html'), true)}</div><p id="authCallbackStatus" class="customer-auth-callback-status is-success" role="status" aria-live="polite">กำลังเปิดแอปให้คุณ…</p>`);
    setTimeout(() => { if (document.visibilityState !== 'hidden') location.assign(next); }, 1200);
  }

  function onboardingState(user, profile) {
    const email = profile.email || user?.email || emailHint || '';
    shell(`${statusIcon('→', 'success')}<span class="customer-auth-callback-eyebrow">AP SERVICE · ขั้นตอนสุดท้าย</span><h1>ยืนยันอีเมลสำเร็จแล้ว</h1><p>กรอกข้อมูลที่จำเป็นอีกเล็กน้อย เพื่อให้เราจัดส่งออร์เดอร์และติดต่อคุณได้สะดวก โดยไม่ต้องจำรหัสผ่าน</p><div class="customer-auth-callback-stepper" aria-label="ขั้นตอนการเริ่มใช้งาน"><span class="is-done">1</span><i></i><span class="is-active">2</span><i></i><span>3</span></div><form id="customerOnboardingForm" class="customer-auth-callback-form" novalidate><label><span>อีเมลที่ยืนยันแล้ว</span><input value="${h(email)}" disabled></label><label><span>ชื่อ–นามสกุล <b aria-hidden="true">*</b></span><input id="onboardingName" type="text" autocomplete="name" minlength="2" maxlength="120" value="${h(isPlaceholderName(profile.display_name, email) ? '' : profile.display_name || '')}" placeholder="เช่น อภิรักษ์ ใจดี" required></label><label><span>เบอร์โทรศัพท์ <b aria-hidden="true">*</b></span><input id="onboardingPhone" type="tel" inputmode="tel" autocomplete="tel" maxlength="16" value="${h(profile.phone || '')}" placeholder="08x-xxx-xxxx" required><small>ใช้ติดต่อเกี่ยวกับออร์เดอร์และการจัดส่งเท่านั้น</small></label><label><span>ที่อยู่จัดส่งหลัก <b aria-hidden="true">*</b></span><textarea id="onboardingAddress" autocomplete="street-address" minlength="5" maxlength="500" placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด และรหัสไปรษณีย์" required>${h(profile.address || '')}</textarea></label><label class="customer-auth-callback-check"><input id="onboardingConsent" type="checkbox" required><span>ฉันยอมรับ <a href="privacy.html" target="_blank" rel="noopener">นโยบายความเป็นส่วนตัว</a> และเงื่อนไขการใช้งานของ AP Service <b aria-hidden="true">*</b></span></label><button class="customer-auth-callback-submit" type="submit">บันทึกข้อมูลและเริ่มใช้งาน</button><p id="authCallbackStatus" class="customer-auth-callback-status" role="status" aria-live="polite"></p></form>`);
    $('#customerOnboardingForm').addEventListener('submit', async event => {
      event.preventDefault();
      const form = event.currentTarget;
      const name = $('#onboardingName').value.trim();
      const phone = normalizePhone($('#onboardingPhone').value);
      const address = $('#onboardingAddress').value.trim();
      if (!name || name.length < 2 || !validPhone(phone) || address.length < 5 || !$('#onboardingConsent').checked) {
        setStatus('กรุณากรอกชื่อ เบอร์โทรศัพท์ ที่อยู่ และยอมรับนโยบายให้ครบถ้วน', 'error');
        form.classList.add('is-error');
        setTimeout(() => form.classList.remove('is-error'), 420);
        return;
      }
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      setStatus('กำลังบันทึกข้อมูลของคุณ…', 'loading');
      try {
        const now = M.ui.nowIso();
        await M.request('user_profiles?on_conflict=user_id', { method: 'POST', private: true, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: user.id, email: user.email || email, display_name: name, phone, address, updated_at: now }) });
        await M.request('user_consents', { method: 'POST', private: true, headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ user_id: user.id, consent_type: 'terms_privacy', policy_version: '2026-08-21', granted: true, granted_at: now, source: 'customer_magic_link_onboarding', evidence: { route: location.pathname, verified_email: true }, created_at: now, updated_at: now }) }).catch(() => null);
        completeState(user, 'บันทึกข้อมูลเรียบร้อยแล้ว กำลังพาคุณเข้าใช้งาน');
      } catch (error) {
        submit.disabled = false;
        setStatus(error?.message || 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่', 'error');
      }
    });
  }

  async function start() {
    loading();
    try {
      const session = await M.auth.acceptMagicLinkFromHash();
      if (!session?.access_token) throw new Error('ไม่พบข้อมูล session จากลิงก์ยืนยัน');
      setStatus('กำลังตรวจสอบบัญชีลูกค้า…', 'loading');
      const user = await M.auth.currentUser();
      if (!user) throw new Error('ไม่พบ session ของผู้ใช้หลังยืนยันอีเมล');
      const roles = await (M.auth.customerRolesFor ? M.auth.customerRolesFor(user.id) : M.auth.rolesFor(user.id));
      if (!roles.includes('customer') || roles.some(role => ['admin', 'rider', 'store_owner'].includes(role))) throw new Error('บัญชีนี้ไม่มีสิทธิ์ Customer');
      setStatus('กำลังตรวจสอบข้อมูลโปรไฟล์…', 'loading');
      const rows = await M.request(`user_profiles?select=display_name,phone,address,email&user_id=eq.${encodeURIComponent(user.id)}&limit=1`, { private: true, forceFresh: true });
      const profile = rows?.[0] || {};
      if (isPlaceholderName(profile.display_name, user.email) || !validPhone(profile.phone) || String(profile.address || '').trim().length < 5) onboardingState(user, profile);
      else completeState(user);
    } catch (error) {
      errorState(error);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
