(() => {
  'use strict';

  const q = selector => document.querySelector(selector);
  const qa = selector => [...document.querySelectorAll(selector)];
  const style = document.createElement('style');
  style.id = 'adminMobileLayoutStyles';
  style.textContent = `
    .admin-mobile-empty-note{display:none}
    @media(max-width:720px){
      #view-admin.admin-page-open{padding-left:14px;padding-right:14px}
      #view-admin.admin-page-open .admin-section.active{min-height:calc(100dvh - 132px)}
      #view-admin .admin-page-back{position:sticky;top:7px;z-index:6;margin:0 0 12px;box-shadow:0 7px 18px rgba(15,76,67,.08)}
      #view-admin .admin-section.active>.panel,#view-admin .admin-section.active>.aiw-shell{min-width:0}
      #view-admin .table-wrap{overflow:visible;border:0;background:transparent}
      #view-admin .table-wrap table.admin-mobile-cards{display:block;min-width:0!important;width:100%;border:0;background:transparent}
      #view-admin .table-wrap table.admin-mobile-cards thead{display:none}
      #view-admin .table-wrap table.admin-mobile-cards tbody{display:grid;gap:10px}
      #view-admin .table-wrap table.admin-mobile-cards tr{display:grid;gap:0;overflow:hidden;border:1px solid #dbece8;border-radius:14px;background:#fff;box-shadow:0 4px 14px rgba(4,55,50,.05)}
      #view-admin .table-wrap table.admin-mobile-cards tr[hidden]{display:none!important}
      #view-admin .table-wrap table.admin-mobile-cards td{display:grid;grid-template-columns:minmax(100px,39%) minmax(0,1fr);gap:8px;align-items:start;min-width:0;padding:10px 11px!important;border:0!important;border-bottom:1px solid #edf3f1!important;overflow-wrap:anywhere;text-align:left!important;font-size:12px;line-height:1.45}
      #view-admin .table-wrap table.admin-mobile-cards td:last-child{border-bottom:0!important}
      #view-admin .table-wrap table.admin-mobile-cards td::before{content:attr(data-admin-label);color:#63817a;font-size:10px;font-weight:900;line-height:1.45}
      #view-admin .table-wrap table.admin-mobile-cards td[colspan]{display:block;text-align:center!important;color:var(--muted);padding:18px 12px!important}
      #view-admin .table-wrap table.admin-mobile-cards td[colspan]::before{display:none}
      #view-admin .table-wrap table.admin-mobile-cards td .btn{max-width:100%;min-height:36px;white-space:normal}
      #view-admin .table-wrap table.admin-mobile-cards td>div[style*="display:flex"]{display:grid!important;grid-template-columns:1fr 1fr;gap:7px!important}
      #view-admin .table-wrap table.admin-mobile-cards td>div[style*="display:flex"] .btn{width:100%}
      #view-admin .admin-mobile-empty-note{display:block;margin:0 0 11px;padding:11px 12px;border:1px dashed #bbdad2;border-radius:13px;background:#f6fcfa;color:#416d65;font-size:11px;line-height:1.55}
      #view-admin .admin-mobile-empty-note b{display:block;margin-bottom:2px;color:#176e60;font-size:12px}
      #view-admin .admin-workspace-tabs{position:sticky;top:64px;z-index:5;margin-top:0;box-shadow:0 6px 14px rgba(15,76,67,.06)}
      #view-admin .admin-workspace-tabs button{min-height:38px;font-size:10px;padding:7px 10px}
    }
  `;
  document.head.appendChild(style);

  function headerLabels(table) {
    return qa('thead th', table).map((cell, index) => String(cell.textContent || '').replace(/\s+/g, ' ').trim() || `ข้อมูล ${index + 1}`);
  }

  function decorateTable(table) {
    if (!table || table.dataset.adminMobileDecorated) return;
    const labels = headerLabels(table);
    if (!labels.length) return;
    table.classList.add('admin-mobile-cards');
    qa('tbody tr', table).forEach(row => {
      qa('td', row).forEach((cell, index) => {
        if (cell.hasAttribute('colspan')) return;
        cell.dataset.adminLabel = labels[index] || `ข้อมูล ${index + 1}`;
      });
    });
    table.dataset.adminMobileDecorated = 'true';
  }

  function refreshTable(table) {
    if (!table) return;
    delete table.dataset.adminMobileDecorated;
    decorateTable(table);
  }

  function ensureEmptyNote(section) {
    if (!section || section.dataset.adminEmptyNoteBound) return;
    section.dataset.adminEmptyNoteBound = 'true';
    const update = () => {
      const tables = qa('table', section).filter(table => table.querySelector('tbody'));
      const hasVisibleData = tables.some(table => qa('tbody tr', table).some(row => !row.hidden && !/ยังไม่มี|ไม่มีรายการในมุมมองนี้|กำลังโหลด/i.test(String(row.textContent || ''))));
      let note = section.querySelector('.admin-mobile-empty-note');
      if (!note && !hasVisibleData && tables.length) {
        note = document.createElement('div');
        note.className = 'admin-mobile-empty-note';
        note.innerHTML = '<b>ยังไม่มีรายการที่ต้องดำเนินการ</b>หากเป็นรายการเก่า ให้เลือกแท็บประวัติหรือทั้งหมดด้านบน ข้อมูลเดิมยังคงอยู่และไม่ได้ถูกลบ';
        const firstTable = tables[0];
        (firstTable.closest('.table-wrap') || firstTable).insertAdjacentElement('beforebegin', note);
      }
      if (note && hasVisibleData) note.remove();
    };
    const observer = new MutationObserver(() => {
      qa('table', section).forEach(refreshTable);
      update();
    });
    observer.observe(section, { childList: true, subtree: true });
    qa('table', section).forEach(refreshTable);
    update();
  }

  function scan() {
    qa('#view-admin .admin-section').forEach(section => {
      qa('table', section).forEach(refreshTable);
      ensureEmptyNote(section);
    });
  }

  document.addEventListener('click', event => {
    if (!event.target.closest('#adminTabs button[data-admin], .admin-page-back button, .admin-workspace-tabs button')) return;
    window.setTimeout(scan, 0);
  }, true);
  document.addEventListener('DOMContentLoaded', () => window.setTimeout(scan, 0), { once: true });
  if (document.readyState !== 'loading') window.setTimeout(scan, 0);
  window.AdminMobileLayout = { scan, decorateTable };
})();
