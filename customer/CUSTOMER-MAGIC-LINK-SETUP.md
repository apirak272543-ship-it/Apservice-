# Customer Email OTP Setup

เอกสารนี้ใช้ตั้งค่าการเข้าสู่ระบบของ AP Service Customer แบบ **รหัส OTP จากอีเมล** โดยลูกค้าจะไม่กดลิงก์ Verify และไม่ต้องเปิด callback URL อีกต่อไป

## รูปแบบที่ใช้งาน

Supabase Email OTP มาตรฐานส่งรหัสตัวเลข **6 หลัก** ผ่านตัวแปร `{{ .Token }}` และตรวจด้วยคำขอ `verifyOtp({ email, token, type: 'email' })` แอปจึงใช้ช่อง PIN 6 หลักตามรูปแบบที่ Auth รองรับอย่างเป็นทางการ [1] [2]

ความต้องการรหัส 4 หลักไม่สามารถทำได้ด้วย Email OTP ของ Supabase Auth โดยตรง เพราะระบบกำหนดรูปแบบ OTP ของตัวเองและเอกสารระบุเป็นรหัส 6 หลัก หากต้องการ 4 หลักจริง ต้องสร้าง backend/Edge Function แยกสำหรับสร้างรหัสแบบสุ่ม เก็บเฉพาะ hash จำกัดจำนวนครั้งและอายุรหัส และเชื่อมผู้ให้บริการส่งอีเมล ซึ่งไม่ควรทำด้วย JavaScript ฝั่งหน้าเว็บเพียงอย่างเดียว

## การตั้งค่าใน Supabase

ใน Supabase Dashboard ให้เปิด **Authentication → Email Templates** แล้วนำเนื้อหาจาก `supabase/templates/customer_magic_link.html` ไปใช้กับ template **Magic Link or OTP** โดยคงตัวแปร `{{ .Token }}` ไว้ในเนื้อหาอีเมล ห้ามใช้ `{{ .ConfirmationURL }}` หรือปุ่ม Verify กับ flow นี้

หาก project ยังใช้ template **Confirm signup** สำหรับบัญชีใหม่ ให้ใช้เนื้อหาจาก `supabase/templates/customer_confirmation.html` ด้วย ทั้งสองไฟล์เป็น template สำหรับ hosted Supabase จึงต้องคัดลอกไปวางใน Dashboard ด้วยตนเอง การ commit ไฟล์ใน repository ไม่ได้เปลี่ยนค่า mailer ของ project hosted โดยอัตโนมัติ

ไม่จำเป็นต้องเพิ่ม callback URL ของ GitHub Pages สำหรับการเข้าสู่ระบบแบบ OTP เพราะแอปส่งคำขอ OTP โดยไม่กำหนด `redirect_to` และให้ลูกค้ากรอกรหัสบนหน้า `profile.html` เดิม อย่างไรก็ตามควรเก็บ Site URL ของ project ให้ตรงกับโดเมนที่ใช้งานจริงสำหรับลิงก์อื่นของระบบ

## Flow ที่ควรทดสอบ

| ขั้นตอน | สิ่งที่ควรเกิดขึ้น |
|---|---|
| เปิดหน้า Login | เห็นช่องอีเมลและปุ่ม `ส่งรหัส PIN เข้าอีเมล` โดยไม่มีช่องรหัสผ่าน |
| ส่งอีเมล | ระบบส่งอีเมลที่มีรหัส 6 หลัก และหน้าเดิมเปลี่ยนเป็นช่อง `รหัส PIN 6 หลัก` |
| กรอกรหัสถูกต้อง | Supabase สร้าง session แล้วลูกค้าใหม่ถูกพาไปฟอร์มชื่อ เบอร์โทรศัพท์ และที่อยู่ |
| บันทึก onboarding | ข้อมูลถูกบันทึกใน `user_profiles` และหลักฐานยอมรับนโยบายถูกบันทึกใน `user_consents` จากนั้นกลับเข้าแอป |
| ลูกค้าเดิม | ถ้าข้อมูลโปรไฟล์ครบ ระบบกลับไปยังหน้าที่ขอไว้โดยไม่แสดง onboarding ซ้ำ |
| รหัสผิดหรือหมดอายุ | แสดงข้อความให้ขอรหัสใหม่ในหน้าเดิม ไม่เปิด GitHub Pages callback และไม่เกิด 404 |

## ความปลอดภัยและข้อจำกัด

รหัส OTP เป็นรหัสใช้ครั้งเดียวและมีอายุจำกัด Supabase ยังจำกัดความถี่การขอ OTP ตามการตั้งค่าของ project ดังนั้นผู้ใช้ควรรอเมื่อเห็นข้อความให้ลองใหม่ภายหลัง และไม่ควรแชร์รหัสกับผู้อื่น

ถ้าใน Gmail ยังเห็นปุ่ม Verify จาก template เดิม แปลว่ายังไม่ได้บันทึก template **Magic Link or OTP** ใน Supabase Dashboard หรือกำลังดูอีเมลเก่า ให้ส่งรหัสใหม่หลังบันทึก template แล้ว

## References

[1]: https://supabase.com/docs/guides/auth/auth-email-passwordless "Supabase Passwordless email logins"
[2]: https://supabase.com/docs/guides/auth/auth-email-templates "Supabase Email Templates"
