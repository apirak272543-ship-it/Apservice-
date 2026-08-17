(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const BUCKET = 'withdrawal-proofs';
  const pathEncode = value => String(value || '').split('/').map(encodeURIComponent).join('/');
  let objectUrl = '';

  const revokeObjectUrl = () => {
    if (!objectUrl) return;
    URL.revokeObjectURL(objectUrl);
    objectUrl = '';
  };

  function ensureViewer() {
    let modal = $('#withdrawalProofViewer');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'withdrawalProofViewer';
    modal.className = 'withdrawal-proof-viewer';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="withdrawal-proof-viewer__backdrop" data-proof-close="true"></div>
      <section class="withdrawal-proof-viewer__panel" role="dialog" aria-modal="true" aria-labelledby="withdrawalProofViewerTitle">
        <header class="withdrawal-proof-viewer__header">
          <div><p>หลักฐานการโอน</p><h3 id="withdrawalProofViewerTitle">ตรวจสอบรายการจ่ายเงิน</h3></div>
          <button type="button" class="withdrawal-proof-viewer__close" data-proof-close="true" aria-label="ปิดหน้าดูหลักฐาน">×</button>
        </header>
        <div class="withdrawal-proof-viewer__body"><img id="withdrawalProofViewerImage" alt="หลักฐานการโอน" /></div>
        <footer>รูปภาพนี้เปิดจากพื้นที่จัดเก็บส่วนตัวของระบบ และไม่เปิดแท็บหรือแอปภายนอก</footer>
      </section>`;
    modal.addEventListener('click', event => { if (event.target?.dataset?.proofClose === 'true') closeViewer(); });
    document.body.appendChild(modal);
    return modal;
  }

  function closeViewer() {
    const modal = $('#withdrawalProofViewer');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    const image = $('#withdrawalProofViewerImage');
    if (image) image.removeAttribute('src');
    revokeObjectUrl();
  }

  function displayProof(src) {
    const modal = ensureViewer();
    const image = $('#withdrawalProofViewerImage');
    if (!image) throw new Error('ไม่สามารถเตรียมหน้าดูหลักฐานได้');
    image.onerror = () => window.UI?.toast?.('รูปหลักฐานเปิดไม่สำเร็จ กรุณาลองใหม่', 'error');
    image.src = src;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modal.querySelector('.withdrawal-proof-viewer__close')?.focus();
  }

  async function viewInApp(requestId) {
    const rows = await window.SupabaseSync.request(`withdrawal_requests?select=id,proof_image_url,proof_available&id=eq.${encodeURIComponent(requestId)}&limit=1`);
    const proof = rows?.[0]?.proof_image_url;
    if (!proof) throw new Error('ยังไม่มีหลักฐานการโอนสำหรับคำขอนี้');
    revokeObjectUrl();
    if (/^data:image\//i.test(proof)) return displayProof(proof);
    const cfg = window.SupabaseSync.config();
    const session = window.SupabaseSync.session();
    const response = await fetch(`${cfg.url}/storage/v1/object/${pathEncode(proof)}`, {
      headers: { apikey: cfg.publishableKey, Authorization: `Bearer ${session?.access_token || ''}` }
    });
    if (!response.ok) throw new Error('ไม่สามารถเปิดหลักฐานการโอนได้ กรุณาตรวจสิทธิ์และลองใหม่');
    objectUrl = URL.createObjectURL(await response.blob());
    displayProof(objectUrl);
  }

  window.closeWithdrawalProofViewer = closeViewer;
  window.viewWithdrawalProof = requestId => viewInApp(requestId).catch(error => window.UI?.toast?.(error.message || 'เปิดหลักฐานไม่สำเร็จ', 'error'));
  window.addEventListener('keydown', event => { if (event.key === 'Escape') closeViewer(); });

  const style = document.createElement('style');
  style.textContent = `.withdrawal-proof-viewer{position:fixed;inset:0;z-index:99999;display:none;align-items:center;justify-content:center;padding:18px}.withdrawal-proof-viewer.open{display:flex}.withdrawal-proof-viewer__backdrop{position:absolute;inset:0;background:rgba(7,25,23,.72);backdrop-filter:blur(3px)}.withdrawal-proof-viewer__panel{position:relative;z-index:1;width:min(680px,100%);max-height:calc(100dvh - 36px);overflow:auto;border-radius:18px;background:#fff;box-shadow:0 22px 60px rgba(0,0,0,.35)}.withdrawal-proof-viewer__header{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 16px;border-bottom:1px solid #e4efec}.withdrawal-proof-viewer__header p{margin:0 0 2px;color:#168b7b;font-size:11px;font-weight:900}.withdrawal-proof-viewer__header h3{margin:0;color:#12332e;font-size:17px}.withdrawal-proof-viewer__close{width:38px;height:38px;border:0;border-radius:50%;background:#edf7f4;color:#0b7163;font-size:27px;line-height:1;cursor:pointer}.withdrawal-proof-viewer__body{display:grid;place-items:center;min-height:180px;padding:12px;background:#f6faf9}.withdrawal-proof-viewer__body img{display:block;max-width:100%;max-height:calc(100dvh - 190px);object-fit:contain;border-radius:10px;background:#fff}.withdrawal-proof-viewer__panel footer{padding:11px 16px;color:#64746f;font-size:11px;line-height:1.45}@media(max-width:540px){.withdrawal-proof-viewer{padding:10px}.withdrawal-proof-viewer__panel{max-height:calc(100dvh - 20px);border-radius:16px}.withdrawal-proof-viewer__body{padding:8px}.withdrawal-proof-viewer__body img{max-height:calc(100dvh - 160px)}}`;
  document.head.appendChild(style);
})();
