AP SERVICE — MASTER GOLDEN RULES
============================================================
นี่คือกฎเหล็กถาวรของโครงการ AP Service
ต้องใช้กฎนี้กับทุก Task ทุก Session และทุกการแก้ไข Code
ห้ามละเลยกฎเหล่านี้แม้ Task จะระบุเพียงบาง Application
============================================================


# 1. โครงสร้างหลักของระบบ

AP Service มี 4 Applications แยกกันอย่างชัดเจน:

1. Customer
   Repository: Apservice-

2. Admin
   Repository: Apservicebeta

3. Merchant
   Repository: ap-store-mobile

4. Rider
   Repository: ap-rider-mobile


หลักการ:

FOUR APPLICATIONS
+
ONE CENTRAL BACKEND
+
ONE CENTRAL DATABASE
+
ONE CENTRAL BUSINESS RULE SYSTEM


Application ทั้ง 4 ต้องสามารถพัฒนา Deploy และเปลี่ยน UI แยกจากกันได้

ห้ามนำ Application หนึ่งกลับไปฝัง Runtime ของอีก Application
โดยไม่จำเป็น


# 2. ห้ามรวม Application กลับเข้าด้วยกัน

ห้าม:

- รวม Customer กับ Admin
- รวม Customer กับ Merchant
- รวม Customer กับ Rider
- รวม Admin กับ Merchant
- รวม Admin กับ Rider
- รวม Merchant กับ Rider

การสร้าง Folder ใหม่ภายใน Repository เดียว
ไม่ถือว่าเป็นการแยก Application

การแยกที่ถูกต้องต้องแยก:

- Repository
- Entry Point
- Runtime
- UI
- Navigation
- Deployment

แต่สามารถใช้ Backend และ Contract กลางร่วมกันได้


# 3. ห้ามลบของเก่าโดยไม่ได้รับอนุญาต

ห้ามลบ:

- UI เดิม
- Function เดิม
- Page เดิม
- JavaScript
- CSS
- Media
- Database
- Storage
- Authentication
- Business Rules
- Legacy Function
- API
- Shared Module

เพียงเพราะกำลังสร้างระบบใหม่

หลักการ Migration คือ:

AUDIT
→ COPY / REFACTOR
→ CONNECT
→ TEST
→ VERIFY
→ MIGRATE
→ REGRESSION TEST

ห้ามใช้แนวคิด:

DELETE EVERYTHING
→ REBUILD


# 4. UI เดิมต้องได้รับการรักษา

การแยก Application ไม่ได้หมายความว่าให้สร้าง UI ใหม่จนหน้าตาและ Function เดิมหายไป

ต้องรักษา:

- Function เดิม
- Content เดิม
- Media เดิม
- Advertisement เดิม
- Promotion เดิม
- Navigation ที่จำเป็น
- Workflow เดิม

สามารถปรับปรุง UI/UX ให้ใช้งานง่ายขึ้นได้

แต่ต้องไม่ทำให้ Feature เดิมหาย


# 5. Backend กลางคือ Source of Truth

ทั้ง 4 Applications ใช้ Backend กลางร่วมกัน

ข้อมูลกลางต้องอยู่ใน:

- Supabase Database
- Supabase Authentication
- Supabase Storage
- Central Business Rules
- Central Media
- Central Order Data

Application ใหม่ต้องสามารถใช้ข้อมูลเดิมได้

ห้ามสร้าง Database ใหม่เพียงเพราะสร้าง Frontend ใหม่


# 6. Database ต้องเป็นระบบกลาง

ตัวอย่าง:

Customer สร้าง Order
→ Central Database

Merchant เห็น Order
→ Central Database

Merchant รับ Order
→ Central Database

Rider เห็นงาน
→ Central Database

Rider อัปเดตสถานะ
→ Central Database

Customer เห็นสถานะใหม่
→ Central Database

Admin ตรวจสอบ
→ Central Database


# 7. Business Rules ต้องเป็นกติกากลาง

ห้ามเขียน Business Rules สำคัญซ้ำกันหลาย Application

ตัวอย่าง:

- Order Status
- Payment Status
- Delivery Status
- Delivery Fee
- Commission
- Promotion
- Permission
- User Role
- Business Rules

ต้องมี Central Contract / Central Rules

Application ต่าง ๆ ต้องอ่านกติกากลาง


# 8. Admin เป็นผู้ควบคุม Business Rules

Admin มีสิทธิ์จัดการกติกากลาง

รูปแบบ:

Admin
→ แก้ Business Rule
→ บันทึก Central Database
→ Application อื่นอ่านค่ากลาง

ห้าม Hard-code กฎสำคัญไว้หลาย Application

หาก Admin เปลี่ยนกฎ:
ไม่ควรต้องแก้ Customer + Merchant + Rider ทีละตัว


# 9. Authentication และ Authorization ต้องแยกตาม Role

ใช้ Authentication กลาง

แต่ต้องตรวจ Authorization ตาม Role:

Customer
→ Customer permissions

Merchant
→ Merchant permissions

Rider
→ Rider permissions

Admin
→ Admin permissions

ห้ามใช้เพียงการซ่อนปุ่มเพื่อรักษาความปลอดภัย

ต้องใช้:

Authentication
+
Authorization
+
RLS


# 10. Application ต้องไม่เข้าถึงข้อมูลเกินสิทธิ์

Customer:
เข้าถึงเฉพาะข้อมูลที่ Customer มีสิทธิ์

Merchant:
เข้าถึงเฉพาะร้านและข้อมูลของตนเอง

Rider:
เข้าถึงเฉพาะงานและข้อมูลที่เกี่ยวข้อง

Admin:
เข้าถึงตามสิทธิ์ของ Admin

Security ต้องบังคับจาก Backend/RLS
ไม่ใช่พึ่ง Frontend


# 11. Media ต้องใช้มาตรฐานกลาง

รูปภาพทั้งหมดต้องใช้ Central Media System

ทั้ง 4 Applications ต้องใช้มาตรฐานเดียวกัน

ต้องตรวจ:

- File type
- File size
- Image dimensions
- Compression
- Storage path
- URL
- Reference
- Access permission

ห้ามสร้างระบบ Upload คนละมาตรฐานในแต่ละ Application


# 12. Performance เป็นกฎสำคัญ

ห้ามทำให้หน้าเว็บรอ Database ก่อน Render โดยไม่จำเป็น

หลักการ:

USER CLICK
→ PAGE RENDER
→ UI พร้อมใช้งาน
→ BACKGROUND REQUEST
→ DATA กลับมา
→ UPDATE UI

ไม่ใช่:

USER CLICK
→ ยิง Database หลายสิบ Request
→ รอ Network
→ Render


# 13. ห้าม Request Storm

เมื่อเปิดหน้า:

ห้ามโหลดข้อมูลทุกอย่างพร้อมกันโดยไม่มีเหตุผล

ให้โหลดเฉพาะข้อมูลที่จำเป็นต่อ Page นั้น

ข้อมูลรองให้:

- Lazy Load
- Background Load
- Cache
- TTL
- Deduplication

ตามความเหมาะสม


# 14. Background Request ต้องไม่ Block UI

Notification
Badge
Analytics
Report
Statistics
Secondary Data

ต้องไม่ Block Navigation

หาก Background Request ล้มเหลว:

Page ต้องยังใช้งานได้

Background Failure
≠
Page Failure


# 15. Cache และ Request Deduplication

ข้อมูลที่ไม่จำเป็นต้องสดทันทีให้ใช้:

- Cache
- TTL
- In-flight Deduplication
- Request Scope
- AbortController
- Stale Response Protection

หาก Request เดิมกำลังทำงานอยู่
ห้ามยิง Request ซ้ำโดยไม่จำเป็น


# 16. Background Sync

ระบบสามารถตรวจข้อมูลสำคัญใหม่ประมาณทุก 15 วินาที

แต่ 15 วินาทีไม่ใช่ข้อบังคับว่าทุก Table ต้อง Poll

ต้องแบ่งข้อมูลตามความสำคัญ:

Critical Data
→ Background Sync / Realtime ตามความเหมาะสม

Secondary Data
→ TTL / Cache

Static Data
→ Cache

ต้อง:

- ไม่ Block UI
- ไม่ยิงทุก Table
- Deduplicate
- หยุดเมื่อ Page ถูกซ่อนถ้าเหมาะสม
- ป้องกัน Request Storm


# 17. Admin ต้องใช้ Multi-Page Architecture

Admin ใช้ MPA

Function สำคัญควรเป็น Page ของตัวเอง เช่น:

dashboard
orders
stores
riders
customers
finance
notifications
promotions
settings
etc.

ไม่ควรเอาข้อมูลทุก Function มากองไว้ในหน้าเดียว

Navigation สามารถคงอยู่ด้านบนได้
แต่ Content ของแต่ละ Function ต้องแยก Page


# 18. ห้ามให้ Legacy กลายเป็น Dependency หลักโดยไม่จำเป็น

Legacy สามารถคงไว้เพื่อความปลอดภัย

แต่ Application ใหม่ต้องไม่พึ่ง Legacy โดยไม่จำเป็น

หากพบ:

New App
→ Legacy Admin
→ Legacy Customer
→ Legacy Runtime

ต้องตรวจสอบก่อนว่าจำเป็นจริงหรือไม่

ห้ามลบทันที

ต้อง:

AUDIT
→ TEST
→ REPLACE
→ VERIFY
→ แล้วจึงพิจารณาเลิกใช้


# 19. ก่อนแก้ Code ต้องตรวจ Dependency

ก่อนแก้หรือลบไฟล์ใด ๆ ต้องตรวจ:

- Import
- Reference
- API
- Database
- Storage
- Authentication
- Shared Module
- Route
- Event
- Cross-App Dependency

ห้ามเดาว่าไฟล์ไม่มีคนใช้


# 20. ห้ามทำงานแบบเดา

ถ้าไม่รู้:

- Function นี้ใช้ที่ไหน
- Table นี้ใช้กับอะไร
- File นี้ถูกโหลดหรือไม่
- Application ไหนเรียกใช้
- API นี้มี Consumer หรือไม่

ต้องตรวจ Source Code จริงก่อน

ห้ามเดา


# 21. Cross-App Compatibility เป็นข้อบังคับ

ทุก Function ที่เกี่ยวข้องกันต้องทำงานข้าม Application ได้

ตัวอย่าง Order:

Customer
→ Create Order
→ Database

Merchant
→ Receive Order
→ Accept Order
→ Database

Rider
→ Receive Delivery Job
→ Accept Job
→ Database

Rider
→ Complete Delivery
→ Database

Customer
→ เห็นสถานะใหม่

Admin
→ ตรวจสอบ Order ได้


# 22. Function จะถือว่า "เสร็จ" ต่อเมื่อทดสอบจริง

การสร้าง File หรือ UI สำเร็จ
ไม่ถือว่า Function เสร็จ

Function จะถือว่า PASS เมื่อ:

Page เปิดได้
+
UI Render ได้
+
Database Read ได้
+
Database Write ได้
+
Authentication ผ่าน
+
Authorization ผ่าน
+
RLS ผ่าน
+
Action ทำงาน
+
ข้อมูลถูกต้อง
+
Application อื่นเห็นข้อมูลที่เกี่ยวข้อง
+
Refresh แล้วยังถูกต้อง
+
Error Handling ทำงาน


# 23. ห้ามมี Loading แล้วหน้าหาย

ห้ามเกิด:

Loading
→ หน้าหาย
→ Blank Page

ต้องมี:

Loading
→ Success

หรือ:

Loading
→ Error State
→ Retry

หรือ:

Loading
→ Empty State


# 24. ทุก Function ต้องมี Error Handling

Network Error
Database Error
Permission Error
Invalid Data
Upload Error
Authentication Error

ต้องแสดงสถานะที่ผู้ใช้เข้าใจได้

ห้ามปล่อยให้ UI หายหรือเงียบ


# 25. การแก้ Application หนึ่งต้องไม่ทำลาย Application อื่น

หากแก้:

Customer
→ ตรวจผลกระทบต่อ Shared Backend

หากแก้:

Admin
→ ตรวจ Business Rules

หากแก้:

Merchant
→ ตรวจ Order Flow

หากแก้:

Rider
→ ตรวจ Delivery Flow

หากแก้:

Central Backend
→ ต้อง Regression Test ทั้ง 4 Applications


# 26. ห้ามแก้หลาย Repository โดยไม่มีเหตุผล

แก้เฉพาะ Repository ที่เกี่ยวข้อง

ถ้าต้องแก้หลาย Repository:

ต้องระบุเหตุผล
ต้องระบุ Dependency
ต้อง Test ทุก Repository ที่ได้รับผลกระทบ


# 27. ห้ามทำลาย Production Data

ห้ามทำ:

DROP TABLE
DELETE DATABASE
DELETE STORAGE
DELETE USERS
DELETE MEDIA
RESET DATA

โดยไม่ได้รับคำสั่งอนุมัติโดยตรง

ข้อมูล Production ถือเป็นข้อมูลสำคัญ


# 28. Git ต้องเป็น Safety Net

ก่อนการเปลี่ยนแปลงใหญ่:

ตรวจ Git Status
ตรวจ Branch
ตรวจ Commit

หลังการเปลี่ยนแปลง:

Commit
Test
Document

ต้องสามารถย้อนกลับได้


# 29. ทุก Task ต้องเริ่มด้วย Impact Analysis

ก่อนลงมือทำ Task ใหม่ ให้ตรวจ:

1. กำลังแก้ Application ไหน?
2. Function นี้เป็นของ Application ไหน?
3. ใช้ Database กลางหรือไม่?
4. ใช้ Business Rule กลางหรือไม่?
5. มี Application อื่นได้รับผลกระทบหรือไม่?
6. มี UI เดิมที่ต้องรักษาหรือไม่?
7. มี Legacy Dependency หรือไม่?
8. มี Media Dependency หรือไม่?
9. มี Authentication/RLS Dependency หรือไม่?
10. การแก้ไขเพิ่ม Network Load หรือไม่?
11. ต้อง Regression Test อะไรบ้าง?

ถ้ายังตอบไม่ได้
ให้ตรวจสอบก่อน
ห้ามเริ่มแก้แบบเดา


# 30. ทุก Task ใหญ่ต้องตรวจสอบหลังทำงาน

หลังทำงานเสร็จต้องรายงาน:

- Files changed
- Repositories changed
- Database changed หรือไม่
- API changed หรือไม่
- Business Rules changed หรือไม่
- UI changed หรือไม่
- Performance impact
- Security impact
- Cross-App impact
- Tests performed
- PASS/FAIL
- Known Issues
- Rollback information


# 31. ห้ามประกาศ "เสร็จ" จากการสร้างโครงสร้างเพียงอย่างเดียว

คำว่า:

"Structure Complete"

ไม่เท่ากับ:

"Application Complete"

ต้องตรวจ:

Structure
→ Runtime
→ Function
→ Database
→ Authentication
→ RLS
→ Media
→ Cross-App
→ Performance
→ Regression


# 32. หลักการสูงสุดของ AP Service

FOUR APPLICATIONS
ONE CENTRAL BACKEND
ONE SOURCE OF TRUTH
ONE CENTRAL BUSINESS RULE SYSTEM
SEPARATE RUNTIME
NO DATA LOSS
NO FEATURE LOSS
NO BLOCKING NAVIGATION
NO UNNECESSARY REQUEST STORM


# 33. กฎห้ามตีความผิด

"แยก Application"
ไม่ได้หมายความว่า
"สร้าง Folder ใหม่"

"ใช้ Backend กลาง"
ไม่ได้หมายความว่า
"รวม Frontend"

"ปรับปรุง UI"
ไม่ได้หมายความว่า
"ลบ UI เดิม"

"สร้าง Application ใหม่"
ไม่ได้หมายความว่า
"ลบ Application เก่า"

"Background Sync 15 วินาที"
ไม่ได้หมายความว่า
"ยิงทุก Table ทุก 15 วินาที"

"Function Complete"
ไม่ได้หมายความว่า
"สร้างไฟล์แล้ว"


# 34. FINAL GOLDEN RULE

เมื่อได้รับ Task ใดก็ตาม:

ห้ามรีบเขียน Code ทันที

ต้อง:

READ
→ UNDERSTAND
→ AUDIT
→ IMPACT ANALYSIS
→ PLAN
→ IMPLEMENT
→ TEST
→ CROSS-APP VERIFY
→ REPORT

และต้องยึด Master Golden Rules นี้เป็นกฎสูงสุดของ AP Service

หากคำสั่งใน Task ขัดแย้งกับกฎนี้
ให้หยุดและแจ้งความขัดแย้งก่อนแก้ไข

ห้ามตีความคำสั่งที่คลุมเครือเอง
ห้ามลบของเก่าเอง
ห้ามเปลี่ยน Architecture เอง
ห้ามเปลี่ยน Database Schema เอง
ห้ามทำลาย UI เดิมเอง
ห้ามทำให้ Application อื่นเสียหาย