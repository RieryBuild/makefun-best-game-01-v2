// Audio: all sound is synthesised with WebAudio — no audio files, no network.
// Bells, drums, coral pulses, whirlpool swirls and a low drone under the waves.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let musicTimer = null;
  const notes = [523.25, 587.33, 659.25, 783.99, 880.0]; // C5 D5 E5 G5 A5

  function ensure() {
    if (!ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (muted) return;
    const c = ensure();
    if (!c) return;
    const t = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  return {
    unlock() { ensure(); },
    setMuted(m) { muted = m; },
    get muted() { return muted; },
    chime() { tone(1046.5, 1.1, 'sine', 0.10); tone(1568, 0.9, 'sine', 0.05, 0.02); },
    drum() { tone(110, 0.35, 'sine', 0.22, 0, 55); tone(220, 0.2, 'triangle', 0.08); },
    siren() { tone(880, 0.9, 'sine', 0.12, 0, 1320); tone(440, 0.9, 'sine', 0.06, 0, 660); },
    ring() { tone(784, 0.8, 'sine', 0.14); tone(1175, 0.7, 'sine', 0.07, 0.05); },
    kill() { tone(660, 0.12, 'square', 0.06, 0, 330); },
    hurt() { tone(180, 0.3, 'sawtooth', 0.12, 0, 90); },
    buy() { tone(523.25, 0.15, 'triangle', 0.12); tone(783.99, 0.2, 'triangle', 0.12, 0.07); },
    deny() { tone(160, 0.18, 'square', 0.08); },
    wave() { tone(392, 0.4, 'triangle', 0.12); tone(523.25, 0.4, 'triangle', 0.12, 0.12); },
    win() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, 0.5, 'triangle', 0.12, i * 0.14)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.5, 'sine', 0.10, i * 0.18)); },
    boss() { tone(65, 1.6, 'sawtooth', 0.14, 0, 48); tone(98, 1.6, 'sawtooth', 0.08, 0.1, 72); },
    startMusic() {
      if (musicTimer) return;
      let i = 0;
      musicTimer = setInterval(() => {
        if (muted) return;
        const f = notes[i % notes.length] / 2;
        tone(f, 2.4, 'sine', 0.035);
        if (i % 4 === 2) tone(f * 1.5, 2.0, 'sine', 0.02);
        i++;
      }, 1400);
    },
    stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } },
  };
}
