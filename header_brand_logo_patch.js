(() => {
  'use strict';

  const logoUrl = './ap-service-header-logo.png';
  const logoAlt = 'AP Service';

  function applyHeaderLogo() {
    const mark = document.getElementById('brandMark');
    if (!mark) return;
    const image = mark.querySelector('img[data-ap-header-logo="true"]');
    if (!image) mark.innerHTML = `<img data-ap-header-logo="true" src="${logoUrl}" alt="${logoAlt}" />`;
    mark.classList.add('ap-header-logo-mark');
    mark.setAttribute('aria-label', logoAlt);
  }

  function installHeaderLogo() {
    applyHeaderLogo();
    const mark = document.getElementById('brandMark');
    if (mark && !mark.__apHeaderLogoObserver) {
      const observer = new MutationObserver(() => applyHeaderLogo());
      observer.observe(mark, { childList: true, subtree: true });
      mark.__apHeaderLogoObserver = observer;
    }
  }

  const style = document.createElement('style');
  style.textContent = `
    .brand-mark.ap-header-logo-mark{background:#fff!important;padding:2px!important;overflow:hidden;border:1px solid #dce8e5;box-shadow:0 6px 16px rgba(19,67,61,.12)}
    .brand-mark.ap-header-logo-mark img{display:block;width:100%;height:100%;object-fit:contain}
  `;
  document.head.appendChild(style);
  installHeaderLogo();
  window.addEventListener('load', installHeaderLogo, { once: true });
})();
