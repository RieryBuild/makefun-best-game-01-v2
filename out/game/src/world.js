// World: the whole game state and its update, DOM-free so headless tests can
// play it. Screens: title → play → win / over. The loop: place resonators and
// traps, call the wave, lure the Drowned to their deaths, keep the Heart-Bell
// alive through ten waves.
import { CFG } from './config.js';
import { createRandom } from './random.js';
import { waveComposition, waveTitle } from './waves.js';
import { makeResonator, ringResonator } from './resonators.js';
import { makeTrap, trapTick } from './traps.js';
import { makeEnemy, moveEnemy, enemyAtBell } from './enemies.js';

export function createWorld(seed = 1) {
  const rng = createRandom(seed);
  return {
    seed,
    rng,
    screen: 'title', // title | play | win | over
    time: 0,
    wave: 0,
    waveState: 'idle', // idle | spawning | fighting | cleared
    spawnQueue: [],
    spawnIn: 0,
    betweenIn: 0,
    salvage: CFG.startSalvage,
    bellHp: CFG.bell.hp,
    lives: CFG.bell.hp,
    kills: 0,
    score: 0,
    earned: 0,
    resonators: [],
    traps: [],
    enemies: [],
    rings: [], // expanding ring visuals: {x, y, r, max, color, t}
    floaters: [], // floating +salvage text: {x, y, text, t}
    selected: null, // build card key being placed
    ringCooldown: 0,
    ringPulse: null, // {x, y, radius, t}
    waveBanner: null, // {text, t}
    message: null, // {text, t}
    shake: 0,
    best: null, // {score, wave} from localStorage, set by main.js
    shells: 0,
    muted: false,
    paused: false,
    // per-frame events the audio layer consumes (main.js drains these).
    sfx: [],
  };
}

function addRing(w, x, y, max, color) {
  w.rings.push({ x, y, r: 8, max, color, t: 0 });
}
function addFloater(w, x, y, text) {
  w.floaters.push({ x, y, text, t: 1.2 });
}
function say(w, text) {
  w.message = { text, t: 2.2 };
}

export function startGame(w) {
  w.screen = 'play';
  w.wave = 0;
  w.waveState = 'idle';
  w.betweenIn = 2.0;
  w.salvage = CFG.startSalvage;
  w.bellHp = CFG.bell.hp;
  w.lives = CFG.bell.hp;
  w.kills = 0;
  w.score = 0;
  w.earned = 0;
  w.resonators = [];
  w.traps = [];
  w.enemies = [];
  w.rings = [];
  w.floaters = [];
  w.selected = null;
  w.ringCooldown = 0;
  w.ringPulse = null;
  w.shells = 0;
  w.sfx.push('wave');
}

export function callWave(w, manual = false) {
  if (w.screen !== 'play' || w.waveState !== 'idle' || w.wave >= CFG.totalWaves) return false;
  if (manual) {
    // Calling early pays: the Keeper does not wait for the tide.
    // The bonus scales with the wave being called: 8 + 3N.
    const bonus = CFG.earlyCallBase + CFG.earlyCallPerWave * (w.wave + 1);
    w.salvage += bonus;
    w.earned += bonus;
  }
  w.wave++;
  w.spawnQueue = waveComposition(w.wave);
  w.spawnIn = 0.4;
  w.waveState = 'spawning';
  w.waveBanner = { text: waveTitle(w.wave), t: 2.4 };
  w.sfx.push(w.wave === CFG.totalWaves ? 'boss' : 'wave');
  return true;
}

function spawnOne(w) {
  const kind = w.spawnQueue.shift();
  const y = w.rng.range(CFG.arena.y + 30, CFG.arena.y + CFG.arena.h - 30);
  const e = makeEnemy(kind, CFG.arena.x + CFG.arena.w - 10, y);
  w.enemies.push(e);
  if (w.spawnQueue.length === 0) w.waveState = 'fighting';
}

function killEnemy(w, e, idx) {
  w.enemies.splice(idx, 1);
  w.kills++;
  w.salvage += e.salvage;
  w.earned += e.salvage;
  w.score += e.salvage * 10;
  addFloater(w, e.x, e.y, `+${e.salvage}`);
  addRing(w, e.x, e.y, 40, '#b8ff9e');
  w.sfx.push('kill');
}

function endWave(w) {
  const bonus = CFG.waveBonus[w.wave] || 0;
  w.salvage += bonus;
  w.earned += bonus;
  w.score += bonus * 10;
  w.waveState = 'idle';
  w.betweenIn = 6;
  if (w.wave >= CFG.totalWaves) {
    winGame(w);
  } else {
    say(w, `Wave ${w.wave} clear  +${bonus} salvage`);
  }
}

function winGame(w) {
  w.screen = 'win';
  w.shells = w.lives >= CFG.shells.threeLives ? 3 : w.lives >= CFG.shells.twoLives ? 2 : 1;
  w.score += w.lives * 100;
  w.sfx.push('win');
}

function loseGame(w) {
  w.screen = 'over';
  w.sfx.push('lose');
}

// Placement: snap to grid, inside the arena, not on the bell, not on another
// building, and affordable. Returns the placed object or null.
export function tryPlace(w, kind, x, y) {
  const def = CFG.resonators[kind] || CFG.traps[kind];
  if (!def) return null;
  if (w.salvage < def.cost) { say(w, 'Not enough salvage'); w.sfx.push('deny'); return null; }
  const gx = Math.round((x - CFG.arena.x) / CFG.grid) * CFG.grid + CFG.arena.x;
  const gy = Math.round((y - CFG.arena.y) / CFG.grid) * CFG.grid + CFG.arena.y;
  if (gx < CFG.arena.x + 10 || gx > CFG.arena.x + CFG.arena.w - 10 ||
      gy < CFG.arena.y + 10 || gy > CFG.arena.y + CFG.arena.h - 10) {
    say(w, 'Outside the seabed'); return null;
  }
  if (Math.hypot(gx - CFG.bell.x, gy - CFG.bell.y) < 70) { say(w, 'Too close to the Heart-Bell'); return null; }
  for (const r of w.resonators) if (Math.hypot(gx - r.x, gy - r.y) < 40) { say(w, 'Occupied'); return null; }
  for (const t of w.traps) if (Math.hypot(gx - t.x, gy - t.y) < 40) { say(w, 'Occupied'); return null; }
  const obj = CFG.resonators[kind] ? makeResonator(kind, gx, gy) : makeTrap(kind, gx, gy);
  if (CFG.resonators[kind]) w.resonators.push(obj); else w.traps.push(obj);
  w.salvage -= def.cost;
  w.score += 5;
  addRing(w, gx, gy, 60, def.color);
  w.sfx.push('buy');
  return obj;
}

// The Keeper's Ring: a manual pulse that drags every enemy toward the
// nearest resonator for a few seconds. Limited by cooldown.
export function keeperRing(w) {
  if (w.screen !== 'play' || w.ringCooldown > 0 || w.resonators.length === 0) return false;
  // The pulse centres on the resonator nearest the middle of the swarm.
  let cx = 0, cy = 0;
  for (const e of w.enemies) { cx += e.x; cy += e.y; }
  if (w.enemies.length > 0) { cx /= w.enemies.length; cy /= w.enemies.length; }
  else { cx = CFG.bell.x + 300; cy = CFG.bell.y; }
  let best = w.resonators[0];
  let bestD = Infinity;
  for (const r of w.resonators) {
    const d = Math.hypot(r.x - cx, r.y - cy);
    if (d < bestD) { best = r; bestD = d; }
  }
  w.ringPulse = { x: best.x, y: best.y, radius: CFG.ring.pull, t: CFG.ring.duration };
  w.ringCooldown = CFG.ring.cooldown;
  addRing(w, best.x, best.y, CFG.ring.pull, '#ffffff');
  // The toll: every enemy caught in the pulse feels the bell.
  for (const e of w.enemies) {
    if (Math.hypot(e.x - best.x, e.y - best.y) < CFG.ring.pull) {
      e.hp -= CFG.ring.dmg;
      e.flash = 0.2;
    }
  }
  w.sfx.push('ring');
  return true;
}

export function updateWorld(w, dt) {
  w.time += dt;
  if (w.shake > 0) w.shake -= dt;
  for (const r of w.rings) { r.t += dt; r.r += (r.max - r.r) * dt * 3 + 30 * dt; }
  w.rings = w.rings.filter((r) => r.t < 1.2);
  for (const f of w.floaters) { f.t -= dt; f.y -= 24 * dt; }
  w.floaters = w.floaters.filter((f) => f.t > 0);
  if (w.message) { w.message.t -= dt; if (w.message.t <= 0) w.message = null; }
  if (w.waveBanner) { w.waveBanner.t -= dt; if (w.waveBanner.t <= 0) w.waveBanner = null; }
  if (w.ringCooldown > 0) w.ringCooldown -= dt;
  if (w.ringPulse) {
    w.ringPulse.t -= dt;
    if (w.ringPulse.t <= 0) w.ringPulse = null;
  }
  if (w.screen !== 'play') return;

  // Resonators ring on their timers.
  for (const r of w.resonators) {
    if (r.ringAnim > 0) r.ringAnim -= dt;
    r.ringIn -= dt;
    if (r.ringIn <= 0) {
      const hits = ringResonator(r, w.enemies, w.time);
      const def = CFG.resonators[r.kind];
      addRing(w, r.x, r.y, def.lure, def.color);
      w.sfx.push(r.kind === 'chime' ? 'chime' : r.kind === 'drum' ? 'drum' : 'siren');
      for (const h of hits) {
        h.enemy.hp -= h.dmg;
        h.enemy.flash = 0.15;
      }
    }
  }

  // Waves: idle counts down to auto-call; spawning drips enemies in.
  if (w.waveState === 'idle') {
    w.betweenIn -= dt;
    if (w.betweenIn <= 0 && w.wave < CFG.totalWaves) callWave(w);
  } else if (w.waveState === 'spawning') {
    w.spawnIn -= dt;
    if (w.spawnIn <= 0 && w.spawnQueue.length > 0) {
      spawnOne(w);
      w.spawnIn = CFG.spawnGap;
    }
  }

  // Traps grind anything standing on them.
  for (const t of w.traps) {
    const before = w.enemies.length;
    const kills = trapTick(t, w.enemies, dt);
    void kills;
    void before;
  }

  // Enemies move, bite the bell or a resonator, and die to damage.
  const bell = CFG.bell;
  for (let i = w.enemies.length - 1; i >= 0; i--) {
    const e = w.enemies[i];
    if (e.hp <= 0) { killEnemy(w, e, i); continue; }
    const bitten = moveEnemy(e, w.resonators, w.ringPulse, bell, dt, w.time);
    if (bitten) {
      e.biteIn -= dt;
      if (e.biteIn <= 0) {
        e.biteIn = CFG.bite.every;
        bitten.hp -= CFG.bite.dmg;
        addRing(w, bitten.x, bitten.y, 26, '#ff9d76');
        if (bitten.hp <= 0) {
          const idx = w.resonators.indexOf(bitten);
          if (idx >= 0) w.resonators.splice(idx, 1);
          addRing(w, bitten.x, bitten.y, 90, '#ff5d5d');
          addFloater(w, bitten.x, bitten.y, 'BELL LOST');
          say(w, 'A resonator was eaten!');
          w.sfx.push('hurt');
        }
      }
      continue;
    }
    if (enemyAtBell(e, bell)) {
      e.biteIn -= dt;
      if (e.biteIn <= 0) {
        e.biteIn = 1.0;
        w.bellHp -= 1;
        w.lives = w.bellHp;
        w.shake = 0.3;
        w.sfx.push('hurt');
        addRing(w, bell.x, bell.y, 70, '#ff5d5d');
        // The bell tolls back: the biter feels it too.
        e.hp -= CFG.bell.toll;
        e.flash = 0.2;
        if (w.bellHp <= 0) { loseGame(w); return; }
      }
    }
  }

  // A wave ends when the queue is empty and the field is clear.
  if ((w.waveState === 'spawning' || w.waveState === 'fighting') &&
      w.spawnQueue.length === 0 && w.enemies.length === 0) {
    endWave(w);
  }
}
