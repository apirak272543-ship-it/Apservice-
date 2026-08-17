Live validation 2026-08-16:
- curl GitHub Pages URL with ?supermarket=15b7e47 returned HTML size 506089 bytes.
- Live HTML contained `service-supermarket` once and `login_location_sorting_patch.js` once.
- GitHub response headers showed Last-Modified: Sun, 16 Aug 2026 13:30:18 GMT.
- An earlier browser console check after navigation reported card/patch absent, then a later console check reported location.href=about:blank and empty body. This indicates the current browser session was not attached to the live page at that moment; repeat browser navigation before treating the DOM check as a failure.
