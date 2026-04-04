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
  resyncScrollEngine,
} from './scrollEngine.js';
import { initCursorEffects, updateCursorEffects } from './cursorEffects.js';

// ============================================
// INTRO LOADER — Multilingual Greeting Sequence
// ============================================
(function runIntroLoader() {
  const loader = document.getElementById('intro-loader');
  const greetingEl = document.getElementById('greeting-text');
  if (!loader || !greetingEl) return;

  const greetings = [
    'initializing system',
    'loading modules',
    'allocating memory',
    'configuring network',
    'ai-core ready',
    'system ready'
  ];

  let i = 0;
  const startTime = performance.now();

  function pad(num) {
    return num.toString().padStart(2, '0');
  }

  function showNext() {
    if (i >= greetings.length) {
      // Done — start fading loader & start hero simultaneously
      loader.classList.add('loader-done');
      document.body.classList.remove('loading');
      document.body.classList.add('intro-done');

      setTimeout(() => loader.remove(), 600);
      return;
    }

    // Calc relative timing
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);

    // Calc absolute timing
    const now = new Date();
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const span = document.createElement('span');
    span.className = 'boot-line';

    const textFormat = `<span class="boot-time">[${timeStr} | ${elapsed}s]</span> ${greetings[i]}`;

    if (i === greetings.length - 1) {
      span.innerHTML = `${textFormat}<span class="terminal-cursor">_</span>`;
    } else {
      span.innerHTML = textFormat;
    }

    greetingEl.appendChild(span);

    // Final line hold vs standard line hold 
    const holdTime = (i === greetings.length - 1) ? 350 : Math.floor(Math.random() * 40) + 160;

    setTimeout(() => {
      i++;
      showNext();
    }, holdTime);
  }

  showNext();
})();

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
let lastActiveImageBlock = null;

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

    if (closestBlock !== lastActiveImageBlock) {
      if (lastActiveImageBlock) lastActiveImageBlock.classList.remove('active');
      closestBlock.classList.add('active');
      lastActiveImageBlock = closestBlock;
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

// ============================================
// ABOUT SECTION — One-Time Typing Effect
// ============================================
(function initTypingEffect() {
  const snippet = document.getElementById('about-code-snippet');
  if (!snippet) return;

  const pre = snippet.querySelector('pre');
  if (!pre) return;

  // Capture the full HTML content to type out
  const fullHTML = pre.innerHTML;
  let typed = false;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !typed) {
        typed = true;
        observer.disconnect();
        startTyping(pre, fullHTML);
      }
    });
  }, { threshold: 0.3 });

  observer.observe(snippet);

  function startTyping(el, html) {
    // Parse out text content (preserving tags)
    const chars = [];
    let inTag = false;
    let tagBuffer = '';

    for (let c = 0; c < html.length; c++) {
      const ch = html[c];
      if (ch === '<') {
        inTag = true;
        tagBuffer = '<';
      } else if (ch === '>' && inTag) {
        inTag = false;
        tagBuffer += '>';
        // Push the entire tag as a single "char" (instant, non-visible)
        chars.push({ type: 'tag', value: tagBuffer });
        tagBuffer = '';
      } else if (inTag) {
        tagBuffer += ch;
      } else {
        chars.push({ type: 'char', value: ch });
      }
    }

    // Add cursor
    el.innerHTML = '<span class="typing-cursor">▌</span>';
    let rendered = '';
    let idx = 0;
    const CHAR_DELAY = 22; // ms per visible character
    let lastTime = 0;

    function typeFrame(timestamp) {
      if (idx >= chars.length) {
        // Done — remove cursor
        el.innerHTML = rendered;
        return;
      }

      if (!lastTime) lastTime = timestamp;
      const elapsed = timestamp - lastTime;

      if (elapsed >= CHAR_DELAY) {
        // Type all tags instantly, then one visible char
        while (idx < chars.length && chars[idx].type === 'tag') {
          rendered += chars[idx].value;
          idx++;
        }
        if (idx < chars.length) {
          rendered += chars[idx].value;
          idx++;
        }
        el.innerHTML = rendered + '<span class="typing-cursor">▌</span>';
        lastTime = timestamp;
      }

      requestAnimationFrame(typeFrame);
    }

    requestAnimationFrame(typeFrame);
  }
})();

// ============================================
// SKILLS MODULE EXPANSION (Mobile/Click handling)
// ============================================
document.querySelectorAll('.skill-category').forEach(category => {
  const items = category.querySelectorAll('.skill-list li');
  items.forEach(item => {
    item.addEventListener('click', (e) => {
      if (window.matchMedia('(hover: hover)').matches) return; // Let CSS handle desktop hover
      
      const isExpanded = item.classList.contains('expanded');
      items.forEach(sibling => sibling.classList.remove('expanded'));
      if (!isExpanded) {
        item.classList.add('expanded');
      }
      
      // Recalculate layout heights and fully reset child animations after CSS slide-down
      setTimeout(resyncScrollEngine, 300);
    });
  });
});

// ============================================
// DUAL-MODE SKILLS VIEW & NETWORK INTERACTION
// ============================================
const toggleBtns = document.querySelectorAll('.skills-view-toggle .toggle-btn');
const systemView = document.getElementById('view-system');
const visualView = document.getElementById('view-visual');

toggleBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.classList.contains('active')) return;
    
    toggleBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    if (btn.dataset.view === 'visual') {
      systemView.classList.remove('active');
      visualView.classList.add('active');
    } else {
      visualView.classList.remove('active');
      systemView.classList.add('active');
    }
    
    // Force full scroll engine resync after display toggle settles completely
    requestAnimationFrame(() => {
      setTimeout(resyncScrollEngine, 20);
    });
  });
});

