# Customer Magic-Link Setup

เอกสารนี้ใช้ตั้งค่าปลายทางของลิงก์ยืนยันอีเมลสำหรับ AP Service Customer หลัง deploy ไปยัง GitHub Pages

## URL ที่ต้องอนุญาตใน Supabase

ใน Supabase Dashboard ให้เปิด **Authentication → URL Configuration** แล้วเพิ่ม URL ต่อไปนี้ใน **Redirect URLs**:

| รายการ | ค่า |
|---|---|
| Site URL | `https://apirak272543-ship-it.github.io/Apservice-` |
| Customer magic-link callback | `https://apirak272543-ship-it.github.io/Apservice-/customer/auth-callback.html` |

ปลายทางที่แอปส่งไปกับคำขอคือ callback URL ข้างต้น พร้อม query `next` และ `email` ที่ผ่านการตรวจรูปแบบแล้ว เช่น `?next=index.html&email=customer%40example.com` ดังนั้นต้องอนุญาต path ของ callback นี้ใน Supabase ไม่ใช่เฉพาะหน้า `profile.html`

## Email template

ใน Supabase Dashboard ให้เปิด **Authentication → Email Templates → Magic Link** แล้วนำเนื้อหาจาก `supabase/templates/customer_magic_link.html` ไปใช้เป็น template ของ Magic Link โดยคงตัวแปร `{{ .ConfirmationURL }}` ไว้ใน href ของปุ่มยืนยัน

ถ้ายังมี flow สมัครสมาชิกเดิมที่ส่งอีเมลยืนยัน ให้ใช้ `supabase/templates/customer_confirmation.html` กับ template **Confirm signup** ด้วย ทั้งสองไฟล์เป็น template สำหรับ hosted Supabase จึงต้องคัดลอกไปวางใน Dashboard ด้วยตนเอง การ commit ไฟล์ไว้ใน repository ไม่ได้เปลี่ยนค่า mailer ของ project hosted โดยอัตโนมัติ

## Flow ที่ควรทดสอบ

1. เปิด `https://apirak272543-ship-it.github.io/Apservice-/customer/profile.html` แล้วกรอกอีเมล
2. กด **ส่งลิงก์เข้าใช้งาน** และเปิดอีเมลล่าสุดใน Gmail
3. กดปุ่ม **ยืนยันและเข้าใช้งาน AP Service** ในอีเมล ลิงก์ควรเปิด `customer/auth-callback.html` ไม่ใช่ endpoint ที่ไม่มีไฟล์
4. บัญชีใหม่ควรเห็นฟอร์มชื่อ เบอร์โทรศัพท์ ที่อยู่ และการยอมรับนโยบาย จากนั้นกดบันทึกข้อมูลและถูกพาเข้าแอป
5. บัญชีเดิมที่มีข้อมูลโปรไฟล์ครบควรถูกพาเข้า route ที่ขอไว้โดยตรง
6. ลิงก์หมดอายุหรือลิงก์ที่ไม่มี token ควรแสดงหน้า error ของ AP Service พร้อมปุ่มขอลิงก์ใหม่ ไม่ใช่หน้า 404 เปล่าของ GitHub Pages

## ข้อควรระวัง

Magic Link เป็นลิงก์ใช้ครั้งเดียวและมีอายุจำกัด หากผู้ให้บริการอีเมลมีระบบติดตามลิงก์หรือระบบสแกนล่วงหน้า อาจทำให้ token ถูกใช้ก่อนลูกค้ากดจริงได้ ในกรณีนี้ควรปิด email link tracking หรือเปลี่ยนไปใช้ email OTP ตามแนวทางของ Supabase
