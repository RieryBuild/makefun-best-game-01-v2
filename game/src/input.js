// Input: mouse position + clicks and keys, kept DOM-free so the world can be
// driven headlessly. The browser side (main.js) feeds real events in; the
// headless tests feed synthetic ones.
export function createInput() {
  return {
    mx: 0, my: 0, clicked: false, clickX: 0, clickY: 0,
    keys: new Set(),
    click(x, y) { this.mx = x; this.my = y; this.clicked = true; this.clickX = x; this.clickY = y; },
    move(x, y) { this.mx = x; this.my = y; },
    key(k) { this.keys.add(k); },
    release(k) { this.keys.delete(k); },
    consumeClick() {
      if (!this.clicked) return null;
      this.clicked = false;
      return { x: this.clickX, y: this.clickY };
    },
    consumeKey(k) {
      if (!this.keys.has(k)) return false;
      this.keys.delete(k);
      return true;
    },
  };
}
