/* Android-safe withdrawal proof upload: file storage instead of Base64 inside RPC/database payloads. */
(() => {
  'use strict';
  const esc = value => typeof window.escapeHtml === 'function' ? window.escapeHtml(value) : String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
  const MAX_PROOF_BYTES = 420 * 1024;
  const BUCKET = 'withdrawal-proofs';
  const isImage = file => ['image/jpeg', 'image/png', 'image/webp'].includes(file?.type);
  const pathEncode = value => String(value || '').split('/').map(encodeURIComponent).join('/');
  const rememberAdminContext = () => {
    try { sessionStorage.setItem('apcx_admin_resume_context', JSON.stringify({ at: Date.now(), view: 'admin', page: window.AdminOrderFilter?.current || 'all' })); } catch (_) {}
  };

  // Keep the current Admin page visible if token renewal fails. A request reports a clear error instead of forcing a login redirect.
  SupabaseSync.refreshSession = async function refreshSessionWithoutPageExit(force = false) {
    const cfg = this.config(), current = this.session(), expiresAt = Number(current?.expires_at || 0);
    const expiresSoon = !expiresAt || expiresAt <= Math.floor(Date.now() / 1000) + 60;
    if (!current?.refresh_token) {
      rememberAdminContext();
      throw new Error('เซสชันแอดมินหมดอายุ กรุณาเข้าสู่ระบบใหม่เมื่อพร้อม งานและหน้าปัจจุบันจะไม่ถูกปิด');
    }
    if (!force && !expiresSoon) return current;
    let response, data;
    try {
      response = await fetch(`${cfg.url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: cfg.publishableKey, 'Content-Type': 'application/json', Authorization: `Bearer ${current.refresh_token}` },
        body: JSON.stringify({ refresh_token: current.refresh_token })
      });
      data = await response.json().catch(() => null);
    } catch (_) {
      rememberAdminContext();
      throw new Error('ต่ออายุเซสชันไม่ได้ในขณะนี้ กรุณาตรวจอินเทอร์เน็ตแล้วลองบันทึกใหม่ หน้าปัจจุบันยังคงอยู่');
    }
    if (!response.ok || !data?.access_token) {
      rememberAdminContext();
      throw new Error(data?.error_description || 'เซสชันแอดมินหมดอายุ กรุณาเข้าสู่ระบบใหม่เมื่อพร้อม งานและหน้าปัจจุบันจะไม่ถูกปิด');
    }
    this.setSession(data);
    return data;
  };

  const blobFromCanvas = (canvas, type, quality) => {
    if (typeof canvas.convertToBlob === 'function') return canvas.convertToBlob({ type, quality });
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('ไม่สามารถเตรียมรูปหลักฐานได้')), type, quality));
  };
  const compactProofBlob = async file => {
    if (!window.createImageBitmap) {
      const fallback = await compressImageForUpload(file, { maxBytes: MAX_PROOF_BYTES, maxDimension: 1280 });
      const blob = await fetch(fallback.dataUrl).then(response => response.blob());
      return blob;
    }
    const type = file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
    let width = 1280, quality = type === 'image/jpeg' ? 0.78 : 0.82;
    for (let attempt = 0; attempt < 7; attempt += 1) {
      const bitmap = await createImageBitmap(file, { resizeWidth: width, resizeQuality: 'high', imageOrientation: 'from-image' });
      const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(bitmap.width, bitmap.height) : document.createElement('canvas');
      canvas.width = bitmap.width; canvas.height = bitmap.height;
      const context = canvas.getContext('2d', { alpha: type !== 'image/jpeg', desynchronized: true });
      context.drawImage(bitmap, 0, 0);
      const blob = await blobFromCanvas(canvas, type, quality);
      bitmap.close?.(); context.clearRect(0, 0, canvas.width, canvas.height); canvas.width = 1; canvas.height = 1;
      if (blob.size > 0 && blob.size <= MAX_PROOF_BYTES) return blob;
      width = Math.max(480, Math.round(width * 0.74)); quality = Math.max(0.48, quality - 0.08);
    }
    throw new Error('ไม่สามารถเตรียมรูปหลักฐานให้มีขนาดปลอดภัยได้ กรุณาเลือกรูปใหม่');
  };
  const WithdrawalProofStorage = {
    async prepare(file) {
      if (!isImage(file)) throw new Error('เลือกได้เฉพาะรูป JPG, PNG หรือ WEBP');
      if (file.size > MAX_SOURCE_BYTES) throw new Error('รูปหลักฐานมีขนาดเกิน 5 MB กรุณาเลือกรูปที่เล็กลงเพื่อป้องกัน Chrome บนมือถือทำงานหนักเกินไป');
      const blob = await compactProofBlob(file);
      if (!blob.size || blob.size > MAX_PROOF_BYTES) throw new Error('ไม่สามารถเตรียมรูปหลักฐานให้อยู่ในขนาดปลอดภัยได้ กรุณาเลือกรูปใหม่');
      const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
      return { blob, extension, bytes: blob.size };
    },
    async upload(requestId, proof) {
      const session = SupabaseSync.session();
      if (!session?.user?.id || !session?.access_token) throw new Error('ไม่พบเซสชันแอดมินสำหรับอัปโหลดหลักฐาน กรุณาเข้าสู่ระบบใหม่เมื่อพร้อม');
      const cfg = SupabaseSync.config();
      const path = `${session.user.id}/${requestId}/${Date.now()}.${proof.extension}`;
      const response = await fetch(`${cfg.url}/storage/v1/object/${BUCKET}/${path}`, {
        method: 'POST',
        headers: { apikey: cfg.publishableKey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': proof.blob.type || 'image/jpeg', 'x-upsert': 'false' },
        body: proof.blob
      });
      if (response.status === 401) throw new Error('เซสชันแอดมินหมดอายุระหว่างอัปโหลด รูปยังไม่ได้บันทึก กรุณาเข้าสู่ระบบใหม่แล้วส่งอีกครั้ง');
      if (!response.ok) throw new Error('อัปโหลดหลักฐานการโอนไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง');
      return `${BUCKET}/${path}`;
    },
    async view(requestId) {
      const rows = await SupabaseSync.request(`withdrawal_requests?select=id,proof_image_url,proof_available&id=eq.${encodeURIComponent(requestId)}&limit=1`);
      const proof = rows?.[0]?.proof_image_url;
      if (!proof) throw new Error('ยังไม่มีหลักฐานการโอนสำหรับคำขอนี้');
      if (/^data:image\//i.test(proof)) {
        const legacy = window.open(proof, '_blank', 'noopener');
        if (!legacy) throw new Error('เบราว์เซอร์บล็อกหน้าต่างรูปภาพ กรุณาอนุญาต pop-up แล้วลองอีกครั้ง');
        return;
      }
      const session = SupabaseSync.session(), cfg = SupabaseSync.config();
      const response = await fetch(`${cfg.url}/storage/v1/object/${pathEncode(proof)}`, { headers: { apikey: cfg.publishableKey, Authorization: `Bearer ${session?.access_token || ''}` } });
      if (!response.ok) throw new Error('ไม่สามารถเปิดหลักฐานการโอนได้');
      const url = URL.createObjectURL(await response.blob());
      const viewer = window.open(url, '_blank', 'noopener');
      if (!viewer) throw new Error('เบราว์เซอร์บล็อกหน้าต่างรูปภาพ กรุณาอนุญาต pop-up แล้วลองอีกครั้ง');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  };

  const originalSettlementLoad = SettlementAdmin.load.bind(SettlementAdmin);
  SettlementAdmin.load = async function loadWithoutInlineWithdrawalProofs() {
    if (!Storage.isAdmin()) return;
    this.ensure();
    try {
      const [stores, riders, settlements, withdrawals] = await Promise.all([
        SupabaseSync.request('stores?select=*&order=name.asc'),
        SupabaseSync.request('riders?select=*&order=name.asc'),
        SupabaseSync.request('settlements?select=*&order=due_date.asc,created_at.desc&limit=300'),
        SupabaseSync.request('withdrawal_requests?select=id,recipient_type,store_id,rider_id,recipient_name,amount,payout_snapshot,status,recipient_note,admin_note,payment_reference,requested_at,reviewed_at,paid_at,proof_available&order=requested_at.asc&limit=300')
      ]);
      this.stores = Array.isArray(stores) ? stores : [];
      this.riders = Array.isArray(riders) ? riders : [];
      this.rows = Array.isArray(settlements) ? settlements : [];
      this.withdrawals = Array.isArray(withdrawals) ? withdrawals : [];
      this.renderRecipientOptions(); this.renderSummary(); this.renderWithdrawals(); this.renderRows();
    } catch (error) {
      const list = $('#settlementList');
      if (list) list.innerHTML = `<div class="notice">ไม่สามารถโหลดข้อมูลรอบจ่ายได้: ${esc(error.message || '')}</div>`;
    }
  };
  void originalSettlementLoad;

  SettlementAdmin.renderWithdrawals = function renderWithdrawalRequestsWithoutInlineImage() {
    const target = $('#withdrawalRequestList'); if (!target) return;
    if (!this.withdrawals.length) { target.innerHTML = '<div class="empty">ยังไม่มีคำขอถอนเงินจากร้านหรือ Rider</div>'; return; }
    const labels = { requested: 'รอตรวจสอบ', approved: 'อนุมัติแล้ว', paid: 'โอนแล้ว', rejected: 'ไม่อนุมัติ', cancelled: 'ยกเลิก' };
    const rows = this.withdrawals.map(row => {
      const pending = row.status === 'requested', approved = row.status === 'approved', paid = row.status === 'paid';
      const action = pending
        ? `<br><button class="btn btn-amber btn-small" style="margin-top:7px" onclick="reviewWithdrawalRequest('${esc(row.id)}','approved')">อนุมัติ</button> <button class="btn btn-plain btn-small" style="margin-top:7px" onclick="reviewWithdrawalRequest('${esc(row.id)}','rejected')">ปฏิเสธ</button>`
        : approved
          ? `<br><button class="btn btn-main btn-small" style="margin-top:7px" onclick="reviewWithdrawalRequest('${esc(row.id)}','paid')">แนบสลิปและบันทึกการโอน</button>`
          : '';
      const proof = paid && row.proof_available ? `<br><button class="btn btn-plain btn-small" style="margin-top:7px" onclick="viewWithdrawalProof('${esc(row.id)}')">ดูหลักฐานการโอน</button>` : '';
      return `<tr><td><strong>${row.recipient_type === 'store' ? '🏪' : '🛵'} ${esc(row.recipient_name)}</strong><br><small>ขอเมื่อ ${esc(new Date(row.requested_at).toLocaleString('th-TH'))}</small></td><td><strong>${money(row.amount)}</strong><br><small>${esc(row.recipient_note || 'ไม่มีหมายเหตุ')}</small></td><td>${this.payoutMarkup(row.payout_snapshot)}</td><td><span class="status ${pending || approved ? 'wait' : row.status === 'rejected' ? 'closed' : ''}">${labels[row.status] || esc(row.status)}</span>${row.admin_note ? `<br><small>${esc(row.admin_note)}</small>` : ''}${proof}${action}</td></tr>`;
    }).join('');
    target.innerHTML = `<div class="table-wrap"><table><thead><tr><th>ผู้ร้องขอ</th><th>ยอด / หมายเหตุ</th><th>ช่องทางรับเงิน</th><th>สถานะ / จัดการ</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  };

  const originalReviewWithdrawal = SettlementAdmin.reviewWithdrawal.bind(SettlementAdmin);
  SettlementAdmin.reviewWithdrawal = async function reviewWithdrawalWithStorage(id, action) {
    if (action !== 'paid') return originalReviewWithdrawal(id, action);
    if (this.withdrawalProofBusy) return UI.toast('กำลังบันทึกหลักฐานการโอน กรุณารอสักครู่', 'warning');
    const row = this.withdrawals.find(item => item.id === id); if (!row) throw new Error('ไม่พบคำขอถอนเงิน');
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp'; input.style.display = 'none'; document.body.appendChild(input);
    input.onchange = async () => {
      const file = input.files?.[0]; input.value = '';
      if (!file) { input.remove(); return; }
      this.withdrawalProofBusy = true;
      try {
        UI.toast('กำลังเตรียมรูปหลักฐานขนาดปลอดภัยสำหรับมือถือ…');
        const proof = await WithdrawalProofStorage.prepare(file);
        const reference = prompt('เลขอ้างอิงการโอน (ไม่บังคับ)', '') ?? '';
        const note = prompt('หมายเหตุการชำระเงิน (ไม่บังคับ)', '') ?? '';
        if (!confirm(`ยืนยันบันทึกการโอน ${money(row.amount)} ให้ ${row.recipient_name} พร้อมหลักฐานขนาด ${Math.ceil(proof.bytes / 1024)} KB หรือไม่?`)) return;
        UI.toast('กำลังอัปโหลดหลักฐานและบันทึกสถานะจ่ายเงิน…');
        const storagePath = await WithdrawalProofStorage.upload(id, proof);
        await SupabaseSync.request('rpc/admin_review_withdrawal', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ p_request_id: id, p_action: 'paid', p_proof_image_url: storagePath, p_payment_reference: reference, p_admin_note: note }) });
        await this.load();
        window.refreshAdminPendingBadges?.();
        UI.toast('บันทึกการโอนและส่งหลักฐานให้ Rider ดูแล้ว');
      } catch (error) {
        UI.toast(`บันทึกการโอนไม่สำเร็จ: ${error.message || 'กรุณาลองใหม่'}`, 'error');
      } finally {
        this.withdrawalProofBusy = false;
        input.remove();
      }
    };
    input.click();
  };

  window.viewWithdrawalProof = id => WithdrawalProofStorage.view(id).catch(error => UI.toast(error.message || 'เปิดหลักฐานไม่สำเร็จ', 'error'));
})();
