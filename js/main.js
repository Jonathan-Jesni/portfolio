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
  smoothVelocity,
} from './scrollEngine.js';
import { initCursorEffects, updateCursorEffects } from './cursorEffects.js';

// ============================================
// DOM CACHE
// ============================================
const navbar = document.getElementById('navbar');
const progressBar = document.getElementById('progress-bar');
const mobileToggle = document.getElementById('mobile-toggle');
const mobileMenu = document.getElementById('mobile-menu');
const anchorLinks = document.querySelectorAll('a[href^="#"]');

// Scroll-synced project text switcher (desktop only)
const imageBlocks = document.querySelectorAll('.image-block');
const projectTexts = document.querySelectorAll('.project-text');
let lastActiveProject = '0';

function updateActiveProject() {
  const viewportCenter = window.innerHeight * 0.45;
  let closestBlock = null;
  let closestDist = Infinity;

  for (let i = 0; i < imageBlocks.length; i++) {
    const rect = imageBlocks[i].getBoundingClientRect();
    const blockCenter = rect.top + rect.height * 0.5;
    const dist = Math.abs(blockCenter - viewportCenter);
    if (dist < closestDist) {
      closestDist = dist;
      closestBlock = imageBlocks[i];
    }
  }

  if (closestBlock) {
    const projectId = closestBlock.dataset.project;
    if (projectId !== lastActiveProject) {
      for (let i = 0; i < projectTexts.length; i++) {
        projectTexts[i].classList.remove('active');
      }
      const target = document.querySelector(`.project-text[data-project="${projectId}"]`);
      if (target) target.classList.add('active');
      lastActiveProject = projectId;
    }
  }
}

// ============================================
// IMAGE BLOCK REVEAL — IntersectionObserver
// ============================================
const imageBlockObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      imageBlockObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

imageBlocks.forEach(block => imageBlockObserver.observe(block));

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
    updateActiveProject();
    updateCursorEffects();
  }

  requestAnimationFrame(mainLoop);
}

// ============================================
// DESKTOP-ONLY EFFECTS
// (cursor trail, magnetic buttons, 3D tilt, spotlight)
// ============================================
if (!isMobile) {
  initCursorEffects(() => smoothVelocity);
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
  
  // CRITICAL: Re-calculate positions after all images load and claim layout space
  window.addEventListener('load', () => {
    updateCachedPositions();
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
