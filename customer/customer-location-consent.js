(() => {
  'use strict';
  const M = window.APServiceMPA;
  if (!M || sessionStorage.getItem('apservice_location_consent_seen_v1') === '1') return;
  const policyVersion = '2026-08-20';
  const close = modal => modal?.remove();
  const markSeen = () => sessionStorage.setItem('apservice_location_consent_seen_v1', '1');
  const consent = async (userId, type, granted, source) => {
    const now = M.ui.nowIso();
    try {
      await M.request('user_consents?on_conflict=user_id,consent_type,policy_version', { method: 'POST', private: true, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: userId, consent_type: type, policy_version: policyVersion, granted, granted_at: granted ? now : null, source, evidence: { route: location.pathname }, created_at: now, updated_at: now }) });
    } catch (_) { /* Consent history must never prevent the customer from continuing. */ }
  };
  const showBenefits = user => {
    const modal = document.createElement('div'); modal.className = 'customer-consent-backdrop';
    modal.innerHTML = `<section class="customer-consent-modal" role="dialog" aria-modal="true" aria-labelledby="locationBenefitsTitle"><span class="customer-consent-art" aria-hidden="true">⌖</span><h2 id="locationBenefitsTitle">ยังเลือกใช้บริการได้ตามปกติ</h2><p>หากไม่ใช้ตำแหน่งตอนนี้ คุณยังเลือกดูร้านและกรอกที่อยู่จัดส่งเองได้ เพียงอาจพลาดความสะดวกบางอย่าง</p><ul><li>ร้านและข้อเสนอที่ใกล้จุดจัดส่งของคุณ</li><li>การช่วยระบุหมุดจัดส่งอย่างแม่นยำ</li><li>การคำนวณค่าจัดส่งและเวลาถึงที่แม่นยำขึ้น</li></ul><div class="customer-consent-actions"><button class="mpa-button mpa-button-secondary" type="button" data-consent-manual>กรอกที่อยู่เอง</button><button class="mpa-button" type="button" data-consent-retry>ลองอนุญาตอีกครั้ง</button></div></section>`;
    document.body.append(modal);
    modal.querySelector('[data-consent-manual]').onclick = async () => { await consent(user.id, 'location_prompt_declined', true, 'customer_location_consent_manual'); markSeen(); close(modal); M.ui.setNotice('คุณสามารถเพิ่มที่อยู่จัดส่งเองได้จากโปรไฟล์หรือหน้าเช็กเอาต์'); };
    modal.querySelector('[data-consent-retry]').onclick = () => { close(modal); showPrompt(user); };
  };
  const saveLocation = async (user, position) => {
    const now = M.ui.nowIso(); const location = { lat: Number(position.coords.latitude), lng: Number(position.coords.longitude), accuracy: Number(position.coords.accuracy), captured_at: now };
    await M.request(`user_profiles?user_id=eq.${encodeURIComponent(user.id)}`, { method: 'PATCH', private: true, headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ location, updated_at: now }) });
    await consent(user.id, 'location_access', true, 'customer_location_consent');
  };
  const showPrompt = user => {
    const modal = document.createElement('div'); modal.className = 'customer-consent-backdrop';
    modal.innerHTML = `<section class="customer-consent-modal" role="dialog" aria-modal="true" aria-labelledby="locationConsentTitle"><span class="customer-consent-art" aria-hidden="true">⌖</span><p class="customer-consent-eyebrow">ตั้งค่าการจัดส่ง</p><h2 id="locationConsentTitle">ให้ AP Service ใช้ตำแหน่งของคุณไหม?</h2><p>เราใช้ตำแหน่งเพื่อช่วยเลือกจุดส่ง แนะนำร้านใกล้คุณ และทำให้การประเมินค่าจัดส่งแม่นยำขึ้น ไม่ได้เปิดเผยตำแหน่งของคุณต่อร้านค้าโดยอัตโนมัติ</p><div class="customer-consent-actions"><button class="mpa-button mpa-button-secondary" type="button" data-consent-not-now>ยังไม่ตอนนี้</button><button class="mpa-button" type="button" data-consent-allow>อนุญาตและใช้ตำแหน่ง</button></div><a class="customer-consent-privacy" href="privacy.html">อ่านนโยบายความเป็นส่วนตัว</a></section>`;
    document.body.append(modal);
    modal.querySelector('[data-consent-not-now]').onclick = () => { close(modal); showBenefits(user); };
    modal.querySelector('[data-consent-allow]').onclick = () => {
      const button = modal.querySelector('[data-consent-allow]');
      if (!navigator.geolocation) { close(modal); showBenefits(user); return; }
      button.disabled = true; button.textContent = 'กำลังขอใช้ตำแหน่ง…';
      navigator.geolocation.getCurrentPosition(async position => {
        try { await saveLocation(user, position); markSeen(); close(modal); M.ui.setNotice('บันทึกตำแหน่งเพื่อช่วยการจัดส่งแล้ว'); }
        catch (_) { close(modal); showBenefits(user); }
      }, () => { close(modal); showBenefits(user); }, { enableHighAccuracy: true, timeout: 12_000, maximumAge: 120_000 });
    };
  };
  const boot = async () => {
    try {
      const user = await M.auth.currentUser(); if (!user) return;
      const rows = await M.request(`user_consents?select=consent_type,granted&user_id=eq.${encodeURIComponent(user.id)}&consent_type=in.(location_access,location_prompt_declined)&policy_version=eq.${policyVersion}&limit=2`, { private: true, cacheTtlMs: 10_000, cacheKey: `customer-location-consent:${user.id}` });
      if ((rows || []).some(row => row.granted === true && ['location_access', 'location_prompt_declined'].includes(row.consent_type))) { markSeen(); return; }
      showPrompt(user);
    } catch (_) { /* A consent prompt must never block the rest of the app. */ }
  };
  void boot();
})();
