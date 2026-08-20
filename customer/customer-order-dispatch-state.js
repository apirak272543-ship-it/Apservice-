(() => {
  'use strict';
  const M = window.APServiceMPA;
  if (!M || document.body.dataset.page !== 'order') return;
  const $ = selector => document.querySelector(selector);
  const orderId = new URLSearchParams(location.search).get('id') || '';
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const labels = { unassigned: 'กำลังรอมอบหมาย Rider', assigned: 'มอบหมาย Rider แล้ว', en_route: 'Rider กำลังไปจุดรับ', arrived_pickup: 'Rider ถึงจุดรับแล้ว', picked_up: 'รับสินค้าแล้ว', delivering: 'กำลังนำส่ง', delivered: 'ส่งสำเร็จ', exception: 'มีเหตุขัดข้อง' };
  const dispatchLabel = value => labels[String(value || '')] || String(value || 'ยังไม่ระบุ');
  const formatTime = value => { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'ยังไม่ระบุเวลา' : new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium', timeStyle: 'short' }).format(date); };
  const etaText = value => { const date = new Date(value); if (Number.isNaN(date.getTime())) return 'ยังไม่ระบุ'; const minutes = Math.round((date.getTime() - Date.now()) / 60000); if (minutes < 0) return `เลยกำหนดประมาณ ${Math.abs(minutes)} นาที`; if (minutes < 60) return `อีกประมาณ ${minutes} นาที`; return `ประมาณ ${Math.floor(minutes / 60)} ชม. ${minutes % 60} นาที`; };
  let stopSync = null;
  const fetchState = async user => {
    const orderSuffix = `id=eq.${encodeURIComponent(orderId)}&limit=1`;
    const [orders, events] = await Promise.all([
      M.request(`delivery_orders?select=id,rider_name,rider_id,dispatch_status,assigned_at,estimated_arrival_at,eta_source,dispatch_note,dispatch_updated_at,status&${orderSuffix}`, { private: true, forceFresh: true, cacheKey: `customer-order-dispatch:${user.id}:${orderId}` }),
      M.request(`delivery_dispatch_events?select=id,event_type,dispatch_status,estimated_arrival_at,note,created_at&order_id=eq.${encodeURIComponent(orderId)}&order=created_at.asc&limit=80`, { private: true, forceFresh: true, cacheKey: `customer-order-dispatch-events:${user.id}:${orderId}` }),
    ]);
    return { order: orders?.[0] || null, events: events || [] };
  };
  const render = state => {
    const host = $('#orderDetail');
    if (!host || !state.order || host.querySelector('[data-dispatch-state]')) return;
    const order = state.order;
    const section = document.createElement('section');
    section.className = 'mpa-card'; section.dataset.dispatchState = 'true'; section.style.marginTop = '16px';
    const eta = order.estimated_arrival_at ? `<div><dt>เวลาถึงโดยประมาณ</dt><dd><b>${esc(etaText(order.estimated_arrival_at))}</b><br><span class="mpa-muted">${esc(formatTime(order.estimated_arrival_at))}</span></dd></div>` : '<div><dt>เวลาถึงโดยประมาณ</dt><dd>ยังไม่กำหนด</dd></div>';
    const events = state.events || [];
    section.innerHTML = `<h2 style="margin-top:0">ติดตามการจัดส่ง</h2><div class="admin-withdrawal-review-grid" style="margin:0"><div><dt>สถานะการจัดส่ง</dt><dd><span class="mpa-badge">${esc(dispatchLabel(order.dispatch_status || (order.rider_id ? 'assigned' : 'unassigned')))}</span></dd></div><div><dt>Rider</dt><dd>${esc(order.rider_name || 'กำลังค้นหา Rider')}</dd></div>${eta}<div><dt>อัปเดตล่าสุด</dt><dd>${esc(formatTime(order.dispatch_updated_at || order.assigned_at))}</dd></div></div>${order.dispatch_note ? `<p class="mpa-muted" style="margin:14px 0 0"><b>หมายเหตุจากศูนย์ควบคุม:</b> ${esc(order.dispatch_note)}</p>` : ''}${events.length ? `<div style="margin-top:16px"><h3 style="margin:0 0 8px">ลำดับการจัดส่ง</h3><ol style="padding-left:20px;margin:0">${events.map(event => `<li style="margin:9px 0"><b>${esc(dispatchLabel(event.dispatch_status))}</b>${event.note ? `<br><span>${esc(event.note)}</span>` : ''}<br><span class="mpa-muted">${esc(formatTime(event.created_at))}</span></li>`).join('')}</ol></div>` : '<p class="mpa-muted" style="margin:14px 0 0">ระบบจะแสดงลำดับเหตุการณ์เมื่อมีการมอบหมายหรืออัปเดตการจัดส่ง</p>'}`;
    host.append(section);
  };
  const mount = async () => {
    if (!orderId) return;
    const host = $('#orderDetail');
    if (!host || host.querySelector('.mpa-loading')) return;
    const user = await M.auth.currentUser();
    if (!user) return;
    const state = await fetchState(user);
    render(state);
    if (!stopSync) {
      stopSync = M.network.startBackgroundSync({
        key: `customer-order-dispatch:${user.id}:${orderId}`,
        intervalMs: 20_000,
        task: async () => ({ changed: true, data: await fetchState(user) }),
        onData: data => { document.querySelector('[data-dispatch-state]')?.remove(); render(data); },
        onError: error => M.ui.setNotice(`อัปเดตการจัดส่งไม่สำเร็จ: ${error.message}`, 'error'),
      });
      addEventListener('pagehide', () => { stopSync?.(); stopSync = null; }, { once: true });
    }
  };
  const observer = new MutationObserver(() => { void mount().catch(() => {}); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  void mount().catch(() => {});
})();
