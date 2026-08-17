(() => {
  'use strict';

  const toast = (message, tone = 'warning') => window.UI?.toast?.(message, tone);
  const hasAuthenticatedCustomer = () => {
    const app = window.AppState || {};
    if (!app.user?.email) return false;
    if (app.config?.mode === 'local') return true;
    return Boolean(window.SupabaseSync?.session?.()?.user?.id);
  };

  function requireCustomerOrderLogin(reason, returnView = 'storefront') {
    if (hasAuthenticatedCustomer()) return true;
    window.AppState = window.AppState || {};
    window.AppState.afterLogin = returnView;
    toast(`${reason} กรุณาเข้าสู่ระบบก่อน เพื่อปกป้องตะกร้า ที่อยู่ และคำสั่งซื้อของคุณ`);
    window.showView?.('login');
    return false;
  }

  function guardAction(name, reason, returnView) {
    const original = window[name];
    if (typeof original !== 'function' || original.__customerLoginGateInstalled) return;
    const guarded = function guardedCustomerAction(...args) {
      if (!requireCustomerOrderLogin(reason, returnView)) return undefined;
      return original.apply(this, args);
    };
    guarded.__customerLoginGateInstalled = true;
    guarded.__customerLoginGateOriginal = original;
    window[name] = guarded;
  }

  function install() {
    window.requireCustomerOrderLogin = requireCustomerOrderLogin;

    // Browsing store fronts remains public for Referral visitors. Only cart/order mutations are gated.
    guardAction('addCart', 'กรุณาเข้าสู่ระบบก่อนเพิ่มสินค้าเข้าตะกร้า', 'storefront');
    guardAction('adjustCart', 'กรุณาเข้าสู่ระบบก่อนแก้ไขตะกร้า', 'storefront');
    guardAction('toggleCartPopup', 'กรุณาเข้าสู่ระบบก่อนเปิดตะกร้าสินค้า', 'storefront');
    guardAction('proceedToCheckoutSummary', 'กรุณาเข้าสู่ระบบก่อนเปิดหน้าสรุปรวมบิล', 'storefront');
    guardAction('confirmCheckoutSummary', 'กรุณาเข้าสู่ระบบก่อนยืนยันคำสั่งซื้อ', 'checkout-summary');
    guardAction('checkout', 'กรุณาเข้าสู่ระบบก่อนดำเนินการสั่งซื้อ', 'checkout-summary');

    document.addEventListener('submit', event => {
      if (event.target?.id !== 'menuOptionsForm') return;
      if (!requireCustomerOrderLogin('กรุณาเข้าสู่ระบบก่อนเพิ่มเมนูเข้าตะกร้า', 'storefront')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
  }

  install();
})();
