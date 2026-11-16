// Seeded random: every run of the game can be replayed from one number,
// which keeps the headless play-tests deterministic.
export function createRandom(seed) {
  let s = (seed >>> 0) || 1;
  return {
    next() {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    },
    range(a, b) {
      return a + this.next() * (b - a);
    },
    pick(arr) {
      return arr[Math.floor(this.next() * arr.length)];
    },
  };
}
