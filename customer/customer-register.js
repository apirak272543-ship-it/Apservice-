(() => {
  'use strict';

  const M = window.APServiceMPA;
  if (!M) return;

  const q = new URLSearchParams(location.search);
  const h = M.ui.escapeHtml;
  const $ = selector => document.querySelector(selector);
  const safeNext = value => {
    const candidate = String(value || '').trim();
    return /^[a-z0-9-]+\.html(?:\?[^#]*)?$/i.test(candidate) ? candidate : 'index.html';
  };
  const destination = safeNext(q.get('next'));
  const loginHref = `profile.html?next=${encodeURIComponent(destination)}`;

  document.body.innerHTML = `<main class="customer-register-shell"><a class="customer-register-back" href="${h(loginHref)}" aria-label="กลับไปหน้าเข้าสู่ระบบ"><span aria-hidden="true">←</span><span>กลับเข้าสู่ระบบ</span></a><header class="customer-register-head"><small>AP SERVICE · CUSTOMER</small><h1>เริ่มใช้งานด้วยอีเมล</h1><p>ไม่ต้องสร้างหรือจำรหัสผ่าน ระบบจะส่งรหัส PIN 6 หลักไปที่อีเมลของคุณ แล้วพาไปกรอกข้อมูลสำหรับการจัดส่งในขั้นตอนถัดไป</p></header><section class="customer-register-card"><div class="customer-register-progress" aria-label="ขั้นตอนการสมัคร"><span class="is-active"></span><span></span><span></span></div><form id="customerRegisterForm" novalidate><section class="customer-register-section"><h2>ส่งรหัสยืนยัน</h2><p>ใช้ Gmail หรืออีเมลที่คุณเปิดดูได้ตอนนี้ รหัสเป็นแบบใช้ครั้งเดียวและจะหมดอายุตามเวลาที่ระบบกำหนด</p><label class="customer-register-field customer-register-wide"><span>อีเมล <b aria-hidden="true">*</b></span><input id="registerEmail" type="email" autocomplete="email" maxlength="254" placeholder="name@example.com" required></label></section><section class="customer-register-section"><h2>หลังจากกรอกรหัส</h2><p>ระบบจะพากลับมาที่ AP Service เพื่อกรอกชื่อ เบอร์โทรศัพท์ และที่อยู่จัดส่งที่จำเป็นต่อการใช้งาน</p></section><label class="customer-register-check"><input id="registerConsent" type="checkbox" required><span>ฉันยอมรับ <a href="privacy.html" target="_blank" rel="noopener">นโยบายความเป็นส่วนตัว</a> และเงื่อนไขการใช้งานของ AP Service <b aria-hidden="true">*</b></span></label><button class="customer-register-submit" type="submit">ส่งรหัส PIN เข้าอีเมล</button><p id="customerRegisterStatus" class="customer-register-status" role="status" aria-live="polite"></p></form><p class="customer-register-login">มีบัญชีอยู่แล้ว? <a href="${h(loginHref)}">เข้าสู่ระบบด้วยอีเมล</a></p></section></main>`;

  const form = $('#customerRegisterForm');
  const status = $('#customerRegisterStatus');
  const submit = form.querySelector('button[type="submit"]');
  const errorMessage = error => {
    const raw = String(error?.message || error || '').toLowerCase();
    if (raw.includes('too many') || raw.includes('rate limit')) return 'ขอรหัสบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่';
    if (raw.includes('network') || raw.includes('fetch')) return 'เชื่อมต่อระบบไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่';
    return 'ยังส่งรหัสไม่ได้ กรุณาตรวจสอบอีเมลและการเชื่อมต่อแล้วลองใหม่';
  };
  const renderOtpStep = email => {
    form.innerHTML = `<section class="customer-register-section customer-register-otp-step"><h2>กรอกรหัสจากอีเมล</h2><p>เราได้ส่งรหัส PIN 6 หลักไปที่ <b>${h(email)}</b> แล้ว กรุณานำรหัสจาก Gmail มากรอกที่นี่</p><label class="customer-register-field customer-register-wide"><span>รหัส PIN 6 หลัก <b aria-hidden="true">*</b></span><input id="registerOtp" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="••••••" required></label><button class="customer-register-submit" data-register-verify type="submit">ยืนยันรหัสและเริ่มใช้งาน</button><button class="ap-login-secondary" data-register-resend type="button">ส่งรหัสใหม่</button><p id="customerRegisterStatus" class="customer-register-status" role="status" aria-live="polite">รหัสมีอายุจำกัดและใช้ได้ครั้งเดียว กรุณาตรวจสอบ Inbox หรือ Spam</p></section>`;
    const otpStatus = $('#customerRegisterStatus');
    const verify = form.querySelector('[data-register-verify]');
    form.onsubmit = async event => {
      event.preventDefault();
      const token = $('#registerOtp').value.trim();
      if (token.length !== 6 || !/^[0-9]+$/.test(token)) {
        otpStatus.textContent = 'กรุณากรอกรหัส 6 หลักจากอีเมล';
        otpStatus.dataset.kind = 'error';
        return;
      }
      verify.disabled = true;
      otpStatus.textContent = 'กำลังตรวจสอบรหัส…';
      otpStatus.dataset.kind = 'loading';
      try {
        await M.auth.verifyEmailOtp(email, token);
        otpStatus.textContent = 'ยืนยันรหัสสำเร็จ กำลังเปิดแบบฟอร์มข้อมูลเพิ่มเติม…';
        otpStatus.dataset.kind = 'success';
        setTimeout(() => location.assign(`profile.html?onboarding=1&next=${encodeURIComponent(destination)}`), 650);
      } catch (error) {
        otpStatus.textContent = /expired|invalid|token/i.test(String(error?.message || error)) ? 'รหัสหมดอายุหรือไม่ถูกต้อง กรุณาขอรหัสใหม่' : errorMessage(error);
        otpStatus.dataset.kind = 'error';
        verify.disabled = false;
      }
    };
    form.querySelector('[data-register-resend]').onclick = async () => {
      const resend = form.querySelector('[data-register-resend]');
      resend.disabled = true;
      otpStatus.textContent = 'กำลังส่งรหัสใหม่…';
      otpStatus.dataset.kind = 'loading';
      try {
        await M.auth.sendEmailOtp(email);
        otpStatus.textContent = 'ส่งรหัสใหม่แล้ว กรุณาตรวจสอบอีเมลล่าสุด';
        otpStatus.dataset.kind = 'success';
      } catch (error) {
        otpStatus.textContent = errorMessage(error);
        otpStatus.dataset.kind = 'error';
        resend.disabled = false;
      }
    };
    $('#registerOtp').focus();
  };

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const email = $('#registerEmail').value.trim().toLowerCase();
    if (!email || !$('#registerConsent').checked) return setStatus('กรุณากรอกอีเมลและยอมรับนโยบายความเป็นส่วนตัว', 'error');
    submit.disabled = true;
    setStatus('กำลังส่งรหัส PIN ไปที่อีเมลของคุณ…', 'loading');
    try {
      await M.auth.sendEmailOtp(email);
      renderOtpStep(email);
    } catch (error) {
      setStatus(errorMessage(error), 'error');
      submit.disabled = false;
    }
  });

  function setStatus(message, kind = '') {
    status.textContent = message || '';
    status.dataset.kind = kind;
  }
})();
