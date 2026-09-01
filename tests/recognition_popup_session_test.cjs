const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

function runNotificationScenario(sourcePath, exportName) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const storage = new Map();
  const calls = [];
  const modals = [];
  const controls = () => ({ onclick: null, focus() {} });
  const document = {
    getElementById: () => null,
    head: { insertAdjacentHTML() {} },
    body: { append: node => modals.push(node) },
    createElement: () => ({
      className: '',
      innerHTML: '',
      setAttribute() {},
      querySelector: () => controls(),
      addEventListener() {},
      remove() {},
    }),
    addEventListener() {},
    removeEventListener() {},
  };
  const event = {
    id: 'event-once',
    title: 'ได้ Tier ใหม่',
    message: 'ผลการประเมินผ่านเกณฑ์',
    payload: { tier: 2, completed_orders: 4, average_rating: 4.8 },
  };
  const M = {
    ui: { escapeHtml: value => String(value), baht: value => `฿${value}` },
    request: async path => {
      calls.push(path);
      if (path.startsWith('recognition_events?')) return [event];
      if (path === 'rpc/recognition_mark_event_seen') return [];
      throw new Error(`unexpected request: ${path}`);
    },
  };
  const context = {
    Array, Boolean, Date, Error, Intl, JSON, Map, Math, Number, Object, Promise, Set, String,
    console: { warn() {} }, document, encodeURIComponent, window: { APServiceMPA: M },
    sessionStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
  };
  vm.runInNewContext(source, context, { filename: sourcePath });
  return context.window[exportName].notify({ user: { id: 'owner-1' } }).then(async () => {
    await context.window[exportName].notify({ user: { id: 'owner-1' } });
    const eventReads = calls.filter(path => path.startsWith('recognition_events?'));
    const acknowledgements = calls.filter(path => path === 'rpc/recognition_mark_event_seen');
    assert.strictEqual(eventReads.length, 1, `${exportName} ต้องอ่านเหตุการณ์ใหม่เพียงครั้งเดียวต่อ session`);
    assert.strictEqual(acknowledgements.length, 1, `${exportName} ต้องทำเครื่องหมายเห็นเหตุการณ์หนึ่งครั้ง`);
    assert.strictEqual(modals.length, 1, `${exportName} ต้องเปิด popup สำเร็จใหม่หนึ่งครั้งต่อ session`);
  });
}

Promise.resolve()
  .then(() => runNotificationScenario('../ap-store-mobile/merchant/merchant-recognition.js', 'APServiceMerchantRecognition'))
  .then(() => runNotificationScenario('../apservice-rider-app/rider/rider-recognition.js', 'APServiceRiderRecognition'))
  .then(() => console.log('recognition popup session: PASS'))
  .catch(error => { console.error(error); process.exitCode = 1; });
