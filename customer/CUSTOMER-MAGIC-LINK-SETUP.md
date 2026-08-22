# Customer Simple Login and Magic-Link Setup

เอกสารนี้ใช้ตั้งค่าการเข้าสู่ระบบของ AP Service Customer แบบเรียบง่ายตามแนวทาง B ลูกค้าที่มี session อยู่แล้วจะเข้าแอปได้ทันทีโดยไม่ต้องยืนยันซ้ำ ส่วนเครื่องใหม่หรือกรณีออกจากระบบจะได้รับลิงก์ Verify ทางอีเมลและกดเพียงครั้งเดียว

## URL ที่ต้องอนุญาตใน Supabase

ใน Supabase Dashboard ให้เปิด **Authentication → URL Configuration** แล้วตรวจสอบค่าเหล่านี้:

| รายการ | ค่า |
|---|---|
| Site URL | `https://apirak272543-ship-it.github.io/Apservice-` |
| Customer Verify callback | `https://apirak272543-ship-it.github.io/Apservice-/customer/auth-callback.html` |

ต้องเพิ่ม callback URL ข้างต้นใน **Redirect URLs** ด้วย อย่าเพิ่มเฉพาะ `profile.html` เพราะคำขอส่งลิงก์ของแอปจะชี้ไปที่ `customer/auth-callback.html` พร้อม query `next` และ `email`

## Email template

ใน Supabase Dashboard ให้เปิด **Authentication → Email Templates → Magic Link** แล้วนำเนื้อหาจาก `supabase/templates/customer_magic_link.html` ไปใช้ โดยคงตัวแปร `{{ .ConfirmationURL }}` ไว้ใน `href` ของปุ่ม Verify

ถ้า project เปิดใช้งานการยืนยันบัญชีใหม่แยกต่างหาก ให้ใช้ `supabase/templates/customer_confirmation.html` กับ template **Confirm signup** ด้วย ทั้งสองไฟล์ใน repository เป็นต้นฉบับสำหรับคัดลอกเท่านั้น การ commit ไฟล์ไม่ได้เปลี่ยน mailer ของ Supabase hosted project โดยอัตโนมัติ

หลังเปลี่ยน template ให้ส่งลิงก์ใหม่เสมอ อีเมลเก่าที่ส่งก่อนแก้ไขอาจยังชี้ไปยังปลายทางเดิมหรือ token หมดอายุแล้ว

## Flow ที่ผู้ใช้เห็น

| สถานการณ์ | ผลลัพธ์ |
|---|---|
| ลูกค้าเคยเข้าสู่ระบบและยังมี session | เปิดหน้า Customer แล้วเข้าแอปได้ทันที |
| ลูกค้าเข้าเครื่องใหม่หรือออกจากระบบ | กรอกอีเมล กด `ส่งลิงก์เข้าใช้งาน` เปิด Gmail แล้วกด Verify |
| ลูกค้าใหม่ | กดปุ่ม `สมัครสมาชิก` บนหน้า Login กรอกอีเมล กด Verify ครั้งเดียว แล้วกรอกชื่อ เบอร์โทรศัพท์ และที่อยู่ |
| Verify สำเร็จ | เห็นหน้า AP Service success พร้อมแถบ motion สีไล่ระดับประมาณ 3 วินาที แล้วกลับเข้าแอป |
| Verify ไม่สำเร็จหรือ token หมดอายุ | เห็นหน้า error ของ AP Service พร้อมปุ่มกลับไปขอลิงก์ใหม่ ไม่ใช่หน้า GitHub Pages 404 |

## ตรวจสอบเมื่อยังเห็น 404

หากกดอีเมลแล้วเห็น `There isn't a GitHub Pages site here` หรือ 404 ให้ตรวจตามลำดับนี้:

1. ตรวจว่า URL ของอีเมลขึ้นต้นด้วย `https://apirak272543-ship-it.github.io/Apservice-/customer/auth-callback.html` ไม่ใช่โดเมนเดียวกันแต่ขาด path `/Apservice-`
2. ตรวจว่า callback URL ถูกเพิ่มใน Supabase **Redirect URLs** ตรงทุกตัวอักษร
3. ลบหรือหยุดใช้ลิงก์เก่า แล้วกลับมาหน้า Login เพื่อขอลิงก์ใหม่
4. ตรวจว่า email template ใช้ `{{ .ConfirmationURL }}` อยู่ใน `href` ของปุ่ม Verify

## ข้อควรระวัง

Magic Link เป็นลิงก์ใช้ครั้งเดียวและมีอายุจำกัด หากผู้ให้บริการอีเมลมีระบบติดตามลิงก์หรือระบบสแกนล่วงหน้า อาจทำให้ token ถูกใช้ก่อนลูกค้ากดจริง ให้เปิดลิงก์ล่าสุดจากอีเมลฉบับล่าสุดและไม่ส่งต่อลิงก์ให้บุคคลอื่น

## References

[1]: https://supabase.com/docs/guides/auth/auth-email-passwordless "Supabase Passwordless email logins"
[2]: https://supabase.com/docs/guides/auth/auth-email-templates "Supabase Email Templates"
