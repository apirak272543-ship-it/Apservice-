# AP Service — Customer Application

รีโพสิตอรีนี้เป็น **Customer Application เท่านั้น** ของ AP Service และเป็นแอพสำหรับผู้ใช้บริการในการเลือกบริการ ร้านค้า เมนู สินค้า สร้างตะกร้า สั่งซื้อ ชำระเงิน ติดตามออร์เดอร์ จัดการที่อยู่ โปรไฟล์ และติดต่อช่วยเหลือ

| รีโพสิตอรี | บทบาท | Entry point หลัก |
|---|---|---|
| `apservice-customer-app` | Customer Application | `customer/` และ root URL เป็น compatibility entry |
| `apservice-admin-app` | Admin Application | `admin/` |
| `apservice-rider-app` | Rider Application | `rider/` |
| `ap-store-mobile` | Merchant Application | `merchant/` |

Customer MPA อยู่ใน `customer/` และแยก source code จาก Admin, Merchant และ Rider อย่างชัดเจน แอพใช้ Supabase Authentication, RLS, data contracts และ Shared Media Service ชุดเดียวกับแอปบทบาทอื่น การเข้าถึงข้อมูลส่วนตัวต้องอาศัย session ที่ยืนยันแล้วและ policy ของ backend/RLS ไม่ใช่ localStorage เพียงอย่างเดียว

## ขอบเขตฟังก์ชัน

ฟังก์ชันหลักประกอบด้วยหน้าแรกและบริการ, ร้านค้าและหมวดหมู่, รายละเอียดร้านและเมนู, ตะกร้าและ checkout แบบหลายร้าน, อาหาร, Retail/Supermarket, Parcel, Marketplace, การแนบสลิป, การติดตามออร์เดอร์, ที่อยู่จัดส่ง, โปรไฟล์, การแจ้งเตือน และระบบช่วยเหลือ รวมถึงการแสดงแบรนด์ พื้นหลัง แบนเนอร์ และโปรโมชันที่ Admin ตั้งค่าจากส่วนกลาง

## ความปลอดภัยของข้อมูล

Publishable Key ของ Supabase สามารถอยู่ในไฟล์เว็บสาธารณะได้ตามการออกแบบของ Supabase แต่ห้ามเพิ่ม Service Role Key, Secret Key หรือรหัสผ่านลงในรีโพสิตอรีนี้โดยเด็ดขาด ไฟล์รูปและหลักฐานต้องผ่านการตรวจชนิดไฟล์ ขนาด การบีบอัด และ authorization ตาม Shared Media Contract

## การตรวจสอบ

ใช้ `npm test` เพื่อรัน customer feature-contract tests ที่อยู่ใน `tests/`
