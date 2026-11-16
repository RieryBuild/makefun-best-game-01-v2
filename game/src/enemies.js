// Enemies: the Drowned. Blind, they walk toward the loudest sound they can
// hear; deaf ones (Wraith, Leviathan) walk straight at the Heart-Bell.
// An enemy that reaches the bell bites it, then keeps biting.
import { CFG } from './config.js';
import { loudestSound } from './resonators.js';

let nextId = 1;

export function makeEnemy(kind, x, y) {
  const def = CFG.enemies[kind];
  return {
    id: nextId++, kind, x, y,
    hp: def.hp, maxHp: def.hp,
    speed: def.speed,
    salvage: def.salvage,
    biteIn: 0,
    wobble: Math.random() * Math.PI * 2,
    flash: 0,
  };
}

export function moveEnemy(e, resonators, ringPulse, bell, dt, time) {
  const def = CFG.enemies[e.kind];
  const target = loudestSound(e, resonators, ringPulse) || { x: bell.x, y: bell.y };
  const dx = target.x - e.x;
  const dy = target.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  // Close enough to a resonator to bite it: stop and chew instead of walking.
  if (target.id !== undefined && d < def.radius + 22) return target;
  // A little wobble so the swarm never marches in a perfect line.
  const wob = Math.sin(time * 2 + e.wobble) * 6;
  const nx = dx / d;
  const ny = dy / d;
  const px = -ny * wob * 0.12;
  const py = nx * wob * 0.12;
  e.x += (nx * def.speed + px) * dt;
  e.y += (ny * def.speed + py) * dt;
  if (e.flash > 0) e.flash -= dt;
  return null;
}

export function enemyAtBell(e, bell) {
  return Math.hypot(e.x - bell.x, e.y - bell.y) < CFG.enemies[e.kind].radius + 26;
}
