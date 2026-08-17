# AP Service Four-Client Separation — Safety Baseline Audit

**วันที่:** 17 สิงหาคม 2026  
**Master Task source:** AI Collaboration Workspace, thread `82e42371-b144-4f0d-95d0-b1ee37cb04b5`  
**Baseline commit:** `8def9d12d0120a17150efcea91a2d3d8196de9cc`  
**Branch / remote state:** `main` ตรงกับ `origin/main` ณ เวลา Audit

## ขอบเขตที่อนุญาตใน Phase 0

Phase นี้เป็นการตรวจสอบแบบอ่านอย่างเดียว ห้ามลบข้อมูล ห้ามเปลี่ยน schema แบบทำลายข้อมูล และห้ามถอด Monolith/Legacy Admin ออกก่อนมี replacement ที่ผ่านการทดสอบครบถ้วน

## Backend Baseline

Supabase project เดิมยังเป็น backend เดียวสำหรับ Database, Auth, RLS และ Storage ของทุก client ที่จะถูกแยก โดยตรวจพบตาราง RLS-enabled ที่ครอบคลุม domain หลัก ได้แก่ `delivery_orders`, `delivery_order_items`, `stores`, `menu_items`, `riders`, `rider_earnings`, `settlements`, `withdrawal_requests`, `payment_slip_reviews`, `user_profiles`, `user_roles`, `wallet_transactions`, `mobile_notifications`, `ai_workspace_*` และตาราง supporting อื่น ๆ

RLS policy catalog มี policies แยกตาม participation/ownership/admin สำหรับ domain สำคัญ เช่น orders, menu, store, rider, profile, role, wallet, settlement และ withdrawal โดยต้องทำ role/permission test จริงใน Phase Security ก่อนอนุญาต cutover ใด ๆ

## Storage Baseline

| Bucket | Public | File-size limit | MIME types |
|---|---:|---:|---|
| `error-evidence` | No | 1,000,000 bytes | JPEG, PNG, WebP |
| `payment-slips` | No | 5,242,880 bytes | JPEG, PNG, WebP |
| `rider-application-documents` | No | 1,048,576 bytes | JPEG, PNG, WebP, PDF |
| `withdrawal-proofs` | No | 1,048,576 bytes | JPEG, PNG, WebP |

> **Security note:** Storage bucket limit ของ `payment-slips` สูงกว่า 1 MB ขณะที่ Master Task ต้องการ media rule กลางและ compression/validation ร่วมกัน จึงระบุเป็น security/performance review item เท่านั้นในช่วงนี้ ไม่มีการเปลี่ยน bucket policy หรือข้อมูลใด ๆ

## Rollback Position

1. Commit `8def9d1` เป็น rollback point ที่เผยแพร่บน GitHub Pages แล้ว
2. Customer Monolith (`index.html`) และ Legacy Admin (`index.html#admin`) ต้องคงอยู่ตลอดการย้าย
3. การแยก client ใหม่ต้องเพิ่มแบบคู่ขนานและใช้ feature/fallback route จนกว่าจะผ่าน role security, regression, deep-link และ runtime testing ครบ

## Next Audit Items

1. ทำ dependency map ของ `index.html`, patches, `legacy-bridge.js`, AppState, modules และ external scripts
2. ระบุ owner ของ business rules และ data contracts ก่อนสร้าง Customer/Admin/Merchant/Rider entry points เพิ่มเติม
3. ทำ RLS/unauthorized access test matrix โดยไม่ใช้ localStorage เป็น security boundary
