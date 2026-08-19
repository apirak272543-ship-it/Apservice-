(() => {
  'use strict';

  const canonicalSteps = Object.freeze(['pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered']);
  const statusMeta = Object.freeze({
    pending: { label: 'รอร้านยืนยัน', hint: 'ส่งคำสั่งซื้อถึงร้านแล้ว กำลังรอการยืนยัน' },
    confirmed: { label: 'ร้านยืนยันแล้ว', hint: 'ร้านรับคำสั่งซื้อแล้ว' },
    preparing: { label: 'กำลังเตรียม', hint: 'ร้านกำลังเตรียมรายการของคุณ' },
    ready: { label: 'พร้อมรับส่ง', hint: 'กำลังจัดหาไรเดอร์สำหรับงานนี้' },
    delivering: { label: 'กำลังจัดส่ง', hint: 'ไรเดอร์กำลังนำรายการไปยังจุดส่ง' },
    delivered: { label: 'จัดส่งสำเร็จ', hint: 'ออเดอร์นี้เสร็จสิ้นแล้ว' },
    cancelled: { label: 'ยกเลิก', hint: 'ออเดอร์นี้ถูกยกเลิก' },
  });
  const knownStatus = value => String(value || '').trim().toLowerCase();
  const status = value => statusMeta[knownStatus(value)] || { label: String(value || 'รอดำเนินการ'), hint: 'กำลังรอการอัปเดตสถานะ' };
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);

  function makeJourney(current) {
    const code = knownStatus(current);
    if (code === 'cancelled') return `<div class="customer-tracker customer-tracker--cancelled"><strong>ออเดอร์ถูกยกเลิก</strong><span>${escapeHtml(status(code).hint)}</span></div>`;
    const activeIndex = canonicalSteps.indexOf(code);
    return `<ol class="customer-tracker" aria-label="ความคืบหน้าออเดอร์">${canonicalSteps.map((step, index) => `<li class="${index < activeIndex ? 'done' : index === activeIndex ? 'current' : ''}"><span aria-hidden="true">${index < activeIndex ? '✓' : index === activeIndex ? '●' : '○'}</span><div><strong>${escapeHtml(status(step).label)}</strong>${index === activeIndex ? `<small>${escapeHtml(status(step).hint)}</small>` : ''}</div></li>`).join('')}</ol>`;
  }

  function decorateOrderList() {
    const root = document.querySelector('#orders');
    const table = root?.querySelector('table');
    if (!root || !table) return;
    [...table.querySelectorAll('tbody tr')].forEach(row => {
      const badge = row.cells?.[2]?.querySelector('.mpa-badge');
      if (!badge || badge.dataset.customerStatusDecorated) return;
      const code = knownStatus(badge.textContent);
      badge.dataset.customerStatusDecorated = 'true';
      badge.dataset.status = code;
      badge.textContent = status(code).label;
      badge.title = status(code).hint;
    });
    if (!root.querySelector('#customerOrdersGuide')) {
      const summary = document.createElement('aside');
      summary.id = 'customerOrdersGuide';
      summary.className = 'customer-orders-guide';
      summary.innerHTML = '<strong>ติดตามสถานะได้แบบเรียลไทม์</strong><span>กด “ติดตาม” เพื่อดูความคืบหน้า รายการสินค้า และติดต่อเจ้าหน้าที่ตามออเดอร์</span>';
      table.parentElement.before(summary);
    }
  }

  function decorateOrderDetail() {
    const root = document.querySelector('#orderDetail');
    const badge = root?.querySelector('.customer-section-head .mpa-badge');
    if (!root || !badge) return;
    const code = knownStatus(badge.dataset.rawStatus || badge.textContent);
    badge.dataset.rawStatus = code;
    badge.textContent = status(code).label;
    badge.title = status(code).hint;
    if (root.querySelector('#customerTrackingJourney')) return;
    const orderId = root.querySelector('.customer-section-head p')?.textContent.replace(/^.*?([0-9a-f-]{8,}).*$/i, '$1') || '';
    const section = document.createElement('section');
    section.id = 'customerTrackingJourney';
    section.className = 'mpa-card customer-tracking-journey';
    section.innerHTML = `<div class="customer-section-head"><div><h2>ความคืบหน้าการจัดส่ง</h2><p>${escapeHtml(status(code).hint)}</p></div><a class="mpa-button mpa-button-secondary" href="support.html${orderId ? `?order=${encodeURIComponent(orderId)}` : ''}">ขอความช่วยเหลือ</a></div>${makeJourney(code)}`;
    const eventCard = [...root.querySelectorAll('.mpa-card')].find(card => card.querySelector('h2')?.textContent.includes('ลำดับสถานะ'));
    if (eventCard) eventCard.before(section); else root.append(section);
  }

  function decorateCheckout() {
    const form = document.querySelector('#checkoutForm');
    const slipPanel = document.querySelector('#slipPanel');
    if (!form || !slipPanel || document.querySelector('#customerPaymentGuide')) return;
    const guide = document.createElement('aside');
    guide.id = 'customerPaymentGuide';
    guide.className = 'customer-payment-guide';
    guide.innerHTML = '<strong>ชำระเงินอย่างปลอดภัย</strong><span>หากเลือกโอนผ่าน QR กรุณาถ่ายหรือเลือกสลิปจากคลังภาพ ระบบจะแปลงเป็น JPEG และบีบอัดอัตโนมัติก่อนส่งตรวจสอบ</span>';
    slipPanel.prepend(guide);
  }

  function decorateSupport() {
    const field = document.querySelector('#supportMessage');
    const conversation = document.querySelector('#support');
    const orderId = new URLSearchParams(location.search).get('order');
    if (!conversation || !orderId || conversation.querySelector('#customerSupportOrderContext')) return;
    const context = document.createElement('aside');
    context.id = 'customerSupportOrderContext';
    context.className = 'customer-support-context';
    context.innerHTML = `<strong>กำลังติดต่อเกี่ยวกับออเดอร์</strong><span>${escapeHtml(orderId)}</span><a href="order.html?id=${encodeURIComponent(orderId)}">กลับไปดูสถานะออเดอร์</a>`;
    conversation.prepend(context);
    if (field && !field.value) field.value = `ต้องการความช่วยเหลือเกี่ยวกับออเดอร์ ${orderId}: `;
  }

  function decorate() { decorateOrderList(); decorateOrderDetail(); decorateCheckout(); decorateSupport(); }
  new MutationObserver(decorate).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', decorate, { once: true }); else decorate();
})();
