// ============================================
// MAIN ENTRY POINT — single rAF loop orchestrator
// ============================================
import { isMobile } from './utils.js';
import {
  registerElements,
  updateCachedPositions,
  updateScrollState,
  applyScrollTransforms,
  applyDepthLayers,
  updateProgressBar,
} from './scrollEngine.js';
import { initTiltSystem, updateTilt } from './tiltSystem.js';
import { initCursorEffects, updateCursorEffects, mouseState } from './cursorEffects.js';
import * as scrollEngine from './scrollEngine.js';

// ============================================
// DOM CACHE
// ============================================
const navbar = document.getElementById('navbar');
const progressBar = document.getElementById('progress-bar');
const mobileToggle = document.getElementById('mobile-toggle');
const mobileMenu = document.getElementById('mobile-menu');
const anchorLinks = document.querySelectorAll('a[href^="#"]');

// ============================================
// RESIZE HANDLER
// ============================================
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(updateCachedPositions, 200);
}, { passive: true });

// ============================================
// MAIN rAF LOOP — single loop for scroll engine
// ============================================
let lastLoopScrollY = -1;
let animationTime = 0;

function mainLoop(timestamp) {
  const scrollY = window.scrollY;
  const viewportHeight = window.innerHeight;
  animationTime = timestamp * 0.001; // Convert to seconds

  // Update scroll velocity state
  updateScrollState(scrollY);

  // Recalculate on scroll change
  if (scrollY !== lastLoopScrollY) {
    // Navbar
    if (navbar) {
      if (scrollY > 50) navbar.classList.add('scrolled');
      else navbar.classList.remove('scrolled');
    }

    // Depth-layered parallax
    applyDepthLayers(scrollY);

    lastLoopScrollY = scrollY;
  }

  // Always apply transforms (idle float needs continuous updates)
  applyScrollTransforms(scrollY, viewportHeight, animationTime);

  // Dynamic progress bar
  updateProgressBar(scrollY, viewportHeight, progressBar);

  if (!isMobile) {
    updateCursorEffects();
    updateTilt(mouseState);
  }

  requestAnimationFrame(mainLoop);
}

// ============================================
// DESKTOP-ONLY EFFECTS
// (cursor trail, magnetic buttons, 3D tilt, spotlight)
// ============================================
if (!isMobile) {
  initCursorEffects(() => scrollEngine.smoothVelocity);
  initTiltSystem(mouseState);
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
