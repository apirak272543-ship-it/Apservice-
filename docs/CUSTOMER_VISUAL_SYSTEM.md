# Customer Visual System

ระบบนี้เพิ่มการตั้งค่าภาพพื้นหลังและ Motion ของ Customer App โดยเก็บ configuration ใน `platform_configs.key = customer_visuals` และใช้ Supabase Storage/media pipeline เดิมสำหรับไฟล์ภาพ

## Data contract

```json
{
  "version": 1,
  "default": {
    "backgroundUrl": "https://...",
    "overlay": 0.86,
    "position": "center",
    "size": "cover",
    "motion": "none"
  },
  "festival": {
    "key": "songkran",
    "motion": "songkran",
    "active": true,
    "startsAt": "",
    "endsAt": ""
  },
  "pages": {
    "profile": {
      "backgroundUrl": "https://...",
      "overlay": 0.9,
      "position": "center",
      "size": "cover",
      "motion": "inherit"
    }
  }
}
```

`pages` รองรับค่า `data-page` ของ Customer ได้แก่ `home`, `stores`, `store`, `orders`, `order`, `checkout`, `profile`, `notifications`, `support`, `parcel`, `retail`, `retail-checkout`, กลุ่ม `marketplace`, `register`, `recover`, `update-password` และ `privacy` หากหน้าใดไม่มีภาพเฉพาะหน้าจะ fallback ไปที่ `default`

## Media rules

Admin อัปโหลดผ่าน `APServiceMedia.uploadPublicImage` ใน bucket `catalog-media` โดยใช้ scope `customer-visuals` และลงทะเบียนใน `media_assets` ระบบ preview แสดงภาพจาก object URL ก่อนอัปโหลด และเปลี่ยนเป็น public URL หลังอัปโหลดสำเร็จ ภาพถูกบีบอัดและตรวจขนาดตาม shared media policy โดย target ไม่เกิน 1 MB

## Motion rules

Motion เป็น CSS overlay ที่สร้างจาก preset ที่ allowlist ไว้ ได้แก่ `summer`, `rainy`, `spring`, `songkran`, `loy_krathong`, `christmas`, `new_year`, `valentines`, `halloween`, `lunar_new_year`, `ramadan_eid`, `diwali` และ `winter` โดยไม่ต้องอัปโหลดไฟล์ animation เพิ่ม ระบบซ่อน motion เมื่อผู้ใช้เปิด `prefers-reduced-motion: reduce`

Customer shared runtime อ่าน configuration แบบ public และ apply ให้ทุกหน้าโดยอาศัย `body[data-page]` จึงไม่กระทบ auth, PIN, cart หรือ route guard
