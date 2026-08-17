const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const carousel = fs.readFileSync(path.join(root, 'store_carousel_icon_patch.js'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'admin_contact_ui_patch.js'), 'utf8');

const checks = [
  ["carousel patch is loaded after mobile layout patch", html.indexOf("admin_mobile_layout_patch.js") < html.indexOf("store_carousel_icon_patch.js?v=store-carousel-icon-v3")],
  ["catalog migration exposes explicit icon_url alias", fs.existsSync(path.join(root, 'supabase/migrations/20260817_store_icon_alias.sql')) && fs.readFileSync(path.join(root, 'supabase/migrations/20260817_store_icon_alias.sql'), 'utf8').includes('s.image_url AS icon_url')],
  ["store cards retain the existing openStore action", carousel.includes('onclick="openStore(\'')],
  ["store rail scrolls horizontally with snap behavior", carousel.includes("overflow-x: auto") && carousel.includes("scroll-snap-type: x mandatory")],
  ["auto-slide interval is two seconds", carousel.includes("setInterval(tick, 2000)")],
  ["auto-slide reaches the end before looping", carousel.includes("const atEnd = target.scrollLeft >= max - 4") && carousel.includes("Math.min(max, target.scrollLeft + step)")],
  ["media is loaded by intersection observer", carousel.includes("IntersectionObserver") && carousel.includes("rootMargin: '0px 90% 0px 90%'")],
  ["media keeps the existing image_url as icon fallback", carousel.includes("store.iconUrl || store.icon_url || store.imageUrl || store.image_url")],
  ["background media is applied only when near the viewport", carousel.includes("store.backgroundUrl || store.background_url") && carousel.includes("visual.classList.add('has-background')")],
  ["admin appearance tab labels image as store icon", admin.includes("ไอคอนร้าน / ภาพสัญลักษณ์")],
  ["admin appearance tab keeps a compressed background picker", admin.includes("detailImagePicker('background_url'") && admin.includes("compressImageForUpload(file)")],
  ["new store form exposes icon and background media inputs", admin.includes("storeFormMediaFields") && admin.includes("storeFormImageUrl") && admin.includes("storeFormBackgroundUrl")],
];

let failed = false;
for (const [label, passed] of checks) {
  if (!passed) { console.error(`FAIL: ${label}`); failed = true; }
  else console.log(`PASS: ${label}`);
}
if (failed) process.exit(1);
console.log("Store carousel and icon contract checks passed.");
