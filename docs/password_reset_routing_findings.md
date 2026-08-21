# Password reset routing findings

- GitHub Pages ของ repository `Apservice-` ใช้ URL หลัก `https://apirak272543-ship-it.github.io/Apservice-/` และ deploy จาก `main` ที่ root (`/`).
- หน้า `https://apirak272543-ship-it.github.io/Apservice-/customer/update-password.html` โหลดได้จริงและแสดงหน้า `เลือกรหัสผ่านใหม่`.
- URL `https://apirak272543-ship-it.github.io/customer/update-password.html` ขึ้น `Site not found · GitHub Pages` เพราะขาด repository base path `/Apservice-/`.
- ปัจจุบัน `customer/customer-recover.js` สร้าง redirect จาก `new URL('update-password.html', location.href).href`; เมื่อ recovery page ถูกเปิดผ่าน path ที่ถูกต้อง ค่าที่ได้ควรอยู่ใต้ `/Apservice-/customer/`.
- ปัจจุบัน `customer/customer-update-password.js` เรียก `M.auth.acceptRecoveryFromHash()` ซึ่งอ่าน access token จาก URL hash แล้วล้าง hash ด้วย `history.replaceState` ก่อนเปิดใช้งานฟอร์ม.
- สมมติฐานหลัก: ลิงก์ในอีเมลหรือค่า Supabase Auth Site URL/Redirect URL กำลังชี้ไปที่ root domain โดยไม่มี `/Apservice-/` หรือผู้ใช้เปิดลิงก์ที่ถูกตัด base path ทำให้เกิด 404 ก่อนถึงหน้า reset.
