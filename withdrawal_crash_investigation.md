# Withdrawal Proof Crash Investigation

ตรวจสอบเมื่อ 2026-08-17 (เวลา UTC) จาก Supabase project `abtsctwfkgzciseppach`.

| จุดตรวจ | ผลที่พบ | ความหมายต่อการแก้ไข |
|---|---|---|
| RPC `admin_review_withdrawal` | รับค่า `p_proof_image_url` แบบ `text` และบันทึกลง `withdrawal_requests.proof_image_url` | ระบบเดิมส่งสลิป Base64 ผ่าน JSON/RPC แทนการอัปโหลดไฟล์ |
| Log Android | `POST /rest/v1/rpc/admin_review_withdrawal` ตอบ `204` พร้อม payload ประมาณ 789,438 bytes | ฐานข้อมูลบันทึกสำเร็จ จึงไม่ได้เป็น error ฝั่ง RPC แต่ client ต้องจัดการ payload ใหญ่ |
| ข้อมูลคำขอจริง | `proof_image_url` มี 789,299 ตัวอักษร ขึ้นต้น `data:image/jpeg;base64,` | การรีเฟรชหน้าศูนย์จ่ายเงินดึง `select=*` ทำให้ Browser ต้องถือและ render Base64 ซ้ำ เสี่ยงทำให้ Chrome Android ใช้หน่วยความจำสูงและล่ม |
| RLS | Rider อ่านแถวคำขอถอนของตนได้ผ่าน `private.owns_rider(rider_id)` | สามารถให้ Rider ดูไฟล์จาก Private Storage ตามสิทธิ์เดิมได้ โดยไม่จำเป็นต้องเก็บรูปใน database row |

แนวทางแก้ที่นำไปใช้คือย้ายสลิปคำขอถอนใหม่ไปยัง Private Storage bucket `withdrawal-proofs`, เก็บเพียง storage path ในฐานข้อมูล, จำกัดรูปต้นทาง 5 MB, บีบอัดก่อนอัปโหลดให้ไม่เกิน 420 KB และดึงไฟล์เฉพาะเมื่อผู้ใช้กดดูหลักฐาน
