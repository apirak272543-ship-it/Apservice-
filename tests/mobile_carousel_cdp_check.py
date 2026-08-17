import json
import time
import urllib.parse
import urllib.request

import websocket

BASE_URL = "http://127.0.0.1:4173/index.html?carousel-test=mobile-cdp"
DEBUG_URL = "http://127.0.0.1:9223/json"


def send(ws, message_id, method, params=None):
    ws.send(json.dumps({"id": message_id, "method": method, "params": params or {}}))
    while True:
        payload = json.loads(ws.recv())
        if payload.get("id") == message_id:
            return payload


def evaluate(ws, message_id, expression, await_promise=False):
    response = send(ws, message_id, "Runtime.evaluate", {
        "expression": expression,
        "returnByValue": True,
        "awaitPromise": await_promise,
    })
    result = response.get("result", {}).get("result", {})
    if "exceptionDetails" in response.get("result", {}):
        raise RuntimeError(response["result"]["exceptionDetails"])
    return result.get("value")


def main():
    tabs = json.loads(urllib.request.urlopen(DEBUG_URL, timeout=5).read())
    tab = next(item for item in tabs if item.get("type") == "page")
    ws = websocket.create_connection(tab["webSocketDebuggerUrl"], timeout=10, origin="http://127.0.0.1:9223")
    send(ws, 1, "Page.enable")
    send(ws, 2, "Runtime.enable")
    send(ws, 3, "Emulation.setDeviceMetricsOverride", {
        "width": 375,
        "height": 812,
        "deviceScaleFactor": 1,
        "mobile": True,
    })
    send(ws, 4, "Page.navigate", {"url": BASE_URL})
    time.sleep(1.2)
    evaluate(ws, 5, "document.querySelector('#homeStores')?.scrollIntoView({block:'center'})")
    time.sleep(0.8)
    result = evaluate(ws, 6, """(async () => {
      const rail = document.querySelector('#homeStores');
      const cards = [...document.querySelectorAll('#homeStores .ap-store-card')];
      const before = { scrollLeft: rail?.scrollLeft ?? null, clientWidth: rail?.clientWidth ?? null, scrollWidth: rail?.scrollWidth ?? null };
      await new Promise(resolve => setTimeout(resolve, 2200));
      const after = { scrollLeft: rail?.scrollLeft ?? null };
      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        rail: before,
        after,
        moved: after.scrollLeft !== before.scrollLeft,
        cards: cards.map(card => ({ ready: card.dataset.mediaReady || 'false', hasSrc: Boolean(card.querySelector('.store-icon-image')?.getAttribute('src')) }))
      };
    })()""", await_promise=True)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    ws.close()


if __name__ == "__main__":
    main()
