(() => {
  'use strict';
  const M = window.APServiceMPA;
  if (!M) return;
  const h = M.ui.escapeHtml;
  const $ = selector => document.querySelector(selector);
  const safeNext = value => /^[a-z0-9-]+\.html(?:\?[^#]*)?$/i.test(String(value || '').trim()) ? String(value).trim() : 'index.html';

  async function render(user, destination = safeNext(new URLSearchParams(location.search).get('next'))) {
    const root = $('#profile');
    if (!root) return;
    root.innerHTML = '<div class="customer-onboarding-loading"><span class="customer-onboarding-spinner" aria-hidden="true"></span><p>กำลังเตรียมแบบฟอร์มข้อมูลของคุณ…</p></div>';
    let profile = {};
    try {
      const rows = await M.request(`user_profiles?select=display_name,phone,address,email&user_id=eq.${encodeURIComponent(user.id)}&limit=1`, { private: true, forceFresh: true });
      profile = rows?.[0] || {};
    } catch (_) {}
    const email = String(profile.email || user.email || '').trim().toLowerCase();
    root.innerHTML = `<section class="customer-onboarding-card"><div class="customer-onboarding-kicker">AP SERVICE · ขั้นตอนสุดท้าย</div><div class="customer-onboarding-icon" aria-hidden="true">✓</div><h2>ยืนยันอีเมลสำเร็จแล้ว</h2><p class="customer-onboarding-lead">กรอกข้อมูลที่จำเป็นอีกเล็กน้อย เพื่อให้เราจัดส่งออร์เดอร์และติดต่อคุณได้สะดวก</p><div class="customer-onboarding-email">${h(email)}</div><div class="customer-onboarding-steps" aria-label="ขั้นตอนการเริ่มใช้งาน"><span class="is-done">1</span><i></i><span class="is-active">2</span><i></i><span>3</span></div><form id="customerOnboardingForm" class="customer-onboarding-form" novalidate><label><span>ชื่อ–นามสกุล <b aria-hidden="true">*</b></span><input id="onboardingName" type="text" autocomplete="name" minlength="2" maxlength="120" value="${h(profile.display_name || '')}" placeholder="เช่น อภิรักษ์ ใจดี" required></label><label><span>เบอร์โทรศัพท์ <b aria-hidden="true">*</b></span><input id="onboardingPhone" type="tel" inputmode="tel" autocomplete="tel" maxlength="16" value="${h(profile.phone || '')}" placeholder="08x-xxx-xxxx" required><small>ใช้ติดต่อเกี่ยวกับออร์เดอร์และการจัดส่งเท่านั้น</small></label><label><span>ที่อยู่จัดส่งหลัก <b aria-hidden="true">*</b></span><textarea id="onboardingAddress" autocomplete="street-address" minlength="5" maxlength="500" placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด และรหัสไปรษณีย์" required>${h(profile.address || '')}</textarea></label><label class="customer-onboarding-check"><input id="onboardingConsent" type="checkbox" required><span>ฉันยอมรับ <a href="privacy.html" target="_blank" rel="noopener">นโยบายความเป็นส่วนตัว</a> และเงื่อนไขการใช้งานของ AP Service <b aria-hidden="true">*</b></span></label><button class="customer-onboarding-submit" type="submit">บันทึกข้อมูลและเริ่มใช้งาน</button><p id="customerOnboardingStatus" class="customer-onboarding-status" role="status" aria-live="polite"></p></form></section>`;
    const form = $('#customerOnboardingForm');
    const status = $('#customerOnboardingStatus');
    const submit = form.querySelector('button[type="submit"]');
    form.onsubmit = async event => {
      event.preventDefault();
      const name = $('#onboardingName').value.trim();
      const phone = $('#onboardingPhone').value.trim();
      const address = $('#onboardingAddress').value.trim();
      if (name.length < 2 || phone.length < 8 || address.length < 5 || !$('#onboardingConsent').checked) {
        status.textContent = 'กรุณากรอกชื่อ เบอร์โทรศัพท์ ที่อยู่ และยอมรับนโยบายให้ครบถ้วน';
        status.dataset.kind = 'error';
        return;
      }
      submit.disabled = true;
      status.textContent = 'กำลังบันทึกข้อมูล…';
      status.dataset.kind = 'loading';
      try {
        const now = M.ui.nowIso();
        await M.request('user_profiles?on_conflict=user_id', { method: 'POST', private: true, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: user.id, email, display_name: name, phone, address, updated_at: now }) });
        await M.request('user_consents', { method: 'POST', private: true, headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify({ user_id: user.id, consent_type: 'terms_privacy', policy_version: '2026-08-21', granted: true, granted_at: now, source: 'customer_otp_onboarding', evidence: { route: location.pathname, verified_email: true }, created_at: now, updated_at: now }) }).catch(() => null);
        status.textContent = 'บันทึกข้อมูลแล้ว กำลังเปิดแอป…';
        status.dataset.kind = 'success';
        setTimeout(() => location.assign(destination), 650);
      } catch (error) {
        status.textContent = error?.message || 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่';
        status.dataset.kind = 'error';
        submit.disabled = false;
      }
    };
  }

  window.APServiceCustomerOnboarding = Object.freeze({ render });
})();
