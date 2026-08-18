# AP Service — Customer

Repository นี้เป็น **Customer Application เท่านั้น** ของ AP Service และเป็น URL เดิมสำหรับผู้ใช้บริการ

| Repository | บทบาท | GitHub Pages |
|---|---|---|
| `Apservice-` | Customer | `/customer/` |
| `Apservicebeta` | Admin | `/admin/` |
| `ap-store-mobile` | Merchant | `/merchant/` |
| `ap-rider-mobile` | Rider | `/rider/` |

Customer MPA อยู่ใน `customer/` และ root URL จะพาไป Customer application โดยตรง แอปนี้ใช้ Supabase, Auth, RLS, data contracts และ Shared Media Service ชุดเดียวกับ application บทบาทอื่น แต่ไม่เก็บ Admin, Merchant หรือ Rider application source code อีกต่อไป

> Publishable Key ของ Supabase สามารถอยู่ในไฟล์เว็บสาธารณะได้ตามการออกแบบของ Supabase แต่ห้ามเพิ่ม Service Role Key, Secret Key หรือรหัสผ่านลงใน repository นี้โดยเด็ดขาด
