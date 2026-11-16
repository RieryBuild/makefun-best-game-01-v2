// Shots: staged states for the screenshots, and the autopilot the headless
// tests drive. Every scene is a real world state — title, a mid-wave fight,
// the Leviathan, and the win screen — so the screenshots show the game itself.
import { CFG } from './config.js';
import { createWorld, startGame, tryPlace, callWave, updateWorld, keeperRing } from './world.js';
import { makeEnemy } from './enemies.js';

function place(w, kind, gx, gy) {
  const x = CFG.arena.x + gx * CFG.grid;
  const y = CFG.arena.y + gy * CFG.grid;
  return tryPlace(w, kind, x, y);
}

function runFor(w, seconds) {
  const dt = 1 / 60;
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) updateWorld(w, dt);
  return w;
}

// A mid-game fight: wave 4, a real build on the field, enemies mid-swarm.
function stagePlay(w) {
  startGame(w);
  w.salvage = 9999; // staging budget: placements must all land.
  place(w, 'drum', 12, 6);
  place(w, 'chime', 16, 3);
  place(w, 'chime', 16, 9);
  place(w, 'siren', 20, 6);
  place(w, 'reef', 14, 6);
  place(w, 'whirl', 18, 4);
  place(w, 'whirl', 18, 8);
  w.salvage = 260;
  w.wave = 3;
  w.waveState = 'idle';
  w.betweenIn = 6;
  callWave(w); // now wave 4: 15 drifters, 9 skitters, 3 brutes, 3 wraiths
  runFor(w, 16);
  return w;
}

function stageBoss(w) {
  startGame(w);
  w.salvage = 9999; // staging budget: placements must all land.
  place(w, 'siren', 10, 4);
  place(w, 'siren', 10, 8);
  place(w, 'drum', 14, 6);
  place(w, 'drum', 18, 3);
  place(w, 'drum', 18, 9);
  place(w, 'whirl', 16, 6);
  place(w, 'reef', 12, 6);
  place(w, 'reef', 20, 6);
  w.salvage = 420;
  w.wave = 9;
  w.waveState = 'idle';
  w.betweenIn = 6;
  callWave(w); // wave 10: the Leviathan + escort
  // Long enough for the whole queue to spawn (0.55s gap) and kills to show.
  runFor(w, 30);
  // The Leviathan spawns last in the queue — bring it on-stage for the shot.
  if (!w.enemies.some((e) => e.kind === 'leviathan')) {
    w.enemies.push(makeEnemy('leviathan', 880, 360));
  }
  return w;
}

function stageWin(w) {
  startGame(w);
  w.salvage = 9999; // staging budget: placements must all land.
  place(w, 'siren', 12, 6);
  place(w, 'drum', 16, 6);
  w.salvage = 640;
  w.kills = 187;
  w.earned = 940;
  w.wave = 10;
  w.screen = 'win';
  w.shells = 3;
  w.score = 9840;
  w.lives = 9;
  w.bellHp = 9;
  return w;
}

export function stageShot(scene, world, opts = {}) {
  const w = world;
  if (scene === 'title') {
    w.screen = 'title';
    return { screen: 'title' };
  }
  if (scene === 'play') return { screen: stagePlay(w).screen, clearName: 'wave 4' };
  if (scene === 'boss') return { screen: stageBoss(w).screen, clearName: 'wave 10' };
  if (scene === 'win') return { screen: stageWin(w).screen, clearName: 'win' };
  return { screen: w.screen };
}

// Autopilot: a scripted build order played from wave 1. The headless test
// runs it to the end and reports whether the game is winnable — and at what
// cost in bell HP. It buys, rings, and calls waves early like a decent player.
// onWaveEnd(wave, world) is called whenever a wave clears, for diagnostics.
export function autopilot(w, onWaveEnd = null) {
  const buildOrder = [
    [0, 'drum', 12, 6],
    [0, 'chime', 16, 3],
    [0, 'reef', 14, 6],
    [1, 'drum', 18, 6],
    [1, 'whirl', 20, 5],
    [2, 'siren', 16, 6],
    [2, 'reef', 12, 3],
    [3, 'drum', 22, 6],
    [3, 'whirl', 18, 9],
    [4, 'siren', 12, 9],
    [4, 'reef', 20, 8],
    [5, 'drum', 24, 4],
    [5, 'siren', 20, 3],
    [6, 'whirl', 22, 8],
    [6, 'reef', 16, 9],
    [7, 'siren', 24, 7],
    [7, 'drum', 10, 6],
    [8, 'whirl', 12, 4],
    [8, 'siren', 22, 5],
    [9, 'siren', 6, 6],
    [9, 'drum', 8, 3],
  ];
  const dt = 1 / 60;
  let t = 0;
  let bought = 0;
  const log = [];
  let lastWave = 0;
  startGame(w);
  const maxT = 60 * 30; // 30 minutes of game time, cap.
  while (t < maxT && w.screen === 'play') {
    if (w.wave > lastWave && w.waveState === 'idle') {
      if (onWaveEnd) onWaveEnd(lastWave, w);
      lastWave = w.wave;
    }
    // Walk the order in sequence, buying each piece when its wave is on and
    // the salvage is there; skip a piece whose spot is taken or invalid.
    const next = buildOrder[bought];
    if (next) {
      const [wave, kind, gx, gy] = next;
      if (wave <= w.wave) {
        const before = w.salvage;
        const obj = place(w, kind, gx, gy);
        if (obj) {
          bought++;
          log.push(`bought ${kind} @${gx},${gy} wave ${w.wave} salvage ${before}->${w.salvage}`);
        } else if (w.salvage >= (CFG.resonators[kind] || CFG.traps[kind]).cost) {
          bought++; // spot taken or invalid: skip it.
        }
      }
    }
    // Ring whenever it is ready and enemies are on the field.
    if (w.enemies.length > 0 && w.ringCooldown <= 0) keeperRing(w);
    // Call the next wave as soon as the field is clear.
    if (w.waveState === 'idle' && w.wave < CFG.totalWaves) callWave(w);
    updateWorld(w, dt);
    t += dt;
  }
  return { screen: w.screen, time: t, log, waves: w.wave, kills: w.kills, lives: w.lives, score: w.score };
}

export { createWorld };
