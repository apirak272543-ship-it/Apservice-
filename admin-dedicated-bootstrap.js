(() => {
  'use strict';

  const ADMIN_SCOPE = 'admin';

  function isCurrentUserAdmin() {
    try {
      const sessionUser = window.SupabaseSync?.session?.()?.user;
      if (!sessionUser?.email) return false;
      if (typeof window.Storage?.isAdmin === 'function') return Boolean(window.Storage.isAdmin());
      const user = window.AppState?.user || sessionUser;
      const admins = window.AppState?.admins || [];
      return Boolean(user?.email && admins.includes(String(user.email).toLowerCase()));
    } catch (_) {
      return false;
    }
  }

  function showDedicatedAdminOrLogin() {
    if (isCurrentUserAdmin()) {
      window.showView?.('admin');
      return;
    }
    window.showView?.('login');
  }

  function installDedicatedHeaderActions() {
    const brand = document.querySelector('.brand');
    if (brand) brand.onclick = () => showDedicatedAdminOrLogin();

    const adminButton = document.getElementById('adminButton');
    if (adminButton) {
      adminButton.classList.remove('hidden');
      adminButton.onclick = () => showDedicatedAdminOrLogin();
    }
  }

  function configureDedicatedLogin() {
    const loginView = document.getElementById('view-login');
    const loginCard = loginView?.querySelector('.login-card');
    if (!loginCard) return;

    loginView.dataset.dedicatedAdminLogin = 'true';
    const heading = loginCard.querySelector('h2');
    const description = loginCard.querySelector('p');
    const emailLabel = document.getElementById('loginEmail')?.closest('.field')?.querySelector('label');
    const passwordLabel = document.getElementById('cloudPassword')?.closest('.field')?.querySelector('label');
    const localActionRow = document.getElementById('cloudUseLocal')?.parentElement;

    if (heading) heading.textContent = 'เข้าสู่ระบบผู้ดูแลระบบ';
    if (description) description.textContent = 'สำหรับผู้ดูแล AP Service เท่านั้น ใช้อีเมลและรหัสผ่านของบัญชีแอดมินเพื่อจัดการงาน ออร์เดอร์ การเงิน และการตั้งค่าระบบ';
    if (emailLabel) emailLabel.textContent = 'อีเมลผู้ดูแลระบบ';
    if (passwordLabel) passwordLabel.textContent = 'รหัสผ่านผู้ดูแลระบบ';
    document.querySelector('.social-login-grid')?.classList.add('hidden');
    document.querySelector('.auth-divider')?.classList.add('hidden');
    if (localActionRow) localActionRow.classList.add('hidden');

    const submit = document.getElementById('loginSubmit');
    if (!submit || submit.dataset.dedicatedAdminBound) return;
    submit.dataset.dedicatedAdminBound = 'true';
    submit.textContent = 'เข้าสู่ Dashboard ผู้ดูแลระบบ';
    submit.onclick = async () => {
      const email = document.getElementById('loginEmail')?.value.trim().toLowerCase() || '';
      const password = document.getElementById('cloudPassword')?.value || '';
      if (!email || !email.includes('@') || !password) {
        return window.UI?.toast?.('กรอกอีเมลและรหัสผ่านของผู้ดูแลระบบให้ครบ', 'warning');
      }

      submit.disabled = true;
      submit.textContent = 'กำลังตรวจสอบสิทธิ์…';
      try {
        const session = await window.SupabaseSync?.signIn?.(email, password);
        if (!session?.access_token) throw new Error('ไม่พบ session หลังเข้าสู่ระบบ');
        await window.finishLogin?.(email, session);
        if (!isCurrentUserAdmin()) {
          window.SupabaseSync?.clearSession?.();
          if (window.AppState) window.AppState.user = null;
          window.Storage?.save?.();
          window.showView?.('login');
          throw new Error('บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ');
        }
        window.showView?.('admin');
        window.UI?.toast?.('เข้าสู่ Dashboard ผู้ดูแลระบบแล้ว');
      } catch (error) {
        window.UI?.toast?.(error?.message || 'เข้าสู่ระบบไม่สำเร็จ', 'error');
      } finally {
        submit.disabled = false;
        submit.textContent = 'เข้าสู่ Dashboard ผู้ดูแลระบบ';
      }
    };
  }

  function routeAdminAfterLogin() {
    const originalFinishLogin = window.finishLogin;
    if (typeof originalFinishLogin !== 'function' || originalFinishLogin.__dedicatedAdminWrapped) return;

    const dedicatedFinishLogin = async (...args) => {
      const result = await originalFinishLogin(...args);
      if (isCurrentUserAdmin()) window.showView?.('admin');
      return result;
    };
    dedicatedFinishLogin.__dedicatedAdminWrapped = true;
    window.finishLogin = dedicatedFinishLogin;
  }

  window.addEventListener('DOMContentLoaded', () => {
    document.documentElement.dataset.appScope = ADMIN_SCOPE;
    routeAdminAfterLogin();
    installDedicatedHeaderActions();
    configureDedicatedLogin();
    setTimeout(showDedicatedAdminOrLogin, 0);
  });
})();
