/**
 * AP Service - Errand UX & JWT Refresh Safeguard Patch
 * 1. Enhances the Errand / Parcel form layout with clear category headers, compact icon-grid location buttons, and distinct labels.
 * 2. Adds automatic retry and session recovery for Rider/Store apps when JWT expires during background polling.
 */
(function() {
  console.log('AP Service Errand UX & JWT Safeguard Patch loaded.');

  // CSS overrides for Errand form & location action buttons
  const style = document.createElement('style');
  style.textContent = `
    /* Errand form & location buttons responsive polish */
    #view-errand .form-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }
    .errand-action-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 8px;
    }
    @media(max-width: 480px) {
      .errand-action-row {
        grid-template-columns: 1fr;
      }
    }
    .errand-location-box {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px;
      margin-top: 8px;
    }
    .errand-location-box strong {
      display: block;
      font-size: 13px;
      color: var(--foreground);
      margin-bottom: 4px;
    }
  `;
  document.head.appendChild(style);

  // Auto-refresh handler for expired JWT in cloud sync requests
  window.handleExpiredJwtError = async function(error, retryCallback) {
    if (error && (String(error.message).includes('JWT expired') || String(error.message).includes('401') || String(error.message).includes('Invalid JWT'))) {
      console.warn('Detected expired JWT in background sync. Attempting session refresh...');
      try {
        if (window.SupabaseSync && typeof SupabaseSync.refreshSession === 'function') {
          await SupabaseSync.refreshSession();
          if (typeof retryCallback === 'function') return await retryCallback();
        }
      } catch (e) {
        console.warn('Auto token refresh failed, prompting re-login:', e.message);
      }
    }
    throw error;
  };
})();
