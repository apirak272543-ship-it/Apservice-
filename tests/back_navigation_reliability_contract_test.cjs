const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const patch = fs.readFileSync('back_navigation_reliability_patch.js', 'utf8');

assert.match(html, /back_navigation_reliability_patch\.js\?v=back-nav-reliability-v1/, 'ต้องโหลดแพตช์ความเสถียรของปุ่มกลับ');
assert.match(html, /behavior:options\.back\?'auto':'smooth'/, 'การย้อนกลับต้องไม่ใช้ smooth scroll');
assert.match(patch, /active\.id === 'view-admin'/, 'การกลับจาก Admin ต้องล้างสถานะหน้าเมนูย่อย');
assert.match(patch, /active\.querySelectorAll\('input,textarea,select'\)/, 'ต้องบันทึกเฉพาะฟอร์มของหน้าที่กำลังเปิด');
assert.match(patch, /next\.length > 2048/, 'ต้องไม่บันทึกข้อมูลขนาดใหญ่ลง draft ระหว่างนำทาง');
assert.match(patch, /window\.history\.back\(\)/, 'ปุ่มกลับต้องใช้ประวัติการนำทางภายใน');
assert.match(patch, /backInProgress/, 'ต้องป้องกันการกดปุ่มกลับซ้ำระหว่างเปลี่ยนหน้า');

console.log('back navigation reliability contract: PASS');
