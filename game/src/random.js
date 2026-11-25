// A tiny seeded random generator, so a screenshot scene staged from one seed always
// plays out the same way. mulberry32: small, fast, deterministic.

export function makeRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one element of `list` with the seeded generator. */
export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

/** An integer in [min, max] from the seeded generator. */
export function randomInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}
