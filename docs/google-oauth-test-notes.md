# Google OAuth local test

Date: 2026-08-30

The profile page rendered the Google login button after loading `customer/customer-app.js` revision `customer-auth-v7-google-oauth`.

The browser click handler ran, but the flow stayed on the page and showed the generic login error. This is expected to require checking the actual Supabase Auth error and provider configuration. The code calls `M.auth.signInWithOAuth('google', callback.href, { queryParams: { prompt: 'select_account' } })`, which delegates to the Supabase Auth Client. Before enabling Google in the Supabase project and allowlisting the callback URL, the provider may return an unsupported-provider or redirect-configuration error.
