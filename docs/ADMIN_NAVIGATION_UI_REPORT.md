# รายงานงานไฟล์ที่ 4 — Admin Navigation และ UI Workspace

## แนวทางการออกแบบ

Admin MPA ใช้ **AP Service Control Workspace** ที่มี top navigation แบบ sticky ไม่ใช่การจำลอง Facebook UI ระบบแยกหน้า MPA เดิมคงอยู่ทุก route และแต่ละหน้าดึงเฉพาะข้อมูลของหน้าตนเองเช่นเดิม Navigation ใหม่ทำหน้าที่เปลี่ยนวิธีเข้าถึงเท่านั้น ไม่ใช่ security boundary และไม่แทนที่การตรวจ Admin role/RLS

| กลุ่ม | Menu ใหม่ | Route จริง | Function เดิม |
|---|---|---|---|
| Primary | ภาพรวม | `dashboard.html` | summary/pending/quick actions |
| Primary | ออร์เดอร์ | `orders.html` | ดูและเปลี่ยนสถานะออร์เดอร์ |
| Primary | ร้านค้า | `stores.html` | ร้านค้าและ media editor |
| Primary | ไรเดอร์ | `riders.html` | จัดการไรเดอร์ |
| Primary | ลูกค้า | `customers.html` | directory ลูกค้า |
| More: Operations | การเงิน | `finance.html` | ตรวจสลิปและคำขอถอน |
| More: Operations | แจ้งเตือน | `notifications.html` | งานแจ้งเตือน |
| More: Content | โฆษณา | `promotions.html` | promotion/customer AD banner |
| More: System | AI Workspace | `ai-workspace.html` | พื้นที่ทำงานร่วม AI |
| More: System | ตั้งค่ากลาง | `settings.html` | control-plane business rules |
| More: Recovery | ระบบเดิม | `../admin.html` | legacy fallback ที่คงอยู่ |

## สิ่งที่ปรับ

Navigation ทุก item ใช้ inline SVG ของ AP Service พร้อม short label, `title`, `aria-label`, active state และ visible keyboard focus โดยไม่เพิ่ม dependency หรือใช้ emoji เป็น production icon Desktop แสดง 5 เมนูหลักพร้อม More menu; Mobile แสดง icon หลัก 3 รายการและ More menu เพื่อป้องกัน top bar ล้น แต่ทุก function ยังเข้าถึงได้ใน More menu

Dashboard ยังคงเป็น Overview: สรุปตัวเลขและงานที่ต้องตรวจสอบเท่านั้น Quick Actions พาไปยัง Stores, Promotions, Orders และ Finance ผ่าน MPA route จริงโดยไม่สร้าง business logic ซ้ำ Cards summary ก็เชื่อมต่อไปยังหน้าดำเนินงานโดยตรง Page shell ยัง render ก่อน auth/role/data และ browser Back ใช้ document navigation มาตรฐาน

## การทดสอบ

ผ่าน `admin_mpa_performance_contract_test.cjs` ที่ตรวจ sticky navigation, SVG icon, active/More route, keyboard focus, mobile breakpoint, cache version และ quick action routes รวมถึง full AP Service contract suite ทั้งหมด GitHub Pages production ตรวจว่า Admin routes ทั้ง 10 หน้าโหลด `admin-navigation.css?v=admin-nav-v1` และ asset ตอบ HTTP 200

การตรวจ function ที่ต้องใช้สิทธิ์ Admin จริงยังอยู่ภายใต้ RLS/role guard เช่นเดิม Environment นี้ไม่มี session Admin ที่ใช้ทำ CRUD production ได้ จึงไม่ได้ทำ action write หรือใช้บัญชีปลอม แต่ route/data contracts, role gate, media/payment/notification regression contracts ผ่านครบ

## Files และ Commit

ไฟล์หลักคือ `admin/admin-app.js`, `admin/admin-navigation.css`, Admin MPA shells ทุกหน้า และ `tests/admin_mpa_performance_contract_test.cjs` Commit implementation คือ `75bacdd` (`feat(admin): add responsive icon navigation workspace`)
