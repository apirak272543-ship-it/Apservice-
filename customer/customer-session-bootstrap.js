(() => {
  'use strict';
  if (window.APServiceCustomerSessionBootstrap) return;

  const api = {
    status: 'IDLE',
    session: null,
    startedAt: Date.now(),
  };
  window.APServiceCustomerSessionBootstrap = api;

  const start = async () => {
    api.status = 'WAITING_FOR_AUTH';
    const auth = window.APServiceSupabaseAuth;
    if (!auth?.ready || !auth?.client) {
      api.status = 'UNAVAILABLE';
      return null;
    }
    try {
      await auth.ready;
      let result = await auth.client.auth.getSession();
      if (result.error) throw result.error;
      let session = result.data?.session || null;
      if (!session) {
        try {
          const refreshed = await auth.client.auth.refreshSession();
          if (!refreshed.error) session = refreshed.data?.session || null;
        } catch (_) {
          // Guest mode remains available; the existing Login/Verify flow handles this case.
        }
      }
      api.session = session;
      api.status = session ? 'RESTORED' : 'GUEST';
      window.dispatchEvent(new CustomEvent('apservice:customer-session-ready', { detail: { session } }));
      return session;
    } catch (_) {
      api.status = 'GUEST';
      window.dispatchEvent(new CustomEvent('apservice:customer-session-ready', { detail: { session: null } }));
      return null;
    }
  };

  void start();
})();
