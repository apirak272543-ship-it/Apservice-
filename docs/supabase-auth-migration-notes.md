# Supabase Auth migration reference

Sources consulted:

1. https://supabase.com/docs/reference/javascript/initializing
   Supabase JavaScript browser client supports `auth.autoRefreshToken`, `auth.persistSession`, and `auth.detectSessionInUrl`. The documentation describes creating a single client with `createClient` and states that `persistSession: true` saves the user session into local storage.

2. https://supabase.com/docs/reference/javascript/auth-signinwithotp
   Supabase JS v2 provides `auth.signInWithOtp` for passwordless email login and accepts redirect options for the email callback.

3. https://supabase.com/docs/reference/javascript/auth-onauthstatechange
   Supabase JS v2 provides `auth.onAuthStateChange` for auth events and session changes.

4. https://supabase.com/docs/reference/javascript/auth-verifyotp
   Supabase JS v2 provides `auth.verifyOtp` for token-hash/email verification flows.

Application-specific audit finding: the frontend currently has no `createClient`, `persistSession`, `autoRefreshToken`, `detectSessionInUrl`, or `onAuthStateChange`; it manually calls `/auth/v1/*` with fetch and stores `apservice_mpa_session_v1` itself. The migration target is one browser Supabase client shared by all customer pages, with business REST calls retaining the access token supplied by that client.
