import fs from 'fs';
import assert from 'assert';

console.log('Running Login Location Onboarding & Store Sorting Contract Check...');

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const patch = fs.readFileSync(new URL('../login_location_sorting_patch.js', import.meta.url), 'utf8');

assert(html.includes('login_location_sorting_patch.js'), 'index.html must load the login location patch');
assert(html.includes('data-feature="supermarket"') || html.includes('openSupermarkets'), 'index.html must have the supermarket service card');
assert(patch.includes('requestLoginLocation'), 'Patch must request geolocation prompt');
assert(patch.includes('loginLocationBanner'), 'Patch must render location onboarding widget on login screen');
assert(patch.includes('sortStoresByRatingAndDistance'), 'Patch must sort stores by rating and proximity');

console.log('All Login Location Onboarding & Store Sorting contract checks passed successfully!');
