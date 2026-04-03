// ============================================
// SCROLL-SYNCED ANIMATION ENGINE
// ============================================
import { seededRandom, easeOutCubic, easeOutQuart, isMobile } from './utils.js';

const scrollElements = [];

// ============================================
// SCROLL VELOCITY TRACKER (shared state)
// ============================================
export let scrollVelocity = 0;
export let lastScrollY = 0;
export let smoothVelocity = 0;
export let isScrolling = false;
export let scrollIdleTimer = 0;

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
    const isLeft = el.classList.contains('reveal-left');
    const isRight = el.classList.contains('reveal-right');
    const isHero = el.closest('#hero') !== null;
    const seed = seededRandom(idx + 1);

    scrollElements.push({
      el,
      type: isLeft ? 'left' : isRight ? 'right' : 'up',
      offsetX: isLeft ? -105 : isRight ? 105 : 0,
      offsetY: isLeft || isRight ? 0 : 52,
      isHero,
      isSkill: false,
      // Organic variation per element
      parallaxMul: 0.9 + seed * 0.2,     // 0.9–1.1
      scaleMul: 0.97 + seed * 0.06,       // 0.97–1.03
      delayOffset: seed * 0.04,            // 0–0.04
      cachedTop: 0,
      cachedHeight: 0,
      // Lerp state for smooth interpolation
      sx: isLeft ? -105 : isRight ? 105 : 0,
      sy: isLeft || isRight ? 0 : 52,
      ss: 0.96,
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
      offsetX: 0,
      offsetY: 30,
      staggerIndex: i,
      isHero: false,
      isSkill: true,
      parallaxMul: 0.85 + seed * 0.3,
      scaleMul: 0.97 + seed * 0.06,
      delayOffset: seed * 0.03,
      cachedTop: 0,
      cachedHeight: 0,
      sx: 0, sy: 30, ss: 0.96, so: 0, revealed: false,
    });
  });

  // Building cards
  document.querySelectorAll('.building-card').forEach((el, i) => {
    const seed = seededRandom(i + 200);
    scrollElements.push({
      el,
      type: 'stagger',
      offsetX: 0,
      offsetY: 30,
      staggerIndex: i,
      isHero: false,
      isSkill: false,
      isProjectCard: false,
      parallaxMul: 0.9 + seed * 0.2,
      scaleMul: 0.97 + seed * 0.06,
      delayOffset: seed * 0.03,
      cachedTop: 0,
      cachedHeight: 0,
      sx: 0, sy: 30, ss: 0.96, so: 0, revealed: false,
    });
  });

  // Fix: elements already in viewport on load should be immediately visible (no flicker)
  const viewportThreshold = window.innerHeight * 0.9;
  scrollElements.forEach(item => {
    const rect = item.el.getBoundingClientRect();
    if (rect.top < viewportThreshold) {
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
// SCROLL PROGRESS — viewport-center-distance
// ============================================
function getElementProgress(item, scrollY, viewportHeight) {
  const elementCenter = item.cachedTop + item.cachedHeight * 0.5;
  const viewportCenter = scrollY + viewportHeight * 0.5;

  const distance = elementCenter - viewportCenter;
  const range = viewportHeight * 0.65;

  if (distance > range) return 0;
  if (distance < -range * 0.3) return 1;

  const raw = 1 - Math.max(0, distance / range);
  return easeOutQuart(Math.max(0, Math.min(1, raw)));
}

// ============================================
// IDLE FLOATING MOTION
// ============================================
function getIdleFloat(index, time) {
  // Each element gets a unique phase based on index
  const phase = index * 0.7;
  const y = Math.sin(time * 0.8 + phase) * 0.7;  // ±0.7px (reduced ~12%)
  const s = 1 + Math.sin(time * 0.6 + phase + 1.5) * 0.0017; // ±0.0017 scale (reduced ~15%)
  return { y, s };
}

// ============================================
// APPLY SCROLL-SYNCED TRANSFORMS
// ============================================
const mobileFactor = isMobile ? 0.5 : 1;

export function applyScrollTransforms(scrollY, viewportHeight, time) {
  const lerpFactor = 0.075;
  const projectLerpFactor = 0.065;
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
      const staggerDelay = item.staggerIndex * 0.07;
      progress = Math.max(0, Math.min(1, (progress - staggerDelay) / (1 - staggerDelay)));
      progress = easeOutCubic(progress);
    }

    // No reveal lock — progress tracks scroll position bidirectionally
    // Elements animate in on scroll down, animate out on scroll up

    const targetOpacity = Math.pow(progress, 1.2);
    const baseScale = 0.96 + 0.04 * progress;
    const targetScale = baseScale * item.scaleMul;

    // Softer slide easing: (1-progress)^1.6 — smoother deceleration, less abrupt
    const slideEase = item.isProjectCard
      ? Math.pow(1 - progress, 1.6)
      : Math.pow(1 - progress, 1.6);
    // No velocityBoost on translation — eliminates scroll-spike jitter
    const targetX = item.offsetX * slideEase * mobileFactor * item.parallaxMul;
    const targetY = item.offsetY * (1 - progress) * mobileFactor * item.parallaxMul;

    // Non-linear blur: drops off faster near visibility (power curve)
    const blurRaw = 1 - progress;
    const blurCurve = Math.pow(blurRaw, 2.2);

    // Idle float — disabled for project cards to prevent wobble during reveal
    let idleY = 0;
    let idleScale = 1;
    if (!item.isProjectCard && progress > 0.5) {
      const idle = getIdleFloat(idx, time);
      idleY = idle.y * idleBlend;
      idleScale = 1 + (idle.s - 1) * idleBlend;
    }

    // Lerp toward targets
    const lf = item.isProjectCard ? projectLerpFactor : lerpFactor;
    item.sx += (targetX - item.sx) * lf;
    item.sy += (targetY - item.sy) * lf;
    item.ss += (targetScale - item.ss) * lf;
    item.so += (targetOpacity - item.so) * lf;

    // Micro-jitter clamp — snap when delta is negligible
    if (Math.abs(targetX - item.sx) < 0.05) item.sx = targetX;
    if (Math.abs(targetY - item.sy) < 0.05) item.sy = targetY;
    if (Math.abs(targetScale - item.ss) < 0.0005) item.ss = targetScale;
    if (Math.abs(targetOpacity - item.so) < 0.005) item.so = targetOpacity;

    if (item.isSkill) {
      const parallaxY = item.sy + blurRaw * 10 * mobileFactor * item.parallaxMul;
      const finalScale = item.ss * idleScale;
      const blurMul = isMobile ? 0 : 2.0;
      const blurAmount = blurCurve * blurMul;

      item.el.style.opacity = item.so.toFixed(2);
      item.el.style.transform = `translate3d(${item.sx.toFixed(1)}px,${(parallaxY + idleY).toFixed(2)}px,0) scale(${finalScale.toFixed(2)})`;
      item.el.style.filter = blurAmount > 0.05 ? `blur(${blurAmount.toFixed(2)}px)` : 'none';
      return;
    }

    // Default + project cards — no filter for project cards; disable blur during scroll for others
    const blurMul = item.isProjectCard ? 0 : ((isMobile || isScrolling) ? 0 : 0.25);
    const blurAmount = blurCurve * blurMul;
    const finalScale = item.ss * idleScale;
    const filterVal = blurAmount > 0.05 ? `blur(${blurAmount.toFixed(2)}px)` : 'none';

    const scrollTransform =
      `translate3d(${item.sx.toFixed(1)}px,${(item.sy + idleY).toFixed(2)}px,0) scale(${finalScale.toFixed(2)})`;

    // Store scroll transform — tilt system will combine when hovering
    item.el.__scrollTransform = scrollTransform;

    if (item.isProjectCard && !isMobile) {
      // Desktop Project cards: scroll system writes opacity + filter ONLY.
      // Transform is strictly unified under the tilt system's rAF loop to prevent conflicts.
      item.el.style.opacity = item.so.toFixed(2);
      item.el.style.filter = filterVal;
    } else {
      // Mobile project cards & all other elements
      item.el.style.opacity = item.so.toFixed(2);
      item.el.style.transform = scrollTransform;
      item.el.style.filter = filterVal;
    }
  });
}

// ============================================
// DEPTH LAYER PARALLAX
// ============================================
export function applyDepthLayers(scrollY) {
  // Background (body::before): 0.1x — handled via CSS var
  document.body.style.setProperty('--scrollY', (scrollY * 0.1) + 'px');

  // Mid-layer section elements get subtle parallax via the animation system
  // Foreground project images: handled inside 3D tilt system
}

// ============================================
// UPDATE SCROLL STATE (called from main loop)
// ============================================
export function updateScrollState(scrollY) {
  scrollVelocity = scrollY - lastScrollY;
  smoothVelocity += (scrollVelocity - smoothVelocity) * 0.2;
  lastScrollY = scrollY;

  // Detect idle state
  if (Math.abs(scrollVelocity) > 1) {
    isScrolling = true;
    scrollIdleTimer = 0;
  } else {
    isScrolling = false;
    scrollIdleTimer += 0.016; // ~1 frame at 60fps
  }
}

// ============================================
// SCROLL PROGRESS BAR
// ============================================
export function updateProgressBar(scrollY, viewportHeight, progressBar) {
  const docHeight = document.body.scrollHeight - viewportHeight;
  scrollProgressTarget = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;

  const progressDelta = scrollProgressTarget - scrollProgressCurrent;
  const progressSpeed = 0.08 + Math.min(Math.abs(progressDelta) * 0.005, 0.15);
  scrollProgressCurrent += progressDelta * progressSpeed;

  if (Math.abs(progressDelta) < 0.05) {
    scrollProgressCurrent = scrollProgressTarget;
  }
  if (progressBar) {
    progressBar.style.width = scrollProgressCurrent + '%';
  }
}
