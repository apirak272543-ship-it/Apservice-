(() => {
  'use strict';
  const M = window.APServiceMPA;
  if (!M || document.body.dataset.page !== 'order') return;
  const $ = selector => document.querySelector(selector);
  const orderId = new URLSearchParams(location.search).get('id') || '';
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const money = value => M.ui.baht(Number(value || 0));
  const paymentLabel = status => ({ pending: 'รอการชำระ', awaiting_slip: 'รอแนบสลิป', under_review: 'กำลังตรวจสอบ', verified: 'ยืนยันการชำระแล้ว', paid: 'ชำระแล้ว', rejected: 'สลิปไม่ผ่าน', refund_pending: 'รอคืนเงิน', refunded: 'คืนเงินแล้ว', partially_refunded: 'คืนเงินบางส่วน', cancelled: 'ยกเลิกการชำระ' }[String(status || '').toLowerCase()] || String(status || 'ไม่ระบุ'));
  const refundLabel = status => ({ requested: 'รอผู้ดูแลพิจารณา', approved: 'อนุมัติแล้ว รอโอนคืน', rejected: 'ไม่อนุมัติ', paid: 'คืนเงินแล้ว', cancelled: 'ยกเลิก' }[String(status || '').toLowerCase()] || String(status || 'ไม่ระบุ'));
  const eventLabel = action => ({ cancellation_requested: 'ส่งคำขอยกเลิก', cancellation_approved: 'อนุมัติคำขอยกเลิก', cancellation_rejected: 'ปฏิเสธคำขอยกเลิก', refund_approved: 'อนุมัติคืนเงิน', refund_rejected: 'ปฏิเสธคืนเงิน', refund_paid: 'บันทึกคืนเงินสำเร็จ' }[String(action || '')] || String(action || 'อัปเดตข้อมูลการเงิน'));
  let stopSync = null;
  const fetchState = async user => {
    const suffix = `order_id=eq.${encodeURIComponent(orderId)}&limit=1`;
    const [payments, refunds, events] = await Promise.all([
      M.request(`order_payments?select=id,method,expected_amount,captured_amount,status,reference,reviewed_at,updated_at&${suffix}`, { private: true, forceFresh: true, cacheKey: `customer-order-payment-state:${user.id}:${orderId}` }),
      M.request(`order_refunds?select=id,requested_amount,approved_amount,paid_amount,currency,status,reason,approved_at,paid_at,payment_reference,created_at&${suffix}`, { private: true, forceFresh: true, cacheKey: `customer-order-refund-state:${user.id}:${orderId}` }),
      M.request(`order_financial_events?select=id,action,reason,after_state,created_at&${suffix.replace('&limit=1', '&order=created_at.asc&limit=100')}`, { private: true, forceFresh: true, cacheKey: `customer-order-financial-events:${user.id}:${orderId}` }),
    ]);
    return { payment: payments?.[0] || null, refund: refunds?.[0] || null, events: events || [] };
  };
  const render = state => {
    const host = $('#orderDetail');
    if (!host || host.querySelector('[data-financial-state]')) return;
    const section = document.createElement('section');
    section.className = 'mpa-card'; section.dataset.financialState = 'true'; section.style.marginTop = '16px';
    const payment = state.payment || {}; const refund = state.refund;
    const events = state.events || [];
    section.innerHTML = `<h2 style="margin-top:0">สถานะการเงิน</h2><div class="admin-withdrawal-review-grid" style="margin:0"><div><dt>สถานะการชำระ</dt><dd><span class="mpa-badge">${esc(paymentLabel(payment.status))}</span></dd></div><div><dt>วิธีชำระ</dt><dd>${esc(payment.method || '-')}</dd></div><div><dt>ยอดที่ต้องชำระ</dt><dd>${money(payment.expected_amount)}</dd></div><div><dt>ยอดที่รับยืนยัน</dt><dd>${money(payment.captured_amount)}</dd></div>${refund ? `<div><dt>สถานะคืนเงิน</dt><dd><span class="mpa-badge">${esc(refundLabel(refund.status))}</span></dd></div><div><dt>ยอดที่ขอคืน</dt><dd>${money(refund.requested_amount)}</dd></div>${refund.approved_amount !== null && refund.approved_amount !== undefined ? `<div><dt>ยอดที่อนุมัติ</dt><dd>${money(refund.approved_amount)}</dd></div>` : ''}${refund.paid_amount !== null && refund.paid_amount !== undefined ? `<div><dt>ยอดที่คืนแล้ว</dt><dd>${money(refund.paid_amount)}</dd></div>` : ''}${refund.payment_reference ? `<div><dt>เลขอ้างอิงการคืนเงิน</dt><dd>${esc(refund.payment_reference)}</dd></div>` : ''}` : ''}</div>${events.length ? `<div style="margin-top:16px"><h3 style="margin:0 0 8px">ลำดับเหตุการณ์การเงิน</h3><ol style="padding-left:20px;margin:0">${events.map(event => `<li style="margin:9px 0"><b>${esc(eventLabel(event.action))}</b><br><span class="mpa-muted">${event.created_at ? new Date(event.created_at).toLocaleString('th-TH') : '-'}</span></li>`).join('')}</ol></div>` : '<p class="mpa-muted" style="margin:14px 0 0">ยังไม่มีเหตุการณ์การเงินเพิ่มเติม</p>'}`;
    host.append(section);
  };
  const mount = async () => {
    if (!orderId) return;
    const host = $('#orderDetail');
    if (!host || host.querySelector('.mpa-loading') || host.querySelector('[data-financial-state]')) return;
    const user = await M.auth.currentUser();
    if (!user) return;
    const state = await fetchState(user);
    render(state);
    if (!stopSync) {
      stopSync = M.network.startBackgroundSync({
        key: `customer-order-financial-state:${user.id}:${orderId}`,
        intervalMs: 30_000,
        task: async () => ({ changed: true, data: await fetchState(user) }),
        onData: data => {
          const current = document.querySelector('[data-financial-state]');
          if (current) current.remove();
          render(data);
        },
        onError: error => M.ui.setNotice(`อัปเดตสถานะการเงินไม่สำเร็จ: ${error.message}`, 'error'),
      });
      addEventListener('pagehide', () => { stopSync?.(); stopSync = null; }, { once: true });
    }
  };
  const observer = new MutationObserver(() => { void mount().catch(() => {}); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  void mount().catch(() => {});
})();
