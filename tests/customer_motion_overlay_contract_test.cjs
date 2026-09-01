const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'shared', 'ap-service-mpa.css'), 'utf8');
const htmlFiles = fs.readdirSync(path.join(__dirname, '..', 'customer')).filter(name => name.endsWith('.html'));

for (const token of [
  'z-index:2147483640',
  'pointer-events:none',
  'body[data-page] > .ap-customer-motion',
  'top:-12vh',
  '@keyframes ap-visual-fall',
  'translate:calc((var(--i) - 9) * -7px) 116vh'
]) {
  if (!css.includes(token)) throw new Error(`Missing Motion contract token: ${token}`);
}
if (htmlFiles.length < 22) throw new Error(`Expected at least 22 Customer pages, found ${htmlFiles.length}`);
for (const name of htmlFiles) {
  const html = fs.readFileSync(path.join(__dirname, '..', 'customer', name), 'utf8');
  if (html.includes('ap-service-mpa.css') && !html.includes('mpa-v14-motion-overlay')) {
    throw new Error(`Stale Motion CSS cache-busting in ${name}`);
  }
}
console.log(`customer_motion_overlay_contract_test: PASS (${htmlFiles.length} Customer HTML pages)`);
