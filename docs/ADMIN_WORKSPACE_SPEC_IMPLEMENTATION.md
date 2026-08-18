# Admin Workspace — Specification Implementation Record

## หลักการที่ใช้งาน

Admin ใช้ **Multi-Page Application** ที่เปลี่ยน document route ก่อนเริ่มโหลดข้อมูลเฉพาะหน้า Shell ถูก render ก่อน role/data query และ Shared Core ยังคงเป็นเจ้าของ auth, role, cache, request lifecycle, media และ business rules การเห็นเมนูไม่ถือเป็นสิทธิ์เข้าถึง; ทุก page เรียก `requireRole('admin')` และ Supabase RLS ยังคงเป็นตัวบังคับสิทธิ์

## Navigation และ Page Structure

| กลุ่ม | New MPA route | Function ที่คงอยู่ |
|---|---|---|
| Primary | `dashboard.html`, `orders.html`, `stores.html`, `riders.html`, `customers.html` | Overview, ออร์เดอร์, ร้าน/สื่อ, ไรเดอร์, ลูกค้า |
| Operations | `finance.html`, `notifications.html` | สลิป/คำขอถอนและการเงิน, การแจ้งเตือน |
| Content | `promotions.html` | โฆษณา Customer และ media upload ผ่าน Shared Media |
| System | `ai-workspace.html`, `settings.html` | AI collaboration และ business rules/control plane |
| Legacy migration | `../admin.html?admin=<section>` | rider applications, settlements, support, inventory, content, admins, errors และ mapping |

More menu ใหม่แบ่งเป็น **การปฏิบัติงาน**, **เนื้อหาและสื่อ**, **ระบบ** และ **ฟังก์ชันเดิมระหว่างย้าย** ไม่มีเมนู legacy ถูกลบ ทั้งยังเพิ่ม deep-link bootstrap ให้ Admin legacy เปิด section ที่เลือกจริงจาก query parameter และ Browser Back ย้อนกลับไปยัง MPA page เดิมตาม browser history

## การตอบ acceptance criteria

| Acceptance | หลักฐาน implementation |
|---|---|
| Fixed compact navigation | shared sticky topbar + `admin-navigation.css` responsive desktop/mobile |
| Icon/label/tooltip/active/focus | Inline SVG, label, `title`, `aria-label`, `aria-current`, `:focus-visible` |
| Mobile access | Top primary 3 icons + More + account; menu อื่นไม่ถูกซ่อนถาวร |
| Dashboard เป็น overview | มี summary, pending guidance, quick actions; ไม่มีรายละเอียด orders/riders/customers กองรวม |
| Page data isolation | ทุก handler query table ของ route ตนเองหลัง `gate()` เท่านั้น |
| Badge does not block | Cache-first from session storage; refresh after shell render, TTL 20 seconds, hidden-page guard, failure keeps cache |
| Notification does not block | Badge refresh อยู่ background; Notifications page query เฉพาะเมื่อเปิด route |
| Old function preservation | Legacy deep-links และ fallback `admin.html` คงอยู่ |
| Media loading | Stores/Promotions ใช้ Shared Media v4 compression, upload verification และ private signed image flow |

## Regression Scope

ผ่าน Admin navigation/performance, standalone shell, back navigation, business rules, payment slip, image cap, mobile layout, pending badges, media และ full AP Service contract suite ผู้ตรวจยังต้องทำ authenticated CRUD acceptance ด้วยบัญชี Admin จริงสำหรับ write action เพราะ environment ตรวจไม่ใช้สิทธิ์ admin จำลองหรือ bypass RLS
