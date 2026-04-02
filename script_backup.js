// ============================================
// DOM CACHE
// ============================================
const navbar = document.getElementById('navbar');
const progressBar = document.getElementById('progress-bar');
const mobileToggle = document.getElementById('mobile-toggle');
const mobileMenu = document.getElementById('mobile-menu');
const anchorLinks = document.querySelectorAll('a[href^="#"]');
const isMobile = matchMedia('(pointer: coarse)').matches;

// ============================================
// SCROLL-SYNCED ANIMATION ENGINE
// ============================================
const scrollElements = [];

// Seed-based pseudo-random for organic variation (deterministic per element)
function seededRandom(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function registerElements() {
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
      isProjectCard: el.classList.contains('project-card'),
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
      isProjectCard: false,
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
      if (item.isHero) {
        item.el.style.cssText = 'opacity:1;transform:translate(0,0) scale(1);filter:none;';
      } else {
        item.el.style.cssText = 'opacity:1;transform:translate(0px,0px) scale(1);filter:none;will-change:transform;';
      }
    }
  });

  updateCachedPositions();
}

function updateCachedPositions() {
  const scrollY = window.scrollY;
  scrollElements.forEach(item => {
    const rect = item.el.getBoundingClientRect();
    item.cachedTop = rect.top + scrollY;
    item.cachedHeight = rect.height;
  });
}

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(updateCachedPositions, 200);
}, { passive: true });

// ============================================
// EASING FUNCTIONS
// ============================================
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

// ============================================
// SCROLL VELOCITY TRACKER
// ============================================
let scrollVelocity = 0;
let lastScrollY = 0;
let smoothVelocity = 0;
let isScrolling = false;
let scrollIdleTimer = 0;

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
let idleTime = 0; // Accumulates when not scrolling

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

function applyScrollTransforms(scrollY, viewportHeight, time) {
  const lerpFactor = 0.12;
  const projectLerpFactor = 0.09;
  // Idle blend: ramp up floating when scroll stops
  const idleBlend = isScrolling ? 0 : Math.min(scrollIdleTimer * 0.3, 1);

  scrollElements.forEach((item, idx) => {
    if (item.isHero) {
      const heroFloat = Math.sin(time * 0.4) * 1.2;
      item.el.style.cssText = `opacity:1;transform:translate(0,${heroFloat.toFixed(2)}px) scale(1);filter:none;`;
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

    // Reveal-once soft lock: after 80% visibility, never drop below 40%
    if (progress > 0.8) {
      item.revealed = true;
    }
    if (item.revealed) {
      progress = Math.max(progress, 0.4);
    }

    const targetOpacity = progress;
    const baseScale = 0.96 + 0.04 * progress;
    const targetScale = baseScale * item.scaleMul;

    // Softer slide easing: (1-progress)^1.4 — smoother deceleration, less abrupt
    const slideEase = item.isProjectCard
      ? Math.pow(1 - progress, 1.6)
      : Math.pow(1 - progress, 1.4);
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

      item.el.style.cssText = `opacity:${item.so.toFixed(2)};transform:translate(${item.sx.toFixed(1)}px,${(parallaxY + idleY).toFixed(2)}px) scale(${finalScale.toFixed(2)});filter:${blurAmount > 0.05 ? `blur(${blurAmount.toFixed(2)}px)` : 'none'};will-change:opacity,transform,filter;`;
      return;
    }

    // Default + project cards — no filter for project cards; disable blur during scroll for others
    const blurMul = item.isProjectCard ? 0 : ((isMobile || isScrolling) ? 0 : 0.25);
    const blurAmount = blurCurve * blurMul;
    const finalScale = item.ss * idleScale;
    const filterVal = blurAmount > 0.05 ? `blur(${blurAmount.toFixed(2)}px)` : 'none';

    const scrollTransform =
      `translate(${item.sx.toFixed(1)}px,${(item.sy + idleY).toFixed(2)}px) scale(${finalScale.toFixed(2)})`;

    // Store scroll transform — tilt system will combine when hovering
    item.el.__scrollTransform = scrollTransform;

    if (item.isProjectCard && !isMobile) {
      // Desktop Project cards: scroll system writes opacity + filter ONLY.
      // Transform is strictly unified under the tilt system's rAF loop to prevent conflicts.
      item.el.style.opacity = item.so.toFixed(2);
      item.el.style.filter = filterVal;
    } else {
      // Mobile project cards & all other elements: single batched DOM write
      item.el.style.cssText = `opacity:${item.so.toFixed(2)};transform:${scrollTransform};filter:${filterVal};will-change:transform;`;
    }
  });
}

// ============================================
// SCROLL PROGRESS BAR — dynamic interpolation
// ============================================
let scrollProgressCurrent = 0;
let scrollProgressTarget = 0;

// ============================================
// DEPTH LAYER PARALLAX
// ============================================
function applyDepthLayers(scrollY) {
  // Background (body::before): 0.1x — handled via CSS var
  document.body.style.setProperty('--scrollY', (scrollY * 0.1) + 'px');

  // Mid-layer section elements get subtle parallax via the animation system
  // Foreground project images: handled inside 3D tilt system
}

// ============================================
// MAIN rAF LOOP — single loop for everything
// ============================================
let lastLoopScrollY = -1;
let animationTime = 0;

function mainLoop(timestamp) {
  const scrollY = window.scrollY;
  const viewportHeight = window.innerHeight;
  animationTime = timestamp * 0.001; // Convert to seconds

  // Scroll velocity (smoothed)
  scrollVelocity = scrollY - lastScrollY;
  smoothVelocity += (scrollVelocity - smoothVelocity) * 0.2;
  lastScrollY = scrollY;

  // Detect idle state
  if (Math.abs(scrollVelocity) > 0.5) {
    isScrolling = true;
    scrollIdleTimer = 0;
  } else {
    isScrolling = false;
    scrollIdleTimer += 0.016; // ~1 frame at 60fps
  }

  // Recalculate on scroll change
  if (scrollY !== lastLoopScrollY) {
    // Navbar
    if (navbar) {
      if (scrollY > 50) navbar.classList.add('scrolled');
      else navbar.classList.remove('scrolled');
    }

    // Depth-layered parallax
    applyDepthLayers(scrollY);

    // Scroll progress target
    const docHeight = document.body.scrollHeight - viewportHeight;
    scrollProgressTarget = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;

    lastLoopScrollY = scrollY;
  }

  // Always apply transforms (idle float needs continuous updates)
  applyScrollTransforms(scrollY, viewportHeight, animationTime);

  // Dynamic progress bar
  const progressDelta = scrollProgressTarget - scrollProgressCurrent;
  const progressSpeed = 0.08 + Math.min(Math.abs(progressDelta) * 0.005, 0.15);
  scrollProgressCurrent += progressDelta * progressSpeed;

  if (Math.abs(progressDelta) < 0.05) {
    scrollProgressCurrent = scrollProgressTarget;
  }
  if (progressBar) {
    progressBar.style.width = scrollProgressCurrent + '%';
  }

  requestAnimationFrame(mainLoop);
}

// ============================================
// INITIALIZE
// ============================================
window.addEventListener('load', () => {
  registerElements();
  lastLoopScrollY = -1;
  requestAnimationFrame(mainLoop);
});

if (document.readyState === 'complete') {
  registerElements();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    registerElements();
    lastLoopScrollY = -1;
  });
}

// ============================================
// MOBILE MENU TOGGLE
// ============================================
if (mobileToggle && mobileMenu) {
  mobileToggle.addEventListener('click', () => {
    mobileToggle.classList.toggle('active');
    mobileMenu.classList.toggle('active');
  });

  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mobileToggle.classList.remove('active');
      mobileMenu.classList.remove('active');
    });
  });
}

mobileToggle?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') mobileToggle.click();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && mobileMenu?.classList.contains('active')) {
    mobileToggle.classList.remove('active');
    mobileMenu.classList.remove('active');
  }
});

// ============================================
// SMOOTH SCROLL FOR NAV LINKS
// ============================================
anchorLinks.forEach((anchor) => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// ============================================
// HOVER INTENT FOR IMAGE SWAPS
// ============================================
document.querySelectorAll('.hover-swap').forEach(card => {
  let timeout;
  card.addEventListener('mouseenter', () => {
    timeout = setTimeout(() => card.classList.add('hover-active'), 60);
  });
  card.addEventListener('mouseleave', () => {
    clearTimeout(timeout);
    card.classList.remove('hover-active');
  });
});

// ============================================
// DESKTOP-ONLY EFFECTS
// (cursor trail, magnetic buttons, 3D tilt, spotlight)
// ============================================
if (!isMobile) {
  // --- Mouse state ---
  let mouseX = 0, mouseY = 0;
  let smoothMouseX = 0, smoothMouseY = 0;
  let glowX = 0, glowY = 0;
  let lastTrailX = 0, lastTrailY = 0;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }, { passive: true });

  // --- Cursor glow ---
  const cursorGlow = document.createElement('div');
  cursorGlow.classList.add('cursor-glow');
  document.body.appendChild(cursorGlow);

  // --- Trail particles (variable size + opacity) ---
  const TRAIL_COUNT = 12;
  const trails = [];
  for (let i = 0; i < TRAIL_COUNT; i++) {
    const t = document.createElement('div');
    t.classList.add('cursor-trail');
    document.body.appendChild(t);
    trails.push({ el: t, x: 0, y: 0, life: 0, size: 0, ix: 0, iy: 0 });
  }
  let trailIndex = 0;

  function spawnTrail() {
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
      trail.el.style.opacity = opacityVar.toFixed(3);
      trailIndex++;

      lastTrailX = mouseX;
      lastTrailY = mouseY;
    }
  }

  const magneticBtns = document.querySelectorAll('.btn');
  const btnStates = [];
  magneticBtns.forEach(btn => {
    btnStates.push({ el: btn, cx: 0, cy: 0, cs: 1, tx: 0, ty: 0, ts: 1 });
  });

  // --- 3D Tilt (project cards) + Micro Parallax on images ---
  const projectCards = document.querySelectorAll('.project-card');
  const tiltStates = [];
  projectCards.forEach((card, index) => {
    const imgContainer = card.querySelector('.project-image');
    const spotlightEl = card.querySelector('.card-spotlight');
    const state = {
      el: card,
      imgEl: imgContainer,
      spotlightEl: spotlightEl,
      rx: 0, ry: 0,   // Current rotation
      trx: 0, try: 0, // Target rotation
      imgTx: 0, imgTy: 0, imgScale: 1,       // Current image parallax
      imgTtx: 0, imgTty: 0, imgTscale: 1,    // Target image parallax
      inside: false,
      // Cached rect — updated in rAF, never in event handlers
      cachedRect: null,
    };
    tiltStates.push(state);

    // Direct reference — no .find() needed
    // Micro delay prevents harsh instant tilt activation on fast cursor passes
    let hoverTimeout;
    card.addEventListener('mouseenter', () => {
      hoverTimeout = setTimeout(() => {
        state.inside = true;
        card.__isHovered = true;
      }, 40);
    });
    card.addEventListener('mouseleave', () => {
      clearTimeout(hoverTimeout);
      card.__isHovered = false;
      state.inside = false;
      state.trx = 0;
      state.try = 0;
      state.imgTtx = 0;
      state.imgTty = 0;
      state.imgTscale = 1;
    });
    // mousemove: just record mouse position — tilt calculated in rAF
    // No getBoundingClientRect() here — that's the key perf fix
  });

  // --- Spotlight ---
  // Show spotlight after first mouse movement
  let spotlightActive = false;
  let lastSpotlightVal = '0';

  // --- Unified cursor animation loop ---
  function animateCursorEffects() {
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
          trail.el.style.opacity = (trail.life * 0.35).toFixed(3);
        }
      }
    }

    // 4. Spotlight (smoothed mouse position for jitter-free tracking)
    smoothMouseX += (mouseX - smoothMouseX) * 0.12;
    smoothMouseY += (mouseY - smoothMouseY) * 0.12;
    if (!spotlightActive && (mouseX !== 0 || mouseY !== 0)) {
      spotlightActive = true;
    }
    // Disable heavy spotlight gradient during fast scrolling — only update when value changes
    const isFastScroll = Math.abs(smoothVelocity) > 2;
    const newSpotlightVal = (spotlightActive && !isFastScroll) ? '1' : '0';
    if (newSpotlightVal !== lastSpotlightVal) {
      document.body.style.setProperty('--spotlight-opacity', newSpotlightVal);
      lastSpotlightVal = newSpotlightVal;
    }
    if (spotlightActive && !isFastScroll) {
      document.body.style.setProperty('--mx', smoothMouseX.toFixed(0) + 'px');
      document.body.style.setProperty('--my', smoothMouseY.toFixed(0) + 'px');
    }

    // 5. Magnetic buttons (elastic JS interpolation + scale)
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
        b.el.style.transform = `translate(${b.cx.toFixed(1)}px, ${b.cy.toFixed(1)}px) scale(${b.cs.toFixed(4)})`;
      } else {
        b.el.style.transform = '';
      }
    }

    // 6. 3D Tilt on project cards + image micro-parallax
    for (let i = 0; i < tiltStates.length; i++) {
      const t = tiltStates[i];

      // Update tilt targets from mouse position inside rAF (no getBoundingClientRect in events)
      if (t.inside) {
        const rect = t.el.getBoundingClientRect();
        t.cachedRect = rect;
        const cx = rect.left + rect.width * 0.5;
        const cy = rect.top + rect.height * 0.5;
        const nx = (mouseX - cx) / (rect.width * 0.5);
        const ny = (mouseY - cy) / (rect.height * 0.5);
        t.trx = -ny * 5;
        t.try = nx * 5;
        t.imgTtx = nx * 8;
        t.imgTty = ny * 8;
        t.imgTscale = 1.025;
      }

      // Smooth interpolation toward target (0.06 = softer than 0.1, prevents stutter)
      t.rx += (t.trx - t.rx) * 0.06;
      t.ry += (t.try - t.ry) * 0.06;

      // Image parallax interpolation
      t.imgTx += (t.imgTtx - t.imgTx) * 0.08;
      t.imgTy += (t.imgTty - t.imgTy) * 0.08;
      t.imgScale += (t.imgTscale - t.imgScale) * 0.08;

      // Snap to zero when very close
      if (!t.inside && Math.abs(t.rx) < 0.05 && Math.abs(t.ry) < 0.05) {
        t.rx = 0;
        t.ry = 0;
      }
      if (!t.inside && Math.abs(t.imgTx) < 0.1 && Math.abs(t.imgTy) < 0.1 && Math.abs(t.imgScale - 1) < 0.001) {
        t.imgTx = 0;
        t.imgTy = 0;
        t.imgScale = 1;
      }

      // Always apply unified transform: scroll base + tilt (even when tilt is zero)
      const hasTilt = Math.abs(t.rx) > 0.01 || Math.abs(t.ry) > 0.01;
      const scrollT = t.el.__scrollTransform || '';
      if (hasTilt) {
        t.el.style.transform =
          `${scrollT} rotateX(${t.rx.toFixed(2)}deg) rotateY(${t.ry.toFixed(2)}deg)`;
      } else {
        // No tilt — still apply scroll transform so project cards stay positioned
        t.el.style.transform = scrollT;
      }

      // Apply micro-parallax to project image
      if (t.imgEl && (t.imgTx !== 0 || t.imgTy !== 0 || t.imgScale !== 1)) {
        t.imgEl.style.transform = `translate(${t.imgTx.toFixed(1)}px, ${t.imgTy.toFixed(1)}px) scale(${t.imgScale.toFixed(4)})`;
      } else if (t.imgEl) {
        t.imgEl.style.transform = '';
      }

      // 7. Magnetic spotlight — use cached rect from above (no extra reflow)
      if (t.spotlightEl && t.inside && t.cachedRect) {
        const sx = ((mouseX - t.cachedRect.left) / t.cachedRect.width) * 100;
        const sy = ((mouseY - t.cachedRect.top) / t.cachedRect.height) * 100;
        t.spotlightEl.style.setProperty('--sx', sx.toFixed(1) + '%');
        t.spotlightEl.style.setProperty('--sy', sy.toFixed(1) + '%');
      }
    }

    requestAnimationFrame(animateCursorEffects);
  }

  animateCursorEffects();
}

// ============================================
// SUBTLE SECTION DEPTH FEEDBACK
// (Uses class toggle instead of inline styles to avoid layout thrashing during scroll)
// ============================================
document.querySelectorAll('section').forEach(section => {
  section.addEventListener('mouseenter', () => {
    section.classList.add('section-depth-active');
  });
  section.addEventListener('mouseleave', () => {
    section.classList.remove('section-depth-active');
  });
});
