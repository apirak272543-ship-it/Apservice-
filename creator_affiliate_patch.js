(() => {
  'use strict';
  const M = window.APServiceMPA;
  if (!M || window.APServiceCustomerCreatorAffiliate) return;

  const storageKey = 'apservice-creator-anonymous-token';
  const params = new URLSearchParams(location.search);
  const commissionBasis = 'order_total_excluding_delivery';
  let creatorReferralCode = String(params.get('creator') || params.get('ref') || '').trim().toUpperCase();

  const getAnonymousToken = () => {
    let token = '';
    try { token = localStorage.getItem(storageKey) || ''; } catch (_) { token = ''; }
    if (!token) {
      token = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      try { localStorage.setItem(storageKey, token); } catch (_) { /* private browsing may deny storage */ }
    }
    return token;
  };

  function getReferralUrl(code) {
    const url = new URL(location.href);
    const value = String(code || '').trim().toUpperCase();
    if (value) url.searchParams.set('creator', value);
    else url.searchParams.delete('creator');
    url.searchParams.delete('ref');
    return url.href;
  }

  const startReferral = async code => {
    const value = String(code || creatorReferralCode || '').trim().toUpperCase();
    if (!value) return null;
    creatorReferralCode = value;
    const result = await M.request('rpc/start_creator_referral', {
      method: 'POST',
      private: false,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_code: value,
        p_anonymous_token: getAnonymousToken(),
        p_landing_path: `${location.pathname}${location.search}`,
        p_source_url: location.href,
      }),
    });
    const session = Array.isArray(result) ? result[0] : result;
    window.dispatchEvent(new CustomEvent('apservice:creator-referral', { detail: session || { referral_code: value } }));
    return session;
  };

  const attributeOrder = async (orderId, code = creatorReferralCode) => {
    const value = String(code || '').trim().toUpperCase();
    if (!orderId || !value) return null;
    const result = await M.request('rpc/attribute_creator_order', {
      method: 'POST',
      private: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_order_id: String(orderId), p_code: value, p_anonymous_token: getAnonymousToken() }),
    });
    return Array.isArray(result) ? result[0] : result;
  };

  window.APServiceCustomerCreatorAffiliate = Object.freeze({
    getReferralUrl,
    startReferral,
    attributeOrder,
    getCode: () => creatorReferralCode,
    getCommissionBasis: () => commissionBasis,
  });

  if (creatorReferralCode) void startReferral(creatorReferralCode).catch(error => {
    window.dispatchEvent(new CustomEvent('apservice:creator-referral-error', { detail: { message: error?.message || 'ไม่สามารถบันทึก referral ได้' } }));
  });
})();

// Commission qualification and amount remain server-owned; the existing workflow uses order_total_excluding_delivery.
