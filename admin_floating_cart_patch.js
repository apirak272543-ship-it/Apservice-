(function(){
  'use strict';
  const $ = selector => document.querySelector(selector);
  const money = val => '฿' + Number(val || 0).toLocaleString('th-TH');
  const getCart = () => Array.isArray(window.AppState?.cart) ? window.AppState.cart : [];
  const esc = value => typeof window.escapeHtml === 'function' ? window.escapeHtml(value) : String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function initGlobalFloatingCart() {
    if ($('#apFloatingCart')) return;
    const fab = document.createElement('div');
    fab.id = 'apFloatingCart';
    fab.className = 'ap-floating-cart-fab';
    fab.innerHTML = `
      <button type="button" class="ap-cart-trigger" onclick="toggleCartPopup()" aria-label="เปิดตะกร้าสินค้า">
        <span aria-hidden="true">🛒</span> <span id="apCartBadge" class="ap-cart-badge">0</span>
      </button>
    `;
    document.body.appendChild(fab);

    const overlay = document.createElement('div');
    overlay.id = 'apCartModal';
    overlay.className = 'modal-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="modal ap-cart-popup-modal" role="dialog" aria-modal="true" aria-labelledby="apCartPopupTitle">
        <div class="modal-head">
          <div class="ap-cart-popup-heading">
            <h2 id="apCartPopupTitle">ตะกร้าสินค้าของคุณ</h2>
            <p>ตรวจสอบรายการและจำนวนชิ้นก่อนยืนยัน</p>
          </div>
          <button type="button" class="modal-close" onclick="toggleCartPopup()" aria-label="ปิด">×</button>
        </div>
        <div id="apCartPopupItems" class="ap-cart-popup-items"></div>
        <div class="ap-cart-popup-summary">
          <div class="ap-cart-subtotal"><span>รวมค่าสินค้า (ยังไม่รวมค่าส่ง)</span><span id="apCartPopupSubtotal">฿0</span></div>
          <small class="sub">ค่าจัดส่ง ระยะทาง และส่วนลดจะคำนวณในขั้นตอนสรุปบิลถัดไป</small>
        </div>
        <div class="ap-cart-popup-actions">
          <button type="button" class="btn btn-plain" onclick="toggleCartPopup()">เลือกซื้อเพิ่ม</button>
          <button type="button" class="btn btn-main" onclick="proceedToCheckoutSummary()">ไปยืนยันรายการ (สรุปบิล &amp; ค่าส่ง)</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const style = document.createElement('style');
    style.id = 'apFloatingCartStyles';
    style.textContent = `
      /* Global floating cart: intentionally visible even when the cart is empty. */
      .ap-floating-cart-fab{position:fixed!important;right:max(18px,env(safe-area-inset-right))!important;bottom:max(24px,calc(env(safe-area-inset-bottom) + 18px))!important;z-index:2147483000!important;display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
      .ap-cart-trigger{position:relative;width:60px;height:60px;border-radius:30px;background:var(--brand);color:#fff;border:0;font-size:26px;line-height:1;box-shadow:0 6px 20px rgba(11,140,124,.4);cursor:pointer;display:grid;place-items:center;transition:transform .2s ease,box-shadow .2s ease}
      .ap-cart-trigger:hover{transform:scale(1.06);box-shadow:0 8px 24px rgba(11,140,124,.5)}
      .ap-cart-trigger:active{transform:scale(.96)}
      .ap-cart-badge{position:absolute;top:-5px;right:-5px;background:#ef4444;color:#fff;font-size:12px;line-height:18px;font-weight:900;padding:1px 6px;border-radius:12px;border:2px solid #fff;min-width:22px;text-align:center}
      .ap-cart-popup-modal{max-width:520px;width:min(92%,520px);max-height:min(88vh,720px);overflow:auto}
      .ap-cart-popup-heading{min-width:0}
      .ap-cart-popup-heading h2{overflow-wrap:anywhere}
      .ap-cart-popup-items{max-height:45vh;overflow-y:auto;padding-right:4px;margin-bottom:14px}
      .ap-cart-popup-summary{border-top:1px solid var(--line);padding-top:12px;margin-bottom:14px}
      .ap-cart-subtotal{display:flex;justify-content:space-between;gap:12px;font-size:15px;font-weight:700;flex-wrap:wrap}
      .ap-cart-subtotal span:last-child{color:var(--brand);white-space:nowrap}
      .ap-cart-popup-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}
      .cart-row{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)}
      .cart-row strong,.cart-row small{overflow-wrap:anywhere}
      .qty{display:flex;align-items:center;gap:6px;flex:0 0 auto}
      .qty button{width:28px;height:28px;border-radius:8px;border:1px solid var(--line);background:#fff;font-weight:700;cursor:pointer}
      #view-storefront .grid-2{grid-template-columns:1fr!important}
      #view-storefront aside.panel.cart{display:none!important}

      /* Shared mobile overflow protections for detail pages, admin tables and action rows. */
      html,body{max-width:100%;overflow-x:hidden}
      img,video,canvas,svg{max-width:100%}
      button,.btn,input,select,textarea{max-width:100%;box-sizing:border-box}
      .panel,.card,.modal,.modal-head,.section-head,.form-grid,.field,.toolbar,.actions,.store-detail-body,.store-detail-section-title{min-width:0}
      .section-head{flex-wrap:wrap;gap:10px}
      .section-head>div{min-width:0;flex:1 1 220px}
      .section-head h1,.section-head h2,.section-head h3,.modal-head h1,.modal-head h2,.modal-head h3{overflow-wrap:anywhere;word-break:break-word}
      .table-wrap{width:100%;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
      .table-wrap table{min-width:640px}
      .table-wrap th,.table-wrap td{overflow-wrap:anywhere;word-break:break-word}
      .form-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))}
      .field.full{min-width:0;grid-column:1/-1}
      .field label{overflow-wrap:anywhere}
      .actions,.toolbar,.section-actions,.store-detail-action-row{display:flex;flex-wrap:wrap;min-width:0}
      .actions>* ,.toolbar>* ,.section-actions>*{min-width:0;max-width:100%}
      .admin-tabs,.tabs,.store-detail-tabs,.ap-category-chips{max-width:100%;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:thin}
      .admin-tabs button,.tabs button,.store-detail-tabs button,.ap-category-chips button{flex:0 0 auto;white-space:nowrap}
      .store-reference-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))}
      .store-detail-form,.store-detail-moderation,.store-detail-media-picker{min-width:0;max-width:100%}
      .store-detail-media-picker .media-source-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}
      .store-detail-media-picker .media-source-actions .btn{min-width:0;white-space:normal;overflow-wrap:anywhere}
      .food-grid,.store-grid,.market-grid,.grid-2{min-width:0}
      .food,.store,.market-card,.store-card{min-width:0;max-width:100%}
      .food h3,.store h3,.market-card h3,.store-card h3{overflow-wrap:anywhere;word-break:break-word}

      @media(max-width:768px){
        body{font-size:14px}
        .grid-2{grid-template-columns:1fr!important;gap:12px!important}
        .panel{padding:14px!important;border-radius:14px!important}
        .modal{padding:16px!important;width:min(95%,560px)!important;max-height:90vh!important;overflow-y:auto!important}
        .modal-head{align-items:flex-start;gap:8px}
        .modal-head>div{min-width:0;flex:1 1 auto}
        input,select,textarea{font-size:16px!important}
        .btn{padding:10px 14px!important;font-size:13px!important;line-height:1.35;white-space:normal;overflow-wrap:anywhere}
        .section-head{align-items:stretch}
        .section-head>button,.section-head>.btn,.section-head input,.section-head select{width:100%;flex:1 1 100%}
        .actions,.toolbar,.section-actions,.store-detail-action-row{align-items:stretch}
        .actions>* ,.toolbar>* ,.section-actions>* ,.store-detail-action-row>*{flex:1 1 145px;width:100%}
        .table-wrap table{min-width:580px}
        .form-grid{grid-template-columns:1fr!important}
        .field.full{grid-column:auto}
        .store-detail-body{padding:15px 14px max(20px,env(safe-area-inset-bottom))}
        .store-detail-media-picker .media-source-actions{grid-template-columns:1fr}
        .store-detail-media-picker .media-source-actions .btn{width:100%}
        .ap-floating-cart-fab{right:max(14px,env(safe-area-inset-right))!important;bottom:max(16px,calc(env(safe-area-inset-bottom) + 14px))!important}
        .ap-cart-trigger{width:56px;height:56px;font-size:23px}
        .ap-cart-popup-actions{display:grid;grid-template-columns:1fr;gap:8px}
        .ap-cart-popup-actions .btn{width:100%}
        .cart-row{grid-template-columns:auto minmax(0,1fr);align-items:start}
        .cart-row .qty{grid-column:2;justify-content:flex-start;margin-top:2px}
      }
      @media(max-width:390px){
        .panel{padding:12px!important}
        .modal{padding:13px!important}
        .store-detail-tabs{padding-left:10px;padding-right:10px}
        .ap-cart-popup-modal{width:calc(100% - 20px)}
      }
      @media(prefers-reduced-motion:reduce){.ap-cart-trigger{transition:none}}
    `;
    document.head.appendChild(style);
  }

  window.toggleCartPopup = () => {
    const modal = $('#apCartModal');
    if (!modal) return;
    const isOpen = modal.classList.contains('open');
    if (isOpen) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    } else {
      renderCartPopupContent();
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
    }
  };

  window.renderCartPopupContent = () => {
    const cart = getCart();
    const totalQty = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);

    const badge = $('#apCartBadge');
    if (badge) badge.textContent = totalQty;
    const fab = $('#apFloatingCart');
    if (fab) {
      fab.style.setProperty('display', 'block', 'important');
      fab.style.setProperty('visibility', 'visible', 'important');
    }

    const itemsContainer = $('#apCartPopupItems');
    if (itemsContainer) {
      itemsContainer.innerHTML = cart.length ? cart.map(item => `
        <div class="cart-row">
          <span style="font-size:22px" aria-hidden="true">${item.emoji || '🍽️'}</span>
          <div><strong>${esc(item.name)}</strong><small style="display:block;color:var(--muted)">${money(item.price)} × ${item.qty}</small></div>
          <div class="qty"><button type="button" onclick="adjustCartPopup('${esc(item.id)}',-1)" aria-label="ลดจำนวน">−</button><b>${item.qty}</b><button type="button" onclick="adjustCartPopup('${esc(item.id)}',1)" aria-label="เพิ่มจำนวน">+</button></div>
        </div>
      `).join('') : '<p class="sub" style="text-align:center;padding:24px 0">ตะกร้าสินค้าว่างเปล่า ลองเลือกเมนูอร่อยจากร้านได้เลย</p>';
    }

    const subtotalEl = $('#apCartPopupSubtotal');
    if (subtotalEl) subtotalEl.textContent = money(subtotal);
  };

  window.adjustCartPopup = (id, delta) => {
    if (typeof window.adjustCart === 'function') window.adjustCart(id, delta);
    renderCartPopupContent();
  };

  window.proceedToCheckoutSummary = () => {
    const cart = getCart();
    if (!cart.length) {
      if (window.UI?.toast) UI.toast('กรุณาเลือกสินค้าใส่ตะกร้าก่อน');
      return;
    }
    toggleCartPopup();
    if (!location.hash.includes('storefront') && window.AppState?.activeStoreId && typeof window.openStore === 'function') {
      openStore(AppState.activeStoreId);
    } else {
      const activeStore = (window.AppState?.stores || []).find(store => store.foods?.some(food => cart.some(item => item.foodId === food.id)));
      if (activeStore && !document.querySelector('#view-storefront.active') && typeof window.openStore === 'function') openStore(activeStore.id);
    }
    setTimeout(() => {
      const checkoutPanel = document.querySelector('#view-storefront aside.panel.cart');
      if (checkoutPanel) {
        checkoutPanel.style.display = 'block';
        checkoutPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
    if (window.UI?.toast) UI.toast('ตรวจสอบจุดจัดส่งและยืนยันคำสั่งซื้อด้านล่างได้เลยครับ');
  };

  const baseRenderCart = window.renderCart;
  window.renderCart = function(){
    if (typeof baseRenderCart === 'function') baseRenderCart();
    renderCartPopupContent();
  };

  const boot = () => { initGlobalFloatingCart(); renderCartPopupContent(); };
  document.addEventListener('DOMContentLoaded', boot, { once:true });
  if (document.readyState === 'complete' || document.readyState === 'interactive') boot();
})();
