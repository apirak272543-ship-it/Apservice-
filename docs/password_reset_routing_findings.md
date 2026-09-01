# Password reset routing findings

- GitHub Pages ของ repository `apservice-customer-app` ใช้ URL หลัก `https://apirak272543-ship-it.github.io/apservice-customer-app/` และ deploy จาก `main` ที่ root (`/`).
- หน้า `https://apirak272543-ship-it.github.io/apservice-customer-app/customer/update-password.html` โหลดได้จริงและแสดงหน้า `เลือกรหัสผ่านใหม่`.
- URL `https://apirak272543-ship-it.github.io/customer/update-password.html` ขึ้น `Site not found · GitHub Pages` เพราะขาด repository base path `/apservice-customer-app/`.
- ปัจจุบัน `customer/customer-recover.js` สร้าง redirect จาก `new URL('update-password.html', location.href).href`; เมื่อ recovery page ถูกเปิดผ่าน path ที่ถูกต้อง ค่าที่ได้ควรอยู่ใต้ `/apservice-customer-app/customer/`.
- ปัจจุบัน `customer/customer-update-password.js` เรียก `M.auth.acceptRecoveryFromHash()` ซึ่งอ่าน access token จาก URL hash แล้วล้าง hash ด้วย `history.replaceState` ก่อนเปิดใช้งานฟอร์ม.
- สมมติฐานหลัก: ลิงก์ในอีเมลหรือค่า Supabase Auth Site URL/Redirect URL กำลังชี้ไปที่ root domain โดยไม่มี `/apservice-customer-app/` หรือผู้ใช้เปิดลิงก์ที่ถูกตัด base path ทำให้เกิด 404 ก่อนถึงหน้า reset.

## Production browser verification

หลัง deploy commit `010a33a` หน้า `https://apirak272543-ship-it.github.io/apservice-customer-app/customer/recover.html` โหลดได้จริง และเมื่อจำลองการ submit โดยดักคำขอไว้ใน browser ไม่เรียก Supabase จริง ค่าที่ส่งเข้า `sendPasswordRecovery` คือ `https://apirak272543-ship-it.github.io/apservice-customer-app/customer/update-password.html` ซึ่งมี repository base path ถูกต้อง.

หน้า `https://apirak272543-ship-it.github.io/apservice-customer-app/customer/update-password.html` ตอบ HTTP 200 และแสดงฟอร์มตั้งรหัสผ่านใหม่. การทดสอบนี้ยังไม่ได้ใช้ recovery token จริงและไม่ได้เปลี่ยนรหัสผ่านของบัญชีใด.
