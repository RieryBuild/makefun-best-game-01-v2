// Render: every pixel of ECHOKEEP, drawn on one canvas. Palette: deep indigo
// water, bioluminescent cyan rings, coral and gold accents — the deep sea, not
// another lantern. Layout constants are exported so main.js can hit-test the
// buttons and build cards the screen draws.
import { CFG } from './config.js';

export const LAYOUT = {
  hud: { x: 24, y: 16, w: 1232, h: 64 },
  buildBar: { x: 24, y: 640, w: 1232, h: 64 },
  cardW: 178,
  cardGap: 8,
  startBtn: { x: 490, y: 520, w: 300, h: 64 },
  nextBtn: { x: 962, y: 640, w: 294, h: 64 },
};

function buildCards() {
  const bar = LAYOUT.buildBar;
  const defs = [
    ...Object.entries(CFG.resonators).map(([k, d]) => ({ key: k, ...d, type: 'resonator' })),
    ...Object.entries(CFG.traps).map(([k, d]) => ({ key: k, ...d, type: 'trap' })),
  ];
  return defs.map((d, i) => ({
    ...d,
    x: bar.x + i * (LAYOUT.cardW + LAYOUT.cardGap),
    y: bar.y,
    w: LAYOUT.cardW,
    h: bar.h,
  }));
}
export function getBuildCards() { return buildCards(); }

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, w) {
  // Deep water: near-black at the surface, dim blue at the seabed, so the
  // glowing bells and rings read as the only light in the trench.
  const g = ctx.createLinearGradient(0, 0, 0, 720);
  g.addColorStop(0, '#02050b');
  g.addColorStop(0.55, '#071a36');
  g.addColorStop(1, '#0a2740');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1280, 720);
  // God rays from the surface.
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#bfe9ff';
  for (let i = 0; i < 5; i++) {
    const x = 120 + i * 240 + Math.sin(w.time * 0.2 + i) * 20;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 90, 0);
    ctx.lineTo(x + 220, 720);
    ctx.lineTo(x + 60, 720);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // Sand floor.
  ctx.fillStyle = '#14304a';
  ctx.fillRect(0, 636, 1280, 84);
  ctx.fillStyle = '#1b3d5c';
  for (let i = 0; i < 40; i++) {
    const x = ((i * 173) % 1280);
    const y = 648 + ((i * 53) % 60);
    ctx.beginPath();
    ctx.ellipse(x, y, 26, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Rising bubbles.
  ctx.fillStyle = 'rgba(180,230,255,0.35)';
  for (let i = 0; i < 24; i++) {
    const bx = (i * 97 + 40) % 1280;
    const by = 700 - ((w.time * (12 + (i % 5) * 6) + i * 61) % 700);
    ctx.beginPath();
    ctx.arc(bx, by, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
  // Arena frame.
  ctx.strokeStyle = 'rgba(127,231,255,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(CFG.arena.x, CFG.arena.y, CFG.arena.w, CFG.arena.h);
  // Placement grid dots.
  ctx.fillStyle = 'rgba(127,231,255,0.10)';
  for (let gx = CFG.arena.x + CFG.grid; gx < CFG.arena.x + CFG.arena.w; gx += CFG.grid) {
    for (let gy = CFG.arena.y + CFG.grid; gy < CFG.arena.y + CFG.arena.h; gy += CFG.grid) {
      ctx.fillRect(gx - 1, gy - 1, 2, 2);
    }
  }
}

function drawBell(ctx, w) {
  const b = CFG.bell;
  const bob = Math.sin(w.time * 1.4) * 3;
  // Glow.
  const g = ctx.createRadialGradient(b.x, b.y + bob, 4, b.x, b.y + bob, 90);
  g.addColorStop(0, 'rgba(255,209,102,0.35)');
  g.addColorStop(1, 'rgba(255,209,102,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(b.x, b.y + bob, 90, 0, Math.PI * 2);
  ctx.fill();
  // Bell body.
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.moveTo(b.x, b.y - 30 + bob);
  ctx.quadraticCurveTo(b.x + 26, b.y - 6 + bob, b.x + 22, b.y + 16 + bob);
  ctx.lineTo(b.x - 22, b.y + 16 + bob);
  ctx.quadraticCurveTo(b.x - 26, b.y - 6 + bob, b.x, b.y - 30 + bob);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(b.x, b.y + 18 + bob, 6, 0, Math.PI * 2);
  ctx.fill();
  // HP hearts.
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < CFG.bell.hp; i++) {
    ctx.fillStyle = i < w.bellHp ? '#ff5d7e' : 'rgba(255,255,255,0.18)';
    ctx.fillText('♥', b.x - 72 + i * 16, b.y - 44 + bob);
  }
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('HEART-BELL', b.x, b.y + 44 + bob);
}

function drawResonator(ctx, r) {
  const def = CFG.resonators[r.kind];
  ctx.save();
  ctx.translate(r.x, r.y);
  // Lure radius, faint.
  ctx.strokeStyle = def.color;
  ctx.globalAlpha = 0.10;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, def.lure, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Ring pulse while ringing.
  if (r.ringAnim > 0) {
    ctx.globalAlpha = r.ringAnim;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 26 + (0.6 - r.ringAnim) * 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (r.kind === 'chime') {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.quadraticCurveTo(16, -4, 13, 12);
    ctx.lineTo(-13, 12);
    ctx.quadraticCurveTo(-16, -4, 0, -20);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 14, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (r.kind === 'drum') {
    ctx.fillStyle = '#8a5a2b';
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.ellipse(0, -4, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5c3a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, -2);
    ctx.lineTo(18, -2);
    ctx.stroke();
  } else {
    // Siren Coral: branching arms.
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (const a of [-0.7, -0.25, 0.2, 0.65]) {
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.quadraticCurveTo(Math.sin(a) * 14, -6, Math.sin(a) * 22, -18 - Math.abs(Math.cos(a)) * 6);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 12, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  // HP bar.
  if (r.hp < r.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-18, 22, 36, 5);
    ctx.fillStyle = '#7dff8a';
    ctx.fillRect(-18, 22, 36 * (r.hp / r.maxHp), 5);
  }
  ctx.restore();
}

function drawTrap(ctx, t) {
  const def = CFG.traps[t.kind];
  ctx.save();
  ctx.translate(t.x, t.y);
  if (t.kind === 'reef') {
    ctx.fillStyle = def.color;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 12 - 6, 10);
      ctx.lineTo(i * 12, -16 - Math.abs(i) * -4);
      ctx.lineTo(i * 12 + 6, 10);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 4;
    for (let k = 0; k < 3; k++) {
      const a0 = t.spin * 1.5 + (k * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.arc(0, 0, 14 + k * 9, a0, a0 + Math.PI * 1.2);
      ctx.stroke();
    }
    ctx.fillStyle = '#0a2148';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEnemy(ctx, e) {
  const def = CFG.enemies[e.kind];
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.fillStyle = e.flash > 0 ? '#ffffff' : def.color;
  if (e.kind === 'drifter') {
    ctx.beginPath();
    ctx.arc(0, 0, def.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#06122e';
    ctx.beginPath();
    ctx.arc(-4, -3, 3, 0, Math.PI * 2);
    ctx.arc(5, -3, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'skitter') {
    ctx.beginPath();
    ctx.moveTo(0, -def.radius);
    ctx.lineTo(def.radius, 0);
    ctx.lineTo(0, def.radius);
    ctx.lineTo(-def.radius, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#06122e';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'brute') {
    ctx.beginPath();
    ctx.arc(0, 0, def.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a2d1d';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * def.radius * 0.7, Math.sin(a) * def.radius * 0.7);
      ctx.lineTo(Math.cos(a) * (def.radius + 7), Math.sin(a) * (def.radius + 7));
      ctx.stroke();
    }
  } else if (e.kind === 'wraith') {
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.moveTo(0, -def.radius);
    ctx.quadraticCurveTo(def.radius, 0, 0, def.radius);
    ctx.quadraticCurveTo(-def.radius, 0, 0, -def.radius);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-4, -2, 2.5, 0, Math.PI * 2);
    ctx.arc(4, -2, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Leviathan: big jawed horror.
    ctx.beginPath();
    ctx.ellipse(0, 0, def.radius + 14, def.radius - 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#06122e';
    ctx.beginPath();
    ctx.arc(-18, -8, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-30 + i * 14, 12);
      ctx.lineTo(-24 + i * 14, 26);
      ctx.lineTo(-18 + i * 14, 12);
      ctx.closePath();
      ctx.fill();
    }
  }
  // HP bar for tough ones.
  if (e.maxHp > 40) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(-20, -def.radius - 12, 40, 5);
    ctx.fillStyle = '#ff5d5d';
    ctx.fillRect(-20, -def.radius - 12, 40 * Math.max(0, e.hp / e.maxHp), 5);
  }
  ctx.restore();
}

function drawHud(ctx, w) {
  const h = LAYOUT.hud;
  ctx.fillStyle = 'rgba(4,16,38,0.72)';
  rr(ctx, h.x, h.y, h.w, h.h, 12);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#7fe7ff';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('ECHOKEEP', h.x + 18, h.y + 36);
  ctx.fillStyle = '#bfe9ff';
  ctx.font = '15px system-ui, sans-serif';
  const waveTxt = w.wave === 0 ? 'WAVE –/10' : `WAVE ${w.wave}/10`;
  ctx.fillText(waveTxt, h.x + 210, h.y + 34);
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`◈ ${w.salvage}`, h.x + 340, h.y + 36);
  ctx.fillStyle = '#ff8fa3';
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.fillText(`♥ ${w.bellHp}/${CFG.bell.hp}`, h.x + 470, h.y + 35);
  ctx.fillStyle = '#bfe9ff';
  ctx.font = '15px system-ui, sans-serif';
  const left = w.spawnQueue.length + w.enemies.length;
  ctx.fillText(`Drowned left: ${left}`, h.x + 590, h.y + 34);
  ctx.fillText(`Kills: ${w.kills}`, h.x + 760, h.y + 34);
  ctx.fillText(`Score: ${w.score}`, h.x + 870, h.y + 34);
  ctx.fillStyle = w.ringCooldown > 0 ? '#7d8aa5' : '#ffffff';
  ctx.fillText(w.ringCooldown > 0 ? `Ring ${Math.ceil(w.ringCooldown)}s` : 'Ring ready [R]', h.x + 1010, h.y + 34);
}

function drawBuildBar(ctx, w) {
  const bar = LAYOUT.buildBar;
  ctx.fillStyle = 'rgba(4,16,38,0.72)';
  rr(ctx, bar.x, bar.y, bar.w, bar.h, 12);
  ctx.fill();
  const cards = buildCards();
  for (const c of cards) {
    const afford = w.salvage >= c.cost;
    const sel = w.selected === c.key;
    ctx.fillStyle = sel ? 'rgba(127,231,255,0.28)' : afford ? 'rgba(127,231,255,0.10)' : 'rgba(255,255,255,0.04)';
    rr(ctx, c.x + 2, c.y + 4, c.w - 4, c.h - 8, 10);
    ctx.fill();
    ctx.strokeStyle = sel ? '#7fe7ff' : 'rgba(127,231,255,0.25)';
    ctx.lineWidth = sel ? 2 : 1;
    rr(ctx, c.x + 2, c.y + 4, c.w - 4, c.h - 8, 10);
    ctx.stroke();
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.arc(c.x + 26, c.y + 32, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(c.name, c.x + 44, c.y + 28);
    ctx.fillStyle = afford ? '#ffd166' : '#ff8fa3';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(`◈ ${c.cost}  [${c.key}]`, c.x + 44, c.y + 50);
  }
  // Next-wave + ring buttons live in the bar's right end.
  const nb = LAYOUT.nextBtn;
  const canCall = w.screen === 'play' && w.waveState === 'idle' && w.wave < CFG.totalWaves;
  ctx.fillStyle = canCall ? '#1d7a4f' : 'rgba(255,255,255,0.08)';
  rr(ctx, nb.x, nb.y, nb.w, nb.h, 10);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(canCall ? '▶ CALL WAVE [Space]' : w.wave >= CFG.totalWaves ? 'FINAL WAVE' : 'WAVE RUNNING…', nb.x + nb.w / 2, nb.y + 39);
  ctx.textAlign = 'left';
}

function drawRingsAndFloaters(ctx, w) {
  for (const r of w.rings) {
    ctx.strokeStyle = r.color;
    ctx.globalAlpha = Math.max(0, 0.7 - r.t * 0.6);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const f of w.floaters) {
    ctx.globalAlpha = Math.min(1, f.t);
    ctx.fillStyle = '#b8ff9e';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function drawBanner(ctx, w) {
  if (w.waveBanner) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, w.waveBanner.t);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(w.waveBanner.text, 640, 300);
    ctx.restore();
  }
  if (w.message) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, w.message.t);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(w.message.text, 640, 132);
    ctx.restore();
  }
}

function drawTitle(ctx, w) {
  ctx.fillStyle = 'rgba(3,10,26,0.55)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#7fe7ff';
  ctx.font = 'bold 84px system-ui, sans-serif';
  ctx.fillText('ECHOKEEP', 640, 190);
  ctx.fillStyle = '#bfe9ff';
  ctx.font = '26px system-ui, sans-serif';
  ctx.fillText('The deep listens. Make it listen to you.', 640, 238);
  ctx.fillStyle = '#eaf7ff';
  ctx.font = '18px system-ui, sans-serif';
  const lines = [
    'The Drowned are blind — they hunt by sound.',
    'Ring bells to lure them into your reefs and whirlpools.',
    'Wraiths hear only drums. The Leviathan barely feels traps.',
    'Keep the Heart-Bell alive through 10 waves. The Leviathan comes last.',
    '',
    'Click a build card, then click the seabed to place it  •  [R] Keeper\'s Ring  •  [Space] call the next wave',
  ];
  lines.forEach((ln, i) => ctx.fillText(ln, 640, 300 + i * 30));
  const b = LAYOUT.startBtn;
  ctx.fillStyle = '#1d7a4f';
  rr(ctx, b.x, b.y, b.w, b.h, 14);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('▶  START THE KEEP', b.x + b.w / 2, b.y + 42);
  if (w.best) {
    ctx.fillStyle = '#ffd166';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(`Best run: ${w.best.score} pts — wave ${w.best.wave}`, 640, 620);
  }
  ctx.fillStyle = '#7d8aa5';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('A game about sound as a weapon  •  [P] pause  •  [M] mute', 640, 660);
}

function drawEnd(ctx, w, won) {
  ctx.fillStyle = won ? 'rgba(6,40,24,0.72)' : 'rgba(40,6,16,0.72)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#7dff8a' : '#ff8fa3';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText(won ? 'THE DEEP IS QUIET' : 'THE BELL IS SILENT', 640, 200);
  if (won) {
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillText('★'.repeat(w.shells) + '☆'.repeat(3 - w.shells), 640, 268);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText(`Score ${w.score}   •   Waves cleared ${won ? 10 : w.wave - 1}/10   •   Drowned slain ${w.kills}   •   Salvage earned ${w.earned}`, 640, 330);
  ctx.fillStyle = '#bfe9ff';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText(
    won ? 'Every bell you rang is still ringing somewhere below.' : 'The Drowned heard the bell before you heard them. Ring louder next time.',
    640, 380,
  );
  const b = LAYOUT.startBtn;
  ctx.fillStyle = '#1d7a4f';
  rr(ctx, b.x, b.y, b.w, b.h, 14);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('↻  KEEP AGAIN', b.x + b.w / 2, b.y + 41);
}

export function render(ctx, w) {
  ctx.save();
  if (w.shake > 0) {
    ctx.translate((Math.random() - 0.5) * w.shake * 20, (Math.random() - 0.5) * w.shake * 20);
  }
  drawBackground(ctx, w);
  if (w.screen === 'title') {
    // A quiet preview of the arena behind the title.
    drawBell(ctx, w);
    drawTitle(ctx, w);
  } else {
    drawBell(ctx, w);
    for (const t of w.traps) drawTrap(ctx, t);
    for (const r of w.resonators) drawResonator(ctx, r);
    for (const e of w.enemies) drawEnemy(ctx, e);
    drawRingsAndFloaters(ctx, w);
    drawHud(ctx, w);
    drawBuildBar(ctx, w);
    drawBanner(ctx, w);
    if (w.screen === 'win') drawEnd(ctx, w, true);
    else if (w.screen === 'over') drawEnd(ctx, w, false);
  }
  ctx.restore();
}
