(() => {
  'use strict';
  const M = window.APServiceMPA;
  if (!M || document.body?.dataset?.page !== 'profile') return;
  const $ = (selector, root = document) => root.querySelector(selector);
  const h = M.ui.escapeHtml;
  const page = document.body.dataset.page;
  const fallbackName = 'ลูกค้า AP Service';
  const safe = value => String(value ?? '').trim();
  const initials = value => safe(value).split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'AS';
  const date = value => value ? new Date(value).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' }) : 'ไม่ระบุ';
  const statusLabel = value => ({ pending: 'กำลังดำเนินการ', preparing: 'กำลังเตรียมสินค้า', delivering: 'กำลังจัดส่ง', delivered: 'สำเร็จ', completed: 'สำเร็จ', cancelled: 'ยกเลิก', canceled: 'ยกเลิก' }[String(value || '').toLowerCase()] || safe(value) || 'รอตรวจสอบ');
  const statusClass = value => `is-${String(value || '').toLowerCase().replace(/[^a-z]+/g, '-') || 'pending'}`;
  const renderError = message => `<div class="account-center-error" role="alert"><strong>ไม่สามารถโหลดข้อมูลส่วนนี้ได้</strong><span>${h(message || 'กรุณาลองใหม่อีกครั้ง')}</span><button class="mpa-button mpa-button-secondary" type="button" data-account-retry>ลองใหม่</button></div>`;
  const count = async (path, key) => { try { return await M.requestCount(path, { private: true, cacheTtlMs: 15_000, cacheKey: `profile-account-count:${key}` }); } catch (_) { return null; } };
  const load = async user => {
    const id = encodeURIComponent(user.id);
    const [profileRows, orders, addresses, notifications, avatar] = await Promise.all([
      M.request(`user_profiles?select=display_name,phone,email,address,created_at&user_id=eq.${id}&limit=1`, { private: true, cacheTtlMs: 15_000, cacheKey: `profile-account:${user.id}` }).catch(() => []),
      M.request(`delivery_orders?select=id,order_id,store_name,status,payable,total,ordered_at&customer_id=eq.${id}&order=ordered_at.desc&limit=3`, { private: true, cacheTtlMs: 15_000, cacheKey: `profile-account-orders:${user.id}` }).catch(() => []),
      M.request(`customer_addresses?select=id,label,address_line,is_default,updated_at&user_id=eq.${id}&archived_at=is.null&order=is_default.desc,updated_at.desc&limit=3`, { private: true, cacheTtlMs: 15_000, cacheKey: `profile-account-addresses:${user.id}` }).catch(() => []),
      M.request(`mobile_notifications?select=id,title,read_at,created_at&recipient_id=eq.${id}&order=created_at.desc&limit=3`, { private: true, cacheTtlMs: 15_000, cacheKey: `profile-account-notifications:${user.id}` }).catch(() => []),
      M.request(`media_assets?select=id,storage_path,bucket_id,version,mime_type,status,created_at&owner_id=eq.${id}&media_type=eq.USER_AVATAR&status=eq.ready&order=created_at.desc&limit=1`, { private: true, cacheTtlMs: 15_000, cacheKey: `profile-account-avatar:${user.id}` }).catch(() => [])
    ]);
    const [orderCount, addressCount, notificationCount] = await Promise.all([
      count(`delivery_orders?customer_id=eq.${id}`, `orders:${user.id}`),
      count(`customer_addresses?user_id=eq.${id}&archived_at=is.null`, `addresses:${user.id}`),
      count(`mobile_notifications?recipient_id=eq.${id}&read_at=is.null`, `notifications:${user.id}`)
    ]);
    const profile = profileRows?.[0] || {};
    let avatarUrl = '';
    if (avatar?.[0]) { try { const media = await M.request(`media_assets?id=eq.${encodeURIComponent(avatar[0].id)}&select=id,bucket_id,storage_path,visibility,version,status,mime_type,byte_size,width,height,media_type&limit=1`, { private: true, cacheTtlMs: 15_000, cacheKey: `profile-account-avatar-meta:${user.id}` }); const asset = media?.[0]; if (asset?.visibility === 'public') avatarUrl = `${M.config.url}/storage/v1/object/public/${encodeURIComponent(asset.bucket_id)}/${asset.storage_path.split('/').map(encodeURIComponent).join('/')}?v=${encodeURIComponent(asset.version || 1)}`; } catch (_) {} }
    return { user, profile, orders: orders || [], addresses: addresses || [], notifications: notifications || [], avatarUrl, counts: { orders: orderCount, addresses: addressCount, notifications: notificationCount } };
  };
  const skeleton = () => `<div class="account-center-skeleton"><span></span><span></span><span></span><span></span></div>`;
  const stat = (icon, label, value, href) => `<a class="account-stat" href="${h(href)}"><span class="account-stat-icon" aria-hidden="true">${icon}</span><span><small>${h(label)}</small><strong>${value == null ? '—' : h(value)}</strong></span></a>`;
  const action = (icon, title, detail, href, anchor = false) => `<a class="account-action" href="${h(href)}"${anchor ? ` data-account-anchor="${h(anchor)}"` : ''}><span class="account-action-icon" aria-hidden="true">${icon}</span><span><strong>${h(title)}</strong><small>${h(detail)}</small></span><b aria-hidden="true">›</b></a>`;
  const sectionHead = (title, detail, href = '') => `<div class="account-section-head"><div><h2>${h(title)}</h2><p>${h(detail)}</p></div>${href ? `<a href="${h(href)}">ดูทั้งหมด <span aria-hidden="true">→</span></a>` : ''}</div>`;
  const render = data => {
    const { user, profile, orders, addresses, notifications, avatarUrl, counts } = data;
    const name = safe(profile.display_name || user.user_metadata?.display_name) || fallbackName;
    const email = safe(profile.email || user.email);
    const editor = $('#profileForm');
    const locationEditor = $('#profileLocationStatus')?.closest('section');
    const editorWrap = document.createElement('details'); editorWrap.className = 'account-editor'; editorWrap.id = 'accountEditor'; editorWrap.innerHTML = '<summary><span>แก้ไขข้อมูลส่วนตัวและที่อยู่</span><b aria-hidden="true">⌄</b></summary><div class="account-editor-body"></div>';
    editorWrap.querySelector('.account-editor-body').append(editor); if (locationEditor) editorWrap.querySelector('.account-editor-body').append(locationEditor);
    const avatar = avatarUrl ? `<img src="${h(avatarUrl)}" alt="รูปโปรไฟล์ของ ${h(name)}" loading="eager">` : `<span aria-hidden="true">${h(initials(name))}</span>`;
    const orderMarkup = orders.length ? orders.map(order => `<a class="account-order-row" href="order.html?id=${encodeURIComponent(order.id)}"><span class="account-order-icon" aria-hidden="true">📦</span><span><strong>${h(order.store_name || 'AP Service')}</strong><small>${h(order.order_id || order.id || '-')} · ${h(date(order.ordered_at))}</small></span><span class="account-order-end"><b>${h(M.ui.baht(order.payable ?? order.total ?? 0))}</b><em class="account-status ${statusClass(order.status)}">${h(statusLabel(order.status))}</em></span></a>`).join('') : `<div class="account-empty"><span aria-hidden="true">📦</span><strong>คุณยังไม่มีคำสั่งซื้อ</strong><small>บริการที่คุณใช้จะแสดงที่นี่</small><a class="mpa-button mpa-button-secondary" href="stores.html">เริ่มสั่งซื้อ</a></div>`;
    const addressMarkup = addresses.length ? addresses.map(address => `<article class="account-address-row"><span class="account-address-icon" aria-hidden="true">${address.is_default ? '⭐' : '🏠'}</span><span><strong>${h(address.label || 'ที่อยู่จัดส่ง')}</strong><small>${h(address.address_line || 'ยังไม่มีรายละเอียดที่อยู่')}</small></span>${address.is_default ? '<em>ที่อยู่หลัก</em>' : ''}</article>`).join('') : `<div class="account-empty account-empty-inline"><span aria-hidden="true">📍</span><strong>ยังไม่มีที่อยู่จัดส่ง</strong><small>เพิ่มที่อยู่เพื่อสั่งบริการได้รวดเร็วยิ่งขึ้น</small></div>`;
    const noticeMarkup = notifications.length ? notifications.map(note => `<a class="account-notice-row" href="notifications.html"><span aria-hidden="true">🔔</span><span><strong>${h(note.title || 'การแจ้งเตือนจาก AP Service')}</strong><small>${h(date(note.created_at))}</small></span>${!note.read_at ? '<i aria-label="ยังไม่ได้อ่าน"></i>' : ''}</a>`).join('') : `<div class="account-empty account-empty-inline"><span aria-hidden="true">🔔</span><strong>ยังไม่มีการแจ้งเตือนใหม่</strong><small>สถานะออร์เดอร์และข่าวสารจะแสดงที่นี่</small></div>`;
    const root = document.createElement('div'); root.className = 'account-center'; root.innerHTML = `<section class="account-hero"><div class="account-hero-top"><span class="account-kicker">MY AP SERVICE</span><a class="account-icon-button" href="privacy.html" aria-label="ตั้งค่าความเป็นส่วนตัว">⚙</a></div><div class="account-hero-main"><div class="account-avatar" data-account-avatar>${avatar}</div><div class="account-identity"><h2>${h(name)}</h2><p><span class="account-verified" aria-hidden="true">✓</span> สมาชิก AP Service</p><small>${h(email)}${profile.phone ? ` · ${h(profile.phone)}` : ''}</small></div></div><div class="account-hero-actions"><button class="mpa-button" type="button" data-account-edit>แก้ไขโปรไฟล์</button><label class="mpa-button mpa-button-secondary account-avatar-upload">เปลี่ยนรูป<input type="file" accept="image/jpeg,image/png,image/webp" data-account-avatar-input hidden></label></div></section><div class="account-stats" aria-label="สรุปบัญชี">${stat('📦','คำสั่งซื้อ',counts.orders,'orders.html')}${stat('📍','ที่อยู่',counts.addresses,'#accountAddresses')}${stat('🔔','แจ้งเตือน',counts.notifications,'notifications.html')}</div><section class="account-section account-quick-section">${sectionHead('ทางลัดของฉัน','เข้าถึงสิ่งที่ใช้บ่อยได้ในครั้งเดียว')}<div class="account-actions-grid">${action('📦','คำสั่งซื้อของฉัน','ติดตามและดูประวัติออร์เดอร์','orders.html')}${action('📍','ที่อยู่ของฉัน','จัดการที่อยู่จัดส่ง','#accountAddresses','accountAddresses')}${action('🔔','การแจ้งเตือน','ดูสถานะและข่าวสาร','notifications.html')}${action('❓','ช่วยเหลือ','ติดต่อ AP Service','support.html')}</div></section><section class="account-section account-orders-section">${sectionHead('คำสั่งซื้อของฉัน','รายการล่าสุดของคุณ','orders.html')}<div class="account-order-list">${orderMarkup}</div></section><section class="account-section" id="accountAddresses">${sectionHead('ที่อยู่ของฉัน','ที่อยู่จัดส่งที่บันทึกไว้')}<div class="account-address-list">${addressMarkup}</div><button class="mpa-button mpa-button-secondary account-add-address" type="button" data-account-edit>＋ เพิ่มหรือแก้ไขที่อยู่</button></section><section class="account-section" id="accountNotifications">${sectionHead('การแจ้งเตือน','ข่าวสารและสถานะการให้บริการ','notifications.html')}<div class="account-notice-list">${noticeMarkup}</div></section><section class="account-section">${sectionHead('ความเป็นส่วนตัวและความปลอดภัย','จัดการข้อมูลและการเข้าถึงบัญชี')}<div class="account-setting-list">${action('🔐','ความปลอดภัยบัญชี','PIN และการยืนยันอีเมล','privacy.html')}${action('📄','นโยบายความเป็นส่วนตัว','อ่านสิทธิ์และการใช้ข้อมูล','privacy.html')}${action('📍','การอนุญาต Location','จัดการจากข้อมูลตำแหน่งในโปรไฟล์','#accountEditor','accountEditor')}</div></section><section class="account-section account-help-section">${sectionHead('ช่วยเหลือ','หากมีปัญหา ให้ติดต่อ AP Service ได้ทันที')}<div class="account-actions-grid account-help-grid">${action('💬','ติดต่อ AP Service','ส่งคำถามหรือปัญหา','support.html')}${action('📖','คำถามที่พบบ่อย','คำแนะนำการใช้งาน','support.html')}</div></section><section class="account-about"><strong>AP Service</strong><span>ศูนย์กลางบัญชีลูกค้า · ข้อมูลจากระบบจริง</span><a href="privacy.html">ข้อกำหนดและนโยบายความเป็นส่วนตัว</a></section></div>`;
    const profileHost = $('#profile'); profileHost.innerHTML = ''; profileHost.append(root, editorWrap);
    root.querySelectorAll('[data-account-edit]').forEach(button => button.addEventListener('click', () => { editorWrap.open = true; editorWrap.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    root.querySelectorAll('[data-account-anchor]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); document.getElementById(link.dataset.accountAnchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    root.querySelector('[data-account-avatar-input]')?.addEventListener('change', event => uploadAvatar(event.target.files?.[0], user, root.querySelector('[data-account-avatar]')));
    profileHost.querySelector('[data-account-retry]')?.addEventListener('click', () => location.reload());
  };
  async function uploadAvatar(file, user, target) {
    if (!file || !window.APServiceMedia?.uploadPublicImage) return;
    try { const session = await M.auth.refreshSession(false); const uploaded = await window.APServiceMedia.uploadPublicImage(file, { ...M.config, accessToken: session?.access_token, actorId: user.id, bucket: 'catalog-media', scope: 'customer-avatar', pathPrefix: 'customer', mediaType: 'USER_AVATAR', ownerType: 'customer', variant: 'profile' }); if (target) target.innerHTML = `<img src="${h(uploaded.publicUrl)}" alt="รูปโปรไฟล์ที่อัปโหลด" loading="eager">`; M.ui.setNotice('เปลี่ยนรูปโปรไฟล์แล้ว'); } catch (error) { M.ui.setNotice(error.message || 'เปลี่ยนรูปโปรไฟล์ไม่สำเร็จ', 'error'); }
  }
  async function mount() {
    const host = $('#profile'); if (!host || host.dataset.accountCenterMounted === 'true') return;
    const editor = $('#profileForm'); if (!editor) return;
    host.dataset.accountCenterMounted = 'true'; host.insertAdjacentHTML('afterbegin', skeleton());
    try { const user = await M.auth.currentUser(); if (!user) throw new Error('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'); render(await load(user)); } catch (error) { host.innerHTML = renderError(error.message); host.querySelector('[data-account-retry]')?.addEventListener('click', () => location.reload()); }
  }
  const start = () => { const observer = new MutationObserver(() => { if ($('#profileForm') && !$('#profile')?.dataset.accountCenterMounted) { window.setTimeout(mount, 850); observer.disconnect(); } }); observer.observe(document.body, { childList: true, subtree: true }); window.setTimeout(() => { if ($('#profileForm')) mount(); }, 1400); };
  start();
})();
