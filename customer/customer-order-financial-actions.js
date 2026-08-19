(() => {
  'use strict';
  const M = window.APServiceMPA;
  if (!M || document.body.dataset.page !== 'order') return;
  const $ = selector => document.querySelector(selector);
  const allowedStates = new Set(['awaiting_payment', 'payment_review', 'payment_rejected', 'store_accepted', 'preparing']);
  const escapeHtml = value => String(value || '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const orderId = new URLSearchParams(location.search).get('id') || '';
  let mountedFor = '';

  const requestKey = id => {
    const storageKey = `apservice.customer.order.cancel.${id}`;
    try {
      const current = sessionStorage.getItem(storageKey);
      if (current && current.length >= 12) return current;
      const created = crypto.randomUUID ? crypto.randomUUID() : `cancel-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(storageKey, created);
      return created;
    } catch (_) {
      return crypto.randomUUID ? crypto.randomUUID() : `cancel-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
  };
  const clearRequestKey = id => { try { sessionStorage.removeItem(`apservice.customer.order.cancel.${id}`); } catch (_) { } };
  const fetchOrder = async user => {
    const rows = await M.request(`delivery_orders?select=id,status,workflow_state,payable,payment_method&customer_id=eq.${encodeURIComponent(user.id)}&id=eq.${encodeURIComponent(orderId)}&limit=1`, { private: true, cacheTtlMs: 0, forceFresh: true, cacheKey: `customer-order-cancellation:${user.id}:${orderId}` });
    return rows?.[0] || null;
  };
  const render = order => {
    const host = $('#orderDetail');
    if (!host || host.dataset.financialActionsMounted === order.id) return;
    host.dataset.financialActionsMounted = order.id;
    const isPending = order.workflow_state === 'cancel_requested';
    const canRequest = allowedStates.has(order.workflow_state);
    const section = document.createElement('section');
    section.className = 'mpa-card';
    section.style.marginTop = '16px';
    if (isPending) {
      section.innerHTML = `<h2 style="margin-top:0">คำขอยกเลิก</h2><p class="mpa-muted">ระบบได้รับคำขอยกเลิกแล้ว ผู้ดูแลจะตรวจสอบสถานะการชำระเงินและผลที่ตามมาก่อนแจ้งผลให้ทราบ</p>`;
    } else if (canRequest) {
      section.innerHTML = `<h2 style="margin-top:0">ขอยกเลิกออร์เดอร์</h2><p class="mpa-muted">เมื่อส่งคำขอ ระบบจะบันทึกเหตุผลและส่งให้ผู้ดูแลพิจารณา การคืนเงินจะไม่เกิดขึ้นอัตโนมัติ</p><form id="customerCancellationForm"><div class="mpa-field"><label for="customerCancellationReason">เหตุผลที่ขอยกเลิก</label><textarea id="customerCancellationReason" rows="3" minlength="3" maxlength="1000" required placeholder="เช่น สั่งผิดร้าน หรือไม่สะดวกรับสินค้า"></textarea></div><button class="mpa-button mpa-button-secondary" type="submit">ส่งคำขอยกเลิก</button></form>`;
    } else {
      section.innerHTML = `<h2 style="margin-top:0">การยกเลิกออร์เดอร์</h2><p class="mpa-muted">ออร์เดอร์อยู่ในสถานะ “${escapeHtml(order.status)}” หากต้องการความช่วยเหลือเพิ่มเติม โปรดติดต่อศูนย์ช่วยเหลือพร้อมหมายเลขออร์เดอร์</p>`;
    }
    host.append(section);
    const form = $('#customerCancellationForm');
    if (!form) return;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      const reason = $('#customerCancellationReason').value.trim();
      if (reason.length < 3) return M.ui.setNotice('กรุณาระบุเหตุผลการยกเลิกอย่างน้อย 3 ตัวอักษร', 'error');
      if (button) button.disabled = true;
      try {
        const result = await M.request('rpc/request_customer_order_cancellation', { method: 'POST', private: true, body: JSON.stringify({ p_order_id: order.id, p_reason: reason, p_evidence: {}, p_idempotency_key: requestKey(order.id) }) });
        const data = Array.isArray(result) ? result[0] : result;
        if (!data?.id) throw new Error('ระบบไม่สามารถบันทึกคำขอยกเลิกได้');
        clearRequestKey(order.id);
        M.ui.setNotice('ส่งคำขอยกเลิกแล้ว ผู้ดูแลจะตรวจสอบและแจ้งผลให้ทราบ');
        setTimeout(() => location.reload(), 450);
      } catch (error) {
        if (button) button.disabled = false;
        M.ui.setNotice(error.message || 'ส่งคำขอยกเลิกไม่สำเร็จ', 'error');
      }
    });
  };
  const mount = async () => {
    if (!orderId || mountedFor === orderId) return;
    const host = $('#orderDetail');
    if (!host || host.querySelector('.mpa-loading')) return;
    const user = await M.auth.currentUser();
    if (!user) return;
    const order = await fetchOrder(user);
    if (!order) return;
    render(order);
    mountedFor = orderId;
  };
  const observer = new MutationObserver(() => { void mount().catch(() => {}); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  void mount().catch(() => {});
})();
