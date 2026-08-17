const fs = require('fs');
const assert = require('assert');

const source = fs.readFileSync('admin_contact_ui_patch.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

assert.match(source, /\^data:image\\\/\/i\.test/, 'ต้องใช้ regex data:image ที่ปิด literal ถูกต้อง');
assert.doesNotMatch(source, /\^data:image\\\\\/\/i\.test/, 'ห้าม escape backslash ซ้ำจน i กลายเป็นตัวแปร');
assert.match(source, /data-store-detail-image-input/, 'แท็บรูปและสื่อต้องมีช่องเลือกไฟล์');
assert.match(source, /compressImageForUpload\(file\)/, 'การอัปโหลดรูปต้องบีบอัดก่อนบันทึก');
assert.match(source, /useStoreDetailCurrentLocation\(\)/, 'แท็บเวลาและโลเคชันต้องมีปุ่มใช้ตำแหน่งปัจจุบัน');
assert.match(source, /pickStoreDetailLocation\('/, 'แท็บเวลาและโลเคชันต้องมีปุ่มเลือกพิกัดบนแผนที่');
assert.match(index, /\^data:image\\\/\/i\.test/, 'ตัวตรวจภาพจากหน้าหลักต้องใช้ regex ที่ปิด literal ถูกต้อง');
assert.doesNotMatch(index, /\^data:image\\\\\/\/i\.test/, 'หน้าหลักห้ามมี regex รูปภาพที่ escape ซ้ำ');

console.log('admin store detail media contract: PASS');
