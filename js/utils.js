// ============================================
// UTILITY FUNCTIONS
// ============================================

// Seed-based pseudo-random for organic variation (deterministic per element)
export function seededRandom(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// Easing functions
export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

export function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

// Device detection
export const isMobile = matchMedia('(pointer: coarse)').matches;
