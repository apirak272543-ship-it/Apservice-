# Admin Media Restore Findings

ตรวจ browser ปัจจุบันก่อนแก้ storage media policy:

`AppState.stores` มีร้าน 4 รายการและทุกแถวมีภาพ data:image อยู่จริง (`withDataImage: 4`). ตัวอย่างร้านแรกมี `imageUrl` ประมาณ 519,903 bytes และ `backgroundUrl` ประมาณ 477,135 bytes. อย่างไรก็ตาม `localStorage.apcx_stores` มีขนาดเพียงประมาณ 3,152 bytes, `withAnyMedia: 0`, และทุกแถวที่เคยมี field ภาพถูกแทนด้วยค่าว่าง (`emptyMedia: 4`).

สาเหตุจริงคือ `modules/core/storage.js` ใน commit performance ใช้ `stripInlineImages()` บน `apcx_stores` และ `apcx_config` ทุกครั้งที่ persist ไม่ใช่เฉพาะตอน quota เต็ม. เมื่อ boot/refresh อ่านข้อมูลจาก cache หรือเมื่อ remote read ไม่พร้อม ภาพจึงหายจาก UI แม้ live AppState ในบางรอบยังมีภาพอยู่. แนวทางแก้คือคงภาพที่ผ่านการบีบอัดไว้ใน cache และข้ามการ serialize เฉพาะเมื่อ revision ไม่เปลี่ยน โดยไม่ตัด media เป็นค่าว่าง.

หลังแก้โค้ดใหม่ยังต้องวัด browser รอบ cache-busting `admin-media-preserve-v1` เพื่อยืนยันว่า `localStorage.apcx_stores` ยังคง image/background bytes และภาพปรากฏในหน้าแรก/คารูเซล.

## Browser รอบก่อนเพิ่ม catalog media persistence

หลังโหลด `admin-media-preserve-v1` แล้ว `AppState.stores` ยังมีภาพ 4/4 รายการ รวม media bytes ประมาณ 2.72 MB แต่ `localStorage.apcx_stores` ยังคง cache เก่าที่ว่าง (ประมาณ 3,152 bytes) เพราะรอบนี้ยังไม่ได้เพิ่มการ queue `Storage.save()` หลัง `refreshCatalog` สำเร็จ. DOM มี image elements 8 รายการแต่ยังไม่โหลดภาพครบในจังหวะที่วัด. ข้อสรุปคือการเปลี่ยน storage policy อย่างเดียวไม่พอ ต้อง persist ข้อมูลร้านที่มีภาพกลับ cache หลัง remote catalog load สำเร็จ ซึ่งเพิ่มใน `performance_optimization_patch.js` แล้ว.

## Browser รอบหลังเพิ่ม catalog persistence

โหลด `performance-v3-media-preserve` และ `storage-v3-media-preserve` แล้วพบว่า `AppState.stores` มี media 4/4 รายการ รวมประมาณ 2.72 MB แต่ `localStorage.apcx_stores` ยังว่าง 3,152 bytes. แปลว่า media mapping/remote data ถูกต้อง แต่ auto-save hook ยังไม่ทำให้ cache เติมในรอบ boot ที่วัด จึงต้องทดสอบ `__apPerformance.flushStorage()` แยกว่าการ save ทำงานหรือ hook ไม่ถูกเรียก.

## Browser รอบ media-safe carousel v4

หลัง cache-bust `store-carousel-icon-v4-media-safe` การ์ดร้าน 4 ใบไม่แสดง `data:image` เป็นข้อความแล้ว (`dataImageTextCards: 0`) และ fallback ของร้านที่มีค่า image URL ในช่อง emoji ถูกแทนเป็น `🏪`. คารูเซลยังคงเป็นแนวนอน (`scrollWidth: 1631`, `clientWidth: 1221`) และยังมี 4 cards.

รอบตรวจต่อพบว่า `AppState.stores` มีภาพครบตามข้อมูลจริง แต่การ์ดทั้งหมดอยู่ที่ `top: 1340` ใน viewport ความสูง 1100 จึงยังไม่เข้า viewport (`visible: false`) และ `mediaReady` ยังไม่ถูกตั้ง. นี่เป็นพฤติกรรม lazy-load ตามที่ออกแบบ ไม่ใช่การลบภาพ; ต้องเลื่อนลง/เรียก observer ด้วย viewport ที่เห็นร้านเพื่อยืนยันภาพถูกโหลดเมื่อเข้าเฟรม.

## Browser lazy-load เมื่อคารูเซลเข้าเฟรม

หลังเลื่อนหน้าให้ร้านเข้า viewport จริง การ์ดที่เห็นทั้ง 4 ใบมี `mediaReady: true` และมี media ที่ใช้งานได้ (`visibleLoaded: 4`, `visibleCount: 4`, `offscreenLoaded: 0`). ร้านที่มีภาพไอคอนถูกโหลดเป็น `img` พร้อม data URL เดิม ส่วนร้านที่ไม่มี icon URL ใช้ fallback emoji แต่ภาพพื้นหลังยังถูกแสดง. ไม่พบ `data:image` หลุดไปเป็นข้อความในชื่อ/เนื้อหาการ์ด.

## Browser รอบ storage media compaction รุ่นใช้งานจริง

หลังหมุน cache-busting เป็น boot `admin-media-preserve-v3`, bridge `admin-media-preserve-v3` และ storage `performance-v5-media-preserve` พบว่า `persistMediaCache` ถูก expose เป็นฟังก์ชันจริง. Runtime `AppState.stores` ยังคง inline media รวมประมาณ 2,720,966 ตัวอักษรครบ 4 ร้าน ขณะที่สำเนา `localStorage.apcx_stores` ถูกบีบอัดเหลือประมาณ 693,834 ตัวอักษร และทั้ง key มีขนาดประมาณ 842,469 bytes. ภาพจึงไม่ถูกลบจาก UI แต่ cache ใช้ภาพลดขนาดตามข้อจำกัดเดิม.
