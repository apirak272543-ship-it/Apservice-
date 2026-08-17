# Admin Async Notification Browser Timing

ทดสอบบน local preview `http://127.0.0.1:4173/index.html?admin-async-audit=2` ด้วย browser runtime โดยใช้บัญชี Admin จำลองและ mock response ของ Supabase badge count requests ให้ช้าประมาณ 300 ms ต่อคำขอ เพื่อแยกผลของ notification ออกจากความเร็วเครือข่ายจริงโดยไม่แตะข้อมูลระบบจริง

| จุดวัด | ผลล่าสุด |
|---|---:|
| Click → DOM section `admin-riders` active | 1.6 ms |
| Click timestamp | 17,266.2 ms |
| Render timestamp | 17,267.8 ms |
| Notification refresh scheduled | 19,610.4 ms |
| Badge network start | 19,610.4 ms |
| Render ก่อน network | จริง |
| ช่องว่าง Render → Badge network | 2,342.6 ms |
| Badge refresh duration หลังเริ่ม | 304.3 ms |

หลังทดสอบพบว่า `view-active` ยังคงเป็น `view-admin`, `admin-section.active` ยังคงเป็น `admin-riders`, `refreshing` กลับเป็น `false` และ badge counts ยังคงอยู่ครบ จึงยืนยันได้ว่า notification refresh ไม่ได้ block การเปลี่ยน section หรือ render ของหน้า Admin

โค้ดเปิดเผย `window.getAdminPerformanceTiming()` และ dispatch event `apservice:admin-navigation-timing` / `apservice:admin-badges-timing` เพื่อให้ตรวจ timing ได้จาก DevTools และ contract test ตรวจว่าการอ่าน cache, การ schedule แบบ Promise microtask, การ mark render ก่อน background work และ fallback cached state มีอยู่จริง

## Failure Resilience

ทดสอบโดยทำให้ badge requests ทั้งหมด reject ด้วย `simulated Supabase timeout` ระหว่างที่เปิดหน้า `admin-riders` ผลคือ `view-active` ยังคงเป็น `view-admin`, section ยังคงเป็น `admin-riders`, `refreshing` กลับเป็น `false`, ค่า cached `withdrawals: 7` และ `finance: 7` ไม่ถูกล้าง และ timing ระบุ `failed: true` โดยหน้า Admin ไม่ถูก redirect หรือทำให้ใช้งานไม่ได้
