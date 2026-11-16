// Main: the browser side of ECHOKEEP. Boots the canvas, wires mouse and keys,
// runs the loop, drains the world's sound-effect queue into the synth, and
// stages screenshot scenes from the URL (?shot=title|play|boss|win&seed=N).
import { CFG } from './config.js';
import { createRandom } from './random.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createWorld, startGame, tryPlace, callWave, updateWorld, keeperRing } from './world.js';
import { render, getBuildCards, LAYOUT } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput();
const audio = createAudio();
const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 1);
const world = createWorld(seed);
world.best = loadBest();

function loadBest() {
  try {
    const raw = localStorage.getItem('echokeep.best');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveBest() {
  try {
    const cur = loadBest();
    if (!cur || world.score > cur.score) {
      localStorage.setItem('echokeep.best', JSON.stringify({ score: world.score, wave: world.wave }));
      world.best = { score: world.score, wave: world.wave };
    }
  } catch {
    // Storage unavailable: the best run just is not kept.
  }
}

function drainSfx() {
  for (const s of world.sfx.splice(0)) {
    if (audio[s]) audio[s]();
  }
}

function canvasPos(ev) {
  const r = canvas.getBoundingClientRect();
  return { x: (ev.clientX - r.left) * (canvas.width / r.width), y: (ev.clientY - r.top) * (canvas.height / r.height) };
}

canvas.addEventListener('mousemove', (ev) => {
  const p = canvasPos(ev);
  input.move(p.x, p.y);
});
canvas.addEventListener('click', (ev) => {
  const p = canvasPos(ev);
  input.click(p.x, p.y);
  audio.unlock();
});
window.addEventListener('keydown', (ev) => {
  input.key(ev.key.toLowerCase());
  audio.unlock();
  if ([' ', 'arrowup', 'arrowdown'].includes(ev.key.toLowerCase())) ev.preventDefault();
});
window.addEventListener('keyup', (ev) => input.release(ev.key.toLowerCase()));

function inside(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function handleClicks() {
  const c = input.consumeClick();
  if (!c) return;
  if (world.screen === 'title' && inside(c.x, c.y, LAYOUT.startBtn)) {
    startGame(world);
    audio.startMusic();
    return;
  }
  if ((world.screen === 'win' || world.screen === 'over') && inside(c.x, c.y, LAYOUT.startBtn)) {
    const w2 = createWorld(seed + 1);
    Object.assign(world, w2);
    world.best = loadBest();
    startGame(world);
    return;
  }
  if (world.screen !== 'play') return;
  if (inside(c.x, c.y, LAYOUT.nextBtn)) {
    callWave(world, true);
    return;
  }
  for (const card of getBuildCards()) {
    if (inside(c.x, c.y, card)) {
      world.selected = world.selected === card.key ? null : card.key;
      return;
    }
  }
  if (world.selected) {
    const obj = tryPlace(world, world.selected, c.x, c.y);
    if (obj) world.selected = null;
  }
}

function handleKeys() {
  if (input.consumeKey(' ')) {
    if (world.screen === 'title') { startGame(world); audio.startMusic(); }
    else if (world.screen === 'play') callWave(world, true);
    else if (world.screen === 'win' || world.screen === 'over') {
      const w2 = createWorld(seed + 1);
      Object.assign(world, w2);
      world.best = loadBest();
      startGame(world);
    }
  }
  if (input.consumeKey('r') && world.screen === 'play') keeperRing(world);
  if (input.consumeKey('p')) world.paused = !world.paused;
  if (input.consumeKey('m')) {
    world.muted = !world.muted;
    audio.setMuted(world.muted);
  }
  for (const card of getBuildCards()) {
    if (input.consumeKey(card.key)) {
      world.selected = world.selected === card.key ? null : card.key;
    }
  }
  if (input.consumeKey('escape')) world.selected = null;
}

// Screenshot staging: ?shot=title|play|boss|win renders one staged frame.
const shot = params.get('shot');
if (shot) {
  stageShot(shot, world, {});
  render(ctx, world);
  drainSfx();
} else {
  let last = performance.now();
  let wasEnd = false;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    handleClicks();
    handleKeys();
    if (!world.paused) updateWorld(world, dt);
    if ((world.screen === 'win' || world.screen === 'over') && !wasEnd) {
      wasEnd = true;
      saveBest();
      audio.stopMusic();
    }
    if (world.screen === 'play') wasEnd = false;
    render(ctx, world);
    drainSfx();
    requestAnimationFrame(frame);
  }
  render(ctx, world);
  requestAnimationFrame(frame);
}
