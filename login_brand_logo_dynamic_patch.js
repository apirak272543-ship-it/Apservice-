(() => {
  'use strict';

  const validImageUrl = value => /^(https?:\/\/|data:image\/)/i.test(String(value || '').trim());
  const brandSource = () => {
    const config = window.AppState?.config || {};
    return String(config.content?.brandMark || config.brand?.logoUrl || '').trim();
  };
  const brandName = () => String(window.AppState?.config?.brand?.name || 'AP Service');

  function applyLoginBrandLogo() {
    const mark = document.getElementById('loginBrandMark');
    if (!mark) return;
    const source = brandSource();
    mark.classList.add('ap-login-brand-mark');
    if (validImageUrl(source)) {
      let image = mark.querySelector('img[data-ap-login-brand="true"]');
      if (!image) {
        mark.textContent = '';
        image = document.createElement('img');
        image.dataset.apLoginBrand = 'true';
        mark.appendChild(image);
      }
      if (image.src !== source) image.src = source;
      image.alt = `${brandName()} logo`;
      mark.dataset.brandSource = source;
      return;
    }
    mark.textContent = brandName().split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'AP';
    mark.dataset.brandSource = '';
  }

  function install() {
    applyLoginBrandLogo();
    const loginView = document.getElementById('view-login');
    if (loginView && !loginView.__apLoginBrandObserver) {
      const observer = new MutationObserver(() => applyLoginBrandLogo());
      observer.observe(loginView, { attributes: true, attributeFilter: ['class'] });
      loginView.__apLoginBrandObserver = observer;
    }
  }

  const style = document.createElement('style');
  style.textContent = `
    #loginBrandMark.ap-login-brand-mark{width:76px;height:76px;margin:0 auto 14px;border-radius:22px;background:#fff;padding:3px;overflow:hidden;border:1px solid #dce8e5;box-shadow:0 9px 22px rgba(19,67,61,.14)}
    #loginBrandMark.ap-login-brand-mark img{display:block;width:100%;height:100%;object-fit:contain}
    @media(max-width:640px){#loginBrandMark.ap-login-brand-mark{width:68px;height:68px;border-radius:20px;margin-bottom:12px}}
  `;
  document.head.appendChild(style);
  install();
  window.addEventListener('load', install, { once: true });
  window.APServiceApplyLoginBrandLogo = applyLoginBrandLogo;
})();
