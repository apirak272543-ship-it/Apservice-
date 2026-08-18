(() => {
  'use strict';

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const nowIso = () => new Date().toISOString();
  const labelTime = () => new Date().toLocaleString('th-TH');
  const moneyText = value => typeof window.money === 'function' ? window.money(Number(value || 0)) : `฿${Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const notify = (message, type = 'info') => window.UI?.toast ? window.UI.toast(message, type) : window.alert(message);
  const adminReady = () => Boolean(window.Storage?.isAdmin?.() && window.SupabaseSync?.session?.()?.user?.id);
  const currentActor = () => window.SupabaseSync?.session?.()?.user || {};
  const adminStatuses = ['รอร้านค้ารับออร์เดอร์', 'ร้านค้ารับออร์เดอร์', 'กำลังดำเนินการ', 'ไรเดอร์กำลังไปรับ', 'รับสินค้าแล้ว', 'กำลังจัดส่ง', 'รอชำระเงิน', 'รอตรวจสอบเครดิต', 'รอตรวจสอบการชำระเงิน', 'ต้องแนบสลิปใหม่', 'รอเลือก Rider', 'รอ Rider ยืนยันรับงาน', 'pending', 'accepted', 'processing', 'assigned', 'picked_up', 'delivering', 'awaiting_payment'];
  const historyPattern = /(เสร็จ|สำเร็จ|ยกเลิก|ระงับ|ปิดงาน|cancel|complete|suspend|reject|archive)/i;
  const isHistoryOrder = order => historyPattern.test(String(order?.status || '')) || Boolean(order?.completedAt);
  const statusLabel = order => String(order?.status || 'ไม่ระบุสถานะ');
  const sortNewest = (a, b) => new Date(b?.orderedAt || b?.time || 0).getTime() - new Date(a?.orderedAt || a?.time || 0).getTime();

  const state = {
    view: 'active',
    historySearch: '',
    historyStatus: 'all',
    editor: null,
    suppressUntil: 0,
    renderScheduled: false,
    rendering: false,
    initialized: false,
  };

  const getOrders = () => Array.isArray(window.AppState?.orders) ? window.AppState.orders : [];
  const getRiders = () => Array.isArray(window.AppState?.riders) ? window.AppState.riders : [];

  async function requireAdminSession() {
    if (!window.Storage?.isAdmin?.()) {
      notify('เฉพาะผู้ดูแลระบบที่เข้าสู่ระบบแล้วเท่านั้น', 'error');
      return false;
    }
    try {
      if (window.SupabaseAdminSync?.ensureAdminSession) await window.SupabaseAdminSync.ensureAdminSession();
      else if (!window.SupabaseSync?.session?.()?.user?.id) throw new Error('เซสชัน Supabase หมดอายุ');
      return true;
    } catch (error) {
      notify(`ไม่สามารถยืนยันสิทธิ์ Admin: ${error.message}`, 'error');
      return false;
    }
  }

  function statusOptions(current) {
    const supplied = typeof window.statusOptions === 'function' ? window.statusOptions(current) : '';
    if (supplied) return supplied;
    const values = [...new Set([...adminStatuses, current].filter(Boolean))];
    return values.map(value => `<option value="${esc(value)}" ${value === current ? 'selected' : ''}>${esc(value)}</option>`).join('');
  }

  function addStyles() {
    if (q('#admin-orders-enhancement-style')) return;
    const style = document.createElement('style');
    style.id = 'admin-orders-enhancement-style';
    style.textContent = `
      .admin-order-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 12px;padding:10px;border:1px solid #d8ebe7;border-radius:14px;background:#f8fdfb}
      .admin-order-view-button{border:1px solid #cfe6e0;border-radius:999px;background:#fff;color:#176256;padding:8px 12px;font-size:11px;font-weight:850;cursor:pointer;transition:transform .16s ease,background .16s ease,color .16s ease}
      .admin-order-view-button:active{transform:scale(.97)}.admin-order-view-button.active{background:#087d68;border-color:#087d68;color:#fff}
      .admin-order-count{display:inline-flex;min-width:20px;justify-content:center;margin-left:4px;padding:2px 6px;border-radius:999px;background:#eaf5f2;color:#176256;font-size:10px}.admin-order-view-button.active .admin-order-count{background:rgba(255,255,255,.2);color:#fff}
      .admin-order-toolbar .table-input{min-height:34px;padding:7px 9px}.admin-order-toolbar .admin-order-refresh{margin-left:auto}
      .admin-order-history-panel{margin-top:16px}.admin-order-history-panel[hidden]{display:none}.admin-order-history-controls{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}.admin-order-history-controls input,.admin-order-history-controls select{min-height:36px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:#fff;color:var(--ink);font-size:11px}.admin-order-history-controls input{flex:1 1 210px}.admin-order-history-controls select{flex:0 1 220px}
      .admin-order-row-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.admin-order-row-actions .btn{min-height:30px;padding:6px 8px;font-size:10px}.admin-order-item-summary{margin-top:7px;padding-top:7px;border-top:1px dashed var(--line)}.admin-order-item-summary small{display:block;margin-top:3px;color:var(--muted)}
      .admin-order-edit-overlay{position:fixed;inset:0;z-index:10050;display:none;align-items:center;justify-content:center;padding:14px;background:rgba(4,39,35,.52)}.admin-order-edit-overlay.open{display:flex}.admin-order-edit-dialog{width:min(900px,100%);max-height:min(92dvh,760px);overflow:auto;border-radius:18px;background:#fff;box-shadow:0 22px 70px rgba(4,55,50,.3);padding:18px}.admin-order-edit-dialog h3{margin:0;font-size:18px}.admin-order-edit-dialog .sub{margin:5px 0 14px}.admin-order-editor-list{display:grid;gap:9px}.admin-order-editor-row{display:grid;grid-template-columns:38px minmax(160px,1.5fr) 90px 110px minmax(100px,1fr) 34px;gap:7px;align-items:end;padding:10px;border:1px solid #d9ebe7;border-radius:12px;background:#fbfefd}.admin-order-editor-row .field{margin:0}.admin-order-editor-row label{display:block;margin-bottom:4px;color:var(--muted);font-size:9px;font-weight:850}.admin-order-editor-row input{width:100%;min-height:34px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;font-size:11px}.admin-order-editor-row .editor-emoji{font-size:18px;text-align:center}.admin-order-editor-remove{min-width:32px;height:34px;border:1px solid #f1c9c9;border-radius:8px;background:#fff4f4;color:#a44343;font-weight:900;cursor:pointer}.admin-order-editor-footer{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px}.admin-order-editor-total{margin-left:auto;font-weight:900;color:#087d68}.admin-order-editor-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:15px;padding-top:12px;border-top:1px solid var(--line)}
      @media(max-width:700px){.admin-order-toolbar .admin-order-refresh{margin-left:0}.admin-order-editor-row{grid-template-columns:34px 1fr 78px 94px 34px}.admin-order-editor-row .editor-emoji-field{grid-column:1 / 2}.admin-order-editor-row .editor-name-field{grid-column:2 / 6}.admin-order-editor-row .editor-qty-field{grid-column:1 / 3}.admin-order-editor-row .editor-price-field{grid-column:3 / 5}.admin-order-editor-row .editor-remove-field{grid-column:5 / 6;align-self:end}.admin-order-editor-row .editor-options-field{grid-column:1 / 6}}
    `;
    document.head.appendChild(style);
  }

  function ensureUi() {
    const section = q('#admin-orders');
    const mainPanel = section?.querySelector(':scope > .panel');
    if (!section || !mainPanel) return false;
    if (!q('#adminOrderToolbar')) {
      const toolbar = document.createElement('div');
      toolbar.id = 'adminOrderToolbar';
      toolbar.className = 'admin-order-toolbar';
      toolbar.innerHTML = `<button type="button" class="admin-order-view-button active" data-order-view="active">งานที่กำลังดำเนินการ <span class="admin-order-count" id="activeOrderCount">0</span></button><button type="button" class="admin-order-view-button" data-order-view="history">ประวัติออเดอร์ <span class="admin-order-count" id="historyOrderCount">0</span></button><button type="button" class="btn btn-plain btn-small admin-order-refresh" id="adminOrderRefresh">รีเฟรชข้อมูล</button>`;
      section.insertBefore(toolbar, mainPanel);
      toolbar.addEventListener('click', event => {
        const viewButton = event.target.closest('[data-order-view]');
        if (viewButton) setView(viewButton.dataset.orderView);
        if (event.target.closest('#adminOrderRefresh')) refreshFromCloud();
      });
    }
    if (!q('#adminOrderHistoryPanel')) {
      const history = document.createElement('div');
      history.id = 'adminOrderHistoryPanel';
      history.className = 'panel admin-order-history-panel';
      history.hidden = true;
      history.innerHTML = `<div class="section-head" style="margin:0 0 12px"><div><h2 style="font-size:17px">ประวัติออเดอร์</h2><p>ออเดอร์ที่เสร็จสิ้น ยกเลิก หรือถูกระงับจะอยู่ที่นี่ ไม่ปะปนกับคิวงานใหม่</p></div></div><div class="admin-order-history-controls"><input id="adminOrderHistorySearch" type="search" placeholder="ค้นหารหัส ลูกค้า ร้านค้า หรือ Rider" /><select id="adminOrderHistoryStatus"><option value="all">ทุกสถานะในประวัติ</option></select></div><div class="table-wrap"><table><thead><tr><th>ออเดอร์</th><th>ลูกค้า/ร้าน</th><th>ยอดรวม</th><th>สถานะ</th><th>Rider</th><th>เวลา</th><th>รายการ</th></tr></thead><tbody id="adminOrderHistoryTable"></tbody></table></div>`;
      section.appendChild(history);
      q('#adminOrderHistorySearch').addEventListener('input', event => { state.historySearch = event.target.value; renderHistory(); });
      q('#adminOrderHistoryStatus').addEventListener('change', event => { state.historyStatus = event.target.value; renderHistory(); });
    }
    if (!q('#adminOrderEditorModal')) {
      const modal = document.createElement('div');
      modal.id = 'adminOrderEditorModal';
      modal.className = 'admin-order-edit-overlay';
      modal.setAttribute('aria-hidden', 'true');
      modal.innerHTML = `<div class="admin-order-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="adminOrderEditorTitle"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px"><div><h3 id="adminOrderEditorTitle">แก้ไขรายการในออเดอร์</h3><p class="sub" id="adminOrderEditorSubtitle"></p></div><button type="button" class="btn btn-plain btn-small" id="adminOrderEditorClose">ปิด</button></div><div class="notice" style="margin-bottom:12px">แก้ชื่อรายการ จำนวน ราคา และ emoji ได้ โดยตัวเลือกเพิ่มเติมของรายการเดิมจะถูกเก็บไว้ หากเปลี่ยนยอดรวม ระบบจะคำนวณยอดชำระใหม่ก่อนบันทึก</div><div class="admin-order-editor-list" id="adminOrderEditorList"></div><div class="admin-order-editor-footer"><button type="button" class="btn btn-plain btn-small" id="adminOrderEditorAdd">+ เพิ่มรายการ</button><span class="admin-order-editor-total" id="adminOrderEditorTotal">ยอดสินค้า ฿0</span></div><div class="field" style="margin-top:12px"><label for="adminOrderEditorReason">เหตุผลการแก้ไข (จำเป็น)</label><textarea id="adminOrderEditorReason" rows="2" maxlength="240" placeholder="เช่น ลูกค้าขอเปลี่ยนจำนวน หรือร้านแจ้งแก้รายการ"></textarea></div><div class="admin-order-editor-actions"><button type="button" class="btn btn-plain" id="adminOrderEditorCancel">ยกเลิก</button><button type="button" class="btn btn-main" id="adminOrderEditorSave">ตรวจสอบและบันทึก</button></div></div>`;
      document.body.appendChild(modal);
      q('#adminOrderEditorClose').addEventListener('click', closeEditor);
      q('#adminOrderEditorCancel').addEventListener('click', closeEditor);
      modal.addEventListener('click', event => { if (event.target === modal) closeEditor(); });
      q('#adminOrderEditorAdd').addEventListener('click', () => { state.editor.rows.push({ id: '', itemId: '', name: '', emoji: '🍽️', unitPrice: 0, quantity: 1, options: {} }); renderEditor(); });
      q('#adminOrderEditorSave').addEventListener('click', prepareSaveItems);
    }
    return true;
  }

  function setView(view) {
    state.view = view === 'history' ? 'history' : 'active';
    qa('[data-order-view]').forEach(button => button.classList.toggle('active', button.dataset.orderView === state.view));
    const mainPanel = q('#admin-orders > .panel');
    const historyPanel = q('#adminOrderHistoryPanel');
    if (mainPanel) mainPanel.style.display = state.view === 'active' ? '' : 'none';
    if (historyPanel) historyPanel.hidden = state.view !== 'history';
    if (state.view === 'history') renderHistory(); else renderActive();
  }

  function renderItemSummary(order) {
    if (!Array.isArray(order?.items)) return '<small class="admin-order-item-summary">กำลังโหลดรายการ…</small>';
    if (!order.items.length) return '<small class="admin-order-item-summary">ไม่มีรายการสินค้า</small>';
    return `<div class="admin-order-item-summary"><small><b>รายการ:</b> ${order.items.slice(0, 3).map(item => `${esc(item.emoji || '🍽️')} ${esc(item.name || 'รายการ')} × ${Number(item.quantity ?? item.qty ?? 0)}`).join(' · ')}${order.items.length > 3 ? ` · และอีก ${order.items.length - 3} รายการ` : ''}</small></div>`;
  }

  function renderActive() {
    const table = q('#operationsOrderTable');
    if (!table) return;
    const active = getOrders().filter(order => !isHistoryOrder(order)).sort(sortNewest);
    const activeCount = q('#activeOrderCount'); const historyCount = q('#historyOrderCount');
    if (activeCount) activeCount.textContent = String(active.length);
    if (historyCount) historyCount.textContent = String(getOrders().filter(isHistoryOrder).length);
    table.innerHTML = active.length ? active.map(order => {
      const riderId = order.riderId || '';
      return `<tr><td><strong>${esc(order.id)}</strong><br><small>${esc(order.storeName || 'ไม่ระบุร้าน')} · ${esc(order.orderedAt || order.time || '-')}</small>${order.riderName ? `<br><small>🛵 ${esc(order.riderName)}</small>` : ''}${renderItemSummary(order)}<div class="admin-order-row-actions"><button type="button" class="btn btn-plain btn-small" data-order-edit="${esc(order.id)}">แก้ไขรายการ</button></div></td><td>${esc(order.name || 'ไม่ระบุ')}<br><small>จุดรับ: ${esc(order.pickupAddress || order.storeName || 'ไม่ระบุ')}</small><br><small>จุดส่ง: ${esc(order.deliveryAddress || order.address || 'ไม่ระบุ')}</small></td><td>${moneyText(order.total)}<br><small>ค่าส่ง ${moneyText(order.deliveryFee || 0)} · เครดิต ${moneyText(order.creditUsed || 0)}</small></td><td><span class="status">${esc(statusLabel(order))}</span><br><small>${esc(order.statusHistory?.at(-1)?.time || '')}</small></td><td><select class="table-input" data-order-rider="${esc(order.id)}"><option value="">ปล่อยให้ Rider รับเอง</option>${getRiders().map(rider => `<option value="${esc(rider.id)}" ${String(riderId) === String(rider.id) ? 'selected' : ''}>${esc(rider.name)} · ${esc(rider.status || 'พร้อมรับงาน')}</option>`).join('')}</select><button type="button" class="btn btn-plain btn-small" style="margin-top:6px" data-order-assign="${esc(order.id)}">บันทึก Rider</button></td><td><select class="table-input" data-order-status="${esc(order.id)}">${statusOptions(order.status)}</select><button type="button" class="btn btn-main btn-small" style="margin-top:6px" data-order-status-save="${esc(order.id)}">บันทึกสถานะ</button></td></tr>`;
    }).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:24px">ไม่มีออเดอร์ที่กำลังดำเนินการ<br><button type="button" class="btn btn-plain btn-small" style="margin-top:9px" data-order-go-history>เปิดดูประวัติออเดอร์</button></td></tr>';
    bindActiveActions(table);
  }

  function bindActiveActions(table) {
    qa('[data-order-edit]', table).forEach(button => button.addEventListener('click', () => openEditor(button.dataset.orderEdit)));
    qa('[data-order-assign]', table).forEach(button => button.addEventListener('click', () => assignRider(button.dataset.orderAssign, q(`[data-order-rider="${CSS.escape(button.dataset.orderAssign)}"]`, table)?.value || '')));
    qa('[data-order-status-save]', table).forEach(button => button.addEventListener('click', () => updateStatus(button.dataset.orderStatusSave, q(`[data-order-status="${CSS.escape(button.dataset.orderStatusSave)}"]`, table)?.value || '')));
    q('[data-order-go-history]', table)?.addEventListener('click', () => setView('history'));
  }

  function updateHistoryStatusOptions() {
    const select = q('#adminOrderHistoryStatus');
    if (!select) return;
    const current = state.historyStatus;
    const statuses = [...new Set(getOrders().filter(isHistoryOrder).map(order => statusLabel(order)))].sort((a, b) => a.localeCompare(b, 'th'));
    select.innerHTML = `<option value="all">ทุกสถานะในประวัติ</option>${statuses.map(status => `<option value="${esc(status)}">${esc(status)}</option>`).join('')}`;
    select.value = statuses.includes(current) ? current : 'all';
    state.historyStatus = select.value;
  }

  function renderHistory() {
    const table = q('#adminOrderHistoryTable');
    if (!table) return;
    updateHistoryStatusOptions();
    const needle = state.historySearch.trim().toLowerCase();
    const history = getOrders().filter(isHistoryOrder).filter(order => {
      const matchesStatus = state.historyStatus === 'all' || statusLabel(order) === state.historyStatus;
      const haystack = [order.id, order.name, order.customerEmail, order.storeName, order.riderName].join(' ').toLowerCase();
      return matchesStatus && (!needle || haystack.includes(needle));
    }).sort(sortNewest);
    table.innerHTML = history.length ? history.map(order => `<tr><td><strong>${esc(order.id)}</strong><br><small>${esc(order.serviceType || 'food')}</small></td><td>${esc(order.name || 'ไม่ระบุ')}<br><small>${esc(order.storeName || 'ไม่ระบุร้าน')}</small></td><td>${moneyText(order.total)}<br><small>สุทธิ ${moneyText(order.payable ?? order.total ?? 0)}</small></td><td><span class="status">${esc(statusLabel(order))}</span></td><td>${order.riderName ? `🛵 ${esc(order.riderName)}` : '<span style="color:var(--muted)">ยังไม่มอบหมาย</span>'}</td><td>${esc(order.completedAt || order.orderedAt || order.time || '-')}</td><td><button type="button" class="btn btn-plain btn-small" data-history-edit="${esc(order.id)}">ดูรายการ</button></td></tr>`).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:24px">ไม่พบออเดอร์ในประวัติตามเงื่อนไข</td></tr>';
    qa('[data-history-edit]', table).forEach(button => button.addEventListener('click', () => openEditor(button.dataset.historyEdit, true)));
  }

  async function fetchItems(orderId) {
    const rows = await window.SupabaseSync.request(`delivery_order_items?select=id,order_id,item_id,name,emoji,unit_price,quantity,options&order_id=eq.${encodeURIComponent(orderId)}&order=id.asc&limit=200`);
    return (Array.isArray(rows) ? rows : []).map(row => ({ id: row.id, itemId: row.item_id || '', name: row.name || '', emoji: row.emoji || '🍽️', unitPrice: Number(row.unit_price || 0), quantity: Math.max(1, Number(row.quantity || 1)), options: row.options || {} }));
  }

  function editorTotal() {
    return (state.editor?.rows || []).reduce((sum, row) => sum + (Number(row.unitPrice) || 0) * (Number(row.quantity) || 0), 0);
  }

  function renderEditor() {
    const list = q('#adminOrderEditorList');
    if (!list || !state.editor) return;
    list.innerHTML = state.editor.rows.length ? state.editor.rows.map((row, index) => `<div class="admin-order-editor-row" data-editor-index="${index}"><div class="field editor-emoji-field"><label>ไอคอน</label><input class="editor-emoji" data-editor-field="emoji" value="${esc(row.emoji || '🍽️')}" maxlength="8" /></div><div class="field editor-name-field"><label>ชื่อรายการ</label><input data-editor-field="name" value="${esc(row.name)}" maxlength="160" placeholder="เช่น ข้าวกะเพรา" /></div><div class="field editor-qty-field"><label>จำนวน</label><input data-editor-field="quantity" type="number" min="1" step="1" value="${Number(row.quantity || 1)}" /></div><div class="field editor-price-field"><label>ราคาต่อหน่วย</label><input data-editor-field="unitPrice" type="number" min="0" step="0.01" value="${Number(row.unitPrice || 0)}" /></div><div class="field editor-remove-field"><label>&nbsp;</label><button type="button" class="admin-order-editor-remove" data-editor-remove="${index}" aria-label="ลบรายการ">×</button></div>${row.options && Object.keys(row.options).length ? `<div class="field editor-options-field"><small style="color:var(--muted)">ตัวเลือกเดิม: ${esc(JSON.stringify(row.options))}</small></div>` : ''}</div>`).join('') : '<div class="store-detail-empty">ออเดอร์นี้ไม่มีรายการ กด “เพิ่มรายการ” เพื่อเพิ่มสินค้า</div>';
    qa('[data-editor-field]', list).forEach(input => input.addEventListener('input', event => {
      const row = state.editor.rows[Number(event.target.closest('[data-editor-index]')?.dataset.editorIndex)];
      if (!row) return;
      const key = event.target.dataset.editorField;
      row[key] = key === 'quantity' ? Math.max(1, Number(event.target.value || 1)) : key === 'unitPrice' ? Math.max(0, Number(event.target.value || 0)) : event.target.value;
      q('#adminOrderEditorTotal').textContent = `ยอดสินค้า ${moneyText(editorTotal())}`;
    }));
    qa('[data-editor-remove]', list).forEach(button => button.addEventListener('click', () => { state.editor.rows.splice(Number(button.dataset.editorRemove), 1); renderEditor(); }));
    q('#adminOrderEditorTotal').textContent = `ยอดสินค้า ${moneyText(editorTotal())}`;
  }

  async function openEditor(orderId, readOnly = false) {
    const order = getOrders().find(item => String(item.id) === String(orderId));
    if (!order) return notify('ไม่พบออเดอร์ที่ต้องการเปิด', 'error');
    if (!(await requireAdminSession())) return;
    try {
      const rows = await fetchItems(order.id);
      state.editor = { order, rows, readOnly };
      q('#adminOrderEditorTitle').textContent = readOnly ? 'ดูรายการในออเดอร์ประวัติ' : 'แก้ไขรายการในออเดอร์';
      q('#adminOrderEditorSubtitle').textContent = `${order.id} · ${order.storeName || 'ไม่ระบุร้าน'} · ${order.name || 'ไม่ระบุลูกค้า'}`;
      q('#adminOrderEditorList').classList.toggle('readonly', readOnly);
      q('#adminOrderEditorAdd').hidden = readOnly;
      q('#adminOrderEditorReason').closest('.field').hidden = readOnly;
      q('#adminOrderEditorSave').hidden = readOnly;
      q('#adminOrderEditorCancel').textContent = readOnly ? 'ปิด' : 'ยกเลิก';
      renderEditor();
      const modal = q('#adminOrderEditorModal'); modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
    } catch (error) {
      notify(`โหลดรายการออเดอร์ไม่สำเร็จ: ${error.message}`, 'error');
    }
  }

  function closeEditor() {
    const modal = q('#adminOrderEditorModal');
    if (!modal) return;
    modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); state.editor = null;
  }

  async function prepareSaveItems() {
    if (!state.editor || state.editor.readOnly) return closeEditor();
    const reason = q('#adminOrderEditorReason')?.value.trim() || '';
    const rows = state.editor.rows.map(row => ({ ...row, name: String(row.name || '').trim(), quantity: Math.max(1, Number(row.quantity || 0)), unitPrice: Math.max(0, Number(row.unitPrice || 0)), emoji: String(row.emoji || '🍽️').trim() || '🍽️' }));
    if (!reason) return notify('กรุณาระบุเหตุผลการแก้ไขก่อนบันทึก', 'error');
    if (rows.some(row => !row.name || !Number.isFinite(row.quantity) || !Number.isFinite(row.unitPrice))) return notify('กรุณาตรวจชื่อรายการ จำนวน และราคาให้ครบถ้วน', 'error');
    const subtotal = rows.reduce((sum, row) => sum + row.unitPrice * row.quantity, 0);
    const order = state.editor.order;
    const deliveryFee = Number(order.deliveryFee || 0);
    const couponDiscount = Math.max(0, Number(order.couponDiscount || 0));
    const total = Math.max(0, subtotal + deliveryFee - couponDiscount);
    const creditUsed = Math.min(Number(order.creditUsed || 0), total);
    const summary = `<b>ออเดอร์:</b> ${esc(order.id)}<br><b>รายการ:</b> ${rows.length} รายการ<br><b>ยอดสินค้าใหม่:</b> ${moneyText(subtotal)}<br><b>ส่วนลดเดิม:</b> ${moneyText(couponDiscount)}<br><b>ยอดรวมใหม่:</b> ${moneyText(total)}<br><b>เหตุผล:</b> ${esc(reason)}`;
    if (typeof window.openActionConfirmation === 'function') {
      window.openActionConfirmation({ title: 'ยืนยันแก้ไขรายการออเดอร์', message: 'ระบบจะบันทึกแต่ละรายการและคำนวณยอดชำระใหม่ใน Supabase', body: summary, confirmText: 'ยืนยันบันทึกรายการ', onConfirm: () => saveItems(order, rows, { total, creditUsed, payable: total - creditUsed, reason }) });
    } else if (window.confirm('ยืนยันแก้ไขรายการออเดอร์หรือไม่?')) {
      await saveItems(order, rows, { total, creditUsed, payable: total - creditUsed, reason });
    }
  }

  async function saveItems(order, rows, totals) {
    if (!(await requireAdminSession())) return;
    try {
      const existing = await fetchItems(order.id);
      const keepIds = new Set(rows.filter(row => row.id !== '' && row.id !== null && row.id !== undefined).map(row => String(row.id)));
      for (const oldRow of existing) {
        if (!keepIds.has(String(oldRow.id))) {
          await window.SupabaseSync.request(`delivery_order_items?id=eq.${encodeURIComponent(oldRow.id)}&order_id=eq.${encodeURIComponent(order.id)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
        }
      }
      for (const row of rows) {
        const payload = { order_id: order.id, item_id: row.itemId || null, name: row.name, emoji: row.emoji, unit_price: row.unitPrice, quantity: row.quantity, options: row.options || {} };
        if (row.id !== '' && row.id !== null && row.id !== undefined) await window.SupabaseSync.request(`delivery_order_items?id=eq.${encodeURIComponent(row.id)}&order_id=eq.${encodeURIComponent(order.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(payload) });
        else await window.SupabaseSync.request('delivery_order_items', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(payload) });
      }
      await window.SupabaseSync.request(`delivery_orders?id=eq.${encodeURIComponent(order.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ total: totals.total, credit_used: totals.creditUsed, payable: totals.payable, updated_at: nowIso() }) });
      order.items = rows; order.total = totals.total; order.creditUsed = totals.creditUsed; order.payable = totals.payable; order.updatedAt = nowIso();
      order.itemEditHistory = [...(order.itemEditHistory || []), { reason: totals.reason, at: labelTime(), by: currentActor().email || 'admin' }];
      window.Storage?.save?.(); closeEditor(); renderEnhanced(); notify('แก้ไขรายการและคำนวณยอดออเดอร์แล้ว', 'success');
    } catch (error) {
      notify(`บันทึกรายการออเดอร์ไม่สำเร็จ: ${error.message}`, 'error');
    }
  }

  async function assignRider(orderId, riderId) {
    const order = getOrders().find(item => String(item.id) === String(orderId));
    const rider = getRiders().find(item => String(item.id) === String(riderId));
    if (!order) return notify('ไม่พบออเดอร์ที่ต้องการมอบหมาย', 'error');
    if (String(order.riderId || '') === String(rider?.id || '')) return notify('ไม่มีการเปลี่ยนแปลง Rider');
    if (!(await requireAdminSession())) return;
    const label = rider ? `${rider.name} (${rider.vehicle || 'มอเตอร์ไซค์'})` : 'ปล่อยเป็นงานว่างให้ Rider รับเอง';
    const body = `<b>ออเดอร์:</b> ${esc(order.id)}<br><b>ลูกค้า:</b> ${esc(order.name || '-') }<br><b>มอบหมายให้:</b> ${esc(label)}`;
    const action = async () => {
      try {
        const payload = { rider_id: rider?.id || null, rider_name: rider?.name || null, updated_at: nowIso() };
        if (order.serviceType === 'ap_ride') payload.ride_selected_rider_id = rider?.id || null;
        await window.SupabaseSync.request(`delivery_orders?id=eq.${encodeURIComponent(order.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(payload) });
        await writeStatusEvent(order, order.status, `มอบหมาย Rider: ${rider?.name || 'งานว่าง'}`);
        order.riderId = rider?.id || null; order.riderName = rider?.name || null; order.updatedAt = nowIso();
        window.Storage?.save?.(); renderEnhanced(); notify(rider ? 'มอบหมายงานให้ Rider แล้ว' : 'ปล่อยงานให้ Rider รับเองแล้ว', 'success');
      } catch (error) { notify(`บันทึกการมอบหมาย Rider ไม่สำเร็จ: ${error.message}`, 'error'); }
    };
    if (typeof window.openActionConfirmation === 'function') window.openActionConfirmation({ title: 'ยืนยันมอบหมายงาน Rider', message: 'การมอบหมายจะถูกบันทึกในศูนย์กลางทันที', body, confirmText: 'ยืนยันมอบหมายงาน', onConfirm: action }); else if (window.confirm('ยืนยันมอบหมาย Rider หรือไม่?')) action();
  }

  async function writeStatusEvent(order, status, actorLabel) {
    const actor = currentActor();
    await window.SupabaseSync.request('order_status_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ order_id: order.id, status, actor_id: actor.id || null, actor_label: actorLabel || actor.email || 'admin' }) });
  }

  async function updateStatus(orderId, next) {
    const order = getOrders().find(item => String(item.id) === String(orderId));
    if (!order || !next || next === order.status) return notify('ไม่มีการเปลี่ยนแปลงสถานะ');
    if (!(await requireAdminSession())) return;
    const body = `<b>ออเดอร์:</b> ${esc(order.id)}<br><b>สถานะเดิม:</b> ${esc(order.status)}<br><b>สถานะใหม่:</b> ${esc(next)}`;
    const action = async () => {
      try {
        const payload = { status: next, updated_at: nowIso() };
        if (/(เสร็จ|สำเร็จ|complete)/i.test(next)) payload.completed_at = nowIso();
        await window.SupabaseSync.request(`delivery_orders?id=eq.${encodeURIComponent(order.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(payload) });
        await writeStatusEvent(order, next, currentActor().email || 'admin');
        order.status = next; order.completedAt = payload.completed_at || order.completedAt || null; order.statusHistory = [...(order.statusHistory || []), { status: next, time: labelTime(), by: currentActor().email || 'admin' }]; order.updatedAt = nowIso();
        window.Storage?.save?.(); renderEnhanced(); notify('อัปเดตสถานะและบันทึกประวัติแล้ว', 'success');
      } catch (error) { notify(`อัปเดตสถานะไม่สำเร็จ: ${error.message}`, 'error'); }
    };
    if (typeof window.openActionConfirmation === 'function') window.openActionConfirmation({ title: 'ยืนยันเปลี่ยนสถานะออเดอร์', message: 'สถานะใหม่จะถูกเก็บไว้ในประวัติสถานะของ Supabase', body, confirmText: 'ยืนยันอัปเดตสถานะ', onConfirm: action }); else if (window.confirm('ยืนยันเปลี่ยนสถานะหรือไม่?')) action();
  }

  async function refreshFromCloud() {
    if (!(await requireAdminSession())) return;
    try {
      const rows = await window.SupabaseSync.request('delivery_orders?select=*&order=ordered_at.desc&limit=200');
      if (!Array.isArray(rows)) return;
      const previous = new Map(getOrders().map(order => [order.id, order]));
      window.AppState.orders = rows.map(row => {
        const local = previous.get(row.id) || {};
        return { ...local, id: row.id, serviceType: row.service_type || 'food', storeId: row.store_id, storeName: row.store_name, riderId: row.rider_id, riderName: row.rider_name, name: row.customer_name, customerEmail: row.customer_email, total: Number(row.total || 0), creditUsed: Number(row.credit_used || 0), payable: Number(row.payable ?? row.total ?? 0), deliveryFee: Number(row.delivery_fee || 0), status: row.status, orderedAt: row.ordered_at, time: row.ordered_at, pickupAddress: row.pickup_address, pickupLocation: row.pickup_location, deliveryAddress: row.delivery_address, deliveryLocation: row.delivery_location, note: row.note || '', acceptedAt: row.accepted_at, completedAt: row.completed_at, paymentMethod: row.payment_method || '', items: local.items };
      });
      window.Storage?.save?.();
      renderEnhanced();
      notify('รีเฟรชออเดอร์จาก Supabase แล้ว', 'success');
    } catch (error) { notify(`รีเฟรชออเดอร์ไม่สำเร็จ: ${error.message}`, 'error'); }
  }

  function renderEnhanced() {
    if (!state.initialized || !ensureUi()) return;
    state.rendering = true; state.suppressUntil = Date.now() + 120;
    try {
      const active = getOrders().filter(order => !isHistoryOrder(order));
      const history = getOrders().filter(isHistoryOrder);
      q('#activeOrderCount').textContent = String(active.length); q('#historyOrderCount').textContent = String(history.length);
      if (state.view === 'history') renderHistory(); else renderActive();
    } finally { state.rendering = false; }
  }

  function install() {
    if (state.initialized || !q('#operationsOrderTable')) return false;
    state.initialized = true; addStyles(); ensureUi();
    const priorRender = window.renderOperationsOrders;
    if (typeof priorRender === 'function') window.renderOperationsOrders = (...args) => { const result = priorRender(...args); setTimeout(renderEnhanced, 0); return result; };
    window.adminEditOrderItems = orderId => openEditor(orderId, false);
    window.assignOrderRider = (orderId, riderId) => assignRider(orderId, riderId);
    window.updateOrderStatus = (orderId, next) => updateStatus(orderId, next);
    const table = q('#operationsOrderTable');
    const observer = new MutationObserver(() => { if (state.rendering || Date.now() < state.suppressUntil) return; if (!state.renderScheduled) { state.renderScheduled = true; setTimeout(() => { state.renderScheduled = false; renderEnhanced(); }, 80); } });
    observer.observe(table, { childList: true, subtree: true });
    setView('active'); renderEnhanced();
    return true;
  }

  function boot(attempt = 0) {
    if (install()) return;
    if (attempt < 120) setTimeout(() => boot(attempt + 1), 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => boot()); else setTimeout(() => boot(), 0);
})();
