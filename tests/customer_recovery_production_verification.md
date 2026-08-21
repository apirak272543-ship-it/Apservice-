# Customer Recovery Production Verification

วันที่ตรวจ: 21 สิงหาคม 2026

| รายการ | ผลการตรวจ |
|---|---|
| Production URL | `https://apirak272543-ship-it.github.io/Apservice-/customer/update-password.html` ตอบกลับและแสดงหัวข้อ **ตั้งรหัสผ่านใหม่** |
| ไม่มี recovery token | หน้าแสดงแบบฟอร์มตั้งรหัสผ่าน; runtime จะปิดปุ่มและแจ้งว่าลิงก์หมดอายุ/ไม่สมบูรณ์แทนการอนุญาตให้อัปเดตรหัสผ่าน |
| Redirect allow-list | Supabase Auth อนุญาต `customer/update-password.html` แล้ว |
| Browser console | สภาพแวดล้อมตรวจ console ไม่พร้อมใช้งาน จึงใช้ syntax และ contract tests ใน repository เป็นหลักฐานประกอบแทน |

การทดสอบ end-to-end ที่ต้องเปิดอีเมลจริงจะต้องใช้ลิงก์กู้บัญชีแบบใช้ครั้งเดียวของบัญชี Customer ที่ได้รับอนุญาต โดยไม่บันทึก token หรือข้อมูลบัญชีลง repository.
