(() => {
  'use strict';

  const ADMIN_SCOPE = 'admin';

  function isCurrentUserAdmin() {
    try {
      if (typeof window.Storage?.isAdmin === 'function') return Boolean(window.Storage.isAdmin());
      const user = window.AppState?.user;
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
    setTimeout(showDedicatedAdminOrLogin, 0);
  });
})();
