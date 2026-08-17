# Admin Performance Runtime Measurements

วันที่วัด: 2026-08-17 (local sandbox)

## รอบหลังแก้บน local preview

URL: `http://127.0.0.1:4173/index.html?admin-perf-audit=1`

PerformanceResourceTiming ของหน้าแรกหลังแก้รายงาน navigation DOMContentLoaded ประมาณ 247 ms และ load ประมาณ 296 ms จาก resource count 50 รายการ. REST/Supabase ที่เห็นก่อนเปิด Admin มี 6 รายการ ได้แก่ `support_admin_presence`, `catalog_stores` แบบ summary, `store_categories`, `platform_configs` และ resource ของโมดูล. ไม่มี `marketplace_listings` ในรอบ boot. `window.__apPerformance.snapshot()` รายงาน cacheEntries 0, inflight 0, catalogInflight false, marketplaceInflight false.

การเปิด Admin ใน browser รอบนี้ยังไม่ได้วัด network ของ Admin เพราะ browser session ไม่มี Supabase access token และ `Storage.isAdmin()` เป็น false แม้ local `AppState.user.role` จะมีค่า `admin`; จึงไม่ใช้รอบนี้เป็นตัวเลข Admin.

## Baseline ที่เตรียมไว้

สร้างจาก `git archive HEAD` ไปยัง `/tmp/apservice-baseline` และเปิดที่ `http://127.0.0.1:4174/index.html?perf-baseline=1`. ต้องวัดด้วย browser profile ที่มีสิทธิ์ Admin หรือใช้ deterministic request harness เพื่อเปรียบเทียบ loader โดยไม่ส่งข้อมูลจริง.

## ข้อจำกัดการตีความ

ค่า latency ของ Supabase ที่เห็นเป็นเวลาจาก browser จริงและอาจเปลี่ยนตาม session/cache/network. ยังไม่สรุปเปอร์เซ็นต์ Admin จนกว่าจะมีรอบวัดที่เทียบ request harness เดียวกันทั้ง baseline และ patched build.

## Baseline browser measurement

URL: `http://127.0.0.1:4174/index.html?perf-baseline=1` จาก commit ก่อนแก้รอบนี้. Navigation: DOMContentLoaded ประมาณ 358 ms, load ประมาณ 379 ms, resource count 56 และ REST/Supabase ที่จับได้ 12 รายการ. Baseline ดึง `catalog_stores` แบบ full catalog, `catalog_menu_items`, `menu_categories`, `menu_option_groups`, `menu_option_values`, `platform_configs`, `support_admin_presence` และมีคำขอ option groups/values ซ้ำอีกชุด. Total transfer ที่ PerformanceResourceTiming รายงานประมาณ 374,747 bytes (resource timing บางรายการเป็น cross-origin จึงมี transferSize เป็นศูนย์).

ในทางข้อมูล baseline จึงมี catalog/menu/option requests 10 รายการที่เกี่ยวข้องกับ boot (รวมซ้ำ) ขณะที่ build หลังแก้รอบแรกจับได้เฉพาะ catalog summary + store_categories และไม่พบ marketplace boot request.

## Patched browser measurement

URL: `http://127.0.0.1:4173/index.html?perf-patched=2`. Navigation: DOMContentLoaded ประมาณ 200 ms, load ประมาณ 242 ms, resource count 50, REST/Supabase 6 รายการ และ total transfer ที่ timing รายงานประมาณ 6,600 bytes (cross-origin body sizes ไม่ถูกรายงานครบ). Requests คือ `support_admin_presence`, catalog store summary, `store_categories`, `platform_configs` และ module resources; ไม่พบ `catalog_menu_items`, `menu_categories`, `menu_option_groups`, `menu_option_values` หรือ `marketplace_listings` ใน boot.

เทียบ baseline รอบ browser เดียวกัน: DOMContentLoaded ลดประมาณ 44.1% (358 → 200 ms), load ลดประมาณ 36.2% (379 → 242 ms), resource count ลดประมาณ 10.7% (56 → 50), REST count ลด 50% (12 → 6), และไม่มี duplicate option group/value boot requests.

หมายเหตุ: ค่า navigation เป็นเวลาที่ browser วัดใน local sandbox และไม่ใช่ latency ของ Supabase เพียว ๆ. Admin end-to-end ต้องแยกวัดด้วย deterministic harness เพราะ browser session นี้ไม่มี access token ของ Admin.

## Browser storage harness

ใช้ `window.APServiceModules.storage.persistAppState` กับ fake storage และ synthetic state ที่มีร้าน 28 รายการ เมนู 336 รายการ และ inline image payload 120 KB ต่อภาพ โดยไม่แตะ localStorage จริงของผู้ใช้. การ stringify raw เฉพาะ stores/config ใช้ประมาณ 110.5–184.9 ms ต่อรอบใน browser รอบนี้. Patched persist ครั้งแรกใช้ประมาณ 3.0 ms และ repeated calls ใช้ 4.8, 1.0, 0.4, 0.6 ms; writes ทั้งหมด 13 ครั้งจาก 5 รอบ เพราะ slice ที่ไม่เปลี่ยนถูกข้าม write. Cache copy ของ `apcx_stores` และ `apcx_config` ไม่มี `data:image` และมีขนาดประมาณ 21.6 KB / 27 bytes. ผลนี้ยืนยันว่าต้นทุน serialize state ใหญ่ซ้ำลดลงอย่างชัดเจนเมื่อ state ไม่เปลี่ยน.
