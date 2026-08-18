(() => {
  'use strict';

  const state = {
    initialized: false,
    media: [],
    mediaFilter: 'all',
    mediaSearch: '',
    editingMediaId: null,
    accounts: [],
    accountRole: 'all',
    accountStatus: 'all',
    accountSearch: '',
    loadingMedia: false,
    loadingAccounts: false,
  };

  const q = selector => document.querySelector(selector);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const currentSession = () => window.SupabaseSync?.session?.() || null;
  const isAdmin = () => Boolean(window.Storage?.isAdmin?.() && currentSession()?.user?.id);
  const toast = (message, type = 'info') => window.UI?.toast ? window.UI.toast(message, type) : window.alert(message);
  const mediaTypeLabel = type => ({
    BANNER: 'แบนเนอร์', ADVERTISEMENT: 'โฆษณา', PROMOTION: 'โปรโมชั่น',
    ADMIN_MEDIA: 'สื่อผู้ดูแล', SYSTEM_MEDIA: 'สื่อระบบ', STORE_LOGO: 'โลโก้ร้าน',
    STORE_BACKGROUND: 'พื้นหลังร้าน', PRODUCT_IMAGE: 'รูปสินค้า', USER_AVATAR: 'รูปผู้ใช้',
    RIDER_AVATAR: 'รูป Rider', PAYMENT_SLIP: 'สลิปชำระเงิน', DELIVERY_PROOF: 'หลักฐานส่งงาน',
  }[String(type || '').toUpperCase()] || String(type || 'ไม่ระบุ'));
  const mediaGroup = type => {
    const value = String(type || '').toUpperCase();
    if (['BANNER', 'ADVERTISEMENT', 'PROMOTION'].includes(value)) return 'campaign';
    if (['ADMIN_MEDIA', 'SYSTEM_MEDIA'].includes(value)) return 'brand';
    if (['STORE_LOGO', 'STORE_BACKGROUND'].includes(value)) return 'store';
    return 'other';
  };
  const accountRoleLabel = role => ({ customer: 'ลูกค้า', rider: 'Rider', store_owner: 'เจ้าของร้าน', admin: 'Admin' }[String(role || '')] || String(role || 'ยังไม่กำหนด'));
  const accountStatusLabel = status => ({ active: 'ใช้งานปกติ', suspended: 'ระงับบัญชี', pending: 'รอตรวจสอบ', disabled: 'ปิดใช้งาน' }[String(status || '')] || String(status || 'ไม่ทราบสถานะ'));

  function ensureStyle() {
    if (q('#adminMediaAccountsStyle')) return;
    const style = document.createElement('style');
    style.id = 'adminMediaAccountsStyle';
    style.textContent = `
      .admin-media-toolbar,.admin-account-toolbar{display:grid;grid-template-columns:minmax(180px,1.3fr) minmax(155px,1fr) minmax(130px,.8fr);gap:8px;align-items:end;margin:0 0 12px}.admin-media-toolbar .field,.admin-account-toolbar .field{margin:0}
      .admin-media-grid,.admin-account-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(255px,1fr));gap:11px}.admin-media-card,.admin-account-card{border:1px solid var(--line);border-radius:16px;background:#fff;padding:12px;box-shadow:0 5px 16px rgba(4,55,50,.06);min-width:0}.admin-media-preview{height:128px;border-radius:12px;overflow:hidden;background:linear-gradient(135deg,#edf9f5,#f7fbfa);border:1px solid #d5ebe4;display:grid;place-items:center;margin-bottom:10px}.admin-media-preview img{display:block;width:100%;height:100%;object-fit:cover}.admin-media-placeholder{font-size:34px}.admin-media-head,.admin-account-head{display:flex;gap:9px;align-items:flex-start;justify-content:space-between}.admin-media-title,.admin-account-title{min-width:0}.admin-media-title h3,.admin-account-title h3{font-size:13px;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.admin-media-title p,.admin-account-title p{font-size:10px;color:var(--muted);margin:3px 0 0;overflow-wrap:anywhere}.admin-media-badges,.admin-account-badges{display:flex;gap:5px;flex-wrap:wrap;margin:9px 0}.admin-media-badge,.admin-account-badge{display:inline-flex;border-radius:999px;padding:4px 7px;background:#f0f8f5;color:#216459;font-size:9px;font-weight:850}.admin-media-badge.warn,.admin-account-badge.warn{background:#fff5df;color:#8b5a03}.admin-media-badge.danger,.admin-account-badge.danger{background:#fff0ef;color:#a44343}.admin-media-meta,.admin-account-meta{border-top:1px solid var(--line);padding-top:8px;color:var(--muted);font-size:10px;line-height:1.55;overflow-wrap:anywhere}.admin-media-actions,.admin-account-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.admin-media-actions .btn,.admin-account-actions .btn{flex:1 1 100px}.admin-media-editor{border:1px solid #b9ded3;background:#f7fcfa;border-radius:15px;padding:13px;margin:0 0 14px}.admin-media-editor-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px}.admin-media-editor h3{font-size:14px;margin:0}.admin-media-empty,.admin-account-empty{grid-column:1/-1;text-align:center;padding:30px 14px;border:1px dashed #b9d8d1;border-radius:15px;color:var(--muted);background:#f8fcfb}.admin-account-role-select{width:100%;font-size:10px;border:1px solid var(--line);border-radius:8px;padding:7px;background:#fff;color:var(--ink)}.admin-account-stat{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:10px}.admin-account-stat div{background:#f7fbfa;border-radius:9px;padding:7px}.admin-account-stat span{display:block;font-size:9px;color:var(--muted)}.admin-account-stat b{display:block;font-size:10px;margin-top:2px;overflow-wrap:anywhere}.admin-media-url{font-size:10px;color:#0b6f9c;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.admin-sync-status{font-size:10px;color:var(--muted);margin-top:7px}.admin-sync-status.ok{color:#16815e}.admin-sync-status.error{color:#a44343}@media(max-width:720px){.admin-media-toolbar,.admin-account-toolbar{grid-template-columns:1fr 1fr}.admin-media-toolbar .field:first-child,.admin-account-toolbar .field:first-child{grid-column:1/-1}.admin-media-grid,.admin-account-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function publicMediaUrl(row) {
    const legacy = row?.legacy_source && typeof row.legacy_source === 'object' ? row.legacy_source : {};
    const direct = String(legacy.url || legacy.public_url || legacy.image_url || '').trim();
    if (direct) return direct;
    const cfg = window.SupabaseSync?.config?.() || {};
    const bucket = String(row?.bucket_id || '').trim();
    const path = String(row?.storage_path || '').replace(/^\/+/, '');
    if (cfg.url && bucket && path) return `${cfg.url}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`;
    return '';
  }

  function ownerLabel(row) {
    if (row?.owner_type === 'system') return 'ระบบ';
    if (row?.owner_type === 'admin') return 'Admin';
    if (row?.owner_id) return String(row.owner_id).slice(0, 8) + '…';
    return 'ไม่ระบุเจ้าของ';
  }

  function ensureMediaSection() {
    if (q('#admin-media-center')) return q('#admin-media-center');
    const tabs = q('#adminTabs');
    const content = tabs?.parentElement?.querySelector(':scope > div');
    if (!content) return null;
    const section = document.createElement('section');
    section.className = 'admin-section';
    section.id = 'admin-media-center';
    section.innerHTML = `<div class="panel"><div class="section-head" style="margin:0 0 14px"><div><h2 style="font-size:17px">ศูนย์จัดการสื่อหน้าเว็บลูกค้า</h2><p>ดูและแก้ไขโลโก้ พื้นหลัง แบนเนอร์ โฆษณา และโปรโมชั่นเป็นรายการแยกกัน ข้อมูลที่มีอยู่จะแสดงก่อนเสมอ</p></div><div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="btn btn-main btn-small" onclick="newAdminMediaAsset()">+ เพิ่มสื่อ</button><button type="button" class="btn btn-plain btn-small" onclick="refreshAdminMediaCenter()">รีเฟรช</button></div></div><div class="notice" style="margin:0 0 14px">การแก้ไข URL หรือ storage path จะบันทึกเฉพาะรายการที่เลือก ไม่ลบสื่อรายการอื่น และต้องผ่าน RLS ของบัญชี Admin</div><div id="adminMediaToolbar" class="admin-media-toolbar"><div class="field"><label for="adminMediaSearch">ค้นหาสื่อ</label><input id="adminMediaSearch" type="search" autocomplete="off" placeholder="ชื่อประเภท URL หรือรหัสรายการ"></div><div class="field"><label for="adminMediaFilter">หมวดสื่อ</label><select id="adminMediaFilter"><option value="all">ทุกหมวด</option><option value="campaign">แบนเนอร์และโฆษณา</option><option value="brand">โลโก้และสื่อระบบ</option><option value="store">สื่อร้านค้า</option><option value="other">สื่ออื่น</option></select></div><div class="field"><label for="adminMediaStatus">สถานะ</label><select id="adminMediaStatus"><option value="all">ทุกสถานะ</option><option value="ready">พร้อมใช้</option><option value="archived">เก็บถาวร</option></select></div></div><div id="adminMediaEditorHost"></div><div id="adminMediaSummary" class="admin-sync-status"></div><div id="adminMediaGrid" class="admin-media-grid"></div></div>`;
    content.appendChild(section);
    const tab = document.createElement('button');
    tab.type = 'button'; tab.dataset.admin = 'media-center'; tab.textContent = 'ศูนย์จัดการสื่อ';
    tabs.appendChild(tab);
    tab.addEventListener('click', () => activateAdminSection('admin-media-center', tab));
    q('#adminMediaSearch').addEventListener('input', event => { state.mediaSearch = event.target.value; renderMedia(); });
    q('#adminMediaFilter').addEventListener('change', event => { state.mediaFilter = event.target.value; renderMedia(); });
    q('#adminMediaStatus').addEventListener('change', event => renderMedia());
    return section;
  }

  function ensureAccountSection() {
    if (q('#admin-account-center')) return q('#admin-account-center');
    const tabs = q('#adminTabs');
    const content = tabs?.parentElement?.querySelector(':scope > div');
    if (!content) return null;
    const section = document.createElement('section');
    section.className = 'admin-section';
    section.id = 'admin-account-center';
    section.innerHTML = `<div class="panel"><div class="section-head" style="margin:0 0 14px"><div><h2 style="font-size:17px">ศูนย์จัดการบัญชีทุกบทบาท</h2><p>จัดการ Customer, Rider, Store Owner และ Admin จากรายการเดียว พร้อมสถานะระงับและบทบาทปัจจุบัน</p></div><button type="button" class="btn btn-plain btn-small" onclick="refreshAdminAccountCenter()">รีเฟรชบัญชี</button></div><div class="notice" style="margin:0 0 14px">การเปลี่ยนบทบาทและระงับบัญชีเป็นการเปลี่ยนสิทธิ์จริงใน Supabase ระบบจะบันทึกเหตุผลและไม่ลบบัญชี Auth อัตโนมัติ</div><div id="adminAccountToolbar" class="admin-account-toolbar"><div class="field"><label for="adminAccountSearch">ค้นหาบัญชี</label><input id="adminAccountSearch" type="search" autocomplete="off" placeholder="อีเมล ชื่อ เบอร์โทร หรือ Login ID"></div><div class="field"><label for="adminAccountRole">บทบาท</label><select id="adminAccountRole"><option value="all">ทุกบทบาท</option><option value="customer">Customer</option><option value="rider">Rider</option><option value="store_owner">Store Owner</option><option value="admin">Admin</option><option value="unassigned">ยังไม่กำหนด</option></select></div><div class="field"><label for="adminAccountStatus">สถานะบัญชี</label><select id="adminAccountStatus"><option value="all">ทุกสถานะ</option><option value="active">ใช้งานปกติ</option><option value="suspended">ระงับบัญชี</option><option value="pending">รอตรวจสอบ</option><option value="disabled">ปิดใช้งาน</option></select></div></div><div id="adminAccountSummary" class="admin-sync-status"></div><div id="adminAccountGrid" class="admin-account-grid"></div></div>`;
    content.appendChild(section);
    const tab = document.createElement('button');
    tab.type = 'button'; tab.dataset.admin = 'account-center'; tab.textContent = 'บัญชีทุกบทบาท';
    tabs.appendChild(tab);
    tab.addEventListener('click', () => activateAdminSection('admin-account-center', tab));
    q('#adminAccountSearch').addEventListener('input', event => { state.accountSearch = event.target.value; renderAccounts(); });
    q('#adminAccountRole').addEventListener('change', event => { state.accountRole = event.target.value; renderAccounts(); });
    q('#adminAccountStatus').addEventListener('change', event => { state.accountStatus = event.target.value; renderAccounts(); });
    return section;
  }

  function activateAdminSection(sectionId, tab) {
    document.querySelectorAll('#adminTabs button').forEach(item => item.classList.toggle('active', item === tab));
    document.querySelectorAll('.admin-section').forEach(section => section.classList.toggle('active', section.id === sectionId));
    if (sectionId === 'admin-media-center') refreshAdminMediaCenter();
    if (sectionId === 'admin-account-center') refreshAdminAccountCenter();
  }

  function ensureContentSyncControl() {
    const form = q('#contentForm');
    const savebar = form?.querySelector('.config-savebar');
    if (!form || !savebar || q('#adminContentBackendSync')) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'btn btn-plain'; button.id = 'adminContentBackendSync'; button.textContent = 'บันทึก Content Studio ขึ้น Supabase';
    button.onclick = () => syncContentConfig();
    savebar.appendChild(button);
    const note = document.createElement('div'); note.id = 'adminContentBackendSyncNote'; note.className = 'admin-sync-status'; note.textContent = 'LocalStorage เดิมยังทำงานได้ และปุ่มนี้ใช้เผยแพร่ค่าขึ้น platform_configs สำหรับหน้าเว็บลูกค้า';
    savebar.parentElement?.appendChild(note);
  }

  function mergeDeep(target, source) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) return target;
    Object.entries(source).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) target[key] = {};
        mergeDeep(target[key], value);
      } else target[key] = value;
    });
    return target;
  }

  async function loadContentConfig() {
    if (!isAdmin() || !window.SupabaseSync?.request || !window.AppState?.config?.content) return;
    try {
      const rows = await window.SupabaseSync.request('platform_configs?key=eq.brand_public&select=key,value,updated_at&limit=1');
      const value = Array.isArray(rows) ? rows[0]?.value : null;
      if (value && typeof value === 'object') {
        mergeDeep(window.AppState.config.content, value);
        window.Storage?.save?.();
        window.renderContentStudio?.();
        const note = q('#adminContentBackendSyncNote');
        if (note) { note.textContent = `โหลด brand_public ล่าสุดจาก Supabase เมื่อ ${new Date(rows[0].updated_at || Date.now()).toLocaleString('th-TH')}`; note.className = 'admin-sync-status ok'; }
      }
    } catch (error) {
      const note = q('#adminContentBackendSyncNote');
      if (note) { note.textContent = `ยังโหลด brand_public ไม่ได้: ${error.message}`; note.className = 'admin-sync-status error'; }
      console.warn('โหลด brand_public ไม่สำเร็จ', error);
    }
  }

  async function syncContentConfig() {
    if (!isAdmin()) return toast('กรุณาเข้าสู่ระบบ Admin ก่อนเผยแพร่ Content Studio', 'warning');
    const value = window.AppState?.config?.content;
    if (!value) return toast('ยังไม่พบข้อมูล Content Studio', 'warning');
    const session = currentSession();
    try {
      await window.SupabaseSync.request('platform_configs?on_conflict=key', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ key: 'brand_public', value, updated_by: session.user.id, updated_at: new Date().toISOString() }]) });
      const note = q('#adminContentBackendSyncNote');
      if (note) { note.textContent = `เผยแพร่ brand_public ขึ้น Supabase แล้ว เมื่อ ${new Date().toLocaleString('th-TH')}`; note.className = 'admin-sync-status ok'; }
      toast('เผยแพร่ Content Studio ขึ้น Supabase แล้ว', 'success');
    } catch (error) {
      const note = q('#adminContentBackendSyncNote');
      if (note) { note.textContent = `เผยแพร่ไม่สำเร็จ: ${error.message}`; note.className = 'admin-sync-status error'; }
      toast(`เผยแพร่ Content Studio ไม่สำเร็จ: ${error.message}`, 'error');
    }
  }
  window.syncAdminContentConfig = syncContentConfig;

  function renderMedia() {
    const host = q('#adminMediaGrid');
    if (!host) return;
    const status = q('#adminMediaStatus')?.value || 'all';
    const query = state.mediaSearch.trim().toLowerCase();
    const rows = state.media.filter(row => {
      const text = [row.id, row.media_type, row.owner_type, row.bucket_id, row.storage_path, publicMediaUrl(row)].join(' ').toLowerCase();
      return (!query || text.includes(query)) && (state.mediaFilter === 'all' || mediaGroup(row.media_type) === state.mediaFilter) && (status === 'all' || String(row.status || 'ready') === status);
    });
    const summary = q('#adminMediaSummary');
    if (summary) summary.textContent = state.loadingMedia ? 'กำลังโหลดรายการสื่อจาก Supabase…' : `แสดง ${rows.length} จาก ${state.media.length} รายการ · แก้ไขเป็นรายรายการได้จากปุ่มด้านล่าง`;
    host.innerHTML = rows.length ? rows.map(row => {
      const url = publicMediaUrl(row); const group = mediaGroup(row.media_type); const badgeClass = row.status === 'archived' ? 'danger' : 'ok';
      return `<article class="admin-media-card"><div class="admin-media-preview">${url ? `<img src="${esc(url)}" alt="${esc(mediaTypeLabel(row.media_type))}" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="admin-media-placeholder" hidden>🖼️</span>` : '<span class="admin-media-placeholder">🖼️</span>'}</div><div class="admin-media-head"><div class="admin-media-title"><h3>${esc(mediaTypeLabel(row.media_type))}</h3><p>${esc(row.id)} · ${esc(ownerLabel(row))}</p></div><span class="admin-media-badge ${badgeClass}">${esc(row.status || 'ready')}</span></div><div class="admin-media-badges"><span class="admin-media-badge">${esc(group === 'campaign' ? 'โฆษณา/แบนเนอร์' : group === 'brand' ? 'โลโก้/แบรนด์' : group === 'store' ? 'ร้านค้า' : 'อื่น ๆ')}</span><span class="admin-media-badge">v${Number(row.version || 1)}</span></div><div class="admin-media-meta"><span class="admin-media-url" title="${esc(url || 'ยังไม่มี public URL')}">${esc(url || 'ยังไม่มี public URL')}</span><span>Bucket: ${esc(row.bucket_id || '—')} · Path: ${esc(row.storage_path || '—')}</span><br><span>อัปเดต ${row.updated_at ? esc(new Date(row.updated_at).toLocaleString('th-TH')) : '—'}</span></div><div class="admin-media-actions"><button type="button" class="btn btn-main btn-small" onclick="editAdminMediaAsset('${esc(row.id)}')">แก้ไขรายการ</button><button type="button" class="btn btn-plain btn-small" onclick="archiveAdminMediaAsset('${esc(row.id)}')">${row.status === 'archived' ? 'เปิดใช้อีกครั้ง' : 'เก็บถาวร'}</button></div></article>`;
    }).join('') : '<div class="admin-media-empty"><strong>ยังไม่พบสื่อในหมวดนี้</strong><span>กด “เพิ่มสื่อ” เพื่อสร้างรายการใหม่ หรือเปลี่ยนตัวกรอง</span></div>';
  }

  function editorMarkup(row = {}) {
    const legacy = row.legacy_source && typeof row.legacy_source === 'object' ? row.legacy_source : {};
    const url = legacy.url || legacy.public_url || legacy.image_url || '';
    return `<div class="admin-media-editor"><div class="admin-media-editor-head"><h3>${row.id ? 'แก้ไขสื่อรายรายการ' : 'เพิ่มรายการสื่อใหม่'}</h3><button type="button" class="btn btn-plain btn-small" onclick="closeAdminMediaEditor()">ยกเลิก</button></div><div class="form-grid"><div class="field"><label>ประเภทสื่อ</label><select id="adminMediaEditType"><option value="BANNER">แบนเนอร์</option><option value="ADVERTISEMENT">โฆษณา</option><option value="PROMOTION">โปรโมชั่น</option><option value="ADMIN_MEDIA">สื่อผู้ดูแล</option><option value="SYSTEM_MEDIA">สื่อระบบ</option><option value="STORE_LOGO">โลโก้ร้าน</option><option value="STORE_BACKGROUND">พื้นหลังร้าน</option></select></div><div class="field"><label>เจ้าของสื่อ</label><select id="adminMediaEditOwnerType"><option value="admin">Admin</option><option value="system">ระบบ</option><option value="merchant">ร้านค้า</option></select></div><div class="field full"><label>URL รูปภาพ / Public URL</label><input id="adminMediaEditUrl" type="url" placeholder="https://.../banner.jpg" value="${esc(url)}"></div><div class="field"><label>Bucket ID (ถ้ามี)</label><input id="adminMediaEditBucket" value="${esc(row.bucket_id || '')}" placeholder="เช่น media"></div><div class="field"><label>Storage path (ถ้ามี)</label><input id="adminMediaEditPath" value="${esc(row.storage_path || '')}" placeholder="เช่น banners/home.jpg"></div><div class="field"><label>สถานะ</label><select id="adminMediaEditStatus"><option value="ready">พร้อมใช้</option><option value="archived">เก็บถาวร</option></select></div><div class="field"><label>Visibility</label><select id="adminMediaEditVisibility"><option value="public">public</option><option value="private">private</option></select></div><div class="field full"><label>คำอธิบายหรือ metadata (ไม่บังคับ)</label><textarea id="adminMediaEditNote" rows="2" placeholder="บันทึกตำแหน่งการใช้งาน เช่น หน้าแรก / แบนเนอร์โปรโมชัน">${esc(legacy.note || '')}</textarea></div></div><div style="display:flex;justify-content:flex-end;margin-top:10px"><button type="button" class="btn btn-main" onclick="saveAdminMediaAsset()">บันทึกสื่อรายการนี้</button></div></div>`;
  }

  function openMediaEditor(row = {}) {
    const host = q('#adminMediaEditorHost'); if (!host) return;
    state.editingMediaId = row.id || null;
    host.innerHTML = editorMarkup(row);
    q('#adminMediaEditType').value = row.media_type || 'BANNER';
    q('#adminMediaEditOwnerType').value = row.owner_type || 'admin';
    q('#adminMediaEditStatus').value = row.status || 'ready';
    q('#adminMediaEditVisibility').value = row.visibility || 'public';
    host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  window.editAdminMediaAsset = id => { const row = state.media.find(item => String(item.id) === String(id)); if (row) openMediaEditor(row); };
  window.newAdminMediaAsset = () => { if (!isAdmin()) return toast('กรุณาเข้าสู่ระบบ Admin ก่อน', 'warning'); openMediaEditor({}); };
  window.closeAdminMediaEditor = () => { state.editingMediaId = null; const host = q('#adminMediaEditorHost'); if (host) host.innerHTML = ''; };

  async function saveAdminMediaAsset() {
    if (!isAdmin()) return toast('กรุณาเข้าสู่ระบบ Admin ก่อน', 'warning');
    const session = currentSession(); const id = state.editingMediaId;
    const existing = id ? state.media.find(row => String(row.id) === String(id)) : null;
    const url = q('#adminMediaEditUrl')?.value.trim() || '';
    const bucket = q('#adminMediaEditBucket')?.value.trim() || '';
    const path = q('#adminMediaEditPath')?.value.trim() || '';
    const type = q('#adminMediaEditType')?.value || 'BANNER';
    const ownerType = q('#adminMediaEditOwnerType')?.value || 'admin';
    const payload = { owner_id: existing?.owner_id || session.user.id, owner_type: ownerType, media_type: type, bucket_id: bucket, storage_path: path, visibility: q('#adminMediaEditVisibility')?.value || 'public', variant: existing?.variant || 'original', mime_type: existing?.mime_type || (url ? 'image/*' : ''), byte_size: Number(existing?.byte_size || 0), version: Number(existing?.version || 0) + 1 || 1, status: q('#adminMediaEditStatus')?.value || 'ready', legacy_source: { ...(existing?.legacy_source || {}), url, note: q('#adminMediaEditNote')?.value.trim() || '', managed_by: 'admin-media-center' }, updated_at: new Date().toISOString() };
    try {
      if (id) await window.SupabaseSync.request(`media_assets?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(payload) });
      else await window.SupabaseSync.request('media_assets', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify([payload]) });
      toast(id ? 'แก้ไขสื่อรายการนี้แล้ว' : 'เพิ่มรายการสื่อแล้ว', 'success');
      window.closeAdminMediaEditor(); await refreshAdminMediaCenter();
    } catch (error) { toast(`บันทึกสื่อไม่สำเร็จ: ${error.message}`, 'error'); }
  }
  window.saveAdminMediaAsset = saveAdminMediaAsset;

  async function archiveAdminMediaAsset(id) {
    if (!isAdmin()) return toast('กรุณาเข้าสู่ระบบ Admin ก่อน', 'warning');
    const row = state.media.find(item => String(item.id) === String(id)); if (!row) return;
    const next = row.status === 'archived' ? 'ready' : 'archived';
    if (!window.confirm(`${next === 'archived' ? 'เก็บถาวร' : 'เปิดใช้งาน'}สื่อรายการนี้หรือไม่?`)) return;
    try { await window.SupabaseSync.request(`media_assets?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: next, version: Number(row.version || 1) + 1, updated_at: new Date().toISOString() }) }); toast(next === 'archived' ? 'เก็บสื่อเข้าประวัติแล้ว' : 'เปิดใช้สื่อแล้ว', 'success'); await refreshAdminMediaCenter(); }
    catch (error) { toast(`เปลี่ยนสถานะสื่อไม่สำเร็จ: ${error.message}`, 'error'); }
  }
  window.archiveAdminMediaAsset = archiveAdminMediaAsset;

  async function refreshAdminMediaCenter() {
    if (!q('#admin-media-center') || !window.SupabaseSync?.request) return;
    if (!isAdmin()) { const host = q('#adminMediaGrid'); if (host) host.innerHTML = '<div class="admin-media-empty">กรุณาเข้าสู่ระบบ Admin เพื่อดูสื่อจาก Supabase</div>'; return; }
    state.loadingMedia = true; renderMedia();
    try { const rows = await window.SupabaseSync.request('media_assets?select=id,owner_id,owner_type,media_type,bucket_id,storage_path,visibility,variant,mime_type,byte_size,version,status,legacy_source,created_at,updated_at&order=updated_at.desc&limit=500'); state.media = Array.isArray(rows) ? rows : []; }
    catch (error) { state.media = []; const host = q('#adminMediaGrid'); if (host) host.innerHTML = `<div class="admin-media-empty"><strong>โหลดสื่อไม่สำเร็จ</strong><span>${esc(error.message)}</span></div>`; }
    finally { state.loadingMedia = false; renderMedia(); }
  }
  window.refreshAdminMediaCenter = refreshAdminMediaCenter;

  function filteredAccounts() {
    const query = state.accountSearch.trim().toLowerCase();
    return state.accounts.filter(account => {
      const roleMatch = state.accountRole === 'all' || (state.accountRole === 'unassigned' ? !account.roles.length : account.roles.includes(state.accountRole));
      const statusMatch = state.accountStatus === 'all' || account.status === state.accountStatus;
      const text = [account.user_id, account.email, account.display_name, account.phone, account.login_id, account.roles.join(' ')].join(' ').toLowerCase();
      return roleMatch && statusMatch && (!query || text.includes(query));
    });
  }

  function renderAccounts() {
    const host = q('#adminAccountGrid'); if (!host) return;
    const rows = filteredAccounts(); const summary = q('#adminAccountSummary');
    if (summary) summary.textContent = state.loadingAccounts ? 'กำลังโหลดบัญชีจาก Supabase…' : `แสดง ${rows.length} จาก ${state.accounts.length} บัญชี · ระบบไม่ลบ Auth เมื่อกดระงับ`;
    host.innerHTML = rows.length ? rows.map(account => {
      const statusClass = account.status === 'suspended' || account.status === 'disabled' ? 'danger' : account.status === 'pending' ? 'warn' : '';
      const roles = account.roles.length ? account.roles : ['unassigned'];
      const roleOptions = ['customer', 'rider', 'store_owner', 'admin'].map(role => `<option value="${role}" ${roles[0] === role ? 'selected' : ''}>${accountRoleLabel(role)}</option>`).join('');
      const controlText = account.suspension_reason ? `เหตุผล: ${esc(account.suspension_reason)}` : 'ไม่มีเหตุผลการระงับ';
      return `<article class="admin-account-card"><div class="admin-account-head"><div class="admin-account-title"><h3>${esc(account.display_name || account.email || account.login_id || 'บัญชีไม่มีชื่อ')}</h3><p>${esc(account.email || 'ไม่มีอีเมล')} · ${esc(account.user_id)}</p></div><span class="admin-account-badge ${statusClass}">${esc(accountStatusLabel(account.status))}</span></div><div class="admin-account-badges">${roles.map(role => `<span class="admin-account-badge">${esc(accountRoleLabel(role))}</span>`).join('')}</div><div class="admin-account-stat"><div><span>เบอร์โทร</span><b>${esc(account.phone || '—')}</b></div><div><span>Login ID</span><b>${esc(account.login_id || '—')}</b></div></div><div class="admin-account-meta">${esc(controlText)}<br>อัปเดต ${account.updated_at ? esc(new Date(account.updated_at).toLocaleString('th-TH')) : '—'}</div><div class="field" style="margin-top:10px"><label>กำหนดบทบาทหลัก</label><select class="admin-account-role-select" onchange="changeAdminAccountRole('${esc(account.user_id)}',this.value)"><option value="unassigned" ${!roles.length || roles[0] === 'unassigned' ? 'selected' : ''}>ยังไม่กำหนด</option>${roleOptions}</select></div><div class="admin-account-actions"><button type="button" class="btn btn-plain btn-small" onclick="toggleAdminAccountStatus('${esc(account.user_id)}')">${account.status === 'suspended' || account.status === 'disabled' ? 'เปิดใช้งาน' : 'ระงับบัญชี'}</button><button type="button" class="btn btn-danger btn-small" onclick="disableAdminAccount('${esc(account.user_id)}')">ปิดการใช้งาน</button></div></article>`;
    }).join('') : '<div class="admin-account-empty"><strong>ไม่พบบัญชีตามตัวกรอง</strong><span>ลองเปลี่ยนบทบาท สถานะ หรือคำค้นหา</span></div>';
  }

  async function loadAccounts() {
    if (!isAdmin() || !window.SupabaseSync?.request) return;
    state.loadingAccounts = true; renderAccounts();
    try {
      const [profiles, roles, controls] = await Promise.all([
        window.SupabaseSync.request('user_profiles?select=user_id,email,display_name,phone,login_id,updated_at&order=updated_at.desc&limit=500'),
        window.SupabaseSync.request('user_roles?select=user_id,role,created_at&order=created_at.desc&limit=1000'),
        window.SupabaseSync.request('account_controls?select=user_id,status,suspension_reason,feature_overrides,updated_at&limit=500'),
      ]);
      const map = new Map();
      (Array.isArray(profiles) ? profiles : []).forEach(row => map.set(row.user_id, { ...row, roles: [], status: 'active', suspension_reason: '', control_updated_at: null }));
      (Array.isArray(roles) ? roles : []).forEach(row => { const item = map.get(row.user_id) || { user_id: row.user_id, roles: [], status: 'active' }; item.roles = [...new Set([...(item.roles || []), row.role])]; map.set(row.user_id, item); });
      (Array.isArray(controls) ? controls : []).forEach(row => { const item = map.get(row.user_id) || { user_id: row.user_id, roles: [], status: 'active' }; item.status = row.status || 'active'; item.suspension_reason = row.suspension_reason || ''; item.control_updated_at = row.updated_at; item.updated_at = row.updated_at || item.updated_at; map.set(row.user_id, item); });
      state.accounts = [...map.values()];
    } catch (error) {
      state.accounts = [];
      const host = q('#adminAccountGrid'); if (host) host.innerHTML = `<div class="admin-account-empty"><strong>โหลดบัญชีไม่สำเร็จ</strong><span>${esc(error.message)}<br>ตรวจสอบ RLS ของ user_profiles, user_roles และ account_controls</span></div>`;
    } finally { state.loadingAccounts = false; renderAccounts(); }
  }
  window.refreshAdminAccountCenter = loadAccounts;

  async function audit(action, targetId, reason, beforeState, afterState) {
    const actor = currentSession()?.user?.id; if (!actor || !window.SupabaseSync?.request) return;
    try { await window.SupabaseSync.request('admin_action_audit', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify([{ actor_id: actor, target_user_id: targetId, action, reason: reason || '', before_state: beforeState || {}, after_state: afterState || {} }]) }); }
    catch (error) { console.warn('บันทึก audit บัญชีไม่สำเร็จ', error); }
  }

  async function upsertControl(account, status, reason) {
    await window.SupabaseSync.request('account_controls?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ user_id: account.user_id, status, suspension_reason: reason || '', updated_by: currentSession().user.id, updated_at: new Date().toISOString() }]) });
  }
  window.toggleAdminAccountStatus = async userId => {
    if (!isAdmin()) return toast('กรุณาเข้าสู่ระบบ Admin ก่อน', 'warning');
    const account = state.accounts.find(item => String(item.user_id) === String(userId)); if (!account) return;
    const next = account.status === 'suspended' || account.status === 'disabled' ? 'active' : 'suspended';
    const reason = next === 'suspended' ? (window.prompt('ระบุเหตุผลการระงับบัญชี', account.suspension_reason || '') || '') : '';
    if (next === 'suspended' && reason.trim().length < 3) return toast('กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร', 'warning');
    if (!window.confirm(`${next === 'suspended' ? 'ระงับ' : 'เปิดใช้งาน'}บัญชี ${account.email || account.user_id} หรือไม่?`)) return;
    try { const before = { status: account.status, roles: account.roles }; await upsertControl(account, next, reason.trim()); account.status = next; account.suspension_reason = reason.trim(); await audit(next === 'suspended' ? 'suspend_account' : 'activate_account', account.user_id, reason.trim(), before, { status: next }); renderAccounts(); toast(next === 'suspended' ? 'ระงับบัญชีแล้ว' : 'เปิดใช้งานบัญชีแล้ว', 'success'); }
    catch (error) { toast(`เปลี่ยนสถานะบัญชีไม่สำเร็จ: ${error.message}`, 'error'); }
  };
  window.disableAdminAccount = async userId => {
    if (!isAdmin()) return toast('กรุณาเข้าสู่ระบบ Admin ก่อน', 'warning');
    const account = state.accounts.find(item => String(item.user_id) === String(userId)); if (!account) return;
    const reason = window.prompt('ระบุเหตุผลการปิดใช้งานบัญชี', account.suspension_reason || 'ปิดใช้งานโดย Admin') || '';
    if (reason.trim().length < 3 || !window.confirm(`ปิดการใช้งานบัญชี ${account.email || account.user_id} หรือไม่?`)) return;
    try { const before = { status: account.status, roles: account.roles }; await upsertControl(account, 'disabled', reason.trim()); account.status = 'disabled'; account.suspension_reason = reason.trim(); await audit('disable_account', account.user_id, reason.trim(), before, { status: 'disabled' }); renderAccounts(); toast('ปิดการใช้งานบัญชีแล้ว', 'success'); }
    catch (error) { toast(`ปิดบัญชีไม่สำเร็จ: ${error.message}`, 'error'); }
  };

  window.changeAdminAccountRole = async (userId, role) => {
    if (!isAdmin()) return toast('กรุณาเข้าสู่ระบบ Admin ก่อน', 'warning');
    const account = state.accounts.find(item => String(item.user_id) === String(userId)); if (!account) return;
    const oldRoles = [...account.roles]; const nextRoles = role === 'unassigned' ? [] : [role];
    if (oldRoles.join(',') === nextRoles.join(',')) return;
    if (!window.confirm(`เปลี่ยนบทบาท ${account.email || account.user_id} เป็น “${role === 'unassigned' ? 'ยังไม่กำหนด' : accountRoleLabel(role)}” หรือไม่?`)) { renderAccounts(); return; }
    try {
      for (const oldRole of oldRoles) await window.SupabaseSync.request(`user_roles?user_id=eq.${encodeURIComponent(userId)}&role=eq.${encodeURIComponent(oldRole)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      if (nextRoles.length) await window.SupabaseSync.request('user_roles', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify([{ user_id: userId, role: nextRoles[0] }]) });
      account.roles = nextRoles; await audit('change_account_role', userId, `บทบาทเดิม ${oldRoles.join(',') || 'ไม่กำหนด'} → ${role}`, { roles: oldRoles }, { roles: nextRoles }); renderAccounts(); toast('เปลี่ยนบทบาทบัญชีแล้ว', 'success');
    } catch (error) { toast(`เปลี่ยนบทบาทไม่สำเร็จ: ${error.message}`, 'error'); renderAccounts(); }
  };

  function install() {
    if (state.initialized) return true;
    if (!q('#adminTabs') || !q('#admin-admins') || !window.SupabaseSync) return false;
    ensureStyle(); ensureMediaSection(); ensureAccountSection(); ensureContentSyncControl();
    state.initialized = true;
    loadContentConfig();
    return true;
  }
  const tryInstall = () => { if (!install()) window.setTimeout(tryInstall, 150); };
  window.AdminMediaCenter = { refresh: refreshAdminMediaCenter, syncContentConfig, loadContentConfig };
  window.AdminAccountCenter = { refresh: loadAccounts };
  window.setTimeout(tryInstall, 0);
})();
