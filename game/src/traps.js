// Traps: what kills the Drowned once the bells have lured them in.
// Spike Reef cuts anything standing on it; a Whirlpool drags prey to its
// centre and grinds it down. Traps never run out — they are the long game.
import { CFG } from './config.js';

let nextId = 1;

export function makeTrap(kind, x, y) {
  const def = CFG.traps[kind];
  return { id: nextId++, kind, x, y, spin: 0 };
}

// Damage-over-time + pull for one tick. Returns kills credited this tick.
export function trapTick(trap, enemies, dt) {
  const def = CFG.traps[trap.kind];
  trap.spin += dt;
  let kills = 0;
  for (const e of enemies) {
    // The Leviathan is too vast for reefs and whirlpools to hold — traps
    // grind it at a quarter strength, so only bells can truly hurt it.
    const dmgScale = e.kind === 'leviathan' ? 0.25 : 1;
    const d = Math.hypot(e.x - trap.x, e.y - trap.y);
    if (d > def.radius) continue;
    if (trap.kind === 'whirl' && d > 10) {
      const pull = def.pull * dt * dmgScale;
      e.x += ((trap.x - e.x) / d) * pull;
      e.y += ((trap.y - e.y) / d) * pull;
    }
    e.hp -= def.dps * dt * dmgScale;
    if (e.hp <= 0) kills++;
  }
  return kills;
}
