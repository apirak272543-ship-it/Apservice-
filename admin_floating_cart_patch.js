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
    // Restore saved position if available
    const savedPos = localStorage.getItem('ap_floating_cart_pos');
    if (savedPos) {
      try {
        const pos = JSON.parse(savedPos);
        fab.style.left = pos.left + 'px';
        fab.style.top = pos.top + 'px';
        fab.style.right = 'auto';
        fab.style.bottom = 'auto';
      } catch(e) {}
    }

    fab.innerHTML = `
      <button type="button" class="ap-cart-trigger" aria-label="เปิดตะกร้าสินค้าและลากย้ายตำแหน่ง">
        <span aria-hidden="true">🛒</span> <span id="apCartBadge" class="ap-cart-badge">0</span>
      </button>
    `;
    document.body.appendChild(fab);

    let isDragging = false, hasMoved = false, startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
    const triggerBtn = fab.querySelector('.ap-cart-trigger');
    fab.style.touchAction = 'none';

    const onStart = (clientX, clientY) => {
      isDragging = true;
      hasMoved = false;
      startX = clientX;
      startY = clientY;
      const rect = fab.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      fab.style.right = 'auto';
      fab.style.bottom = 'auto';
      fab.style.left = initialLeft + 'px';
      fab.style.top = initialTop + 'px';
    };

    const onMove = (clientX, clientY) => {
      if (!isDragging) return;
      const dx = clientX - startX;
      const dy = clientY - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        hasMoved = true;
      }
      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;
      const maxLeft = window.innerWidth - fab.offsetWidth - 8;
      const maxTop = window.innerHeight - fab.offsetHeight - 8;
      newLeft = Math.max(8, Math.min(newLeft, maxLeft));
      newTop = Math.max(8, Math.min(newTop, maxTop));
      fab.style.left = newLeft + 'px';
      fab.style.top = newTop + 'px';
    };

    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      if (hasMoved) {
        const rect = fab.getBoundingClientRect();
        localStorage.setItem('ap_floating_cart_pos', JSON.stringify({left: rect.left, top: rect.top}));
      }
    };

    fab.addEventListener('pointerdown', e => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      onStart(e.clientX, e.clientY);
      fab.setPointerCapture(e.pointerId);
    });

    fab.addEventListener('pointermove', e => {
      onMove(e.clientX, e.clientY);
    });

    fab.addEventListener('pointerup', e => {
      try { fab.releasePointerCapture(e.pointerId); } catch(err) {}
      onEnd();
    });

    fab.addEventListener('pointercancel', e => {
      try { fab.releasePointerCapture(e.pointerId); } catch(err) {}
      onEnd();
    });

    triggerBtn.addEventListener('click', e => {
      if (hasMoved) {
        e.stopImmediatePropagation();
        e.preventDefault();
        hasMoved = false;
        return;
      }
      if (typeof window.toggleCartPopup === 'function') {
        window.toggleCartPopup();
      }
    });

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
      /* Allow cart panel to show when explicitly needed or targeted */
      #view-storefront aside.panel.cart.force-show{display:block!important}

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

  window.renderCheckoutSummary = () => {
    const cart = getCart();
    const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
    const storesList = window.AppState?.stores || [];
    const storeMap = {};
    cart.forEach(item => {
      const sId = item.storeId || 'default';
      if (!storeMap[sId]) {
        const storeObj = storesList.find(s => s.id === sId) || { name: item.storeName || 'ร้านค้า', location: {lat:13.7563, lng:100.5018} };
        storeMap[sId] = { store: storeObj, items: [] };
      }
      storeMap[sId].items.push(item);
    });

    const activeStores = Object.values(storeMap);
    const deliveryLoc = window.AppState?.userLocation || activeStores[0]?.store?.location || {lat:13.7563, lng:100.5018};

    // Calculate real distance using distanceKmBetween or fallback to 3.5 km minimum
    let totalKm = 0;
    activeStores.forEach((entry, idx) => {
      const loc = entry.store.location || {lat:13.7563, lng:100.5018};
      const dist = (typeof window.distanceKmBetween === 'function' && deliveryLoc && loc.lat) ? window.distanceKmBetween(loc, deliveryLoc) : 3.5;
      if (dist > totalKm) {
        totalKm = dist;
      }
    });
    // If multiple stores, add extra multi-stop overhead
    if (activeStores.length > 1) {
      totalKm += (activeStores.length - 1) * 1.5;
    }
    totalKm = Math.max(1.5, Number(totalKm.toFixed(1)));

    const rule = typeof window.deliveryRules === 'function' ? window.deliveryRules() : { baseFee: 35, perKm: 12, includedKm: 0, zoneMultiplier: 1 };
    const base = Number(rule.baseFee || 35);
    const included = Number(rule.includedKm || 0);
    const billable = Math.max(0, totalKm - included);
    // Admin rule: 1st store base fee + 50% of base fee for each additional store, plus per-km rate for billable km
    let deliveryFee = base;
    if (activeStores.length > 1) {
      deliveryFee += (activeStores.length - 1) * (base * 0.5);
    }
    deliveryFee += billable * Number(rule.perKm || 12) * Number(rule.zoneMultiplier || 1);
    deliveryFee = Math.round(deliveryFee);

    const useCredit = document.getElementById('checkoutUseCredit')?.checked;
    const creditAvail = Number(window.AppState?.user?.credit || 0);
    const creditUsed = useCredit ? Math.min(subtotal + deliveryFee, creditAvail) : 0;
    const total = Math.max(0, subtotal + deliveryFee - creditUsed);

    const itemsEl = document.getElementById('checkoutSummaryItems');
    if (itemsEl) {
      itemsEl.innerHTML = cart.length ? cart.map(item => `
        <div class="cart-row" style="padding:8px 0;border-bottom:1px solid var(--line)">
          <span style="font-size:22px">${item.emoji || '🍽️'}</span>
          <div><strong>${esc(item.name)}</strong><small style="display:block;color:var(--muted)">${money(item.price)} × ${item.qty}</small></div>
          <div style="font-weight:950;color:var(--brand-deep)">${money(item.price * item.qty)}</div>
        </div>
      `).join('') : '<p class="sub">ยังไม่มีสินค้าในตะกร้า</p>';
    }

    const addrEl = document.getElementById('checkoutSummaryAddress');
    if (addrEl) {
      const mode = window.AppState?.foodDeliveryMode === 'other' ? 'ระบุจุดรับเอง / ส่งให้ผู้อื่น' : 'GPS ปัจจุบันของฉัน';
      const name = document.getElementById('foodDeliveryRecipientName')?.value || window.AppState?.user?.name || 'ลูกค้าผู้สั่งซื้อ';
      const phone = document.getElementById('foodDeliveryRecipientPhone')?.value || window.AppState?.user?.phone || '-';
      const desc = document.getElementById('foodDeliveryAddress')?.value || (window.AppState?.foodDeliveryLocationName || 'พิกัด GPS ปัจจุบัน');
      addrEl.innerHTML = `<strong>รูปแบบ:</strong> ${mode}<br><strong>จุดรับสินค้า:</strong> รวม ${activeStores.length} ร้านค้า<br><strong>ผู้รับ:</strong> ${name} (${phone})<br><strong>จุดส่งปลายทาง:</strong> ${desc}`;
    }

    const subEl = document.getElementById('checkoutSummarySubtotal');
    if (subEl) subEl.textContent = money(subtotal);

    const feeEl = document.getElementById('checkoutSummaryDeliveryFee');
    if (feeEl) feeEl.textContent = `${money(deliveryFee)} (${totalKm.toFixed(1)} กม. - รับ ${activeStores.length} ร้าน)`;

    const crEl = document.getElementById('checkoutSummaryCredit');
    if (crEl) crEl.textContent = `-${money(creditUsed)}`;

    const totEl = document.getElementById('checkoutSummaryTotal');
    if (totEl) totEl.textContent = money(total);
  };

  window.proceedToCheckoutSummary = () => {
    const cart = getCart();
    if (!cart.length) {
      if (window.UI?.toast) UI.toast('กรุณาเลือกสินค้าใส่ตะกร้าก่อน');
      return;
    }
    toggleCartPopup();
    if (typeof window.showView === 'function') {
      window.showView('checkout-summary');
    }
    window.renderCheckoutSummary();
    if (window.UI?.toast) UI.toast('เข้าสู่หน้าสรุปรวมบิลเรียบร้อยครับ');
  };

  window.togglePaymentMethod = (method) => {
    const qrContainer = document.getElementById('transferQrContainer');
    if (qrContainer) {
      if (method === 'transfer') {
        qrContainer.classList.remove('hidden');
        qrContainer.style.animation = 'fadeInDown .3s ease';
      } else {
        qrContainer.classList.add('hidden');
      }
    }
  };

  window.copyCheckoutTotal = () => {
    const totEl = document.getElementById('checkoutSummaryTotal');
    const text = totEl ? totEl.textContent.replace(/[^0-9.]/g, '') : '0';
    navigator.clipboard?.writeText(text).then(() => {
      if (window.UI?.toast) UI.toast(`คัดลอกยอดเงิน ฿${text} เรียบร้อยแล้ว`);
    }).catch(() => {
      if (window.UI?.toast) UI.toast(`ยอดโอน: ฿${text}`);
    });
  };

  window.saveQrImage = () => {
    const img = document.querySelector('#qrDynamicDisplay img');
    if (!img || !img.src) {
      if (window.UI?.toast) UI.toast('ยังไม่มีรูป QR Code ในระบบ');
      return;
    }
    const a = document.createElement('a');
    a.href = img.src;
    a.download = 'APService-Payment-QR.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (window.UI?.toast) UI.toast('ดาวน์โหลดรูป QR Code เรียบร้อยแล้ว');
  };

  window.openBankAppDropdown = (val) => {
    if (!val) return;
    const schemes = {
      kplus: 'kplus://',
      scbeasy: 'scbeasy://',
      krungsri: 'krungsri://',
      ktb: 'ktbnext://',
      bbl: 'bbl://',
      ttb: 'ttbtouch://'
    };
    const url = schemes[val];
    if (url) {
      if (window.UI?.toast) UI.toast('กำลังเปิดแอปพลิเคชันธนาคาร...');
      window.location.href = url;
    }
    // Reset dropdown after action
    setTimeout(() => {
      const sel = document.getElementById('bankAppSelect');
      if (sel) sel.value = '';
    }, 1000);
  };

  const getCloud = () => window.SupabaseSync || (typeof SupabaseSync !== 'undefined' ? SupabaseSync : null);
  const PaymentSlipReview = {
    current: null,
    armedAt: 0,
    isTransferSelected() {
      return document.querySelector('input[name="paymentMethod"]:checked')?.value === 'transfer';
    },
    setStatus(message, tone = 'warning') {
      const status = $('#checkoutSlipStatus');
      if (!status) return;
      const colors = {
        warning: ['#fff4df', '#9b6812'],
        success: ['#eaf8f2', '#167b59'],
        error: ['#fdecee', '#ad3b49'],
        info: ['#e9f5ff', '#1f6f9e']
      };
      const [background, color] = colors[tone] || colors.warning;
      status.style.background = background;
      status.style.color = color;
      status.textContent = message;
    },
    async select(input) {
      const file = input?.files?.[0];
      if (!file) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        input.value = '';
        this.current = null;
        this.setStatus('เลือกได้เฉพาะภาพ JPG, PNG หรือ WEBP', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        input.value = '';
        this.current = null;
        this.setStatus('ไฟล์สลิปมีขนาดเกิน 5 MB กรุณาเลือกรูปใหม่', 'error');
        return;
      }
      try {
        this.setStatus('กำลังเตรียมสลิปเพื่อส่งเข้าคิวตรวจสอบ…', 'info');
        const compressed = typeof window.compressImageForUpload === 'function'
          ? await window.compressImageForUpload(file, { maxBytes: 1000000, maxDimension: 1600 })
          : { dataUrl: await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }), bytes: file.size };
        const blob = await fetch(compressed.dataUrl).then(response => response.blob());
        const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
        this.current = { blob, extension, bytes: Number(compressed.bytes || blob.size), selectedAt: new Date().toISOString(), fileName: file.name || `slip.${extension}`, previewDataUrl: compressed.dataUrl };
        const preview = $('#checkoutSlipPreview');
        if (preview) {
          preview.style.display = 'block';
          preview.innerHTML = `<img src="${compressed.dataUrl}" alt="ตัวอย่างสลิปโอนเงิน" style="max-width:100%;max-height:180px;border-radius:8px;border:1px solid var(--line);object-fit:contain;background:#fff" />`;
        }
        this.setStatus('ตรวจเบื้องต้น: ไฟล์ภาพผ่านและพร้อมส่งให้แอดมินตรวจยอด วันที่ และเวลาโอน', 'success');
      } catch (error) {
        input.value = '';
        this.current = null;
        this.setStatus(`เตรียมสลิปไม่สำเร็จ: ${error.message || 'กรุณาลองใหม่'}`, 'error');
      }
    },
    arm() {
      if (!this.current) return false;
      this.armedAt = Date.now();
      return true;
    },
    shouldAttach(order) {
      return Boolean(this.current && this.isTransferSelected() && this.armedAt && Date.now() - this.armedAt < 120000 && order?.serviceType === 'food');
    },
    async attach(order) {
      const cloud = getCloud();
      const session = cloud?.session?.();
      if (!cloud || !session?.user?.id || !session?.access_token || !this.current) throw new Error('ไม่พบข้อมูลสลิปหรือเซสชันสำหรับบันทึก');
      const cfg = cloud.config();
      const item = this.current;
      const path = `${session.user.id}/${order.id}-${Date.now()}.${item.extension}`;
      const upload = await fetch(`${cfg.url}/storage/v1/object/payment-slips/${path}`, {
        method: 'POST',
        headers: { apikey: cfg.publishableKey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': item.blob.type || 'image/jpeg', 'x-upsert': 'false' },
        body: item.blob
      });
      if (!upload.ok) throw new Error('ไม่สามารถบันทึกรูปสลิปได้');
      await cloud.request('payment_slip_reviews', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          order_id: order.id,
          customer_id: session.user.id,
          slip_path: path,
          expected_amount: Number(order.payable || 0),
          status: 'pending',
          preliminary_status: 'needs_review',
          preliminary_result: {
            file_name: item.fileName,
            file_bytes: item.bytes,
            uploaded_at: item.selectedAt,
            note: 'ตรวจรูปแบบไฟล์สำเร็จ ต้องให้แอดมินตรวจยอด วันที่ และเวลาโอนก่อนยืนยันเงินเข้า'
          }
        })
      });
      this.current = null;
      this.armedAt = 0;
      return path;
    },
    async markAttachFailure(order, error) {
      const cloud = getCloud();
      order.status = 'ต้องแนบสลิปใหม่';
      order.statusHistory = [...(order.statusHistory || []), { status: order.status, time: new Date().toLocaleString('th-TH'), by: 'ระบบ' }];
      await cloud?.request?.(`delivery_orders?id=eq.${encodeURIComponent(order.id)}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ status: order.status, updated_at: new Date().toISOString() })
      }).catch(() => {});
      this.armedAt = 0;
      this.setStatus(`รับออร์เดอร์แล้ว แต่บันทึกสลิปไม่สำเร็จ: ${error.message || 'กรุณาแนบใหม่จากประวัติออร์เดอร์'}`, 'error');
    }
  };

  window.handleCheckoutSlipUpload = input => PaymentSlipReview.select(input);

  function installPaymentSlipOrderGuard() {
    const cloud = getCloud();
    if (!cloud?.pushOrder || cloud.__paymentSlipOrderGuardInstalled) return;
    const basePushOrder = cloud.pushOrder.bind(cloud);
    cloud.pushOrder = async order => {
      const requiresReview = PaymentSlipReview.shouldAttach(order);
      if (requiresReview) {
        order.paymentMethod = 'โอนเงินผ่าน QR Code';
        order.status = 'รอตรวจสอบการชำระเงิน';
        order.note = String(window.AppState?.lastCheckoutMeta?.riderNote || order.note || '').trim();
        order.statusHistory = [...(order.statusHistory || []), { status: order.status, time: new Date().toLocaleString('th-TH'), by: window.AppState?.user?.email || 'ระบบ' }];
      }
      const result = await basePushOrder(order);
      if (requiresReview) {
        try {
          order.paymentSlipPath = await PaymentSlipReview.attach(order);
          if (window.UI?.toast) UI.toast('รับคำสั่งซื้อแล้ว กำลังตรวจสอบการชำระเงิน');
        } catch (error) {
          await PaymentSlipReview.markAttachFailure(order, error);
        }
      }
      return result;
    };
    cloud.__paymentSlipOrderGuardInstalled = true;
  }

  const baseRenderCheckoutSummary = window.renderCheckoutSummary;
  window.renderCheckoutSummary = () => {
    if (typeof baseRenderCheckoutSummary === 'function') baseRenderCheckoutSummary();
    const totEl = document.getElementById('checkoutSummaryTotal');
    const qrAmt = document.getElementById('qrDynamicAmount');
    const qrDisp = document.getElementById('qrDynamicDisplay');
    if (totEl && qrAmt) {
      const amtText = totEl.textContent || '฿0';
      qrAmt.textContent = `ยอดชำระ: ${amtText}`;
      if (qrDisp) {
        // Retrieve official platform payment QR from all possible locations including AppState, State, DOM inputs, and localStorage
        const platformQr = window.AppState?.config?.payment?.qrImageUrl || window.State?.config?.payment?.qrImageUrl || document.getElementById('paymentQrImageUrl')?.value || document.getElementById('adminQrUrl')?.value || localStorage.getItem('apcx_admin_qr') || localStorage.getItem('apcx_platform_qr') || '';
        const promptPayId = window.AppState?.config?.payment?.promptPayId || window.State?.config?.payment?.promptPayId || document.getElementById('paymentPromptPayId')?.value || '';
        if (platformQr) {
          qrDisp.innerHTML = `<img src="${platformQr}" alt="Platform Payment QR" style="width:100%;height:100%;object-fit:contain;border-radius:8px" /><div style="font-size:10px;color:var(--muted);margin-top:4px">${promptPayId ? `PromptPay: ${promptPayId}` : ''}</div>`;
        } else {
          qrDisp.innerHTML = `<div style="font-size:11px;font-weight:700;color:var(--danger);padding:12px;text-align:center">⚠️ กรุณาตั้งค่ารูป QR Code รับชำระเงินในหลังบ้านแอดมินก่อน</div>`;
        }
      }
    }
  };

  window.confirmCheckoutSummary = () => {
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'cod';
    const riderNote = document.getElementById('checkoutRiderNote')?.value || '';
    if (paymentMethod === 'transfer' && !PaymentSlipReview.arm()) {
      PaymentSlipReview.setStatus('กรุณาแนบสลิปโอนเงินก่อนส่งคำสั่งซื้อ', 'error');
      if (window.UI?.toast) UI.toast('กรุณาแนบสลิปโอนเงินก่อนส่งคำสั่งซื้อ', 'warning');
      return;
    }
    // Store metadata in window.AppState for order creation
    if (!window.AppState) window.AppState = {};
    window.AppState.lastCheckoutMeta = {
      paymentMethod,
      riderNote,
      paymentStatus: paymentMethod === 'transfer' ? 'รอตรวจสอบการโอน' : 'ชำระเงินปลายทาง (COD)'
    };

    if (typeof window.checkout === 'function') {
      window.checkout();
    } else {
      if (window.UI?.toast) UI.toast('ยืนยันคำสั่งซื้อเรียบร้อยแล้ว');
      window.showView('home');
    }
  };

  const baseRenderCart = window.renderCart;
  window.renderCart = function(){
    if (typeof baseRenderCart === 'function') baseRenderCart();
    renderCartPopupContent();
  };

  const PaymentSlipAdminQueue = {
    isAdmin() {
      try { return typeof Storage !== 'undefined' && typeof Storage.isAdmin === 'function' && Storage.isAdmin(); } catch (error) { return false; }
    },
    async view(path) {
      try {
        const cloud = getCloud();
        const response = await fetch(`${cloud.config().url}/storage/v1/object/payment-slips/${path}`, { headers: cloud.headers(false) });
        if (!response.ok) throw new Error('ไม่สามารถเปิดรูปสลิปได้');
        const url = URL.createObjectURL(await response.blob());
        const viewer = window.open(url, '_blank', 'noopener');
        if (!viewer) throw new Error('เบราว์เซอร์บล็อกหน้าต่างรูปภาพ');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      } catch (error) {
        if (window.UI?.toast) UI.toast(error.message || 'เปิดสลิปไม่สำเร็จ', 'error');
      }
    },
    async decide(reviewId, orderId, decision) {
      if (!this.isAdmin()) return window.UI?.toast?.('เฉพาะแอดมินเท่านั้นที่ตรวจสลิปได้', 'error');
      const cloud = getCloud();
      const session = cloud?.session?.();
      const approved = decision === 'approve';
      const note = approved ? 'ตรวจสอบโดยแอดมินแล้ว' : (window.prompt('ระบุเหตุผลที่ต้องแนบสลิปใหม่ (จะแจ้งให้ลูกค้าเห็น)') || 'กรุณาแนบสลิปใหม่ให้เห็นยอด วันที่ เวลา และชื่อผู้รับชัดเจน');
      try {
        await cloud.request(`payment_slip_reviews?id=eq.${encodeURIComponent(reviewId)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ status: approved ? 'approved' : 'needs_reupload', reviewed_at: new Date().toISOString(), reviewed_by: session?.user?.id || null, reviewer_note: note })
        });
        await cloud.request(`delivery_orders?id=eq.${encodeURIComponent(orderId)}`, {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify(approved ? { status: 'ร้านค้ารับออร์เดอร์', payment_confirmed_at: new Date().toISOString(), updated_at: new Date().toISOString() } : { status: 'ต้องแนบสลิปใหม่', updated_at: new Date().toISOString() })
        });
        await cloud.request('order_status_events', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ order_id: orderId, status: approved ? 'ร้านค้ารับออร์เดอร์' : 'ต้องแนบสลิปใหม่', actor_id: session?.user?.id || null, actor_label: 'แอดมินตรวจสลิป' }) }).catch(() => {});
        if (window.UI?.toast) UI.toast(approved ? 'อนุมัติสลิปแล้ว ระบบปล่อยออร์เดอร์ให้ร้านและ Rider' : 'ส่งคำขอแนบสลิปใหม่ให้ลูกค้าแล้ว');
        await this.render();
      } catch (error) {
        if (window.UI?.toast) UI.toast(`บันทึกผลตรวจสลิปไม่สำเร็จ: ${error.message || ''}`, 'error');
      }
    },
    async render() {
      const host = $('#paymentSlipQueueRows');
      if (!host) return;
      if (!this.isAdmin()) { host.innerHTML = '<tr><td colspan="5">เฉพาะแอดมินเท่านั้นที่เข้าถึงคิวตรวจสลิป</td></tr>'; return; }
      try {
        const cloud = getCloud();
        const rows = await cloud.request('payment_slip_reviews?select=id,order_id,slip_path,expected_amount,status,preliminary_status,preliminary_result,uploaded_at,delivery_orders(customer_name,customer_email,payable,status)&status=eq.pending&order=uploaded_at.desc&limit=100');
        host.innerHTML = Array.isArray(rows) && rows.length ? rows.map(row => {
          const order = Array.isArray(row.delivery_orders) ? row.delivery_orders[0] : row.delivery_orders || {};
          return `<tr><td><b>${esc(row.order_id)}</b><br><small>${esc(order.customer_name || order.customer_email || '-')}</small></td><td><b>${money(row.expected_amount)}</b><br><small>${new Date(row.uploaded_at).toLocaleString('th-TH')}</small></td><td><span class="status">${esc(row.preliminary_status || 'needs_review')}</span><br><small>${esc(row.preliminary_result?.file_name || 'แนบสลิป')}</small></td><td><button class="btn btn-plain btn-small" onclick="viewPaymentSlip('${esc(row.slip_path)}')">ดูสลิป</button></td><td><div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn btn-main btn-small" onclick="reviewPaymentSlip('${esc(row.id)}','${esc(row.order_id)}','approve')">อนุมัติ</button><button class="btn btn-plain btn-small" onclick="reviewPaymentSlip('${esc(row.id)}','${esc(row.order_id)}','reject')">ขอแนบใหม่</button></div></td></tr>`;
        }).join('') : '<tr><td colspan="5">ยังไม่มีสลิปรอตรวจสอบ</td></tr>';
      } catch (error) {
        host.innerHTML = `<tr><td colspan="5">โหลดคิวสลิปไม่สำเร็จ: ${esc(error.message || '')}</td></tr>`;
      }
    },
    init() {
      if ($('#admin-payment-slips')) return;
      const tabs = $('#adminTabs');
      const content = tabs?.parentElement?.querySelector(':scope > div');
      if (!tabs || !content) return;
      tabs.insertAdjacentHTML('beforeend', '<button data-admin="payment-slips">ตรวจสลิปชำระเงิน</button>');
      content.insertAdjacentHTML('beforeend', '<section class="admin-section" id="admin-payment-slips"><div class="panel"><div class="section-head" style="margin:0 0 14px"><div><h2 style="font-size:17px">คิวตรวจสลิปชำระเงิน</h2><p>ตรวจรูปสลิปกับยอด เวลา และข้อมูลผู้รับก่อนอนุมัติปล่อยงานให้ร้านและ Rider</p></div><button class="btn btn-plain btn-small" onclick="refreshPaymentSlipQueue()">รีเฟรช</button></div><div class="notice" style="margin:0 0 14px">คำเตือน: ผลตรวจจากรูปเป็นเพียงด่านเบื้องต้น ควรตรวจยอดเงินเข้าจริงก่อนกดอนุมัติทุกครั้ง</div><div class="table-wrap"><table><thead><tr><th>ออร์เดอร์/ลูกค้า</th><th>ยอด/เวลาแนบ</th><th>ผลเบื้องต้น</th><th>หลักฐาน</th><th>จัดการ</th></tr></thead><tbody id="paymentSlipQueueRows"></tbody></table></div></div></section>');
      const button = $('#adminTabs [data-admin="payment-slips"]');
      tabs.appendChild(button);
      button.onclick = () => window.switchAdmin?.('payment-slips');
    }
  };
  window.viewPaymentSlip = path => PaymentSlipAdminQueue.view(path);
  window.reviewPaymentSlip = (reviewId, orderId, decision) => PaymentSlipAdminQueue.decide(reviewId, orderId, decision);
  window.refreshPaymentSlipQueue = () => PaymentSlipAdminQueue.render();

  const boot = () => { initGlobalFloatingCart(); renderCartPopupContent(); installPaymentSlipOrderGuard(); PaymentSlipAdminQueue.init(); };
  document.addEventListener('DOMContentLoaded', boot, { once:true });
  if (document.readyState === 'complete' || document.readyState === 'interactive') boot();
})();
