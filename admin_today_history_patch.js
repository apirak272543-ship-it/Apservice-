(() => {
  'use strict';
  const q = selector => document.querySelector(selector);
  const qa = selector => [...document.querySelectorAll(selector)];
  const todayKey = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  };
  const dateKey = value => {
    if (!value) return '';
    if (/^\d{4}-\d{2}-\d{2}/.test(String(value))) return String(value).slice(0, 10);
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    const offset = parsed.getTimezoneOffset() * 60000;
    return new Date(parsed.getTime() - offset).toISOString().slice(0, 10);
  };
  const orderDate = order => dateKey(order?.orderedAt || order?.created_at || order?.time || order?.updated_at);
  const completed = order => ['สำเร็จแล้ว', 'เสร็จสิ้นแล้ว', 'completed', 'delivered'].includes(String(order?.status || '')) || Boolean(order?.completedAt || order?.completed_at);
  const actionable = order => !completed(order);
  const labels = { today: 'วันนี้', backlog: 'งานค้างจากวันก่อน', history: 'ประวัติย้อนหลัง', all: 'ทั้งหมด' };
  const scopes = { orders: 'today', ledger: 'today', settlements: 'current', withdrawals: 'current', creator: 'current', slips: 'current' };

  const style = document.createElement('style');
  style.textContent = `
    .admin-workspace-tabs{display:flex;align-items:center;gap:7px;overflow:auto;margin:0 0 12px;padding:8px;border:1px solid #d2e7e1;border-radius:13px;background:#f5fbf9;scrollbar-width:none}.admin-workspace-tabs button{flex:0 0 auto;min-height:34px;padding:6px 10px;border:1px solid #cbe2dc;border-radius:999px;background:#fff;color:#2e675e;font-size:10px;font-weight:900}.admin-workspace-tabs button.active{background:#087d68;border-color:#087d68;color:#fff}.admin-workspace-tabs small{margin-left:auto;color:#58726d;font-size:10px;font-weight:800;white-space:nowrap}.admin-history-empty{padding:18px!important;text-align:center!important;color:var(--muted)!important}.admin-today-summary{margin:0 0 12px;padding:10px 11px;border-radius:12px;background:#edf9f6;color:#19675a;font-size:11px;font-weight:850}.admin-today-summary b{font-size:13px}@media(max-width:520px){.admin-workspace-tabs{gap:5px;padding:6px}.admin-workspace-tabs button{font-size:9px;padding:6px 8px}.admin-workspace-tabs small{display:none}}
  `;
  document.head.appendChild(style);

  function makeTabs(id, items, onChange) {
    const existing = q(`#${id}`);
    const host = existing || document.createElement('div');
    if (!existing) { host.id = id; host.className = 'admin-workspace-tabs'; }
    host.innerHTML = items.map(([key, label]) => `<button type="button" data-scope="${key}" class="${items.scope === key ? 'active' : ''}">${label}</button>`).join('') + '<small></small>';
    host.querySelectorAll('button').forEach(button => button.addEventListener('click', () => onChange(button.dataset.scope)));
    return host;
  }
  function placeTabs(table, id, items, onChange) {
    if (!table) return null;
    const wrap = table.closest('.table-wrap') || table.parentElement;
    if (!wrap) return null;
    let tabs = q(`#${id}`);
    if (!tabs) { tabs = makeTabs(id, items, onChange); wrap.parentElement?.insertBefore(tabs, wrap); }
    return tabs;
  }
  function setTab(tabs, scope, count, suffix = 'รายการ') {
    if (!tabs) return;
    qa(`#${tabs.id} button`).forEach(button => button.classList.toggle('active', button.dataset.scope === scope));
    const note = tabs.querySelector('small'); if (note) note.textContent = `${Number(count || 0).toLocaleString('th-TH')} ${suffix}`;
  }
  function setVisibleRows(table, visible) {
    if (!table) return;
    const rows = [...table.rows]; let shown = 0;
    rows.forEach((row, index) => { const show = Boolean(visible[index]); row.hidden = !show; if (show) shown += 1; });
    let empty = table.querySelector('.admin-history-empty');
    const hasSourceEmpty = rows.some(row => /ยังไม่มี/.test(String(row.textContent || '')));
    if (!shown && rows.length && !hasSourceEmpty) { if (!empty) { empty = document.createElement('tr'); empty.className = 'admin-history-empty'; empty.innerHTML = `<td colspan="${Math.max(1, table.closest('table')?.querySelectorAll('thead th').length || 1)}">ไม่มีรายการในมุมมองนี้</td>`; table.appendChild(empty); } } else empty?.remove();
    return shown;
  }
  function applyOrders(scope = scopes.orders) {
    const table = q('#operationsOrderTable'); if (!table) return;
    const orders = Array.isArray(window.AppState?.orders) ? window.AppState.orders : [];
    const today = todayKey();
    const visible = orders.map(order => scope === 'today' ? actionable(order) && orderDate(order) === today : scope === 'backlog' ? actionable(order) && orderDate(order) && orderDate(order) < today : scope === 'history' ? completed(order) : true);
    const count = setVisibleRows(table, visible) || 0;
    const tabs = placeTabs(table, 'adminOrderWorkspaceTabs', [['today','งานวันนี้'],['backlog','งานค้าง'],['history','ประวัติ'],['all','ทั้งหมด']], next => { scopes.orders = next; applyOrders(next); });
    setTab(tabs, scope, count);
    const note = q('#adminOrderFilterNote'); if (note && ['today','backlog','history'].includes(scope)) note.textContent = `${labels[scope]} · ${count.toLocaleString('th-TH')} รายการ`;
  }
  function applyLedger(scope = scopes.ledger) {
    const table = q('#cashLedgerTable'); if (!table) return;
    const entries = Array.isArray(window.AppState?.cashLedger) ? window.AppState.cashLedger.slice(0, 50) : [];
    const today = todayKey();
    const visible = entries.map(entry => scope === 'today' ? String(entry.date || '') === today : scope === 'history' ? String(entry.date || '') !== today : true);
    const count = setVisibleRows(table, visible) || 0;
    const tabs = placeTabs(table, 'adminLedgerWorkspaceTabs', [['today','รายการวันนี้'],['history','ประวัติ'],['all','ทั้งหมด']], next => { scopes.ledger = next; applyLedger(next); });
    setTab(tabs, scope, count);
  }
  function classifyRowByText(row, currentWords) {
    const text = String(row?.textContent || ''); return currentWords.some(word => text.includes(word));
  }
  function applyStatusQueue(tableSelector, tabId, kind, currentWords) {
    const table = q(tableSelector); if (!table) return;
    const rows = [...table.rows];
    const current = scopes[kind] !== 'history';
    const visible = rows.map(row => current ? classifyRowByText(row, currentWords) : !classifyRowByText(row, currentWords));
    const count = setVisibleRows(table, visible) || 0;
    const tabs = placeTabs(table, tabId, [['current','งานต้องจัดการ'],['history','ประวัติ']], next => { scopes[kind] = next; applyStatusQueue(tableSelector, tabId, kind, currentWords); });
    setTab(tabs, current ? 'current' : 'history', count);
  }
  function applyCreatorQueues() {
    applyStatusQueue('#creatorCommissionRows', 'adminCreatorCommissionTabs', 'creator', ['รอออร์เดอร์สำเร็จ','รออนุมัติจ่าย','อนุมัติให้จ่าย']);
    const rights = q('#creatorRightsRows');
    if (rights) {
      const current = scopes.creator !== 'history'; const rows = [...rights.rows];
      const visible = rows.map(row => current ? /รออนุมัติสิทธิ์/.test(row.textContent || '') : !/รออนุมัติสิทธิ์/.test(row.textContent || ''));
      const count = setVisibleRows(rights, visible) || 0;
      const tabs = placeTabs(rights, 'adminCreatorRightsTabs', [['current','สิทธิ์รอตรวจ'],['history','ทะเบียนย้อนหลัง']], next => { scopes.creator = next; applyCreatorQueues(); });
      setTab(tabs, current ? 'current' : 'history', count);
    }
  }
  function applyFinanceQueues() {
    applyStatusQueue('#settlementList tbody', 'adminSettlementWorkspaceTabs', 'settlements', ['รอจ่าย']);
    applyStatusQueue('#withdrawalRequestList tbody', 'adminWithdrawalWorkspaceTabs', 'withdrawals', ['รอตรวจสอบ','อนุมัติแล้ว']);
  }
  async function renderSlipHistory() {
    const host = q('#paymentSlipQueueRows'); if (!host || !window.SupabaseSync?.request || !window.Storage?.isAdmin?.()) return;
    host.innerHTML = '<tr><td colspan="5">กำลังโหลดประวัติการตรวจสลิป…</td></tr>';
    try {
      const rows = await window.SupabaseSync.request('payment_slip_reviews?select=id,order_id,expected_amount,status,reviewed_at,uploaded_at,reviewer_note,delivery_orders(customer_name,customer_email)&status=in.(approved,needs_reupload)&order=reviewed_at.desc&limit=150');
      host.innerHTML = Array.isArray(rows) && rows.length ? rows.map(row => { const order = Array.isArray(row.delivery_orders) ? row.delivery_orders[0] : row.delivery_orders || {}; const status = row.status === 'approved' ? 'อนุมัติแล้ว' : 'ขอแนบใหม่'; return `<tr><td><b>${String(row.order_id || '-')}</b><br><small>${String(order.customer_name || order.customer_email || '-')}</small></td><td><b>฿${Number(row.expected_amount || 0).toLocaleString('th-TH')}</b><br><small>${new Date(row.reviewed_at || row.uploaded_at).toLocaleString('th-TH')}</small></td><td><span class="status">${status}</span><br><small>${String(row.reviewer_note || '-')}</small></td><td>เก็บใน Private Storage</td><td>ประวัติ</td></tr>`; }).join('') : '<tr><td colspan="5">ยังไม่มีประวัติการตรวจสลิป</td></tr>';
    } catch (error) { host.innerHTML = `<tr><td colspan="5">โหลดประวัติสลิปไม่สำเร็จ: ${String(error.message || '')}</td></tr>`; }
  }
  function installSlipTabs() {
    const table = q('#paymentSlipQueueRows'); if (!table) return;
    const tabs = placeTabs(table, 'adminSlipWorkspaceTabs', [['current','สลิปรอตรวจ'],['history','ประวัติการตรวจ']], async next => { scopes.slips = next; if (next === 'history') await renderSlipHistory(); else await window.refreshPaymentSlipQueue?.(); installSlipTabs(); });
    const count = [...table.rows].filter(row => !row.hidden).length; setTab(tabs, scopes.slips === 'history' ? 'history' : 'current', count);
  }
  function applyOverview() {
    const orders = Array.isArray(window.AppState?.orders) ? window.AppState.orders : [];
    const today = todayKey();
    const work = orders.filter(order => orderDate(order) === today && actionable(order));
    const stat = q('#statOrders');
    if (stat) {
      stat.textContent = String(work.length);
      const card = stat.closest('.stat');
      const label = card?.querySelector('span'); if (label) label.textContent = 'งานที่ต้องจัดการวันนี้';
      let detail = card?.querySelector('.admin-overview-total');
      if (!detail && card) { detail = document.createElement('small'); detail.className = 'admin-overview-total'; card.appendChild(detail); }
      if (detail) detail.textContent = `ยอดออร์เดอร์สะสม ${orders.length.toLocaleString('th-TH')} รายการ`;
    }
    const table = q('#adminOrderTable');
    if (table) {
      const visible = orders.map(order => orderDate(order) === today && actionable(order));
      const count = setVisibleRows(table, visible) || 0;
      const overview = q('#admin-overview');
      let summary = overview?.querySelector('.admin-today-summary');
      if (!summary && overview) { summary = document.createElement('div'); summary.className = 'admin-today-summary'; const panel = overview.querySelector('.panel'); if (panel) overview.insertBefore(summary, panel); }
      if (summary) summary.innerHTML = `<b>งานวันนี้ ${count.toLocaleString('th-TH')} รายการ</b> · แสดงเฉพาะออร์เดอร์ที่ยังต้องติดตาม ส่วนออร์เดอร์เก่าเปิดดูได้จากเมนูออร์เดอร์และประวัติ`;
    }
  }
  function applyAll() { applyOverview(); applyOrders(); applyLedger(); applyFinanceQueues(); applyCreatorQueues(); installSlipTabs(); }
  function observe(selector, callback) { const node = q(selector); if (!node || node.dataset.todayHistoryObserved) return; node.dataset.todayHistoryObserved = 'true'; new MutationObserver(() => queueMicrotask(callback)).observe(node, { childList: true, subtree: true }); }
  function start() {
    applyAll();
    observe('#operationsOrderTable', () => applyOrders());
    observe('#cashLedgerTable', () => applyLedger());
    observe('#settlementList', applyFinanceQueues);
    observe('#withdrawalRequestList', applyFinanceQueues);
    observe('#creatorCommissionRows', applyCreatorQueues);
    observe('#creatorRightsRows', applyCreatorQueues);
    observe('#paymentSlipQueueRows', installSlipTabs);
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('button[data-admin]'); if (!button) return;
    const name = button.dataset.admin;
    if (name === 'orders') scopes.orders = 'today';
    if (['new-orders','active-orders','completed-orders'].includes(name)) scopes.orders = 'all';
    setTimeout(start, 0);
  }, true);
  const originalSwitch = window.switchAdmin;
  window.switchAdmin = function(name) { const result = typeof originalSwitch === 'function' ? originalSwitch(name) : undefined; if (name === 'orders') scopes.orders = 'today'; setTimeout(start, 0); return result; };
  window.AdminTodayHistory = { start, applyOrders, applyLedger, applyFinanceQueues, applyCreatorQueues, labels };
  document.addEventListener('DOMContentLoaded', () => setTimeout(start, 0), { once: true });
  if (document.readyState !== 'loading') setTimeout(start, 0);
})();
