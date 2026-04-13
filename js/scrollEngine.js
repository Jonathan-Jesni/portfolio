// ============================================
// SCROLL-SYNCED ANIMATION ENGINE
// ============================================
import { seededRandom, isMobile, prefersReducedMotion } from './utils.js';

const scrollElements = [];

// ============================================
// SCROLL VELOCITY TRACKER (shared state)
// ============================================
let scrollVelocity = 0;
let lastScrollY = window.scrollY || 0;
export let smoothVelocity = 0;
let isScrolling = false;
let scrollIdleTimer = 0;

// ============================================
// SCROLL PROGRESS BAR — dynamic interpolation
// ============================================
let scrollProgressCurrent = 0;
let scrollProgressTarget = 0;

// ============================================
// REGISTER ELEMENTS
// ============================================
export function registerElements() {
  // General reveals
  document.querySelectorAll('.reveal').forEach((el, idx) => {
    const isHero = el.closest('#hero') !== null;
    const seed = seededRandom(idx + 1);

    scrollElements.push({
      el,
      type: 'up',
      offsetX: 6,
      offsetY: isMobile ? 12 : 22,
      isHero,
      isSkill: false,
      // Organic variation per element
      parallaxMul: isMobile ? 1 : 0.98 + seed * 0.04,
      scaleMul: 1,
      delayOffset: seed * (isMobile ? 0.01 : 0.02),
      cachedTop: 0,
      cachedHeight: 0,
      // Lerp state for smooth interpolation
      sx: 6,
      sy: isMobile ? 12 : 22,
      ss: 0.985,
      so: 0,
      revealed: false,
    });
  });

  // Skill cards
  document.querySelectorAll('.skill-category').forEach((el, i) => {
    const seed = seededRandom(i + 100);
    scrollElements.push({
      el,
      type: 'skill',
      offsetX: 6,
      offsetY: isMobile ? 2 : 4,
      staggerIndex: i,
      isHero: false,
      isSkill: true,
      parallaxMul: isMobile ? 1 : 0.98 + seed * 0.04,
      scaleMul: 1,
      delayOffset: seed * (isMobile ? 0.01 : 0.02),
      cachedTop: 0,
      cachedHeight: 0,
      sx: 6, sy: isMobile ? 2 : 4, ss: 0.985, so: 0, revealed: false,
    });
  });

  // Skill list items (micro-staggered horizontal)
  document.querySelectorAll('.skill-list li').forEach((el, i) => {
    scrollElements.push({
      el,
      type: 'skill-desc',
      offsetX: 6,
      offsetY: 0,
      staggerIndex: i,
      isHero: false,
      isSkill: true,
      parallaxMul: 1,
      scaleMul: 1,
      delayOffset: (i % 6) * (isMobile ? 0.02 : 0.045),
      cachedTop: 0,
      cachedHeight: 0,
      sx: 6, sy: 0, ss: 1, so: 0, revealed: false,
    });
  });

  // Building cards
  document.querySelectorAll('.building-card').forEach((el, i) => {
    const seed = seededRandom(i + 200);
    scrollElements.push({
      el,
      type: 'stagger',
      offsetX: 0,
      offsetY: isMobile ? 12 : 24,
      staggerIndex: i,
      isHero: false,
      isSkill: false,
      parallaxMul: isMobile ? 1 : 0.98 + seed * 0.04,
      scaleMul: 1,
      delayOffset: seed * (isMobile ? 0.01 : 0.02),
      cachedTop: 0,
      cachedHeight: 0,
      sx: 0, sy: isMobile ? 12 : 24, ss: 0.985, so: 0, revealed: false,
    });
  });

  // Fix: elements already in viewport on load should be immediately visible (no flicker)
  const viewportThreshold = window.innerHeight * 0.9;
  scrollElements.forEach(item => {
    // Add GPU acceleration class mapped in css/base.css
    item.el.classList.add('accelerate');

    const rect = item.el.getBoundingClientRect();
    if (prefersReducedMotion || rect.top < viewportThreshold) {
      // Snap lerp state to fully visible
      item.sx = 0;
      item.sy = 0;
      item.ss = 1 * item.scaleMul;
      item.so = 1;
      item.revealed = true;
      // Apply immediately so there's no frame of invisibility
      item.el.style.opacity = '1';
      item.el.style.transform = 'translate3d(0,0,0) scale(1)';
      item.el.style.filter = 'none';
    } else {
      // Apply initial JS hidden state since we removed CSS fallback
      item.el.style.opacity = '0';
      item.el.style.transform = `translate3d(${item.offsetX}px, ${item.offsetY}px, 0)`;
    }
  });

  updateCachedPositions();
}

// ============================================
// CACHED POSITIONS
// ============================================
export function updateCachedPositions() {
  const scrollY = window.scrollY;
  scrollElements.forEach(item => {
    const rect = item.el.getBoundingClientRect();
    item.cachedTop = rect.top + scrollY;
    item.cachedHeight = rect.height;
  });
}

// ============================================
// FULLY RESYNC SCROLL ENGINE (Safe Layout Recalc)
// ============================================
export function resyncScrollEngine() {
  // Only update bounding boxes; do NOT force resets
  // This keeps the continuous lerp system stable
  updateCachedPositions();
}

// ============================================
// SCROLL PROGRESS — viewport-center-distance
// ============================================
function getElementProgress(item, scrollY, viewportHeight) {
  const elementCenter = item.cachedTop + item.cachedHeight * 0.5;
  const viewportCenter = scrollY + viewportHeight * 0.5;

  const distance = elementCenter - viewportCenter;
  const range = viewportHeight * (isMobile ? 0.85 : 0.7);

  if (distance > range) return 0;
  if (distance < -range * 0.35) return 1;

  const raw = 1 - Math.max(0, distance / range);
  return ease(Math.max(0, Math.min(1, raw)));
}

function ease(t) {
  return 1 - Math.pow(1 - t, 3);
}

// ============================================
// IDLE FLOATING MOTION
// ============================================
function getIdleFloat(index, time) {
  // Each element gets a unique phase based on index
  const phase = index * 0.7;
  const y = Math.sin(time * 0.8 + phase) * 0.4;  // Subtle < 0.5px float
  const s = 1 + Math.sin(time * 0.6 + phase + 1.5) * 0.001;
  return { y, s };
}

// ============================================
// APPLY SCROLL-SYNCED TRANSFORMS
// ============================================
const mobileFactor = isMobile ? 0.5 : 1;

export function applyScrollTransforms(scrollY, viewportHeight, time, dt = 1 / 60) {
  if (prefersReducedMotion) return;

  const baseLerpFactor = isMobile ? 0.14 : 0.09;
  const lerpFactor = 1 - Math.pow(1 - baseLerpFactor, dt * 60);
  // Idle blend: ramp up floating when scroll stops
  const idleBlend = isScrolling ? 0 : Math.min(scrollIdleTimer * 0.3, 1);

  scrollElements.forEach((item, idx) => {
    if (item.isHero) {
      const heroFloat = Math.sin(time * 0.4) * 1.2;
      item.el.style.opacity = '1';
      item.el.style.transform = `translate3d(0,${heroFloat.toFixed(2)}px,0) scale(1)`;
      item.el.style.filter = 'none';
      return;
    }

    let progress = getElementProgress(item, scrollY, viewportHeight);

    // Skip offscreen elements — no DOM writes needed
    if (progress <= 0 && item.so < 0.01) return;

    // Per-element organic delay
    if (item.delayOffset > 0 && progress > 0 && progress < 1) {
      progress = Math.max(0, Math.min(1, (progress - item.delayOffset) / (1 - item.delayOffset)));
    }

    // Stagger for grouped cards
    if ((item.type === 'stagger' || item.type === 'skill') && item.staggerIndex > 0) {
      const staggerDelay = item.staggerIndex * (isMobile ? 0.045 : 0.07);
      progress = Math.max(0, Math.min(1, (progress - staggerDelay) / (1 - staggerDelay)));
      progress = ease(progress);
    }

    // No reveal lock — progress tracks scroll position bidirectionally
    // Elements animate in on scroll down, animate out on scroll up

    const targetOpacity = Math.pow(progress, 1.2);
    const baseScale = 0.985 + 0.015 * progress;
    const targetScale = baseScale * item.scaleMul;

    // Softer slide easing: (1-progress)^1.6 — smoother deceleration, less abrupt
    const slideEase = Math.pow(1 - progress, isMobile ? 1.1 : 1.6);
    // No velocityBoost on translation — eliminates scroll-spike jitter
    const targetX = item.offsetX * slideEase * mobileFactor * item.parallaxMul;
    const targetY = item.offsetY * (1 - progress) * mobileFactor * item.parallaxMul;

    // Non-linear blur: drops off faster near visibility (power curve)
    const blurRaw = 1 - progress;
    const blurCurve = Math.pow(blurRaw, 2.2);

    // Subtle idle float
    let idleY = 0;
    let idleScale = 1;
    if (progress > 0.5) {
      const idle = getIdleFloat(idx, time);
      idleY = idle.y * idleBlend;
      idleScale = 1 + (idle.s - 1) * idleBlend;
    }

    // Lerp toward targets
    const lf = lerpFactor;
    item.sx += (targetX - item.sx) * lf;
    item.sy += (targetY - item.sy) * lf;
    item.ss += (targetScale - item.ss) * lf;
    item.so += (targetOpacity - item.so) * lf;

    // Micro-jitter clamp — snap when delta is negligible
    if (Math.abs(targetX - item.sx) < 0.05) item.sx = targetX;
    if (Math.abs(targetY - item.sy) < 0.05) item.sy = targetY;
    if (Math.abs(targetScale - item.ss) < 0.0005) item.ss = targetScale;
    if (Math.abs(targetOpacity - item.so) < 0.005) item.so = targetOpacity;

    // Lighter stabilization to avoid snapping (to 0.1px resolution)
    const tx = Math.round(item.sx * 10) / 10;
    
    if (item.isSkill) {
      const ty = Math.round((item.sy + blurRaw * 10 * mobileFactor * item.parallaxMul) * 10) / 10;
      const ts = item.ss.toFixed(3);
      const blurMul = isMobile ? 0 : 2.0;
      const blurAmount = blurCurve * blurMul;

      item.el.style.opacity = item.so.toFixed(2);
      item.el.style.transform = `translate3d(${tx}px, ${(ty + idleY).toFixed(2)}px, 0) scale(${ts})`;
      item.el.style.filter = blurAmount > 0.05 ? `blur(${blurAmount.toFixed(2)}px)` : 'none';
      return;
    }

    // Default — disable blur during scroll
    const ty = Math.round(item.sy * 10) / 10;
    const ts = item.ss.toFixed(3);
    const blurMul = (isMobile || isScrolling) ? 0 : 0.25;
    const blurAmount = blurCurve * blurMul;
    const filterVal = blurAmount > 0.05 ? `blur(${blurAmount.toFixed(2)}px)` : 'none';

    const scrollTransform = `translate3d(${tx}px, ${(ty + idleY).toFixed(2)}px, 0) scale(${ts})`;

    // Store scroll transform
    item.el.__scrollTransform = scrollTransform;

    item.el.style.opacity = item.so.toFixed(2);
    item.el.style.transform = scrollTransform;
    item.el.style.filter = filterVal;
  });
}

// ============================================
// DEPTH LAYER PARALLAX
// ============================================
export function applyDepthLayers(scrollY) {
  if (prefersReducedMotion) return;

  // Background (body::before): 0.1x — handled via CSS var
  document.body.style.setProperty('--scrollY', (scrollY * 0.1) + 'px');

  // Mid-layer section elements get subtle parallax via the animation system
  // Foreground project images: handled inside 3D tilt system
}

// ============================================
// UPDATE SCROLL STATE (called from main loop)
// ============================================
export function updateScrollState(scrollY, dt = 1 / 60) {
  const raw = scrollY - lastScrollY;

  // Normalize + smooth velocity to avoid snapping when direction changes.
  scrollVelocity = raw * 0.1;
  smoothVelocity += (scrollVelocity - smoothVelocity) * 0.08;

  // Idle decay keeps motion alive while settling naturally.
  if (Math.abs(scrollVelocity) < 0.001) {
    smoothVelocity *= 0.92;
  }

  lastScrollY = scrollY;

  // Detect idle state
  if (Math.abs(scrollVelocity) > 0.02) {
    isScrolling = true;
    scrollIdleTimer = 0;
  } else {
    isScrolling = false;
    scrollIdleTimer += dt;
  }
}

// ============================================
// SCROLL PROGRESS BAR
// ============================================
export function updateProgressBar(scrollY, viewportHeight, progressBar, dt = 1 / 60) {
  const docHeight = document.body.scrollHeight - viewportHeight;
  scrollProgressTarget = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;

  const progressDelta = scrollProgressTarget - scrollProgressCurrent;
  const baseProgressSpeed = 0.08 + Math.min(Math.abs(progressDelta) * 0.005, 0.15);
  const progressSpeed = 1 - Math.pow(1 - baseProgressSpeed, dt * 60);
  scrollProgressCurrent += progressDelta * progressSpeed;

  if (Math.abs(progressDelta) < 0.05) {
    scrollProgressCurrent = scrollProgressTarget;
  }
  if (progressBar) {
    progressBar.style.width = scrollProgressCurrent + '%';
  }
}
