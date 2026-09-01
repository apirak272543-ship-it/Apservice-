# Customer Motion Browser findings

ตรวจบน Customer local `http://127.0.0.1:4173/customer/index.html?motion-test=direction-v1` หลังเพิ่ม Motion overlay รุ่นใหม่

Browser จำลอง `ap-motion-rainy ap-motion-direction-diagonal` แล้วตรวจ computed style ได้ว่าเลเยอร์มี `z-index: 2147483640`, `pointer-events: none`, particle ใช้ animation name `ap-visual-diagonal`, top เริ่มต้น `-132px` และ opacity `0.72` ขณะเดียวกัน `document.elementFromPoint(120,260)` ยังคืนค่าเป็น `<a>` แสดงว่า Motion อยู่เหนือทุกอย่างทางภาพ แต่ไม่ขวางการคลิกจริง

Customer HTML 22 หน้าโหลด shared MPA CSS รุ่น `mpa-v14-motion-overlay` และ shared runtime รุ่นเดียวกัน การทดสอบ contract ผ่านทั้งหมด
