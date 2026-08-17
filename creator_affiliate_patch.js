/* Creator Affiliate & Referral workspace. All customer-facing labels are Thai; database codes remain stable. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const esc = value => typeof window.escapeHtml === 'function' ? window.escapeHtml(value) : String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const money = value => `฿${Number(value || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatDate = value => value ? new Date(value).toLocaleString('th-TH') : '—';
  const statLabel = (value, dictionary) => dictionary[value] || value || '—';
  const creatorStatus = { pending: 'รอตรวจสอบ', active: 'เปิดใช้งาน', paused: 'พักใช้งาน', archived: 'เก็บข้อมูล' };
  const campaignStatus = { draft: 'ฉบับร่าง', active: 'กำลังใช้งาน', paused: 'พักแคมเปญ', ended: 'สิ้นสุดแล้ว' };
  const commissionStatus = { pending_qualification: 'รอออร์เดอร์สำเร็จ', qualified: 'รออนุมัติจ่าย', void: 'ไม่เข้าเกณฑ์', approved: 'อนุมัติให้จ่าย', paid: 'จ่ายแล้ว' };
  const consentStatus = { pending: 'รออนุมัติสิทธิ์', approved: 'อนุญาตใช้งาน', revoked: 'เพิกถอนสิทธิ์', expired: 'สิทธิ์หมดอายุ' };
  const platformName = { tiktok: 'TikTok', facebook: 'Facebook', instagram: 'Instagram', youtube: 'YouTube', other: 'อื่น ๆ' };

  const CreatorAffiliate = {
    loading: false,
    state: { creators: [], campaigns: [], commissions: [], rights: [], stores: [], sessions: [], attributions: [] },
    isAdmin() { try { return Boolean(window.Storage?.isAdmin?.()); } catch (_) { return false; } },
    session() { return window.SupabaseSync?.session?.() || null; },
    isAdminView() { return Boolean(document.querySelector('#view-admin.admin-page-open, #admin-creator-affiliates.active')); },
    async request(path, options) {
      if (!window.SupabaseSync?.request) throw new Error('ระบบกำลังเตรียมการเชื่อมต่อข้อมูล');
      return window.SupabaseSync.request(path, options);
    },
    toast(message, tone = 'warning') { window.UI?.toast?.(message, tone); },
    normalizeCode(value) { return String(value || '').toUpperCase().replace(/[^A-Z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 48); },
    generateCode() {
      const name = $('#creatorDisplayName')?.value || 'CREATOR';
      const source = this.normalizeCode(name.replace(/[ก-๙]/g, '') || 'CREATOR').replace(/-/g, '').slice(0, 10) || 'CREATOR';
      const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
      $('#creatorCampaignCode').value = `AP-${source}-${suffix}`;
    },
    async load({ quiet = false } = {}) {
      if (!this.isAdmin() || !this.isAdminView() || !this.session()?.access_token || this.loading) return;
      this.loading = true;
      try {
        const [creators, campaigns, commissions, rights, stores, sessions, attributions] = await Promise.all([
          this.request('creators?select=*&order=created_at.desc&limit=200'),
          this.request('creator_campaigns?select=*,creator_campaign_stores(store_id)&order=created_at.desc&limit=300'),
          this.request('creator_commissions?select=*&order=created_at.desc&limit=500'),
          this.request('creator_content_rights?select=*&order=created_at.desc&limit=300'),
          this.request('stores?select=id,name,active&order=name.asc&limit=500'),
          this.request('creator_referral_sessions?select=id,campaign_id,customer_id,converted_at&order=first_seen_at.desc&limit=1000'),
          this.request('creator_order_attributions?select=creator_id,order_id&order=created_at.desc&limit=1000')
        ]);
        this.state = { creators: Array.isArray(creators) ? creators : [], campaigns: Array.isArray(campaigns) ? campaigns : [], commissions: Array.isArray(commissions) ? commissions : [], rights: Array.isArray(rights) ? rights : [], stores: Array.isArray(stores) ? stores : [], sessions: Array.isArray(sessions) ? sessions : [], attributions: Array.isArray(attributions) ? attributions : [] };
        this.render();
        if (!quiet) this.toast('รีเฟรชข้อมูล Creator Affiliate แล้ว', 'success');
      } catch (error) {
        this.renderError(error);
        this.toast(`โหลดข้อมูล Creator Affiliate ไม่สำเร็จ: ${error.message || 'โปรดลองใหม่'}`, 'error');
      } finally { this.loading = false; }
    },
    ensureSection() {
      const tabs = $('#adminTabs');
      if (!tabs) return false;
      if (!tabs.querySelector('[data-admin="creator-affiliates"]')) {
        const button = document.createElement('button');
        button.type = 'button'; button.dataset.admin = 'creator-affiliates'; button.textContent = 'Creator Affiliate และ Referral';
        tabs.appendChild(button);
      }
      if ($('#admin-creator-affiliates')) return true;
      const content = tabs.parentElement?.querySelector(':scope > div');
      if (!content) return false;
      content.insertAdjacentHTML('beforeend', `
        <section class="admin-section" id="admin-creator-affiliates">
          <div class="panel creator-affiliate-shell">
            <div class="creator-affiliate-hero">
              <div><span class="creator-kicker">LOCAL CREATOR PARTNERS</span><h2>Creator Affiliate และ Referral</h2><p>ใช้รหัสและลิงก์แนะนำเพื่อวัดออร์เดอร์จริง สรุปค่าคอมมิชชัน และบันทึกสิทธิ์ใช้คอนเทนต์อย่างตรวจสอบได้</p></div>
              <button class="btn btn-plain btn-small" type="button" onclick="refreshCreatorAffiliate()">รีเฟรชข้อมูล</button>
            </div>
            <div class="creator-affiliate-note"><b>หลักการจ่ายเงิน:</b> ระบบจะสร้างรายการคอมมิชชันเมื่อออร์เดอร์ถูกผูกรหัสแนะนำ แต่จะไม่ถือว่าเป็นยอดจ่ายจนกว่าออร์เดอร์สำเร็จและแอดมินอนุมัติ</div>
            <div class="creator-kpis" id="creatorAffiliateKpis"></div>
            <div class="creator-grid">
              <form id="creatorProfileForm" class="creator-card" autocomplete="off">
                <div class="creator-card-head"><div><h3>เพิ่มหรือแก้ไข Creator</h3><p>เริ่มจาก Creator ท้องถิ่น แล้วเปิดใช้งานเมื่อข้อมูลพร้อม</p></div><button class="btn btn-plain btn-small" type="button" onclick="resetCreatorProfileForm()">ล้างฟอร์ม</button></div>
                <input id="creatorProfileId" type="hidden" />
                <div class="form-grid">
                  <div class="field"><label>ชื่อ Creator / ช่อง</label><input id="creatorDisplayName" required maxlength="140" placeholder="เช่น ศรีรัตนะรีวิว" /></div>
                  <div class="field"><label>ผู้ติดต่อ</label><input id="creatorContactName" maxlength="140" placeholder="ชื่อผู้ประสานงาน" /></div>
                  <div class="field"><label>เบอร์โทร</label><input id="creatorPhone" inputmode="tel" maxlength="40" placeholder="เช่น 08x-xxx-xxxx" /></div>
                  <div class="field"><label>อีเมล</label><input id="creatorEmail" type="email" maxlength="160" placeholder="creator@example.com" /></div>
                  <div class="field"><label>พื้นที่หลัก</label><input id="creatorArea" maxlength="120" placeholder="เช่น ศรีรัตนะ / พื้นที่ใกล้เคียง" /></div>
                  <div class="field"><label>แพลตฟอร์มหลัก</label><select id="creatorPlatform"><option value="tiktok">TikTok</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="youtube">YouTube</option><option value="other">อื่น ๆ</option></select></div>
                  <div class="field"><label>ลิงก์ช่อง</label><input id="creatorChannelUrl" type="url" maxlength="1000" placeholder="https://..." /></div>
                  <div class="field"><label>จำนวนผู้ติดตาม (ถ้าทราบ)</label><input id="creatorFollowers" type="number" min="0" step="1" value="0" /></div>
                  <div class="field"><label>สถานะบัญชี</label><select id="creatorStatus"><option value="pending">รอตรวจสอบ</option><option value="active">เปิดใช้งาน</option><option value="paused">พักใช้งาน</option><option value="archived">เก็บข้อมูล</option></select></div>
                  <div class="field"><label>ช่องทางรับเงิน</label><select id="creatorPayoutMethod"><option value="bank">บัญชีธนาคาร</option><option value="qr">QR รับเงิน</option><option value="cash">เงินสด</option><option value="other">อื่น ๆ</option></select></div>
                  <div class="field"><label>ธนาคาร / ผู้รับเงิน</label><input id="creatorPayoutName" maxlength="180" placeholder="เก็บเพื่อการจ่ายที่แอดมินอนุมัติ" /></div>
                  <div class="field"><label>เลขบัญชี / รายละเอียดรับเงิน</label><input id="creatorPayoutNumber" maxlength="120" placeholder="เก็บเฉพาะเมื่อมีสิทธิ์ดูแลการจ่าย" /></div>
                  <div class="field full"><label>หมายเหตุภายใน</label><textarea id="creatorNote" rows="2" maxlength="1200" placeholder="เช่น แนวคอนเทนต์ ร้านหรือพื้นที่ที่ถนัด และเงื่อนไขการร่วมงาน"></textarea></div>
                </div>
                <button class="btn btn-main" type="submit">บันทึกข้อมูล Creator</button>
              </form>
              <form id="creatorCampaignForm" class="creator-card" autocomplete="off">
                <div class="creator-card-head"><div><h3>สร้างรหัส Referral และแคมเปญ</h3><p>กำหนดเปอร์เซ็นต์ต่อแคมเปญ ไม่ใช้ค่าเริ่มต้นแทนข้อตกลง</p></div><button class="btn btn-plain btn-small" type="button" onclick="generateCreatorReferralCode()">สุ่มรหัส</button></div>
                <div class="form-grid">
                  <div class="field"><label>Creator</label><select id="creatorCampaignCreator" required></select></div>
                  <div class="field"><label>ชื่อแคมเปญ</label><input id="creatorCampaignTitle" required maxlength="160" placeholder="เช่น รีวิวร้านอาหารศรีรัตนะ" /></div>
                  <div class="field"><label>รหัส Referral</label><input id="creatorCampaignCode" required maxlength="48" placeholder="AP-CREATOR-01" /></div>
                  <div class="field"><label>ค่าคอมมิชชัน (%)</label><input id="creatorCampaignRate" required type="number" min="0" max="100" step="0.01" placeholder="ระบุตามข้อตกลง" /></div>
                  <div class="field"><label>ฐานคำนวณ</label><select id="creatorCampaignBasis"><option value="order_total_excluding_delivery">ยอดออร์เดอร์ ไม่รวมค่าจัดส่ง</option><option value="order_total">ยอดออร์เดอร์รวมค่าจัดส่ง</option></select></div>
                  <div class="field"><label>อายุ Attribution (วัน)</label><input id="creatorCampaignWindow" required type="number" min="1" max="90" value="30" /></div>
                  <div class="field"><label>สถานะแคมเปญ</label><select id="creatorCampaignStatus"><option value="draft">ฉบับร่าง</option><option value="active">กำลังใช้งาน</option><option value="paused">พักแคมเปญ</option></select></div>
                  <div class="field"><label>หน้า Landing</label><input id="creatorCampaignLanding" value="/" maxlength="240" placeholder="/stores หรือ /" /></div>
                  <div class="field full"><label>ร้านค้าที่เข้าร่วม (เลือกได้หลายร้าน)</label><select id="creatorCampaignStores" multiple size="4"></select></div>
                  <div class="field full"><label>รายละเอียดข้อตกลง</label><textarea id="creatorCampaignDescription" rows="2" maxlength="1200" placeholder="ระบุสินค้า/ร้านที่โปรโมต เงื่อนไข และช่วงเวลา"></textarea></div>
                </div>
                <button class="btn btn-main" type="submit">สร้างแคมเปญและรหัส Referral</button>
              </form>
            </div>
            <div class="creator-grid creator-lower-grid">
              <form id="creatorRightForm" class="creator-card" autocomplete="off">
                <div class="creator-card-head"><div><h3>สิทธิ์ใช้คลิปและคอนเทนต์</h3><p>บันทึกสิทธิ์ก่อนนำคลิป Creator ไปโพสต์หรือทำโฆษณาต่อ</p></div></div>
                <div class="form-grid">
                  <div class="field"><label>Creator เจ้าของคอนเทนต์</label><select id="creatorRightCreator" required></select></div>
                  <div class="field"><label>ชื่อคลิป/คอนเทนต์</label><input id="creatorRightTitle" required maxlength="180" placeholder="เช่น รีวิวร้าน A ตอนที่ 1" /></div>
                  <div class="field"><label>ลิงก์คอนเทนต์</label><input id="creatorRightUrl" required type="url" maxlength="1500" placeholder="https://..." /></div>
                  <div class="field"><label>สถานะแจ้งสิทธิ์</label><select id="creatorRightStatus"><option value="pending">รออนุมัติสิทธิ์</option><option value="approved">อนุญาตใช้งาน</option><option value="revoked">เพิกถอนสิทธิ์</option></select></div>
                  <div class="field"><label>ขอบเขตการใช้งาน</label><select id="creatorRightScope"><option value="organic_only">โพสต์ปกติของ AP Service เท่านั้น</option><option value="paid_ads_allowed">ใช้โฆษณาแบบชำระเงินได้</option><option value="all_platform_use">ใช้งานทุกช่องทางตามข้อตกลง</option></select></div>
                  <div class="field"><label>สิ้นสุดสิทธิ์ (ถ้ามี)</label><input id="creatorRightExpiry" type="datetime-local" /></div>
                  <div class="field full"><label>ช่องทางที่อนุญาต</label><input id="creatorRightChannels" maxlength="300" placeholder="เช่น Facebook Page, TikTok AP Service" /></div>
                  <div class="field full"><label>ลิงก์หลักฐานการยินยอม (ถ้ามี)</label><input id="creatorRightProof" type="url" maxlength="1500" placeholder="ลิงก์เอกสารหรือข้อความยืนยัน" /></div>
                </div>
                <button class="btn btn-main" type="submit">บันทึกสิทธิ์คอนเทนต์</button>
              </form>
              <div class="creator-card creator-howto"><h3>วิธีใช้กับ Creator ท้องถิ่น</h3><p>1. เพิ่ม Creator และบันทึกช่องทางติดต่อ</p><p>2. สร้างแคมเปญและกำหนดค่าคอมมิชชัน ระบบจะสร้างรหัสกับลิงก์ให้อัตโนมัติ</p><p>3. กด <b>คัดลอกลิงก์</b> หรือ <b>แชร์ให้ Creator</b> จากตารางด้านล่าง แล้วส่งลิงก์นั้นให้ Creator ไปใส่ใน Bio, โพสต์ หรือข้อความของคลิป</p><p>4. เมื่อลูกค้ากดลิงก์ ระบบจะจำรหัสไว้ และผูกกับออร์เดอร์เมื่อสั่งซื้อสำเร็จ</p><p class="creator-warning">Creator ไม่ต้องประกอบลิงก์เอง และไม่ต้องพิมพ์รหัสเอง ลูกค้าเพียงเปิดลิงก์แล้วสั่งซื้อได้ตามปกติ</p><p class="creator-warning">อย่านำคอนเทนต์ไปใช้โฆษณาต่อจนกว่าจะมีบันทึกสิทธิ์เป็น “อนุญาตใช้งาน”</p></div>
            </div>
            <div class="creator-card creator-table-card"><div class="creator-card-head"><div><h3>รายชื่อ Creator แคมเปญ และลิงก์พร้อมใช้</h3><p>ระบบสร้างลิงก์จากรหัสให้อัตโนมัติ กดคัดลอกหรือแชร์ให้ Creator ได้ทันที</p></div></div><div class="table-wrap"><table><thead><tr><th>Creator</th><th>สถานะ</th><th>แคมเปญ / รหัส</th><th>ผลลัพธ์</th><th>จัดการ</th></tr></thead><tbody id="creatorAffiliateRows"></tbody></table></div></div>
            <div class="creator-card creator-table-card"><div class="creator-card-head"><div><h3>คิวคอมมิชชัน</h3><p>คอมมิชชันจะผ่านเป็น “รออนุมัติจ่าย” เฉพาะออร์เดอร์ที่สำเร็จ</p></div></div><div class="table-wrap"><table><thead><tr><th>Creator / ออร์เดอร์</th><th>ฐานคำนวณ</th><th>คอมมิชชัน</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody id="creatorCommissionRows"></tbody></table></div></div>
            <div class="creator-card creator-table-card"><div class="creator-card-head"><div><h3>ทะเบียนสิทธิ์คอนเทนต์</h3><p>ตรวจสิทธิ์ก่อนนำคลิปหรือสื่อ Creator ไปใช้งานต่อ</p></div></div><div class="table-wrap"><table><thead><tr><th>Creator / คอนเทนต์</th><th>ขอบเขต</th><th>สิทธิ์</th><th>หมดอายุ</th><th>ลิงก์</th></tr></thead><tbody id="creatorRightsRows"></tbody></table></div></div>
          </div>
        </section>`);
      this.bindForms();
      return true;
    },
    renderError(error) {
      ['creatorAffiliateRows', 'creatorCommissionRows', 'creatorRightsRows'].forEach(id => { const node = $(`#${id}`); if (node) node.innerHTML = `<tr><td colspan="5">ยังโหลดข้อมูลไม่ได้: ${esc(error?.message || 'โปรดลองรีเฟรช')}</td></tr>`; });
    },
    render() {
      if (!this.ensureSection()) return;
      const { creators, campaigns, commissions, rights, stores, sessions, attributions } = this.state;
      const ready = commissions.filter(item => item.status === 'qualified' || item.status === 'approved');
      const payable = ready.reduce((total, item) => total + Number(item.commission_amount || 0), 0);
      $('#creatorAffiliateKpis').innerHTML = [
        ['Creator ทั้งหมด', creators.length, 'บัญชี Creator ที่บันทึกไว้'],
        ['รอตรวจ Creator', creators.filter(item => item.status === 'pending').length, 'ต้องตรวจข้อมูลก่อนเปิดใช้'],
        ['แคมเปญกำลังใช้งาน', campaigns.filter(item => item.status === 'active').length, 'รหัสที่ลูกค้าใช้ได้ตอนนี้'],
        ['คิวคอมมิชชัน', money(payable), `${ready.length.toLocaleString('th-TH')} รายการรออนุมัติ/จ่าย`]
      ].map(([label, value, note]) => `<div class="creator-kpi"><span>${esc(label)}</span><b>${esc(String(value))}</b><small>${esc(note)}</small></div>`).join('');
      const creatorOptions = `<option value="">เลือก Creator</option>${creators.map(item => `<option value="${esc(item.id)}">${esc(item.display_name)} · ${esc(statLabel(item.status, creatorStatus))}</option>`).join('')}`;
      ['creatorCampaignCreator', 'creatorRightCreator'].forEach(id => { const select = $(`#${id}`); if (select) select.innerHTML = creatorOptions; });
      const storeSelect = $('#creatorCampaignStores'); if (storeSelect) storeSelect.innerHTML = stores.filter(store => store.active !== false).map(store => `<option value="${esc(store.id)}">${esc(store.name)}</option>`).join('') || '<option disabled>ยังไม่มีร้านที่เปิดใช้งาน</option>';
      const campaignByCreator = new Map(); campaigns.forEach(campaign => { const rows = campaignByCreator.get(campaign.creator_id) || []; rows.push(campaign); campaignByCreator.set(campaign.creator_id, rows); });
      const commissionByCreator = new Map(); commissions.forEach(item => commissionByCreator.set(item.creator_id, (commissionByCreator.get(item.creator_id) || 0) + Number(item.commission_amount || 0)));
      const campaignCreator = new Map(campaigns.map(campaign => [campaign.id, campaign.creator_id]));
      const clicksByCreator = new Map(), customersByCreator = new Map(), ordersByCreator = new Map(), qualifiedByCreator = new Map(), cancelledByCreator = new Map(), netSalesByCreator = new Map();
      sessions.forEach(session => { const creatorId = campaignCreator.get(session.campaign_id); if (!creatorId) return; clicksByCreator.set(creatorId, (clicksByCreator.get(creatorId) || 0) + 1); if (session.customer_id) { const customers = customersByCreator.get(creatorId) || new Set(); customers.add(session.customer_id); customersByCreator.set(creatorId, customers); } });
      attributions.forEach(item => ordersByCreator.set(item.creator_id, (ordersByCreator.get(item.creator_id) || 0) + 1));
      commissions.forEach(item => { const creatorId = item.creator_id; if (item.status === 'qualified' || item.status === 'approved' || item.status === 'paid') qualifiedByCreator.set(creatorId, (qualifiedByCreator.get(creatorId) || 0) + 1); if (item.status === 'void') cancelledByCreator.set(creatorId, (cancelledByCreator.get(creatorId) || 0) + 1); if (item.status !== 'void') netSalesByCreator.set(creatorId, (netSalesByCreator.get(creatorId) || 0) + Number(item.commissionable_amount || 0)); });
      $('#creatorAffiliateRows').innerHTML = creators.length ? creators.map(creator => {
        const creatorCampaigns = campaignByCreator.get(creator.id) || [];
        const codeItems = creatorCampaigns.map(campaign => { const url = this.getReferralUrl(campaign.referral_code); return `<div class="creator-code"><b>${esc(campaign.referral_code)}</b><small>${esc(campaign.title)} · คอมมิชชัน ${Number(campaign.commission_rate || 0)}%</small><div class="creator-link-box"><input class="creator-link-input" readonly value="${esc(url)}" aria-label="ลิงก์ Referral ${esc(campaign.referral_code)}" /><div class="creator-inline-actions"><button class="btn btn-plain btn-small" type="button" onclick="copyCreatorReferralCode('${esc(campaign.referral_code)}')">คัดลอกรหัส</button><button class="btn btn-plain btn-small" type="button" onclick="copyCreatorReferralLink('${esc(campaign.referral_code)}')">คัดลอกลิงก์</button><button class="btn btn-main btn-small" type="button" onclick="shareCreatorReferralLink('${esc(campaign.referral_code)}')">แชร์ให้ Creator</button></div></div></div>`; }).join('') || '<small>ยังไม่มีแคมเปญและรหัส Referral</small>';
        const customerCount = customersByCreator.get(creator.id)?.size || 0;
        const performance = `<div class="creator-performance"><span>คลิก <b>${Number(clicksByCreator.get(creator.id) || 0).toLocaleString('th-TH')}</b></span><span>ลูกค้า <b>${Number(customerCount).toLocaleString('th-TH')}</b></span><span>ออร์เดอร์ <b>${Number(ordersByCreator.get(creator.id) || 0).toLocaleString('th-TH')}</b></span><span>สำเร็จ <b>${Number(qualifiedByCreator.get(creator.id) || 0).toLocaleString('th-TH')}</b></span><span>ยกเลิก <b>${Number(cancelledByCreator.get(creator.id) || 0).toLocaleString('th-TH')}</b></span><span>ยอดขายสุทธิ <b>${money(netSalesByCreator.get(creator.id) || 0)}</b></span></div>`;
        return `<tr><td><b>${esc(creator.display_name)}</b><br><small>${esc(platformName[creator.platform] || creator.platform)} · ${esc(creator.local_area || 'ไม่ระบุพื้นที่')}</small></td><td><span class="creator-status ${esc(creator.status)}">${esc(statLabel(creator.status, creatorStatus))}</span></td><td>${codeItems}</td><td><b>${money(commissionByCreator.get(creator.id) || 0)}</b><br><small>ยอดคอมมิชชันที่บันทึก</small>${performance}</td><td><div class="creator-inline-actions"><button class="btn btn-plain btn-small" type="button" onclick="editCreatorAffiliate('${esc(creator.id)}')">แก้ไข</button>${creator.status === 'pending' ? `<button class="btn btn-main btn-small" type="button" onclick="setCreatorAffiliateStatus('${esc(creator.id)}','active')">เปิดใช้</button>` : creator.status === 'active' ? `<button class="btn btn-plain btn-small" type="button" onclick="setCreatorAffiliateStatus('${esc(creator.id)}','paused')">พักใช้</button>` : `<button class="btn btn-main btn-small" type="button" onclick="setCreatorAffiliateStatus('${esc(creator.id)}','active')">เปิดกลับ</button>`}</div></td></tr>`;
      }).join('') : '<tr><td colspan="5">ยังไม่มี Creator เริ่มต้นด้วยการเพิ่ม Creator ท้องถิ่นรายแรก</td></tr>';
      $('#creatorCommissionRows').innerHTML = commissions.length ? commissions.map(item => { const creator = creators.find(row => row.id === item.creator_id); return `<tr><td><b>${esc(creator?.display_name || 'ไม่พบ Creator')}</b><br><small>ออร์เดอร์ ${esc(item.order_id)}</small></td><td>${money(item.commissionable_amount)}<br><small>${esc(item.commission_basis === 'order_total_excluding_delivery' ? 'ไม่รวมค่าจัดส่ง' : 'รวมค่าจัดส่ง')} · ${Number(item.commission_rate || 0)}%</small></td><td><b>${money(item.commission_amount)}</b></td><td><span class="creator-status ${esc(item.status)}">${esc(statLabel(item.status, commissionStatus))}</span><br><small>${item.payout_reference ? `อ้างอิง: ${esc(item.payout_reference)}` : ''}</small></td><td>${item.status === 'qualified' ? `<button class="btn btn-main btn-small" type="button" onclick="approveCreatorCommission('${esc(item.id)}')">อนุมัติจ่าย</button>` : item.status === 'approved' ? `<button class="btn btn-main btn-small" type="button" onclick="markCreatorCommissionPaid('${esc(item.id)}')">บันทึกว่าจ่ายแล้ว</button>` : '—'}</td></tr>`; }).join('') : '<tr><td colspan="5">ยังไม่มีออร์เดอร์ที่ผูกรหัส Creator</td></tr>';
      $('#creatorRightsRows').innerHTML = rights.length ? rights.map(item => { const creator = creators.find(row => row.id === item.creator_id); return `<tr><td><b>${esc(creator?.display_name || 'ไม่พบ Creator')}</b><br><small>${esc(item.title)}</small></td><td>${esc(item.usage_scope === 'organic_only' ? 'โพสต์ปกติเท่านั้น' : item.usage_scope === 'paid_ads_allowed' ? 'ใช้โฆษณาได้' : 'ทุกช่องทางตามข้อตกลง')}</td><td><span class="creator-status ${esc(item.consent_status)}">${esc(statLabel(item.consent_status, consentStatus))}</span></td><td>${formatDate(item.expires_at)}</td><td><a class="btn btn-plain btn-small" href="${esc(item.content_url)}" target="_blank" rel="noopener">เปิดคอนเทนต์</a></td></tr>`; }).join('') : '<tr><td colspan="5">ยังไม่มีทะเบียนสิทธิ์คอนเทนต์</td></tr>';
    },
    bindForms() {
      const profile = $('#creatorProfileForm'); if (profile && !profile.dataset.bound) { profile.dataset.bound = 'true'; profile.addEventListener('submit', event => this.saveCreator(event)); }
      const campaign = $('#creatorCampaignForm'); if (campaign && !campaign.dataset.bound) { campaign.dataset.bound = 'true'; campaign.addEventListener('submit', event => this.saveCampaign(event)); }
      const right = $('#creatorRightForm'); if (right && !right.dataset.bound) { right.dataset.bound = 'true'; right.addEventListener('submit', event => this.saveContentRight(event)); }
    },
    async saveCreator(event) {
      event.preventDefault(); if (!this.isAdmin()) return this.toast('เฉพาะแอดมินเท่านั้นที่บันทึก Creator ได้', 'error');
      const id = $('#creatorProfileId').value;
      const payload = { display_name: $('#creatorDisplayName').value.trim(), contact_name: $('#creatorContactName').value.trim(), contact_phone: $('#creatorPhone').value.trim(), contact_email: $('#creatorEmail').value.trim(), local_area: $('#creatorArea').value.trim(), platform: $('#creatorPlatform').value, channel_url: $('#creatorChannelUrl').value.trim(), follower_count: Math.max(0, Number($('#creatorFollowers').value || 0)), status: $('#creatorStatus').value, payout_method: $('#creatorPayoutMethod').value, payout_account_name: $('#creatorPayoutName').value.trim(), payout_account_number: $('#creatorPayoutNumber').value.trim(), note: $('#creatorNote').value.trim(), updated_at: new Date().toISOString() };
      if (!payload.display_name) return this.toast('กรุณาระบุชื่อ Creator หรือชื่อช่อง', 'warning');
      const button = event.submitter; button.disabled = true;
      try {
        const session = this.session(); if (!id && payload.status !== 'pending') { payload.reviewed_by = session?.user?.id || null; payload.reviewed_at = new Date().toISOString(); }
        if (id) await this.request(`creators?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(payload) });
        else await this.request('creators', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(payload) });
        this.toast(id ? 'บันทึกข้อมูล Creator แล้ว' : 'เพิ่ม Creator แล้ว สร้างรหัส Referral ต่อได้เลย', 'success'); this.resetCreatorForm(); await this.load({ quiet: true }); window.refreshAdminPendingBadges?.();
      } catch (error) { this.toast(`บันทึก Creator ไม่สำเร็จ: ${error.message || ''}`, 'error'); } finally { button.disabled = false; }
    },
    async saveCampaign(event) {
      event.preventDefault(); if (!this.isAdmin()) return this.toast('เฉพาะแอดมินเท่านั้นที่สร้างแคมเปญได้', 'error');
      const creatorId = $('#creatorCampaignCreator').value, code = this.normalizeCode($('#creatorCampaignCode').value), rate = Number($('#creatorCampaignRate').value);
      if (!creatorId || !code || !Number.isFinite(rate) || rate < 0 || rate > 100) return this.toast('กรุณาเลือก Creator ระบุรหัส และค่าคอมมิชชัน 0–100% ให้ถูกต้อง', 'warning');
      const form = event.currentTarget; const button = event.submitter; button.disabled = true;
      try {
        const session = this.session();
        const rows = await this.request('creator_campaigns', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ creator_id: creatorId, title: $('#creatorCampaignTitle').value.trim(), description: $('#creatorCampaignDescription').value.trim(), referral_code: code, landing_path: $('#creatorCampaignLanding').value.trim() || '/', commission_rate: rate, commission_basis: $('#creatorCampaignBasis').value, attribution_window_days: Number($('#creatorCampaignWindow').value || 30), status: $('#creatorCampaignStatus').value, created_by: session?.user?.id || null }) });
        const campaign = rows?.[0]; const storeIds = [...$('#creatorCampaignStores').selectedOptions].map(option => option.value);
        if (campaign && storeIds.length) await this.request('creator_campaign_stores', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(storeIds.map(store_id => ({ campaign_id: campaign.id, store_id }))) });
        this.toast(`สร้างแคมเปญ ${code} แล้ว`, 'success'); form?.reset(); $('#creatorCampaignWindow').value = '30'; await this.load({ quiet: true });
      } catch (error) { this.toast(`สร้างแคมเปญไม่สำเร็จ: ${error.message || 'ตรวจว่ารหัสซ้ำหรือไม่'}`, 'error'); } finally { button.disabled = false; }
    },
    async saveContentRight(event) {
      event.preventDefault(); if (!this.isAdmin()) return this.toast('เฉพาะแอดมินเท่านั้นที่บันทึกสิทธิ์คอนเทนต์ได้', 'error');
      const creatorId = $('#creatorRightCreator').value; if (!creatorId) return this.toast('กรุณาเลือก Creator เจ้าของคอนเทนต์', 'warning');
      const form = event.currentTarget; const button = event.submitter; button.disabled = true;
      try {
        const session = this.session(); const channels = $('#creatorRightChannels').value.split(',').map(value => value.trim()).filter(Boolean);
        await this.request('creator_content_rights', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ creator_id: creatorId, title: $('#creatorRightTitle').value.trim(), content_url: $('#creatorRightUrl').value.trim(), consent_status: $('#creatorRightStatus').value, usage_scope: $('#creatorRightScope').value, allowed_channels: channels, consent_proof_url: $('#creatorRightProof').value.trim() || null, expires_at: $('#creatorRightExpiry').value ? new Date($('#creatorRightExpiry').value).toISOString() : null, reviewed_by: $('#creatorRightStatus').value === 'approved' ? session?.user?.id || null : null, reviewed_at: $('#creatorRightStatus').value === 'approved' ? new Date().toISOString() : null }) });
        this.toast('บันทึกทะเบียนสิทธิ์คอนเทนต์แล้ว', 'success'); form?.reset(); await this.load({ quiet: true }); window.refreshAdminPendingBadges?.();
      } catch (error) { this.toast(`บันทึกสิทธิ์คอนเทนต์ไม่สำเร็จ: ${error.message || ''}`, 'error'); } finally { button.disabled = false; }
    },
    editCreator(id) {
      const item = this.state.creators.find(row => row.id === id); if (!item) return;
      $('#creatorProfileId').value = item.id; $('#creatorDisplayName').value = item.display_name || ''; $('#creatorContactName').value = item.contact_name || ''; $('#creatorPhone').value = item.contact_phone || ''; $('#creatorEmail').value = item.contact_email || ''; $('#creatorArea').value = item.local_area || ''; $('#creatorPlatform').value = item.platform || 'other'; $('#creatorChannelUrl').value = item.channel_url || ''; $('#creatorFollowers').value = Number(item.follower_count || 0); $('#creatorStatus').value = item.status || 'pending'; $('#creatorPayoutMethod').value = item.payout_method || 'bank'; $('#creatorPayoutName').value = item.payout_account_name || ''; $('#creatorPayoutNumber').value = item.payout_account_number || ''; $('#creatorNote').value = item.note || ''; $('#creatorProfileForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    resetCreatorForm() { $('#creatorProfileForm')?.reset(); $('#creatorProfileId').value = ''; $('#creatorFollowers').value = '0'; $('#creatorStatus').value = 'pending'; },
    async setCreatorStatus(id, status) {
      if (!this.isAdmin()) return; const label = statLabel(status, creatorStatus); if (!confirm(`ยืนยันเปลี่ยนสถานะ Creator เป็น “${label}” หรือไม่?`)) return;
      try { const session = this.session(); await this.request(`creators?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status, reviewed_by: session?.user?.id || null, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }) }); this.toast(`เปลี่ยนสถานะ Creator เป็น ${label} แล้ว`, 'success'); await this.load({ quiet: true }); window.refreshAdminPendingBadges?.(); } catch (error) { this.toast(`เปลี่ยนสถานะไม่สำเร็จ: ${error.message || ''}`, 'error'); }
    },
    async updateCommission(id, payload, success) {
      try { await this.request(`creator_commissions?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(payload) }); this.toast(success, 'success'); await this.load({ quiet: true }); window.refreshAdminPendingBadges?.(); } catch (error) { this.toast(`บันทึกคอมมิชชันไม่สำเร็จ: ${error.message || ''}`, 'error'); }
    },
    async approveCommission(id) { if (!confirm('ยืนยันอนุมัติคอมมิชชันนี้เข้าสู่คิวจ่ายเงินหรือไม่?')) return; const session = this.session(); return this.updateCommission(id, { status: 'approved', approved_by: session?.user?.id || null, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() }, 'อนุมัติคอมมิชชันเข้าสู่คิวจ่ายเงินแล้ว'); },
    async markCommissionPaid(id) { const reference = prompt('ระบุเลขอ้างอิงการโอนหรือหมายเหตุการจ่ายเงิน', '') ; if (reference === null) return; const session = this.session(); return this.updateCommission(id, { status: 'paid', payout_reference: reference.trim() || null, paid_by: session?.user?.id || null, paid_at: new Date().toISOString(), updated_at: new Date().toISOString() }, 'บันทึกว่าจ่ายคอมมิชชันแล้ว'); },
    getReferralUrl(code) { const base = new URL(location.href); base.search = ''; base.hash = ''; return `${base.origin}${base.pathname}?ref=${encodeURIComponent(code)}`; },
    async writeToClipboard(text) { try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; } const area = document.createElement('textarea'); area.value = text; area.style.position = 'fixed'; area.style.opacity = '0'; document.body.appendChild(area); area.select(); const copied = document.execCommand('copy'); area.remove(); return copied; } catch (_) { return false; } },
    async copyCode(code) { const ok = await this.writeToClipboard(code); this.toast(ok ? `คัดลอกรหัส ${code} แล้ว` : `คัดลอกรหัสไม่สำเร็จ: ${code}`, ok ? 'success' : 'warning'); },
    async copyLink(code) { const url = this.getReferralUrl(code); const ok = await this.writeToClipboard(url); this.toast(ok ? `คัดลอกลิงก์ ${code} แล้ว` : `คัดลอกลิงก์ไม่สำเร็จ โปรดลองกดค้างที่ช่องลิงก์`, ok ? 'success' : 'warning'); },
    async shareLink(code) { const url = this.getReferralUrl(code); if (navigator.share) { try { await navigator.share({ title: 'AP Service Referral', text: `ลิงก์สั่งซื้อผ่าน Creator ${code}`, url }); this.toast('เปิดเมนูแชร์ให้ Creator แล้ว', 'success'); return; } catch (error) { if (error?.name === 'AbortError') return; } } await this.copyLink(code); },
    activate() { if (this.isAdmin() && this.isAdminView() && this.session()?.access_token) this.load({ quiet: true }); },
    init() { this.ensureSection(); }
  };

  const CreatorReferral = {
    storageKey: 'ap_creator_referral_v1',
    get() { try { const value = JSON.parse(localStorage.getItem(this.storageKey) || 'null'); return value && value.expiresAt && new Date(value.expiresAt).getTime() > Date.now() ? value : null; } catch (_) { return null; } },
    set(value) { try { localStorage.setItem(this.storageKey, JSON.stringify(value)); } catch (_) {} },
    clear() { try { localStorage.removeItem(this.storageKey); } catch (_) {} },
    token() { const state = this.get(); return state?.token || crypto.randomUUID(); },
    async capture(code) {
      const normalized = CreatorAffiliate.normalizeCode(code); if (!normalized || !window.SupabaseSync?.request) return null;
      const token = this.token();
      try {
        const rows = await window.SupabaseSync.request('rpc/start_creator_referral', { method: 'POST', body: JSON.stringify({ p_code: normalized, p_anonymous_token: token, p_landing_path: location.pathname || '/', p_source_url: location.href }) });
        const row = Array.isArray(rows) ? rows[0] : null;
        if (!row) { this.clear(); return null; }
        const state = { code: row.referral_code, campaignId: row.campaign_id, creatorId: row.creator_id, sessionId: row.referral_session_id, token, expiresAt: row.expires_at };
        this.set(state); return state;
      } catch (error) { console.warn('ไม่สามารถบันทึกการเข้าจากลิงก์ Creator', error); return null; }
    },
    addCheckoutField() {
      const note = $('#checkoutRiderNote')?.closest('.field'); if (!note || $('#creatorReferralField')) return;
      note.insertAdjacentHTML('beforebegin', `<div class="field full" id="creatorReferralField"><label style="font-size:12px;font-weight:700;margin-bottom:4px;display:block">รหัสแนะนำ Creator (ถ้ามี)</label><div style="display:flex;gap:8px"><input id="creatorReferralCode" maxlength="48" placeholder="เช่น AP-SRI-01" style="flex:1;min-width:0;padding:8px 10px;border-radius:8px;border:1px solid var(--line);font-size:12px;text-transform:uppercase" /><button class="btn btn-plain btn-small" type="button" onclick="applyCreatorReferralCode()">ใช้รหัส</button></div><small id="creatorReferralHint" style="display:block;margin-top:5px;color:var(--muted)">รหัสนี้ใช้วัดผล Creator ที่แนะนำบริการ และไม่เปลี่ยนราคาคำสั่งซื้อของคุณ</small></div>`);
      const state = this.get(); if (state) { $('#creatorReferralCode').value = state.code; $('#creatorReferralHint').textContent = `ใช้รหัส ${state.code} แล้ว · ระบบจะผูกเมื่อส่งคำสั่งซื้อสำเร็จ`; }
    },
    async applyFromField() {
      const input = $('#creatorReferralCode'); const code = CreatorAffiliate.normalizeCode(input?.value); if (!code) { this.clear(); $('#creatorReferralHint').textContent = 'ยังไม่ได้ใช้รหัสแนะนำ'; return; }
      $('#creatorReferralHint').textContent = 'กำลังตรวจรหัส Creator…'; const state = await this.capture(code);
      if (!state) { $('#creatorReferralHint').textContent = 'ไม่พบรหัสนี้ หรือแคมเปญอาจหมดอายุแล้ว'; CreatorAffiliate.toast('รหัส Creator ใช้ไม่ได้หรือหมดอายุแล้ว', 'warning'); return; }
      input.value = state.code; $('#creatorReferralHint').textContent = `ใช้รหัส ${state.code} แล้ว · ระบบจะผูกเมื่อส่งคำสั่งซื้อสำเร็จ`; CreatorAffiliate.toast('ใช้รหัส Creator แล้ว', 'success');
    },
    decorateCheckout() {
      const base = window.renderCheckoutSummary; if (typeof base !== 'function' || base.__creatorReferralWrapped) return;
      const wrapped = () => { base(); this.addCheckoutField(); }; wrapped.__creatorReferralWrapped = true; window.renderCheckoutSummary = wrapped;
    },
    decorateOrderPush() {
      const cloud = window.SupabaseSync; if (!cloud?.pushOrder || cloud.__creatorReferralOrderWrapped) return;
      const base = cloud.pushOrder.bind(cloud); cloud.__creatorReferralOrderWrapped = true;
      cloud.pushOrder = async order => {
        const result = await base(order); const state = this.get();
        if (result && state?.code && order?.id) {
          try { await cloud.request('rpc/attribute_creator_order', { method: 'POST', body: JSON.stringify({ p_order_id: order.id, p_code: state.code, p_anonymous_token: state.token || null }) }); }
          catch (error) { console.warn('สร้างข้อมูลคอมมิชชัน Creator ไม่สำเร็จ', error); CreatorAffiliate.toast('บันทึกออร์เดอร์แล้ว แต่ยังผูกรหัส Creator ไม่สำเร็จ แอดมินตรวจสอบได้ภายหลัง', 'warning'); }
        }
        return result;
      };
    },
    init() {
      const code = new URLSearchParams(location.search).get('ref'); if (code) this.capture(code).then(state => { if (state) { const url = new URL(location.href); url.searchParams.delete('ref'); history.replaceState({}, '', url.pathname + url.search + url.hash); CreatorAffiliate.toast(`บันทึกรหัสแนะนำ ${state.code} แล้ว`, 'success'); } });
      this.decorateCheckout(); this.decorateOrderPush();
    }
  };

  window.CreatorAffiliate = CreatorAffiliate;
  window.refreshCreatorAffiliate = () => CreatorAffiliate.load();
  window.editCreatorAffiliate = id => CreatorAffiliate.editCreator(id);
  window.resetCreatorProfileForm = () => CreatorAffiliate.resetCreatorForm();
  window.setCreatorAffiliateStatus = (id, status) => CreatorAffiliate.setCreatorStatus(id, status);
  window.generateCreatorReferralCode = () => CreatorAffiliate.generateCode();
  window.copyCreatorReferralCode = code => CreatorAffiliate.copyCode(code);
  window.copyCreatorReferralLink = code => CreatorAffiliate.copyLink(code);
  window.shareCreatorReferralLink = code => CreatorAffiliate.shareLink(code);
  window.approveCreatorCommission = id => CreatorAffiliate.approveCommission(id);
  window.markCreatorCommissionPaid = id => CreatorAffiliate.markCommissionPaid(id);
  window.applyCreatorReferralCode = () => CreatorReferral.applyFromField();

  const style = document.createElement('style');
  style.textContent = `
    .creator-affiliate-shell{display:grid;gap:14px}.creator-affiliate-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:18px;border-radius:16px;background:linear-gradient(135deg,#073d36,#0d806f);color:#fff}.creator-affiliate-hero h2{margin:4px 0 5px;font-size:21px}.creator-affiliate-hero p{margin:0;max-width:680px;color:rgba(255,255,255,.83);font-size:12px;line-height:1.55}.creator-affiliate-hero .btn{background:#fff;color:#075c52;border-color:#fff}.creator-kicker{font-size:9px;letter-spacing:.12em;font-weight:950;color:#a9f3e5}.creator-affiliate-note{padding:11px 12px;border-radius:12px;background:#fff8e6;color:#7c5a06;font-size:11px;line-height:1.55}.creator-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.creator-kpi{padding:12px;border:1px solid #d7ebe6;border-radius:13px;background:#fbfefd}.creator-kpi span,.creator-kpi small{display:block;color:var(--muted);font-size:10px}.creator-kpi b{display:block;margin:6px 0 3px;color:#075c52;font-size:19px}.creator-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.creator-lower-grid{align-items:start}.creator-card{padding:15px;border:1px solid #dcece8;border-radius:15px;background:#fff;min-width:0}.creator-card-head{display:flex;justify-content:space-between;gap:9px;align-items:flex-start;margin-bottom:12px}.creator-card h3{margin:0;font-size:15px}.creator-card p{margin:4px 0 0;color:var(--muted);font-size:10.5px;line-height:1.45}.creator-card .form-grid{margin-bottom:12px}.creator-howto{background:#f7fcfa}.creator-warning{padding:9px;border-radius:9px;background:#fff4df;color:#8b5a03}.creator-table-card{display:grid;gap:10px}.creator-inline-actions,.creator-code{display:flex;gap:5px;align-items:flex-start;flex-wrap:wrap}.creator-code+.creator-code{margin-top:7px}.creator-code small{display:block;flex-basis:100%;font-size:10px;color:var(--muted)}.creator-link-box{display:grid;gap:6px;width:100%;margin-top:5px}.creator-link-input{width:100%;min-width:0;box-sizing:border-box;padding:7px 8px;border:1px solid #cfe1dc;border-radius:8px;background:#f7fbfa;color:#40625b;font-size:10px}.creator-performance{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px;margin-top:7px}.creator-performance span{padding:3px 5px;border-radius:6px;background:#f3f8f6;color:#60746e;font-size:9px}.creator-performance span b{color:#155e52;font-size:9px}.creator-status{display:inline-flex;padding:5px 7px;border-radius:999px;background:#f0f4f3;color:#41605a;font-size:10px;font-weight:900;white-space:nowrap}.creator-status.pending,.creator-status.pending_qualification{background:#fff4df;color:#90620a}.creator-status.active,.creator-status.qualified,.creator-status.approved{background:#e7f8f2;color:#127158}.creator-status.paused,.creator-status.void,.creator-status.revoked{background:#fdecef;color:#ac3d49}.creator-status.paid{background:#e7f1ff;color:#2c6599}@media(max-width:760px){.creator-affiliate-hero{flex-direction:column}.creator-affiliate-hero .btn{width:100%}.creator-kpis,.creator-grid{grid-template-columns:1fr 1fr}.creator-card{padding:13px}.creator-card-head{flex-direction:column}.creator-card-head .btn{width:100%}}@media(max-width:470px){.creator-kpis,.creator-grid{grid-template-columns:1fr}.creator-affiliate-hero h2{font-size:18px}}
  `;
  document.head.appendChild(style);
  CreatorAffiliate.init(); CreatorReferral.init();
})();
