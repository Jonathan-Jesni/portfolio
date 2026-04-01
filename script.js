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
      offsetX: isLeft ? -70 : isRight ? 70 : 0,
      offsetY: isLeft || isRight ? 0 : 40,
      isHero,
      isSkill: false,
      isProjectCard: el.classList.contains('project-card'),
      // Organic variation per element
      parallaxMul: 0.9 + seed * 0.2,     // 0.9–1.1
      scaleMul: 0.97 + seed * 0.06,       // 0.97–1.03
      delayOffset: seed * 0.04,            // 0–0.04
      cachedTop: 0,
      cachedHeight: 0,
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
    });
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
  const y = Math.sin(time * 0.8 + phase) * 0.8;  // ±0.8px
  const s = 1 + Math.sin(time * 0.6 + phase + 1.5) * 0.002; // ±0.002 scale
  return { y, s };
}

// ============================================
// APPLY SCROLL-SYNCED TRANSFORMS
// ============================================
const mobileFactor = isMobile ? 0.5 : 1;

function applyScrollTransforms(scrollY, viewportHeight, time) {
  // Reduced velocity boost (max 8% instead of 15%)
  const velocityBoost = 1 + Math.min(Math.abs(smoothVelocity) * 0.002, 0.08);
  // Idle blend: ramp up floating when scroll stops
  const idleBlend = isScrolling ? 0 : Math.min(scrollIdleTimer * 0.3, 1);

  scrollElements.forEach((item, idx) => {
    if (item.isHero) {
      const heroFloat = Math.sin(time * 0.4) * 1.2;
      item.el.style.opacity = '1';
      item.el.style.transform = `translate(0, ${heroFloat.toFixed(2)}px) scale(1)`;
      item.el.style.filter = '';
      return;
    }

    let progress = getElementProgress(item, scrollY, viewportHeight);

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

    const opacity = progress;
    const baseScale = 0.96 + 0.04 * progress;
    const scale = baseScale * item.scaleMul;

    // Non-linear slide easing: (1-progress)^1.4 for stronger entry, smoother finish
    const slideEase = Math.pow(1 - progress, 1.4);
    const translateX = item.offsetX * slideEase * mobileFactor * velocityBoost * item.parallaxMul;
    const translateY = item.offsetY * (1 - progress) * mobileFactor * velocityBoost * item.parallaxMul;

    // Non-linear blur: drops off faster near visibility (power curve)
    const blurRaw = 1 - progress;
    const blurCurve = Math.pow(blurRaw, 2.2); // Faster falloff near visible

    // Idle float (only when element is visible)
    const idle = progress > 0.5 ? getIdleFloat(idx, time) : { y: 0, s: 1 };
    const idleY = idle.y * idleBlend;
    const idleScale = 1 + (idle.s - 1) * idleBlend;

    if (item.isSkill) {
      const parallaxY = translateY + blurRaw * 10 * mobileFactor * item.parallaxMul;
      const finalScale = scale * idleScale;
      const blurMul = isMobile ? 0 : 2.0;
      const blurAmount = blurCurve * blurMul;

      item.el.style.opacity = opacity.toFixed(3);
      item.el.style.transform =
        `translate(${translateX.toFixed(1)}px, ${(parallaxY + idleY).toFixed(2)}px) scale(${finalScale.toFixed(4)})`;
      item.el.style.filter = blurAmount > 0.05 ? `blur(${blurAmount.toFixed(2)}px)` : 'none';
      return;
    }

    // Default + project cards
    const blurMul = isMobile ? 0 : 0.8;
    const blurAmount = blurCurve * blurMul;
    const finalScale = scale * idleScale;

    item.el.style.opacity = opacity.toFixed(3);
    item.el.style.transform =
      `translate(${translateX.toFixed(1)}px, ${(translateY + idleY).toFixed(2)}px) scale(${finalScale.toFixed(4)})`;
    item.el.style.filter = blurAmount > 0.05 ? `blur(${blurAmount.toFixed(2)}px)` : 'none';
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

  // --- 3D Tilt (project cards) ---
  const projectCards = document.querySelectorAll('.project-card');
  const tiltStates = [];
  projectCards.forEach(card => {
    tiltStates.push({
      el: card,
      rx: 0, ry: 0,   // Current rotation
      trx: 0, try: 0, // Target rotation
      inside: false,
    });

    card.addEventListener('mouseenter', () => {
      const state = tiltStates.find(s => s.el === card);
      if (state) state.inside = true;
    });
    card.addEventListener('mouseleave', () => {
      const state = tiltStates.find(s => s.el === card);
      if (state) {
        state.inside = false;
        state.trx = 0;
        state.try = 0;
      }
    });
    card.addEventListener('mousemove', (e) => {
      const state = tiltStates.find(s => s.el === card);
      if (!state) return;
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;
      // Normalize to -1..1
      const nx = (e.clientX - cx) / (rect.width * 0.5);
      const ny = (e.clientY - cy) / (rect.height * 0.5);
      state.trx = -ny * 5;  // Max 5 degrees
      state.try = nx * 5;
    });
  });

  // --- Spotlight ---
  // Show spotlight after first mouse movement
  let spotlightActive = false;

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
      document.body.style.setProperty('--spotlight-opacity', '1');
    }
    if (spotlightActive) {
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

    // 6. 3D Tilt on project cards
    for (let i = 0; i < tiltStates.length; i++) {
      const t = tiltStates[i];
      // Smooth interpolation toward target
      t.rx += (t.trx - t.rx) * 0.1;
      t.ry += (t.try - t.ry) * 0.1;

      // Snap to zero when very close
      if (!t.inside && Math.abs(t.rx) < 0.05 && Math.abs(t.ry) < 0.05) {
        t.rx = 0;
        t.ry = 0;
      }

      if (t.rx !== 0 || t.ry !== 0) {
        t.el.style.transform = `rotateX(${t.rx.toFixed(2)}deg) rotateY(${t.ry.toFixed(2)}deg)`;
      }
    }

    requestAnimationFrame(animateCursorEffects);
  }

  animateCursorEffects();
}
