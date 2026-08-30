# Social login UI local test

The local `customer/profile.html` rendered all three social buttons after the social-providers revision:

- Google: `data-social-provider="google"`
- Facebook: `data-social-provider="facebook"`
- LINE: `data-social-provider="line"`

The existing Verify Email form remained visible. The buttons share one handler that calls `M.auth.signInWithOAuth(provider, callback.href, ...)`. Provider credentials and enablement remain a Supabase project configuration prerequisite.
