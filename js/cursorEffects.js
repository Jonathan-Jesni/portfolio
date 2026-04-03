// ============================================
// CURSOR EFFECTS (glow, trail, magnetic buttons, spotlight)
// ============================================
import { seededRandom } from './utils.js';

// Shared mouse state object — written by mousemove, read by all systems
export const mouseState = {
  mouseX: 0,
  mouseY: 0,
};

// --- Cursor glow ---
let glowX = 0, glowY = 0;
let cursorGlow;

// --- Trail particles ---
const TRAIL_COUNT = 10;
const trails = [];
let trailIndex = 0;
let lastTrailX = 0, lastTrailY = 0;

// --- Smooth mouse for spotlight ---
let smoothMouseX = 0, smoothMouseY = 0;
let spotlightActive = false;
let lastSpotlightVal = '0';

// --- Magnetic buttons ---
const btnStates = [];

export function initCursorEffects(smoothVelocityGetter) {
  // Mouse tracking
  window.addEventListener('mousemove', (e) => {
    mouseState.mouseX = e.clientX;
    mouseState.mouseY = e.clientY;
  }, { passive: true });

  // Cursor glow element
  cursorGlow = document.createElement('div');
  cursorGlow.classList.add('cursor-glow');
  document.body.appendChild(cursorGlow);

  // Trail particles (variable size + opacity)
  for (let i = 0; i < TRAIL_COUNT; i++) {
    const t = document.createElement('div');
    t.classList.add('cursor-trail');
    document.body.appendChild(t);
    trails.push({ el: t, x: 0, y: 0, life: 0, size: 0, ix: 0, iy: 0 });
  }

  // Magnetic buttons
  const magneticBtns = document.querySelectorAll('.btn');
  magneticBtns.forEach(btn => {
    btnStates.push({ el: btn, cx: 0, cy: 0, cs: 1, tx: 0, ty: 0, ts: 1 });
  });

  // Store the getter for smooth velocity
  _smoothVelocityGetter = smoothVelocityGetter;
}

let _smoothVelocityGetter = () => 0;

function spawnTrail() {
  const { mouseX, mouseY } = mouseState;
  const dx = mouseX - lastTrailX;
  const dy = mouseY - lastTrailY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > 12) {
    const trail = trails[trailIndex % TRAIL_COUNT];
    const sizeVar = 38 + seededRandom(trailIndex) * 12;
    const opacityVar = 0.3 + seededRandom(trailIndex + 50) * 0.12;

    trail.x = mouseX;
    trail.y = mouseY;
    trail.ix = mouseX;
    trail.iy = mouseY;
    trail.life = 1;
    trail.size = sizeVar;
    trail.el.style.left = mouseX + 'px';
    trail.el.style.top = mouseY + 'px';
    trail.el.style.width = sizeVar + 'px';
    trail.el.style.height = sizeVar + 'px';
    trail.el.style.opacity = Math.round(opacityVar * 10) / 10;
    trailIndex++;

    lastTrailX = mouseX;
    lastTrailY = mouseY;
  }
}

export function updateCursorEffects() {
  const { mouseX, mouseY } = mouseState;

  // 1. Cursor glow
  glowX += (mouseX - glowX) * 0.12;
  glowY += (mouseY - glowY) * 0.12;
  cursorGlow.style.left = glowX + 'px';
  cursorGlow.style.top = glowY + 'px';

  // 2. Trail spawning
  spawnTrail();

  for (let i = 0; i < TRAIL_COUNT; i++) {
    const trail = trails[i];
    if (trail.life > 0) {
      trail.ix += (mouseX - trail.ix) * 0.04;
      trail.iy += (mouseY - trail.iy) * 0.04;
      trail.el.style.left = trail.ix + 'px';
      trail.el.style.top = trail.iy + 'px';

      const fadeSpeed = 0.022 + (1 - trail.size / 50) * 0.01;
      trail.life -= fadeSpeed;
      if (trail.life <= 0) {
        trail.life = 0;
        trail.el.style.opacity = '0';
      } else {
        trail.el.style.opacity = Math.round(trail.life * 0.35 * 10) / 10;
      }
    }
  }

  // 3. Spotlight (smoothed mouse position for jitter-free tracking)
  smoothMouseX += (mouseX - smoothMouseX) * 0.12;
  smoothMouseY += (mouseY - smoothMouseY) * 0.12;
  if (!spotlightActive && (mouseX !== 0 || mouseY !== 0)) {
    spotlightActive = true;
  }
  // Disable heavy spotlight gradient during fast scrolling — only update when value changes
  const smoothVel = _smoothVelocityGetter();
  const isFastScroll = Math.abs(smoothVel) > 2;
  const newSpotlightVal = (spotlightActive && !isFastScroll) ? '1' : '0';
  if (newSpotlightVal !== lastSpotlightVal) {
    document.body.style.setProperty('--spotlight-opacity', newSpotlightVal);
    lastSpotlightVal = newSpotlightVal;
  }
  if (spotlightActive && !isFastScroll) {
    document.body.style.setProperty('--mx', Math.round(smoothMouseX) + 'px');
    document.body.style.setProperty('--my', Math.round(smoothMouseY) + 'px');
  }

  // 4. Magnetic buttons (elastic JS interpolation + scale)
  for (let i = 0; i < btnStates.length; i++) {
    const b = btnStates[i];
    const rect = b.el.getBoundingClientRect();
    const bcx = rect.left + rect.width * 0.5;
    const bcy = rect.top + rect.height * 0.5;
    const dx = mouseX - bcx;
    const dy = mouseY - bcy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const threshold = 120;

    if (dist < threshold) {
      const pull = 1 - dist / threshold;
      const maxShift = 8;
      b.tx = Math.max(-maxShift, Math.min(maxShift, dx * pull * 0.15));
      b.ty = Math.max(-maxShift, Math.min(maxShift, dy * pull * 0.15));
      b.ts = 1 + pull * 0.04;
    } else {
      b.tx = 0;
      b.ty = 0;
      b.ts = 1;
    }

    b.cx += (b.tx - b.cx) * 0.08;
    b.cy += (b.ty - b.cy) * 0.08;
    b.cs += (b.ts - b.cs) * 0.08;

    if (Math.abs(b.cx) < 0.05 && Math.abs(b.cy) < 0.05 && Math.abs(b.cs - 1) < 0.001) {
      b.cx = 0;
      b.cy = 0;
      b.cs = 1;
    }

    if (b.cx !== 0 || b.cy !== 0 || b.cs !== 1) {
      b.el.style.transform = `translate3d(${Math.round(b.cx * 10) / 10}px, ${Math.round(b.cy * 10) / 10}px, 0) scale(${Math.round(b.cs * 1000) / 1000})`;
    } else {
      b.el.style.transform = '';
    }
  }
}
