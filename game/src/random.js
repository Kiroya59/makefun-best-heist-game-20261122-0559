// random.js: one small seeded generator, so a scene is the same every run.
// One clear job: deterministic randomness, nothing else.

// mulberry32: tiny, fast, and the same sequence for the same seed.
export function makeRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick a value in [min, max) from a generator.
export function range(rand, min, max) {
  return min + rand() * (max - min);
}
