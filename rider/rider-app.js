(() => {
  'use strict';
  const M = window.APServiceMPA;
  const C = window.APServiceCore;
  const $ = selector => document.querySelector(selector);
  const h = M.ui.escapeHtml;
  const page = document.body.dataset.page;
  const params = new URLSearchParams(location.search);
  const links = [['dashboard', 'ภาพรวม'], ['jobs', 'งานจัดส่ง'], ['earnings', 'รายได้'], ['profile', 'โปรไฟล์'], ['settings', 'ตั้งค่า']];

  const app = (active, content) => {
    const nav = links.map(([key, label]) => `<a class="${active === key ? 'active' : ''}" href="${key}.html">${label}</a>`).join('');
    document.body.innerHTML = `<header class="mpa-topbar"><a class="mpa-brand" href="dashboard.html">AP Service · Rider</a><nav class="mpa-nav">${nav}<a href="../rider.html">Fallback</a></nav></header><main class="mpa-shell" data-page-content>${content}</main>`;
  };

  async function ownRider(user) {
    const rows = await M.request(`riders?select=id,name,phone,vehicle,status,user_id&user_id=eq.${encodeURIComponent(user.id)}&limit=1`, { private: true });
    return rows?.[0] || null;
  }

  async function gate(active, content) {
    app(active, content);
    const access = await M.auth.requireRole('rider', { loginUrl: 'login.html', container: $('[data-page-content]') });
    if (!access) return null;
    const rider = await ownRider(access.user);
    if (!rider) {
      $('[data-page-content]').innerHTML = M.ui.error('ไม่พบโปรไฟล์ไรเดอร์', 'กรุณาติดต่อผู้ดูแลระบบ');
      return null;
    }
    return { ...access, rider };
  }

  const ordersPath = riderId => `delivery_orders?select=id,status,payable,store_name,pickup_address,delivery_address,customer_name,ordered_at&rider_id=eq.${encodeURIComponent(riderId)}&order=ordered_at.desc&limit=150`;

  async function login() {
    document.body.innerHTML = `<main class="mpa-shell" style="min-height:100vh;display:grid;place-items:center"><section class="mpa-card" style="width:min(430px,100%)"><h1>เข้าสู่ระบบไรเดอร์</h1><p class="mpa-muted">ใช้บัญชีไรเดอร์ที่ได้รับสิทธิ์ใน AP Service</p><form id="login"><div class="mpa-field"><label>อีเมล</label><input id="email" type="email" required></div><div class="mpa-field"><label>รหัสผ่าน</label><input id="password" type="password" required></div><button class="mpa-button" style="width:100%">เข้าสู่ระบบไรเดอร์</button></form><p class="mpa-muted"><a href="../rider.html">เปิด Rider fallback เดิม</a></p></section></main>`;
    $('#login').onsubmit = async event => {
      event.preventDefault();
      try {
        const session = await M.auth.signIn($('#email').value.trim(), $('#password').value);
        if (!(await M.auth.rolesFor(session.user.id)).includes('rider')) {
          M.auth.signOut('login.html');
          throw new Error('บัญชีนี้ไม่มีสิทธิ์ไรเดอร์');
        }
        location.assign('dashboard.html');
      } catch (err) { M.ui.setNotice(err.message, 'error'); }
    };
  }

  async function dashboard() {
    const ctx = await gate('dashboard', `<div class="mpa-page-head"><div><h1>ภาพรวมงานไรเดอร์</h1><p>แสดงงานที่ได้รับมอบหมายและสถานะการพร้อมรับงาน</p></div><button id="out" class="mpa-button mpa-button-secondary">ออกจากระบบ</button></div><div id="content">${M.ui.loading('กำลังโหลดงาน…')}</div>`);
    if (!ctx) return;
    $('#out').onclick = () => M.auth.signOut('login.html');
    try {
      const jobs = await M.request(ordersPath(ctx.rider.id), { private: true });
      const active = jobs.filter(row => !['สำเร็จแล้ว', 'ยกเลิก'].includes(row.status));
      $('#content').innerHTML = `<div class="mpa-grid stats"><div class="mpa-card mpa-stat"><small>งานที่กำลังดำเนินการ</small><strong>${active.length}</strong></div><div class="mpa-card mpa-stat"><small>สถานะรับงาน</small><strong>${h(ctx.rider.status || '-')}</strong></div><div class="mpa-card mpa-stat"><small>งานทั้งหมด</small><strong>${jobs.length}</strong></div><div class="mpa-card mpa-stat"><small>ยานพาหนะ</small><strong style="font-size:18px">${h(ctx.rider.vehicle || '-')}</strong></div></div><section class="mpa-card" style="margin-top:18px"><a class="mpa-button" href="jobs.html">ดูงานจัดส่ง</a></section>`;
    } catch (err) { $('#content').innerHTML = M.ui.error('โหลดภาพรวมไม่สำเร็จ', err.message); }
  }

  async function jobs() {
    const ctx = await gate('jobs', `<div class="mpa-page-head"><div><h1>งานจัดส่ง</h1><p>งานที่ได้รับมอบหมายให้บัญชีไรเดอร์นี้</p></div></div><section id="list" class="mpa-card">${M.ui.loading('กำลังโหลดงานจัดส่ง…')}</section>`);
    if (!ctx) return;
    try {
      const rows = await M.request(ordersPath(ctx.rider.id), { private: true });
      $('#list').innerHTML = rows.length ? `<div class="mpa-table-wrap"><table class="mpa-table"><thead><tr><th>ร้านค้า</th><th>สถานะ</th><th>ปลายทาง</th><th>งาน</th></tr></thead><tbody>${rows.map(row => `<tr><td>${h(row.store_name || '-')}</td><td><span class="mpa-badge">${h(row.status)}</span></td><td>${h(row.delivery_address || '-')}</td><td><a class="mpa-button" href="delivery.html?id=${encodeURIComponent(row.id)}">เปิดงาน</a></td></tr>`).join('')}</tbody></table></div>` : M.ui.empty('ยังไม่มีงานที่ได้รับมอบหมาย');
    } catch (err) { $('#list').innerHTML = M.ui.error('โหลดงานไม่สำเร็จ', err.message); }
  }

  async function delivery() {
    const ctx = await gate('jobs', `<section id="job" class="mpa-card">${M.ui.loading('กำลังโหลดรายละเอียดงาน…')}</section>`);
    if (!ctx) return;
    const id = params.get('id');
    if (!id) { $('#job').innerHTML = M.ui.error('ไม่พบรหัสงาน'); return; }
    try {
      const rows = await M.request(`${ordersPath(ctx.rider.id)}&id=eq.${encodeURIComponent(id)}`, { private: true });
      const job = rows?.[0];
      if (!job) throw new Error('ไม่พบงานหรือบัญชีนี้ไม่มีสิทธิ์');
      const steps = Object.values(C.contracts.orderStatus).filter(next => C.order.canTransition({ from: job.status, to: next, actor: 'rider' }).ok);
      $('#job').innerHTML = `<a class="mpa-muted" href="jobs.html">← กลับรายการงาน</a><h1>${h(job.store_name || 'งานจัดส่ง')}</h1><p><span class="mpa-badge">${h(job.status)}</span></p><p><b>จุดรับ:</b> ${h(job.pickup_address || '-')}</p><p><b>จุดส่ง:</b> ${h(job.delivery_address || '-')}</p><p><b>ลูกค้า:</b> ${h(job.customer_name || '-')}</p>${steps.length ? `<div class="mpa-field"><label>อัปเดตสถานะงาน</label><select id="next"><option value="">เลือกสถานะ…</option>${steps.map(status => `<option>${h(status)}</option>`).join('')}</select></div><button id="save" class="mpa-button">บันทึกสถานะ</button>` : '<p class="mpa-muted">ไม่มีสถานะถัดไปที่บทบาทไรเดอร์เปลี่ยนได้</p>'}`;
      $('#save')?.addEventListener('click', async () => {
        const next = $('#next').value;
        if (!next) return;
        try {
          await M.request(`delivery_orders?id=eq.${encodeURIComponent(job.id)}`, { method: 'PATCH', private: true, headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: next, updated_at: M.ui.nowIso() }) });
          M.ui.setNotice('อัปเดตสถานะงานแล้ว'); setTimeout(() => location.reload(), 350);
        } catch (err) { M.ui.setNotice(err.message, 'error'); }
      });
    } catch (err) { $('#job').innerHTML = M.ui.error('โหลดรายละเอียดงานไม่สำเร็จ', err.message); }
  }

  async function earnings() {
    const ctx = await gate('earnings', `<div class="mpa-page-head"><div><h1>รายได้และกระเป๋าเงิน</h1><p>แสดงเฉพาะข้อมูลรายได้ของไรเดอร์ที่ล็อกอิน</p></div></div><section id="list" class="mpa-card">${M.ui.loading('กำลังโหลดรายได้…')}</section>`);
    if (!ctx) return;
    try {
      const rows = await M.request(`rider_earnings?select=*&rider_id=eq.${encodeURIComponent(ctx.rider.id)}&order=created_at.desc&limit=150`, { private: true });
      $('#list').innerHTML = rows.length ? `<pre style="white-space:pre-wrap">${h(JSON.stringify(rows, null, 2))}</pre>` : M.ui.empty('ยังไม่มีรายการรายได้');
    } catch (err) { $('#list').innerHTML = M.ui.error('โหลดรายได้ไม่สำเร็จ', err.message); }
  }

  async function profile() {
    const ctx = await gate('profile', `<div class="mpa-page-head"><div><h1>โปรไฟล์ไรเดอร์</h1><p>ตั้งค่าสถานะพร้อมรับงานของบัญชีนี้</p></div></div><section id="form" class="mpa-card">${M.ui.loading()}</section>`);
    if (!ctx) return;
    $('#form').innerHTML = `<form id="save" style="max-width:520px"><div class="mpa-field"><label>ชื่อ</label><input id="name" value="${h(ctx.rider.name)}" required></div><div class="mpa-field"><label>โทรศัพท์</label><input id="phone" value="${h(ctx.rider.phone || '')}"></div><div class="mpa-field"><label>สถานะ</label><select id="status"><option ${ctx.rider.status === 'พร้อมรับงาน' ? 'selected' : ''}>พร้อมรับงาน</option><option ${ctx.rider.status === 'ไม่พร้อมรับงาน' ? 'selected' : ''}>ไม่พร้อมรับงาน</option></select></div><button class="mpa-button">บันทึกโปรไฟล์</button></form>`;
    $('#save').onsubmit = async event => {
      event.preventDefault();
      try {
        await M.request(`riders?id=eq.${encodeURIComponent(ctx.rider.id)}`, { method: 'PATCH', private: true, headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ name: $('#name').value.trim(), phone: $('#phone').value.trim(), status: $('#status').value, updated_at: M.ui.nowIso() }) });
        M.ui.setNotice('บันทึกโปรไฟล์แล้ว');
      } catch (err) { M.ui.setNotice(err.message, 'error'); }
    };
  }

  async function settings() {
    const ctx = await gate('settings', `<section class="mpa-card"><h1>ตั้งค่าไรเดอร์</h1><p class="mpa-muted">การตั้งค่าหน้านี้มีผลเฉพาะบัญชีของคุณ กฎธุรกิจกลางอยู่ใน Admin Control Plane</p><button id="out" class="mpa-button mpa-button-secondary">ออกจากระบบ</button></section>`);
    if (ctx) $('#out').onclick = () => M.auth.signOut('login.html');
  }

  ({ login, dashboard, jobs, delivery, earnings, profile, settings }[page] || login)();
})();
