(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const SOURCE_IMAGE_MAX_BYTES = 40_000_000;
  const DEFAULT_OUTPUT_MAX_BYTES = 1_000_000;
  const DEFAULT_MAX_DIMENSION = 1600;
  const ACCEPTED_IMAGE_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp']);

  function fail(message) { throw new Error(message); }

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
    assertInput(file);
    const outputLimit = Math.min(DEFAULT_OUTPUT_MAX_BYTES, Math.max(1, Number(maxOutputBytes) || DEFAULT_OUTPUT_MAX_BYTES));
    const image = await loadImage(file);
    const originalWidth = image.naturalWidth || image.width;
    const originalHeight = image.naturalHeight || image.height;
    if (!originalWidth || !originalHeight) fail('รูปภาพไม่มีขนาดที่ใช้งานได้');

    let bound = Math.min(Math.max(1, Number(maxDimension) || DEFAULT_MAX_DIMENSION), Math.max(originalWidth, originalHeight));
    let quality = 0.88;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const ratio = Math.min(1, bound / Math.max(originalWidth, originalHeight));
      const width = Math.max(1, Math.round(originalWidth * ratio));
      const height = Math.max(1, Math.round(originalHeight * ratio));
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) fail('อุปกรณ์นี้ไม่พร้อมสำหรับการบีบอัดรูปภาพ');
      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);
      const type = file.type === 'image/png' && file.size <= outputLimit && ratio === 1 ? 'image/png' : 'image/webp';
      const blob = await canvasBlob(canvas, type, quality);
      if (blob.size <= outputLimit) {
        const previewUrl = URL.createObjectURL(blob);
        return Object.freeze({
          blob,
          dataUrl: await readAsDataUrl(blob),
          previewUrl,
          mimeType: blob.type,
          extension: extensionFor(blob.type),
          bytes: blob.size,
          originalBytes: file.size,
          width,
          height,
          compressed: blob.size < file.size || width !== originalWidth || height !== originalHeight,
        });
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

  async function uploadPublicCatalogImage(file, { url, publishableKey, accessToken, actorId, scope = 'catalog' } = {}) {
    if (!url || !publishableKey || !accessToken || !actorId) fail('ไม่พบข้อมูลการยืนยันตัวตนสำหรับอัปโหลดรูปภาพ');
    const prepared = await prepareImage(file);
    const nonce = typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const path = `admin/${safeSegment(actorId, 'admin')}/${safeSegment(scope)}/${nonce}.${prepared.extension}`;
    const upload = await fetch(`${String(url).replace(/\/$/, '')}/storage/v1/object/catalog-media/${path}`, {
      method: 'POST',
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': prepared.mimeType,
        'x-upsert': 'false',
      },
      body: prepared.blob,
    });
    if (!upload.ok) {
      const detail = await upload.text().catch(() => '');
      URL.revokeObjectURL(prepared.previewUrl);
      fail(`ไม่สามารถอัปโหลดรูปภาพได้${detail ? `: ${detail}` : ''}`);
    }
    const publicUrl = `${String(url).replace(/\/$/, '')}/storage/v1/object/public/catalog-media/${path}`;
    try {
      await verifyRenderableUrl(publicUrl);
    } catch (error) {
      URL.revokeObjectURL(prepared.previewUrl);
      throw error;
    }
    return Object.freeze({ ...prepared, bucket: 'catalog-media', path, publicUrl });
  }

  root.APServiceMedia = Object.freeze({
    version: 'shared-media-v1',
    policy: Object.freeze({ sourceImageMaxBytes: SOURCE_IMAGE_MAX_BYTES, outputImageMaxBytes: DEFAULT_OUTPUT_MAX_BYTES, acceptedImageTypes: ACCEPTED_IMAGE_TYPES }),
    prepareImage,
    uploadPublicCatalogImage,
    verifyRenderableUrl,
    revokePreview(prepared) { if (prepared?.previewUrl) URL.revokeObjectURL(prepared.previewUrl); },
  });
})();
