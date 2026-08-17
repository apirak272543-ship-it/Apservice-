# Store Carousel Browser Findings

## ผลตรวจหน้าเว็บ

วันที่ 2026-08-17 ตรวจที่ `http://127.0.0.1:4173/index.html` พบว่าหน้าแรกโหลดสำเร็จและแสดงร้าน 4 รายการใน rail แนวนอน พร้อมปุ่ม ก่อนหน้า/ถัดไปและข้อความภาษาไทยที่อธิบายการเลื่อนซ้าย–ขวา ภาพหน้าจอ desktop รอบแรกอยู่ที่ `/home/ubuntu/screenshots/127_0_0_1_2026-08-17_10-09-29_5853.webp` และรอบหลังแก้ไขอยู่ที่ `/home/ubuntu/screenshots/127_0_0_1_2026-08-17_10-12-56_4406.webp`.

## ผลตรวจ lazy-load

เมื่อ rail ยังอยู่นอก viewport การ์ดยังไม่มี `data-media-ready` และไม่มี `src` ของไอคอนตามเงื่อนไข lazy-load เมื่อเลื่อน `#homeStores` เข้ามากลาง viewport พบว่าการ์ดที่อยู่ใกล้เฟรม 3 รายการได้รับการเตรียมภาพและพื้นหลัง ส่วนการ์ดลำดับที่ 4 ซึ่งอยู่นอกคิวใกล้ยังไม่ถูกโหลด ผลนี้ตรงกับ requirement ที่ให้เตรียมเฉพาะรายการที่อยู่ในเฟรมหรือใกล้เฟรม.

## สาเหตุและการแก้ auto-slide

การตรวจ interval พบว่าคำสั่งเลื่อนถูกเรียกทุก 2 วินาที แต่เงื่อนไขเดิมรีเซ็ตไปตำแหน่ง 0 ทันทีใน desktop เมื่อความกว้าง rail เหลือพื้นที่เห็นการ์ดถัดไปเพียงบางส่วน จึงดูเหมือนไม่เลื่อน แก้เป็นแยกสถานะ `atEnd` และใช้ `Math.min(max, scrollLeft + step)` เพื่อให้เลื่อนไปสุดรางก่อน แล้วจึงวนกลับต้นทางในรอบถัดไป นอกจากนี้เพิ่ม version เป็น `store-carousel-icon-v2` ใน index.html เพื่อป้องกัน browser ใช้ patch รุ่นเก่าจาก cache.

## ข้อจำกัดการตรวจ

Browser sandbox ใช้ viewport desktop ในรอบนี้ จึงยืนยัน DOM, overflow แนวนอน, IntersectionObserver และ interval ได้ แต่ยังไม่ได้จำลอง viewport โทรศัพท์จริงผ่าน device emulation.

## ผลยืนยันหลังแก้ไข

หลังเปลี่ยน cache-busting เป็น `store-carousel-icon-v2` และโหลดหน้าใหม่ การดัก `scrollTo` ใน `#homeStores` ช่วง 4.3 วินาทีพบคำสั่ง `{ left: 410 }` แล้ว `{ left: 0 }` ตามลำดับ แปลว่าคารูเซลเลื่อนไปสุดรางและวนกลับต้นทางจริง โดยมี `calls: 2`, `hidden: false` และ `pauseAuto: false`.

## ผลตรวจ mobile viewport จริง

การตรวจด้วย Chrome DevTools emulation ที่ viewport `375×812` ผ่าน `tests/mobile_carousel_cdp_check.py` ให้ผลว่า `#homeStores` มีความกว้างแสดงผล 351px, ความกว้างเนื้อหา 977px และหลังรอ 2.2 วินาที `scrollLeft` เปลี่ยนจาก 2 เป็น 331 จึงยืนยันว่า auto-slide ทำงานบนมือถือจริง การ์ดที่เข้าใกล้ viewport ถูกทำเครื่องหมาย `mediaReady: true` ตาม IntersectionObserver ส่วน icon ที่ไม่มี URL จริงยังคงใช้ fallback ไม่ทำให้การ์ดล้ม.
