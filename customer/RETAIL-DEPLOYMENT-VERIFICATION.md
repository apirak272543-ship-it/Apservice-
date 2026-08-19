# Customer Retail Deployment Verification

วันที่ตรวจสอบ: 19 สิงหาคม 2026

| รายการตรวจสอบ | ผล |
|---|---|
| Commit ที่เผยแพร่ | `4ac833c` — `feat: add customer retail ordering UX` |
| GitHub Pages workflow | สำเร็จ (`Deploy AP Service to GitHub Pages`) |
| URL ที่ตรวจ | `https://apirak272543-ship-it.github.io/Apservice-/customer/retail.html` |
| Asset และ entrypoint | โหลดได้จริง; ไม่มี 404 หลัง workflow เสร็จ |
| ผู้ใช้ที่ยังไม่ลงชื่อเข้าใช้ | แสดงข้อความให้ลงชื่อเข้าใช้ และลิงก์ไป `profile.html?next=retail.html` |
| ข้อมูลสินค้าและตัวเลขการเงิน | ไม่แสดงข้อมูลจำลอง; รายละเอียดราคา/สต๊อกจะโหลดเฉพาะหลังตรวจ session และ query ข้อมูลจริง |

การตรวจนี้ยืนยันเฉพาะ public entrypoint และ empty/auth state โดยยังไม่ทดสอบ checkout จริง เนื่องจากต้องใช้บัญชี customer ที่มีสิทธิ์และสินค้าร้านจริงในระบบกลาง
