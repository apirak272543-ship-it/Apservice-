# Customer Android WebView Acceptance Checklist

เอกสารนี้เป็นเกณฑ์ตรวจรับ **Customer APK** ที่ห่อ Customer MPA ของ AP Service โดยมีเป้าหมายให้การเปลี่ยน UI, route, auth, media และ workflow บนเว็บไม่ทำให้ประสบการณ์ Android WebView แตกต่างจากเว็บไซต์หลัก

> สถานะ `ผ่านด้วย contract` หมายถึง source และ configuration ผ่าน automated checks แล้ว แต่ไม่ทดแทนการยืนยันบนโทรศัพท์ Android จริง

| หมวด | ขั้นตอนบน Android จริง | ผลที่ต้องได้ | สถานะปัจจุบัน |
|---|---|---|---|
| เปิดแอป | เปิด Customer APK บน Android | แสดง Customer production URL ภายใน shell พร้อม loading ภาษาไทย | ผ่านด้วย contract |
| เครือข่าย | ปิดอินเทอร์เน็ตแล้วเปิดแอป จากนั้นกดลองเชื่อมใหม่หลังเปิดเน็ต | ไม่เกิดหน้าขาว; เห็น error ภาษาไทยและ retry ใช้ได้ | ผ่านด้วย contract |
| Authentication | เข้าสู่ระบบ Customer บนหน้าเว็บภายใน APK แล้วปิด/เปิดแอป | session ของ Customer คงอยู่ตามนโยบายเว็บไซต์; header แสดงว่าเชื่อมบัญชีแล้ว | รอเครื่องจริง |
| Android back | เปิดร้าน → รายละเอียดร้าน → ตะกร้าหรือ checkout แล้วกดปุ่มย้อนกลับของ Android | กลับตาม WebView history ก่อน ไม่ปิดแอปทันที | ผ่านด้วย contract, รอเครื่องจริง |
| Refresh | ดึงลงเพื่อ refresh หรือกดปุ่มรีเฟรชใน native header | หน้า Customer โหลดใหม่โดยไม่มี data corruption | ผ่านด้วย contract, รอเครื่องจริง |
| Upload | แนบสลิปหรืออัปโหลดรูปจากคลัง/กล้องตาม flow Customer | เปิดตัวเลือกรูป, บีบอัดผ่าน Shared Media Service และไฟล์ไม่เกิน 1 MB | รอเครื่องจริง |
| Media | เปิด logo, banner, store background และรูปสินค้าใน Customer Web | สื่อจาก Admin แสดงตรงบน Android; ไม่มีรูปแตกหรือ URL หมดอายุ | รอเครื่องจริง |
| External links | เปิดลิงก์ออกนอก GitHub Pages จากเนื้อหา Customer | ไม่โหลด host ที่ไม่เกี่ยวข้องใน Customer WebView; เปิดด้วย handler ภายนอกอย่างชัดเจน | ผ่านด้วย contract, รอเครื่องจริง |
| Logout | ใช้เมนู native ออกจากระบบ | ล้าง Customer session จากเครื่อง และกลับสู่หน้า Customer ที่ยังไม่เข้าสู่ระบบ | ผ่านด้วย contract, รอเครื่องจริง |

## เกณฑ์ก่อนสร้าง APK รอบตรวจรับ

ให้ทำรายการที่ระบุว่า **รอเครื่องจริง** ครบด้วยบัญชี Customer ทดสอบหนึ่งบัญชี และทดสอบ flow ชำระเงินจริงเฉพาะรายการที่ไม่ทำให้เกิดการโอนเงินจริงโดยไม่จำเป็น หากพบความแตกต่างระหว่าง Web และ APK ให้บันทึก URL, รุ่น APK, Android version และขั้นตอนทำซ้ำ ก่อนแก้ทั้งสองฝั่งให้ parity กัน
