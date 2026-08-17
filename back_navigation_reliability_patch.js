(() => {
  'use strict';

  const q = selector => document.querySelector(selector);
  let backInProgress = false;

  /* Saving every input from every hidden Admin page serialised large tables and
     image values on each navigation. Keep drafts scoped to the active customer
     view only, and never persist long or file-like values. */
  const drafts = window.APServiceModuleUI?.formDraft;
  if (drafts && !drafts.__backNavigationSafeSave) {
    const write = typeof drafts.write === 'function' ? drafts.write.bind(drafts) : () => {};
    drafts.save = () => {
      const active = q('.view.active');
      if (!active || active.id === 'view-admin') return;
      const value = {};
      active.querySelectorAll('input,textarea,select').forEach(field => {
        if (!field.id || field.type === 'password' || field.type === 'file') return;
        const next = field.type === 'checkbox' ? Boolean(field.checked) : String(field.value ?? '');
        if (typeof next === 'string' && (next.length > 2048 || /^data:/i.test(next))) return;
        value[field.id] = next;
      });
      write(value);
    };
    drafts.__backNavigationSafeSave = true;
  }

  function resetAdminSubpageState() {
    q('#view-admin')?.classList.remove('admin-page-open');
    if (window.AdminOrderFilter) window.AdminOrderFilter.current = 'all';
  }

  function returnToPreviousView() {
    if (backInProgress) return;
    backInProgress = true;
    const active = q('.view.active');
    if (active?.id === 'view-admin') resetAdminSubpageState();

    /* Internal views add a history entry. browser back triggers the existing
       popstate handler with {back:true}, avoiding another entry and animation. */
    if (window.history.length > 1) {
      window.history.back();
      window.setTimeout(() => { backInProgress = false; }, 450);
      return;
    }
    window.showView?.('home', { back: true });
    window.setTimeout(() => { backInProgress = false; }, 0);
  }

  document.addEventListener('click', event => {
    const back = event.target.closest('button.ap-back');
    if (!back) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    returnToPreviousView();
  }, true);

  window.addEventListener('popstate', () => {
    resetAdminSubpageState();
    window.setTimeout(() => { backInProgress = false; }, 0);
  });
})();
