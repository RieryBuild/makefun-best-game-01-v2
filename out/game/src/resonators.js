// Resonators: the bells that lure the Drowned. A resonator rings on its own
// timer; its sound pulls every enemy inside its lure radius toward it, and
// the drum and siren hurt what stands close when they ring.
import { CFG } from './config.js';

let nextId = 1;

export function makeResonator(kind, x, y) {
  const def = CFG.resonators[kind];
  return {
    id: nextId++, kind, x, y,
    hp: def.hp, maxHp: def.hp,
    ringIn: def.ringEvery * 0.5,
    ringAnim: 0,
  };
}

// Ringing: returns the list of (enemy, damage) hits for this ring, and the
// lure point enemies should steer toward.
export function ringResonator(r, enemies, time) {
  const def = CFG.resonators[r.kind];
  r.ringIn = def.ringEvery;
  r.ringAnim = 0.6;
  const hits = [];
  if (def.dmg > 0) {
    for (const e of enemies) {
      const d = Math.hypot(e.x - r.x, e.y - r.y);
      if (d < def.lure * 0.45) hits.push({ enemy: e, dmg: def.dmg });
    }
  }
  return hits;
}

// The loudest sound an enemy can hear: the nearest in-range resonator itself
// (so the caller knows what the enemy is biting), or the Keeper's Ring pulse
// point. Frequency sensitivity: some enemies hear only certain bells — a
// Wraith hears drums alone, so only a drum can pull it off the Heart-Bell.
// Deaf enemies (no lureKinds and lureSense 0) walk straight at the bell.
export function loudestSound(enemy, resonators, ringPulse) {
  const sense = CFG.enemies[enemy.kind].lureSense;
  const kinds = CFG.enemies[enemy.kind].lureKinds;
  if (sense <= 0 && !kinds) return null;
  let best = null;
  let bestD = Infinity;
  for (const r of resonators) {
    if (kinds && !kinds.includes(r.kind)) continue;
    const def = CFG.resonators[r.kind];
    const d = Math.hypot(enemy.x - r.x, enemy.y - r.y);
    // Frequency sensitivity: a Wraith hears drums alone, and only nearby
    // ones (55% of the drum's lure) — a drum must sit on its path to pull
    // it off the Heart-Bell.
    const reach = kinds ? def.lure * 0.55 : def.lure * sense;
    if (d < reach && d < bestD) { best = r; bestD = d; }
  }
  if (ringPulse && ringPulse.t > 0) {
    const d = Math.hypot(enemy.x - ringPulse.x, enemy.y - ringPulse.y);
    if (d < ringPulse.radius && d < bestD) return { x: ringPulse.x, y: ringPulse.y, pulse: true };
  }
  return best;
}
