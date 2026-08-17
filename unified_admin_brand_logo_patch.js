(() => {
  'use strict';

  const PUBLIC_KEY = 'brand_public';
  const $ = id => document.getElementById(id);
  const toText = value => String(value ?? '').trim();
  const initialMark = () => toText(window.AppState?.config?.brand?.name || 'AP Service').split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'AP';
  const isImageSource = value => /^(https?:\/\/|data:image\/)/i.test(toText(value));
  const localBrand = () => {
    const config = window.AppState?.config || {};
    return {
      name: toText(config.brand?.name || 'AP Service'),
      tagline: toText(config.brand?.tagline || 'Delivery & Everyday Services'),
      primary: toText(config.brand?.primary || '#0B8C7C'),
      logoUrl: toText(config.content?.brandMark || config.brand?.logoUrl || '')
    };
  };

  function fallback(target) {
    if (!target) return;
    target.dataset.apBrandAppliedSource = '';
    target.textContent = initialMark();
    target.classList.remove('ap-admin-brand-logo', 'ap-admin-brand-logo-ready');
  }

  function applyLogo(target, source) {
    if (!target) return;
    const url = toText(source);
    if (!isImageSource(url)) return fallback(target);
    const existing = target.querySelector('img[data-ap-admin-brand-logo="true"]');
    if (target.dataset.apBrandAppliedSource === url && existing) return;
    if (target.dataset.apBrandFailedSource === url) return fallback(target);
    target.dataset.apBrandAppliedSource = url;
    target.classList.remove('ap-admin-brand-logo-ready');
    target.classList.add('ap-admin-brand-logo');
    target.textContent = initialMark();
    const image = document.createElement('img');
    image.dataset.apAdminBrandLogo = 'true';
    image.alt = `${localBrand().name} logo`;
    image.onload = () => {
      if (target.dataset.apBrandAppliedSource !== url) return;
      target.textContent = '';
      target.appendChild(image);
      target.classList.add('ap-admin-brand-logo-ready');
      delete target.dataset.apBrandFailedSource;
    };
    image.onerror = () => {
      if (target.dataset.apBrandAppliedSource === url) {
        target.dataset.apBrandFailedSource = url;
        fallback(target);
      }
    };
    image.src = url;
  }

  function applyBrandEverywhere() {
    const brand = localBrand();
    const header = $('brandMark');
    const login = $('loginBrandMark');
    const name = $('brandNameTop');
    const tagline = $('brandTagTop');
    if (name) name.textContent = brand.name;
    if (tagline) tagline.textContent = brand.tagline;
    document.documentElement.style.setProperty('--brand', brand.primary);
    applyLogo(header, brand.logoUrl);
    applyLogo(login, brand.logoUrl);
  }

  async function loadPublicBrand() {
    try {
      const rows = await window.SupabaseSync?.request?.(`platform_configs?select=value&key=eq.${PUBLIC_KEY}&limit=1`);
      const value = Array.isArray(rows) ? rows[0]?.value : null;
      if (!value || typeof value !== 'object') return false;
      const config = window.AppState?.config;
      if (!config) return false;
      config.brand = { ...config.brand, name: toText(value.name || config.brand?.name), tagline: toText(value.tagline || config.brand?.tagline), primary: toText(value.primary || config.brand?.primary), logoUrl: toText(value.logoUrl || '') };
      config.content = { ...config.content, brandMark: toText(value.logoUrl || '') };
      applyBrandEverywhere();
      return true;
    } catch (error) {
      console.warn('ไม่สามารถโหลดโลโก้แบรนด์สาธารณะ', error);
      return false;
    }
  }

  async function publishPublicBrand() {
    const session = await window.SupabaseAdminSync?.ensureAdminSession?.();
    if (!session?.user?.id) throw new Error('กรุณาเข้าสู่ระบบแอดมินก่อนเผยแพร่โลโก้แบรนด์');
    const brand = localBrand();
    await window.SupabaseSync.request('platform_configs?on_conflict=key', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key: PUBLIC_KEY, value: { ...brand, updatedAt: new Date().toISOString() }, updated_at: new Date().toISOString(), updated_by: session.user.id })
    });
    applyBrandEverywhere();
    return brand;
  }

  const style = document.createElement('style');
  style.textContent = `
    .brand-mark.ap-admin-brand-logo{position:relative;background:linear-gradient(135deg,#54dcc9,#087368);color:#fff;overflow:hidden}
    .brand-mark.ap-admin-brand-logo.ap-admin-brand-logo-ready{background:#fff;padding:2px;border:1px solid #dce8e5;box-shadow:0 6px 16px rgba(19,67,61,.12)}
    .brand-mark.ap-admin-brand-logo img{display:block;width:100%;height:100%;object-fit:contain}
    #loginBrandMark.ap-admin-brand-logo{width:68px;height:68px;margin:0 auto 14px;border-radius:20px;font-size:0}
    #loginBrandMark.ap-admin-brand-logo:not(.ap-admin-brand-logo-ready){font-size:20px}
    @media(min-width:641px){#loginBrandMark.ap-admin-brand-logo{width:76px;height:76px;border-radius:22px}}
  `;
  document.head.appendChild(style);

  window.SupabaseAdminSync = window.SupabaseAdminSync || {};
  window.SupabaseAdminSync.publishPublicBrand = publishPublicBrand;
  window.APServiceApplyBrandLogo = applyBrandEverywhere;
  applyBrandEverywhere();
  loadPublicBrand();

  ['brandMark', 'loginBrandMark'].forEach(id => {
    const target = $(id);
    if (!target) return;
    const observer = new MutationObserver(() => applyLogo(target, localBrand().logoUrl));
    observer.observe(target, { childList: true, subtree: true });
  });
})();
