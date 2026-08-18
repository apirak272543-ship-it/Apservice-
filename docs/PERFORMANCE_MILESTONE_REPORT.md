# รายงานผล Milestone: MPA Lifecycle, Media และ Payment Review

**วันที่วัด:** 18 สิงหาคม 2026  
**Production:** <https://apirak272543-ship-it.github.io/Apservice-/>  
**Commit:** `4e40912c077d85f761dec6f6238d708a88b88caa`

## ขอบเขตการปรับปรุง

Milestone นี้ย้ายงาน network ที่ไม่สำคัญต่อการเปิดหน้าออกจาก critical rendering path ของ MPA โดยเพิ่ม request lifecycle กลางที่รองรับ cache-first แบบ TTL, deduplication ของ request ที่กำลังทำงาน, request scope พร้อม `AbortController` และการตัด stale response เมื่อผู้ใช้ออกจากหน้าแล้ว. Background sync ถูกจำกัดเป็นรายบทบาทและรายข้อมูลที่เกี่ยวข้องเท่านั้น อีกทั้งหยุดรอบ sync เมื่อหน้าเว็บถูกซ่อนเพื่อลด request storm.

ในส่วน media ได้เพิ่มเส้นทางอัปโหลดที่ใช้ Shared Media Service สำหรับ Merchant store media, Rider delivery proof และ Customer payment slip โดยไฟล์ภาพจะถูกบีบอัดไม่เกิน 1 MB, แสดง progress ตามการประมวลผล/ไบต์จริง, ตรวจ URL ก่อนบันทึก และเก็บ private media เป็น storage reference ที่ไม่หมดอายุ. Admin MPA ได้รับคิวตรวจสลิป, viewer ภายในหน้าเว็บด้วย signed URL และ workflow อนุมัติหรือขอแนบใหม่ตาม Shared Core order transition.

| ส่วนงาน | ผลที่ส่งมอบ |
|---|---|
| Shared Runtime | Cache TTL, in-flight deduplication, stale-response protection, scoped background sync และ metric counters |
| Customer | แนบสลิปจากคลัง/กล้อง, ส่งเข้า `payment_slip_reviews`, บันทึก private storage reference |
| Merchant | อัปโหลดไอคอนและภาพพื้นหลังร้านจากคลัง/กล้อง ภายใต้ RLS path ของเจ้าของร้าน |
| Rider | อัปโหลดหลักฐานส่งงานแบบ private จากคลัง/กล้อง ภายใต้ RLS ที่ผูกกับงานของไรเดอร์ |
| Admin | ตรวจสลิปในหน้าเว็บ, อนุมัติ/ขอแนบใหม่, บันทึก order event และ Control Plane สำหรับ `business_rules` |

## วิธีวัด

วัดจาก GitHub Pages production ด้วย Chromium headless ผ่าน Chrome DevTools Protocol โดยใช้ fresh profile ในแต่ละรอบ. เก็บ navigation timing, first contentful paint (FCP), จำนวน network/resource request และขนาด resource ที่ browser รายงาน. Baseline วัดก่อน push; after measurement วัดหลังตรวจยืนยันว่า GitHub Pages ให้ไฟล์ Shared Runtime และ checkout เวอร์ชันใหม่แล้ว.

> ตัวเลขเป็น **single cold-run sample** จาก network environment เดียวกัน จึงใช้ยืนยันว่าไม่มี request count เพิ่มและว่า render timing รอบวัดดีขึ้น ไม่ควรตีความเป็น SLA หรือความเร็วคงที่ของผู้ใช้ทุกเครือข่าย. TTFB โดยเฉพาะอาจผันผวนตาม CDN/network.

## ผลวัดก่อนและหลังเผยแพร่

| Route | Network requests ก่อน → หลัง | DCL ก่อน → หลัง | FCP ก่อน → หลัง | Load ก่อน → หลัง |
|---|---:|---:|---:|---:|
| Customer `/customer/` | 10 → 10 | 269.0 → 210.3 ms (**-21.8%**) | 372 → 308 ms (**-17.2%**) | 270.7 → 211.7 ms (**-21.8%**) |
| Admin `/admin/dashboard.html` | 9 → 9 | 92.5 → 67.5 ms (**-27.0%**) | 136 → 104 ms (**-23.5%**) | 115.5 → 87.9 ms (**-23.9%**) |
| Merchant `/merchant/dashboard.html` | 9 → 9 | 138.4 → 69.3 ms (**-49.9%**) | 168 → 104 ms (**-38.1%**) | 151.4 → 84.9 ms (**-43.9%**) |
| Rider `/rider/dashboard.html` | 9 → 9 | 78.5 → 65.1 ms (**-17.1%**) | 112 → 96 ms (**-14.3%**) | 95.6 → 79.3 ms (**-17.1%**) |

จำนวน request ของหน้า dashboard ที่ยังไม่ล็อกอินคงเดิม เพราะคำขอ P2/P3 ที่ต้องมีสิทธิ์จะไม่เริ่มก่อน role gate ผ่าน. การป้องกัน request ซ้ำและ scoped background sync ถูกยืนยันโดย contract tests; การวัดปัจจุบันไม่ได้ใช้บัญชีจริง จึงไม่รวม Supabase data requests หลังล็อกอิน.

Customer มี resource bytes จาก 18,822 เป็น 21,601 bytes ในรอบวัด เนื่องจาก Shared Runtime เพิ่ม lifecycle logic. แม้ payload เพิ่มขึ้น แต่ DCL, load และ FCP รอบวัดลดลง และไม่มี request เพิ่ม. ภาพที่อยู่นอก viewport ยังคงใช้ lazy loading ตาม route/media lifecycle.

## การตรวจสอบที่ผ่าน

รัน `bash /tmp/run_apservice_contracts.sh` หลังแก้ไขแล้วผ่านทุก test ใน suite รวมทั้ง contract ใหม่สำหรับ Shared Request Lifecycle, Customer payment slip, Merchant media, Rider delivery proof, Admin payment slip MPA และ Admin business rules control plane. ตรวจ `git diff --check` ก่อน commit และยืนยัน production asset หลัง push แล้ว.

| กลุ่มการตรวจ | สถานะ |
|---|---|
| MPA route/asset/runtime contracts | ผ่าน |
| Shared Core และ request lifecycle contracts | ผ่าน |
| Media 1 MB hard cap และ progress contracts | ผ่าน |
| Customer/Merchant/Rider private media contracts | ผ่าน |
| Admin payment-slip queue, viewer และ business rules contracts | ผ่าน |
| Legacy fallback regression contracts | ผ่าน |
| Production HTTP และ Chromium-CDP before/after measurement | ผ่านตามขอบเขตที่วัด |

## ข้อจำกัดและงานต่อเนื่อง

ระบบยัง **ไม่** อนุมัติสลิปโดยอัตโนมัติ เพราะยังไม่มีผู้ให้บริการตรวจสอบธุรกรรมที่เชื่อถือได้เชื่อมต่ออยู่; Admin ต้องตรวจยอด วันเวลา และผู้รับเงินจริงก่อนอนุมัติ. ค่า `business_rules` ถูกบันทึกใน `platform_configs` ผ่าน RLS ของ Admin แล้ว แต่ต้องมี server-side consumer/validation ที่อ้างอิงค่านี้ก่อนนำไปบังคับใช้กับการคำนวณและตัดเงินจริง. การวัดนี้ไม่มี session ของแต่ละบทบาท จึงควรทำ authenticated E2E benchmark เพิ่มเติมเมื่อมีบัญชีทดสอบที่เหมาะสม.
