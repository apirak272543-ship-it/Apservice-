# AP Service Cross-App UI, Function and WebView/APK Audit

**วันที่ตรวจ:** 19 สิงหาคม 2026  
**ขอบเขต:** Customer, Admin, Merchant, Rider และ Android WebView APK ที่เกี่ยวข้อง  
**สถานะ:** Audit ระยะที่หนึ่ง — พบช่องว่างที่ต้องแก้ก่อนขยาย UI/ฟังก์ชันต่อ

> กฎบังคับใหม่: การแก้ UI, route, authentication, media, data contract หรือ workflow ใด ๆ ต้องทำ impact analysis ครอบคลุม 4 Web Applications และ 3 Android WebView APK ก่อน implement และหลัง implement ต้องทดสอบ cross-app ตามผลกระทบจริง

## 1. โครงสร้างที่ตรวจพบ

| Application | Repository | MPA routes ที่พบ | APK / WebView shell | สถานะเริ่มต้น |
|---|---|---:|---|---|
| Customer | `Apservice-` | 15 | ยังไม่พบ Android WebView shell ที่เชื่อม Customer production | **Gap สำคัญ** |
| Admin | `Apservicebeta` | 14 | ไม่มี APK ตามรูปแบบที่ตรวจพบ | Web MPA พร้อมใช้งาน |
| Merchant | `ap-store-mobile` | 8 | `App.tsx` โหลด `…/ap-store-mobile/merchant/` | WebView shell มีอยู่ |
| Rider | `ap-rider-mobile` | 8 | `App.tsx` โหลด `…/ap-rider-mobile/rider/` | WebView shell มีอยู่ |

ตัวโปรเจกต์ `/home/ubuntu/app-delivery-mobile` ที่เคยถูกสร้างไว้ยังเป็น Expo template ชื่อ **AppDelivery** และไม่ใช่ Customer WebView shell ที่เชื่อม production URL ดังนั้นจึงยังไม่สามารถนับเป็น APK Customer ที่พร้อมใช้งานได้

## 2. ผลตรวจเส้นทางและ Shared Runtime

ทุก HTML route ที่พบในการ deploy ตอบ HTTP `200` ขณะตรวจสอบ ได้แก่ Customer 15 routes, Admin 14 routes, Merchant 8 routes และ Rider 8 routes อีกทั้งไฟล์ `ap-service-core.js`, `ap-service-mpa.js` และ `ap-service-media.js` มี SHA-256 ตรงกันทั้ง 4 repositories ซึ่งยืนยันว่า runtime กลางชุดปัจจุบันยังเท่ากัน

| Shared runtime | ผล hash เทียบ 4 repositories | ความหมาย |
|---|---|---|
| `ap-service-core.js` | ตรงกัน | สัญญา order / business rules กลางเท่ากัน |
| `ap-service-mpa.js` | ตรงกัน | lifecycle, cache และ request scope กลางเท่ากัน |
| `ap-service-media.js` | ตรงกัน | compression / upload / media registry กลางเท่ากัน |

## 3. สิ่งที่ผ่านการตรวจเชิงโครงสร้าง

Merchant และ Rider APK ใช้ React Native WebView โดยเปิด JavaScript, DOM storage, cache, pull-to-refresh และ Android back navigation ผ่าน `canGoBack` ทั้งคู่ นอกจากนี้มี loading overlay, retry state, notification preferences และ OTA settings ใน native shell จึงไม่ใช่เพียง WebView เปล่า

Merchant ผูก URL ไปที่ Merchant repository ของตนเอง และ Rider ผูก URL ไปที่ Rider repository ของตนเอง จึงสอดคล้องกับหลักแยก deployment/runtime. Rider ยังมี native polling ทุก 10 วินาทีสำหรับงานพร้อมรับ และ Merchant ทุก 30 วินาทีสำหรับออร์เดอร์ร้านค้า ซึ่งใช้ AppState guard เพื่อลดงานเมื่อ app ไม่ active

Customer native contracts ที่ไม่พึ่ง path ข้าม repository ผ่านแล้วในหัวข้อ brand RLS, delivery pricing, media, marketplace, notification, register, support และ visual shell. Merchant media contract และ Rider available-job/delivery-proof contracts ผ่านแล้ว พร้อม TypeScript check ของทั้งสอง APK. Admin contracts ผ่าน 17 ชุดแรกครอบคลุม MPA, media, finance, store, control plane และ mobile layout ก่อนเจอ test ที่ยังอ้าง patch file เก่า

## 4. ช่องว่างและความเสี่ยงที่พบ

| ลำดับ | ความเสี่ยง | หลักฐาน | ผลกระทบ | การแก้ที่เสนอ |
|---:|---|---|---|---|
| P0 | **Customer APK ยังไม่เป็น production WebView shell** | `app-delivery-mobile` ยังเป็น Expo template และไม่ชี้ Customer production URL | Customer Web UI และ APK ไม่สามารถรับประกัน parity | สร้าง/เปลี่ยน Customer APK ให้เป็น WebView shell ที่ใช้ Customer URL, session bridge, upload, back handling, loading/retry และ notification contract เดียวกับ Merchant/Rider |
| P0 | **contract tests หลายชุดยังอ้างไฟล์จาก repository เดิม** | พบ reference เช่น `merchant/merchant-app.js`, `admin_contact_ui_patch.js`, `admin/admin-app.js`, `admin_floating_cart_patch.js` ใน Customer tests; Admin back-navigation contract อ้าง patch file เก่า | regression suite เต็มชุด false-fail และไม่สะท้อน architecture 4 repositories | เปลี่ยน tests ให้ resolve repository peer หรือแยก cross-repository contracts ไป test harness กลางที่รับ absolute repo paths |
| P1 | **ไม่มี Android-device acceptance test สำหรับ file upload / storage / external navigation** | Native WebView เปิด DOM storage แต่ยังไม่มี test ที่ยืนยันการเลือกไฟล์ กล้อง/คลังรูป, signed URL, external link และ logout บนอุปกรณ์จริง | ภาพอาจเลือก/อัปโหลดไม่ได้ หรือ external link ทำงานไม่ตามที่ต้องการบน Android | เพิ่ม device checklist และ deterministic bridge contracts; ทดสอบ Android จริงก่อนทุก release ที่เปลี่ยน media/auth/navigation |
| P1 | **Order, Store, Account และ Customer Content UI ยังอยู่ระหว่างขยาย** | requirements ล่าสุดต้องการ detail-first order editor, store directory, account ทุกบทบาท, category content manager | UI ปัจจุบันยังไม่ครอบคลุม control plane ทั้งหมด | หยุดสร้าง UI แบบแยกหน้าเดี่ยว และทำ impact matrix/acceptance criteria 4 app ก่อน implement แต่ละหมวด |
| P2 | **WebView navigation policy ยังอนุญาต `https`/`http` ทุก host** | `originWhitelist` ใน Merchant/Rider เปิด wildcard protocol | external links อาจอยู่ใน WebView แทนเปิด browser หรือไม่มี policy ชัดเจน | เพิ่ม allowlist สำหรับ AP Service/GitHub Pages/Supabase และส่ง external URL ออก system browser โดย explicit policy |

## 5. Matrix ตรวจผลกระทบที่ต้องใช้เป็น gate

| การเปลี่ยนแปลง | Customer Web | Admin Web | Merchant Web/APK | Rider Web/APK | Customer APK | Backend / RLS | การทดสอบขั้นต่ำ |
|---|---:|---:|---:|---:|---:|---:|---|
| Order lifecycle / item edit | ต้องเห็นรายละเอียดใหม่ | แก้แบบ audit | ต้องเห็นราคาหรือรายการใหม่ | ต้องเห็นงานล่าสุด | ต้องเห็นสถานะใหม่ | RPC + pricing + RLS | create → edit → merchant → rider → customer refresh |
| Media / brand / banner | ต้อง render media ใหม่ | จัดการ/preview | เฉพาะ media ร้าน | เฉพาะ proof / profile | ต้อง render + upload ได้ | Storage + registry + RLS | upload → URL → refresh 4 apps ที่เกี่ยวข้อง |
| User roles / account controls | permissions enforced | control plane | Merchant login/entity link | Rider login/entity link | session/role behavior | Auth + role function + RLS | account create/edit/suspend → all relevant sign-in paths |
| Route / navigation UI | browser + APK back | browser | browser + Android back | browser + Android back | Android back | ไม่มีโดยปกติ | page route, reload, back, deep/external link |
| Shared runtime update | regression | regression | web + APK | web + APK | APK | contracts | hashes + tests 4 repos |

## 6. ลำดับงานที่แนะนำก่อนต่อยอด UI ใหม่

1. สร้าง Customer APK WebView shell ที่มี parity ขั้นต่ำกับ Merchant/Rider และกำหนดว่า 3 APK คือ Customer, Merchant และ Rider อย่างเป็นทางการ
2. ซ่อม cross-repository contract tests ที่ยังอ้างไฟล์ legacy/path เดิม เพื่อให้ full regression suite เชื่อถือได้
3. ทำ cross-app E2E acceptance ผ่านบัญชีจริงตาม flow: Customer create → Merchant accept → Rider claim/complete → Customer status; รวม QR/slip, media brand และ account suspension
4. หลัง gate ข้อ 1–3 ผ่าน จึงพัฒนา detail-first UI ของ Orders, Stores, Accounts และ Customer Content พร้อมกรอก impact matrix ทุกครั้ง

## 7. เกณฑ์ประกาศว่า UI/Function ผ่าน

ฟังก์ชันจะไม่ถือว่าเสร็จเพียงเพราะหน้า render ได้ ต้องผ่าน: UI render, authenticated read, RLS-protected write, refresh persistence, error/empty/loading state, cross-app consumer update และ WebView APK device check เมื่อมี APK ที่เกี่ยวข้อง

## 8. Rollback

การแก้แต่ละ repository ต้องเป็น commit แยกตาม application และการเปลี่ยน database/Edge Function ต้องมี migration/source ที่ versioned ใน Central Backend repository. ห้ามลบ UI, media, storage object, user หรือ production data ระหว่าง audit นี้
