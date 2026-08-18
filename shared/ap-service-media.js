(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const SOURCE_IMAGE_MAX_BYTES = 40_000_000;
  const DEFAULT_OUTPUT_MAX_BYTES = 1_000_000;
  const DEFAULT_MAX_DIMENSION = 1600;
  const ACCEPTED_IMAGE_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);

  function fail(message) { throw new Error(message); }

  const progress = (() => {
    let hideTimer = null;
    function ensure() {
      if (typeof document === 'undefined') return null;
      if (!document.getElementById('ap-service-media-progress-style')) {
        const style = document.createElement('style');
        style.id = 'ap-service-media-progress-style';
        style.textContent = `
          .ap-media-progress{position:fixed;z-index:99999;left:50%;bottom:max(18px,env(safe-area-inset-bottom));width:min(420px,calc(100vw - 28px));padding:13px 14px;border:1px solid #b7e8d2;border-radius:15px;background:#fff;box-shadow:0 14px 38px rgba(3,76,57,.22);color:#0d4f41;font-family:inherit}.ap-media-progress[hidden]{display:none}.ap-media-progress__head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;font-size:12px;font-weight:850}.ap-media-progress__percent{color:#078a63;font-variant-numeric:tabular-nums}.ap-media-progress__track{height:9px;overflow:hidden;margin-top:9px;border-radius:999px;background:#dff4e9}.ap-media-progress__bar{width:100%;height:100%;border-radius:inherit;background:linear-gradient(90deg,#0b8c7c,#28c77b);transform:scaleX(0);transform-origin:left;transition:transform 180ms cubic-bezier(.23,1,.32,1)}.ap-media-progress__detail{display:block;margin-top:7px;color:#56746b;font-size:11px;line-height:1.4}.ap-media-progress.is-error{border-color:#f2b9bc}.ap-media-progress.is-error .ap-media-progress__percent{color:#b5474e}.ap-media-progress.is-error .ap-media-progress__bar{background:#e75d64}@media (prefers-reduced-motion:reduce){.ap-media-progress__bar{transition:none}}
        `;
        document.head.append(style);
      }
      let host = document.getElementById('ap-service-media-progress');
      if (!host) {
        host = document.createElement('section');
        host.id = 'ap-service-media-progress';
        host.className = 'ap-media-progress';
        host.setAttribute('role', 'status');
        host.setAttribute('aria-live', 'polite');
        host.hidden = true;
        host.innerHTML = '<div class="ap-media-progress__head"><span class="ap-media-progress__stage"></span><span class="ap-media-progress__percent">0%</span></div><div class="ap-media-progress__track" aria-hidden="true"><div class="ap-media-progress__bar"></div></div><small class="ap-media-progress__detail"></small>';
        document.body.append(host);
      }
      return host;
    }
    function update(percent, stage, detail = '') {
      const host = ensure(); if (!host) return;
      clearTimeout(hideTimer);
      const safePercent = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
      host.hidden = false; host.classList.remove('is-error');
      host.querySelector('.ap-media-progress__stage').textContent = stage || 'กำลังเตรียมรูปภาพ…';
      host.querySelector('.ap-media-progress__percent').textContent = `${safePercent}%`;
      host.querySelector('.ap-media-progress__detail').textContent = detail;
      host.querySelector('.ap-media-progress__bar').style.transform = `scaleX(${safePercent / 100})`;
    }
    function open(label = 'กำลังเตรียมรูปภาพ…') { update(4, label, 'เริ่มตรวจสอบไฟล์ที่เลือก'); }
    function complete(detail = 'บันทึกรูปภาพเรียบร้อยแล้ว') {
      update(100, 'เสร็จเรียบร้อย', detail);
      hideTimer = setTimeout(() => { const host = ensure(); if (host) host.hidden = true; }, 2300);
    }
    function failProgress(detail = 'ไม่สามารถดำเนินการกับรูปภาพได้') {
      const host = ensure(); if (!host) return;
      clearTimeout(hideTimer); host.hidden = false; host.classList.add('is-error');
      host.querySelector('.ap-media-progress__stage').textContent = 'ดำเนินการไม่สำเร็จ';
      host.querySelector('.ap-media-progress__percent').textContent = '—';
      host.querySelector('.ap-media-progress__detail').textContent = detail;
      host.querySelector('.ap-media-progress__bar').style.transform = 'scaleX(1)';
    }
    return Object.freeze({ open, update, complete, fail: failProgress });
  })();

  function safeSegment(value, fallback = 'image') {
    const normalized = String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    return normalized || fallback;
  }

  function extensionFor(type) {
    if (type === 'image/png') return 'png';
    if (type === 'image/webp') return 'webp';
    return 'jpg';
  }

  function readAsDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
      reader.readAsDataURL(blob);
    });
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const previewUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => { URL.revokeObjectURL(previewUrl); resolve(image); };
      image.onerror = () => { URL.revokeObjectURL(previewUrl); reject(new Error('ไฟล์รูปภาพนี้เปิดอ่านไม่ได้ กรุณาเลือก JPG, PNG หรือ WebP ใหม่')); };
      image.src = previewUrl;
    });
  }

  function canvasBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('ไม่สามารถสร้างไฟล์รูปหลังบีบอัดได้')), type, quality);
    });
  }

  function assertInput(file) {
    if (!file) fail('ไม่พบไฟล์รูปภาพที่เลือก');
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) fail('เลือกได้เฉพาะรูป JPG, PNG หรือ WebP');
    if (!Number.isFinite(Number(file.size)) || file.size <= 0) fail('ไฟล์รูปภาพไม่มีข้อมูลหรืออ่านขนาดไฟล์ไม่ได้');
    if (file.size > SOURCE_IMAGE_MAX_BYTES) fail('รูปภาพต้นฉบับมีขนาดเกิน 40 MB กรุณาเลือกรูปที่เล็กลง');
  }

  async function prepareImage(file, { maxOutputBytes = DEFAULT_OUTPUT_MAX_BYTES, maxDimension = DEFAULT_MAX_DIMENSION } = {}) {
    progress.update(8, 'กำลังตรวจสอบไฟล์รูปภาพ', 'ตรวจชนิดและขนาดไฟล์');
    assertInput(file);
    const outputLimit = Math.min(DEFAULT_OUTPUT_MAX_BYTES, Math.max(1, Number(maxOutputBytes) || DEFAULT_OUTPUT_MAX_BYTES));
    progress.update(18, 'กำลังอ่านรูปภาพ', 'กำลังเตรียมรูปจากกล้องหรือคลังไฟล์');
    const image = await loadImage(file);
    const originalWidth = image.naturalWidth || image.width;
    const originalHeight = image.naturalHeight || image.height;
    if (!originalWidth || !originalHeight) fail('รูปภาพไม่มีขนาดที่ใช้งานได้');

    let bound = Math.min(Math.max(1, Number(maxDimension) || DEFAULT_MAX_DIMENSION), Math.max(originalWidth, originalHeight));
    let quality = 0.88;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      progress.update(24 + Math.round((attempt / 12) * 28), 'กำลังบีบอัดรูปภาพ', `กำลังปรับขนาดและคุณภาพให้ไม่เกิน ${Math.round(outputLimit / 1024)} KB`);
      const ratio = Math.min(1, bound / Math.max(originalWidth, originalHeight));
      const width = Math.max(1, Math.round(originalWidth * ratio));
      const height = Math.max(1, Math.round(originalHeight * ratio));
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) fail('อุปกรณ์นี้ไม่พร้อมสำหรับการบีบอัดรูปภาพ');
      canvas.width = width; canvas.height = height;
      context.drawImage(image, 0, 0, width, height);
      const type = file.type === 'image/png' && file.size <= outputLimit && ratio === 1 ? 'image/png' : 'image/webp';
      const blob = await canvasBlob(canvas, type, quality);
      if (blob.size <= outputLimit) {
        progress.update(55, 'เตรียมไฟล์ภาพแล้ว', `ขนาดหลังบีบอัด ${Math.ceil(blob.size / 1024)} KB`);
        const previewUrl = URL.createObjectURL(blob);
        return Object.freeze({ blob, dataUrl: await readAsDataUrl(blob), previewUrl, mimeType: blob.type, extension: extensionFor(blob.type), bytes: blob.size, originalBytes: file.size, width, height, compressed: blob.size < file.size || width !== originalWidth || height !== originalHeight });
      }
      if (quality > 0.5) quality = Math.max(0.48, quality - 0.1);
      else { bound = Math.max(480, Math.round(bound * 0.78)); quality = 0.82; }
    }
    fail('ไม่สามารถบีบอัดรูปให้อยู่ภายใต้ 1 MB ได้ กรุณาเลือกรูปที่เล็กลงหรือภาพที่รายละเอียดน้อยลง');
  }

  function verifyRenderableUrl(url, { timeoutMs = 12_000 } = {}) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const timer = setTimeout(() => { image.src = ''; reject(new Error('ตรวจสอบภาพที่อัปโหลดไม่สำเร็จภายในเวลาที่กำหนด')); }, timeoutMs);
      image.onload = () => { clearTimeout(timer); resolve({ ok: true, width: image.naturalWidth, height: image.naturalHeight }); };
      image.onerror = () => { clearTimeout(timer); reject(new Error('อัปโหลดไฟล์แล้วแต่ไม่สามารถเปิดแสดงรูปภาพได้')); };
      image.src = url;
    });
  }

  function uploadBlobWithMeasuredProgress(endpoint, headers, blob) {
    if (typeof XMLHttpRequest === 'undefined') return fetch(endpoint, { method: 'POST', headers, body: blob });
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint, true);
      Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
      xhr.upload.onprogress = event => {
        if (!event.lengthComputable || !event.total) return;
        const percent = 58 + Math.round((event.loaded / event.total) * 27);
        progress.update(percent, 'กำลังอัปโหลดรูปภาพ', `ส่งแล้ว ${Math.ceil(event.loaded / 1024)} KB จาก ${Math.ceil(event.total / 1024)} KB`);
      };
      xhr.onerror = () => reject(new Error('ไม่สามารถเชื่อมต่อเพื่ออัปโหลดรูปภาพได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่'));
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve({ ok: true, status: xhr.status, text: async () => xhr.responseText });
        else resolve({ ok: false, status: xhr.status, text: async () => xhr.responseText });
      };
      xhr.send(blob);
    });
  }

  async function uploadPublicCatalogImage(file, { url, publishableKey, accessToken, actorId, scope = 'catalog' } = {}) {
    let prepared = null;
    progress.open('กำลังเตรียมรูปภาพ…');
    try {
      if (!url || !publishableKey || !accessToken || !actorId) fail('ไม่พบข้อมูลการยืนยันตัวตนสำหรับอัปโหลดรูปภาพ');
      prepared = await prepareImage(file);
      const nonce = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const path = `admin/${safeSegment(actorId, 'admin')}/${safeSegment(scope)}/${nonce}.${prepared.extension}`;
      progress.update(58, 'กำลังอัปโหลดรูปภาพ', 'กำลังเริ่มส่งไฟล์ไปยังระบบจัดเก็บ');
      const upload = await uploadBlobWithMeasuredProgress(`${String(url).replace(/\/$/, '')}/storage/v1/object/catalog-media/${path}`, {
        apikey: publishableKey, Authorization: `Bearer ${accessToken}`, 'Content-Type': prepared.mimeType, 'x-upsert': 'false'
      }, prepared.blob);
      if (!upload.ok) {
        const detail = await upload.text().catch(() => '');
        fail(`ไม่สามารถอัปโหลดรูปภาพได้${detail ? `: ${detail}` : ''}`);
      }
      const publicUrl = `${String(url).replace(/\/$/, '')}/storage/v1/object/public/catalog-media/${path}`;
      progress.update(90, 'กำลังตรวจสอบว่ารูปภาพเปิดแสดงได้', 'ยืนยัน URL ก่อนให้บันทึกลงข้อมูลร้านหรือโฆษณา');
      await verifyRenderableUrl(publicUrl);
      progress.complete(`อัปโหลดและตรวจสอบภาพแล้ว · ${Math.ceil(prepared.bytes / 1024)} KB`);
      return Object.freeze({ ...prepared, bucket: 'catalog-media', path, publicUrl });
    } catch (error) {
      if (prepared?.previewUrl) URL.revokeObjectURL(prepared.previewUrl);
      progress.fail(error?.message || 'อัปโหลดรูปภาพไม่สำเร็จ');
      throw error;
    }
  }

  root.APServiceMediaProgress = progress;
  root.APServiceMedia = Object.freeze({
    version: 'shared-media-v2',
    policy: Object.freeze({ sourceImageMaxBytes: SOURCE_IMAGE_MAX_BYTES, outputImageMaxBytes: DEFAULT_OUTPUT_MAX_BYTES, acceptedImageTypes: ACCEPTED_IMAGE_TYPES }),
    prepareImage,
    uploadPublicCatalogImage,
    verifyRenderableUrl,
    progress,
    revokePreview(prepared) { if (prepared?.previewUrl) URL.revokeObjectURL(prepared.previewUrl); },
  });
})();
