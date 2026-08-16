(function(){
  'use strict';
  const $ = selector => document.querySelector(selector);
  const money = val => '฿' + Number(val || 0).toLocaleString('th-TH');

  function initGlobalFloatingCart() {
    if ($('#apFloatingCart')) return;
    const fab = document.createElement('div');
    fab.id = 'apFloatingCart';
    fab.className = 'ap-floating-cart-fab';
    fab.innerHTML = `
      <button type="button" class="ap-cart-trigger" onclick="toggleCartPopup()" aria-label="ตะกร้าสินค้า">
        🛒 <span id="apCartBadge" class="ap-cart-badge">0</span>
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
          <div>
            <h2 id="apCartPopupTitle">ตะกร้าสินค้าของคุณ</h2>
            <p>ตรวจสอบรายการและจำนวนชิ้นก่อนยืนยัน</p>
          </div>
          <button type="button" class="modal-close" onclick="toggleCartPopup()" aria-label="ปิด">×</button>
        </div>
        <div id="apCartPopupItems" style="max-height:45vh;overflow-y:auto;padding-right:4px;margin-bottom:14px"></div>
        <div style="border-top:1px solid var(--line);padding-top:12px;margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700">
            <span>รวมค่าสินค้า (ยังไม่รวมค่าส่ง)</span>
            <span id="apCartPopupSubtotal" style="color:var(--brand)">฿0</span>
          </div>
          <small class="sub" style="display:block;margin-top:4px">ค่าจัดส่ง ระยะทาง และส่วนลดจะคำนวณในขั้นตอนสรุปบิลถัดไป</small>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap">
          <button type="button" class="btn btn-plain" onclick="toggleCartPopup()">เลือกซื้อเพิ่ม</button>
          <button type="button" class="btn btn-main" onclick="proceedToCheckoutSummary()">ไปยืนยันรายการ (สรุปบิล & ค่าส่ง)</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const style = document.createElement('style');
    style.textContent = `
      .ap-floating-cart-fab{position:fixed;bottom:24px;right:24px;z-index:99999}
      .ap-cart-trigger{position:relative;width:60px;height:60px;border-radius:30px;background:var(--brand);color:#fff;border:none;font-size:26px;box-shadow:0 6px 20px rgba(11,140,124,.4);cursor:pointer;display:grid;place-items:center;transition:transform .2s ease}
      .ap-cart-trigger:hover{transform:scale(1.06)}
      .ap-cart-badge{position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;font-size:12px;font-weight:900;padding:2px 7px;border-radius:12px;border:2px solid #fff;min-width:22px;text-align:center}
      .ap-cart-popup-modal{max-width:520px;width:92%}
      .cart-row{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)}
      .qty{display:flex;align-items:center;gap:6px}
      .qty button{width:28px;height:28px;border-radius:8px;border:1px solid var(--line);background:#fff;font-weight:700;cursor:pointer}
      #view-storefront .grid-2{grid-template-columns:1fr!important}
      #view-storefront aside.panel.cart{display:none!important}
      
      /* Mobile Responsive Enhancements */
      @media(max-width:768px){
        body{font-size:14px}
        .grid-2{grid-template-columns:1fr!important;gap:12px!important}
        .panel{padding:14px!important;border-radius:14px!important}
        .modal{padding:16px!important;width:95%!important;max-height:90vh!important;overflow-y:auto!important}
        input, select, textarea{font-size:16px!important} /* Prevent iOS zoom */
        .btn{padding:10px 14px!important;font-size:13px!important}
        .ap-floating-cart-fab{bottom:18px;right:18px}
        .ap-cart-trigger{width:54px;height:54px;font-size:23px}
      }
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
    const cart = AppState.cart || [];
    const totalQty = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
    
    const badge = $('#apCartBadge');
    if (badge) badge.textContent = totalQty;
    const fab = $('#apFloatingCart');
    if (fab) fab.style.display = 'block'; // Always visible globally as requested

    const itemsContainer = $('#apCartPopupItems');
    if (itemsContainer) {
      itemsContainer.innerHTML = cart.length ? cart.map(i => `
        <div class="cart-row">
          <span style="font-size:22px">${i.emoji || '🍽️'}</span>
          <div>
            <strong>${escapeHtml(i.name)}</strong>
            <small style="display:block;color:var(--muted)">${money(i.price)} × ${i.qty}</small>
          </div>
          <div class="qty">
            <button type="button" onclick="adjustCartPopup('${i.id}', -1)">−</button>
            <b>${i.qty}</b>
            <button type="button" onclick="adjustCartPopup('${i.id}', 1)">+</button>
          </div>
        </div>
      `).join('') : '<p class="sub" style="text-align:center;padding:24px 0">ตะกร้าสินค้าว่างเปล่า ลองเลือกเมนูอร่อยจากร้านได้เลย</p>';
    }

    const subtotalEl = $('#apCartPopupSubtotal');
    if (subtotalEl) subtotalEl.textContent = money(subtotal);
  };

  window.adjustCartPopup = (id, delta) => {
    window.adjustCart(id, delta);
    renderCartPopupContent();
  };

  window.proceedToCheckoutSummary = () => {
    const cart = AppState.cart || [];
    if (!cart.length) {
      UI.toast('กรุณาเลือกสินค้าใส่ตะกร้าก่อน');
      return;
    }
    toggleCartPopup();
    if (!location.hash.includes('storefront') && AppState.activeStoreId) {
      openStore(AppState.activeStoreId);
    } else {
      const activeStore = AppState.stores.find(s => s.foods?.some(f => cart.some(c => c.foodId === f.id)));
      if (activeStore && !document.querySelector('#view-storefront.active')) {
        openStore(activeStore.id);
      }
    }
    setTimeout(() => {
      const checkoutPanel = document.querySelector('#view-storefront aside.panel.cart');
      if (checkoutPanel) {
        checkoutPanel.style.display = 'block';
        checkoutPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
    UI.toast('ตรวจสอบจุดจัดส่งและยืนยันคำสั่งซื้อด้านล่างได้เลยครับ');
  };

  const baseRenderCart = window.renderCart;
  window.renderCart = function() {
    if (typeof baseRenderCart === 'function') baseRenderCart();
    renderCartPopupContent();
  };

  document.addEventListener('DOMContentLoaded', () => {
    initGlobalFloatingCart();
    renderCartPopupContent();
  });
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initGlobalFloatingCart();
    renderCartPopupContent();
  }
})();
