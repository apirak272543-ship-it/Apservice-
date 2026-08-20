(() => {
  'use strict';

  const page = document.body?.dataset?.page;
  const query = new URLSearchParams(location.search);
  const appHost = () => document.querySelector('[data-page-content]');
  const safeText = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const safeImage = value => /^https?:\/\//i.test(String(value || '').trim()) ? String(value).trim() : '';

  const renderFallback = ({ title, detail, href, label }) => {
    const host = appHost();
    if (!host) return;
    host.innerHTML = `<section class="mpa-card mpa-state" role="status"><h1>${safeText(title)}</h1><p>${safeText(detail)}</p><a class="mpa-button" href="${href}">${safeText(label)}</a></section>`;
    window.setTimeout(() => {
      if (!new URLSearchParams(location.search).get('id')) location.replace(href);
    }, 3000);
  };

  if (page === 'store' && !query.get('id')) renderFallback({ title: 'ไม่พบรหัสร้านค้า', detail: 'ลิงก์นี้ไม่มีข้อมูลร้านที่ต้องการเปิด เราจะพาคุณกลับไปเลือกร้านค้าทั้งหมดภายใน 3 วินาที', href: 'stores.html', label: 'กลับไปร้านค้าทั้งหมด' });
  if (page === 'order' && !query.get('id')) renderFallback({ title: 'ไม่พบรหัสออร์เดอร์', detail: 'ลิงก์นี้ไม่มีข้อมูลออร์เดอร์ที่ต้องการเปิด เราจะพาคุณกลับไปดูประวัติออร์เดอร์ภายใน 3 วินาที', href: 'orders.html', label: 'ดูประวัติออร์เดอร์ของฉัน' });

  if (page !== 'marketplace-chat') return;
  const listingId = query.get('listing') || query.get('item_id');
  if (!listingId) {
    const host = appHost();
    if (host) host.innerHTML = '<section class="mpa-card mpa-state" role="status"><h1>ไม่พบรายการสินค้า</h1><p>กรุณาเปิดแชตจากหน้ารายละเอียดสินค้า</p><a class="mpa-button" href="marketplace.html">กลับตลาด AP Service</a></section>';
    return;
  }

  const injectListingContext = async () => {
    const thread = document.getElementById('marketThread');
    if (!thread || document.getElementById('marketplaceChatListingContext')) return;
    const request = window.APServiceMPA?.request;
    if (!request) return;
    try {
      const rows = await request(`marketplace_listings?select=id,title,price,image_url,seller_name,status&id=eq.${encodeURIComponent(listingId)}&limit=1`, { private: true, cacheTtlMs: 15_000, cacheKey: `marketplace-chat-context:${listingId}` });
      const listing = rows?.[0];
      if (!listing) return;
      const image = safeImage(listing.image_url);
      const context = document.createElement('section');
      context.id = 'marketplaceChatListingContext';
      context.className = 'mpa-card';
      context.style.cssText = 'display:flex;align-items:center;gap:12px;margin:0 0 12px;padding:12px';
      context.innerHTML = `<div style="width:52px;height:52px;border-radius:12px;overflow:hidden;display:grid;place-items:center;background:#edf8f5;flex:0 0 52px">${image ? `<img src="${safeText(image)}" alt="" style="width:100%;height:100%;object-fit:cover" onerror="this.remove()">` : '🛍️'}</div><div style="min-width:0"><strong style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${safeText(listing.title)}</strong><span class="mpa-muted">${Number.isFinite(Number(listing.price)) ? Number(listing.price).toLocaleString('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }) : 'ราคาไม่พร้อม'} · ผู้ขาย ${safeText(listing.seller_name || 'สมาชิก AP Service')}</span></div>`;
      thread.before(context);
    } catch (_) {
      // The conversation remains usable even if optional listing context fails.
    }
  };
  const observer = new MutationObserver(() => { void injectListingContext(); });
  observer.observe(document.body, { childList: true, subtree: true });
  void injectListingContext();
  addEventListener('pagehide', () => observer.disconnect(), { once: true });
})();
