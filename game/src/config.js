// ECHOKEEP — tuning constants. One place for every number the game balances on.
// The deep listens: blind enemies hunt by sound, so every number below shapes
// how loud a lure is, how fast the Drowned close in, and what a kill is worth.
export const CFG = {
  view: { w: 1280, h: 720 },
  // The arena: the Heart-Bell sits left, the Drowned rise from the deep right.
  arena: { x: 24, y: 96, w: 1232, h: 528 },
  bell: { x: 150, y: 360, hp: 10, toll: 40 },
  // Placement grid (snapped, so clicks always land somewhere sensible).
  grid: 44,
  // Economy.
  startSalvage: 120,
  waveBonus: [0, 30, 40, 50, 60, 70, 80, 90, 100, 120, 150],
  // Early-call bonus scales with the wave: calling wave 1 early is a small
  // head start; calling wave 9 early is a real gamble paid in kind.
  // Bonus for calling wave N early: 8 + 3N.
  earlyCallBase: 8,
  earlyCallPerWave: 3,
  // The Keeper's Ring: a manual global lure pulse, limited by cooldown.
  // It drags enemies toward the nearest bell — and tolls them on the way.
  ring: { cooldown: 12, pull: 260, duration: 2.5, dmg: 25 },
  // Resonators: what they cost, how far their sound carries, what they do.
  resonators: {
    chime: { name: 'Chime Bell', key: '1', cost: 40, lure: 170, ringEvery: 2.0, dmg: 0, hp: 40, color: '#7fe7ff' },
    drum: { name: 'Drum', key: '2', cost: 80, lure: 240, ringEvery: 2.8, dmg: 14, hp: 70, color: '#ffd166' },
    siren: { name: 'Siren Coral', key: '3', cost: 140, lure: 320, ringEvery: 3.6, dmg: 26, hp: 50, color: '#ff7ad9' },
  },
  // Traps: what they cost and what they do to anything standing on them.
  traps: {
    reef: { name: 'Spike Reef', key: '4', cost: 50, radius: 46, dps: 26, hp: 9999, color: '#b8ff9e' },
    whirl: { name: 'Whirlpool', key: '5', cost: 100, radius: 84, dps: 14, pull: 90, hp: 9999, color: '#8fb8ff' },
  },
  // Enemies: hp, speed (px/s), salvage, and how deaf they are to lures.
  // lureSense 1 = fully lured by sound; 0 = walks straight at the Heart-Bell.
  enemies: {
    drifter: { name: 'Drifter', hp: 30, speed: 34, salvage: 5, lureSense: 1.0, radius: 13, color: '#9fd8ff' },
    skitter: { name: 'Skitter', hp: 18, speed: 70, salvage: 7, lureSense: 1.0, radius: 10, color: '#ffe066' },
    brute: { name: 'Brute', hp: 150, speed: 24, salvage: 12, lureSense: 0.5, radius: 19, color: '#ff9d76' },
    wraith: { name: 'Wraith', hp: 90, speed: 56, salvage: 10, lureSense: 0.0, radius: 12, color: '#d9a7ff', lureKinds: ['drum'] },
    leviathan: { name: 'The Leviathan', hp: 1000, speed: 16, salvage: 150, lureSense: 0.0, radius: 44, color: '#ff5d8f' },
  },
  // Waves: [drifters, skitters, brutes, wraiths]. Wave 10 adds the Leviathan.
  waves: [
    null,
    [8, 0, 0, 0],
    [10, 4, 0, 0],
    [13, 6, 1, 0],
    [15, 9, 3, 3],
    [15, 11, 4, 5],
    [18, 13, 5, 9],
    [18, 15, 6, 9],
    [20, 18, 8, 9],
    [23, 20, 9, 10],
    [20, 18, 10, 9],
  ],
  totalWaves: 10,
  spawnGap: 0.55,
  // An enemy that reaches the bell or a resonator stops and bites it:
  // one tooth per bite, slow enough that a bell is bait, not a sacrifice.
  bite: { dmg: 1, every: 1.2 },
  shells: { threeLives: 8, twoLives: 4 },
};
