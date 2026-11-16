// Waves: what each wave sends, and when. Wave 10 adds the Leviathan.
// The spawn list is built once per wave so the headless tests can count it.
import { CFG } from './config.js';

export function waveComposition(n) {
  const c = CFG.waves[n] || [0, 0, 0, 0];
  const list = [];
  for (let i = 0; i < c[0]; i++) list.push('drifter');
  for (let i = 0; i < c[1]; i++) list.push('skitter');
  for (let i = 0; i < c[2]; i++) list.push('brute');
  for (let i = 0; i < c[3]; i++) list.push('wraith');
  if (n === CFG.totalWaves) list.push('leviathan');
  return list;
}

export function waveTitle(n) {
  if (n === CFG.totalWaves) return 'WAVE 10 — THE LEVIATHAN';
  const names = {
    1: 'WAVE 1 — THE FIRST DRIFT',
    2: 'WAVE 2 — QUICKENING',
    3: 'WAVE 3 — HEAVY WATER',
    4: 'WAVE 4 — WHISPERS',
    5: 'WAVE 5 — THE SWARM THICKENS',
    6: 'WAVE 6 — CRUSHING DARK',
    7: 'WAVE 7 — TEETH IN THE TIDE',
    8: 'WAVE 8 — THE HOLLOW CHOIR',
    9: 'WAVE 9 — LAST LIGHT BEFORE THE DEEP',
    10: 'WAVE 10 — THE LEVIATHAN',
  };
  return names[n] || `WAVE ${n}`;
}
