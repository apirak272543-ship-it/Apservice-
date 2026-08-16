import fs from 'fs';
import assert from 'assert';

console.log('Running Errand UX & JWT Safeguard Contract Check...');

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert(html.includes('errand_ux_and_jwt_patch.js'), 'index.html must load errand_ux_and_jwt_patch.js');

const patch = fs.readFileSync(new URL('../errand_ux_and_jwt_patch.js', import.meta.url), 'utf8');
assert(patch.includes('handleExpiredJwtError'), 'Patch must define handleExpiredJwtError helper');
assert(patch.includes('errand-action-row'), 'Patch must include responsive action row CSS rules');

console.log('All Errand UX & JWT Safeguard contract checks passed successfully!');
