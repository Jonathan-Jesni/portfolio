// ============================================
// DOM CACHE (optimize repeated queries)
// ============================================
const revealEls = document.querySelectorAll('.reveal');
const navbar = document.getElementById('navbar');
const progressBar = document.getElementById('progress-bar');
const mobileToggle = document.getElementById('mobile-toggle');
const mobileMenu = document.getElementById('mobile-menu');
const anchorLinks = document.querySelectorAll('a[href^="#"]');

// ============================================
// INTERSECTION OBSERVER FALLBACK
// ============================================
if (!('IntersectionObserver' in window)) {
  revealEls.forEach(el => {
    el.classList.add('visible');
  });
}

// ============================================
// SCROLL REVEAL ANIMATION
// ============================================
if ('IntersectionObserver' in window) {
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -60px 0px',
    threshold: 0.15
  };

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  revealEls.forEach((el) => {
    revealObserver.observe(el);
  });

  // ============================================
  // STAGGERED REVEAL FOR SKILL CARDS
  // ============================================
  const skillCards = document.querySelectorAll('.skill-category');
  skillCards.forEach((card, i) => {
    card.dataset.index = i;
    card.classList.add('reveal');
  });

  const skillObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const i = entry.target.dataset.index;
        entry.target.style.transitionDelay = `${i * 80}ms`;
        entry.target.classList.add('visible');
        skillObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  skillCards.forEach((card) => {
    skillObserver.observe(card);
  });

  // ============================================
  // STAGGERED REVEAL FOR BUILDING CARDS
  // ============================================
  const buildingCards = document.querySelectorAll('.building-card');
  buildingCards.forEach((card, i) => {
    card.dataset.index = i;
    card.classList.add('reveal');
  });

  const buildObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const i = entry.target.dataset.index;
        entry.target.style.transitionDelay = `${i * 100}ms`;
        entry.target.classList.add('visible');
        buildObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  buildingCards.forEach((card) => {
    buildObserver.observe(card);
  });
}

// ============================================
// NAVBAR SCROLL EFFECT + PROGRESS BAR
// (optimized with requestAnimationFrame)
// ============================================
let ticking = false;

window.addEventListener('scroll', () => {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      const current = window.scrollY;

      if (navbar) {
        if (current > 50) navbar.classList.add('scrolled');
        else navbar.classList.remove('scrolled');
      }

      if (progressBar) {
        const height = document.body.scrollHeight - window.innerHeight;
        const progress = height > 0 ? (current / height) * 100 : 0;
        progressBar.style.width = progress + '%';
      }

      ticking = false;
    });
    ticking = true;
  }
}, { passive: true });

// ============================================
// REVEAL HERO IMMEDIATELY ON LOAD
// ============================================
window.addEventListener('load', () => {
  document.querySelectorAll('#hero .reveal').forEach(el => {
    el.classList.add('visible');
  });
});

// ============================================
// MOBILE MENU TOGGLE (SAFE)
// ============================================
if (mobileToggle && mobileMenu) {
  mobileToggle.addEventListener('click', () => {
    mobileToggle.classList.toggle('active');
    mobileMenu.classList.toggle('active');
  });

  // Close menu on link click
  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mobileToggle.classList.remove('active');
      mobileMenu.classList.remove('active');
    });
  });
}

// ============================================
// MOBILE MENU KEYBOARD ACCESSIBILITY
// ============================================
mobileToggle?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    mobileToggle.click();
  }
});

// ============================================
// ESC KEY CLOSES MOBILE MENU
// ============================================
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && mobileMenu?.classList.contains('active')) {
    mobileToggle.classList.remove('active');
    mobileMenu.classList.remove('active');
  }
});

// ============================================
// SMOOTH SCROLL FOR NAV LINKS (cached)
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
// (prevents accidental flicker on quick mouse pass)
// ============================================
document.querySelectorAll('.hover-swap').forEach(card => {
  let timeout;

  card.addEventListener('mouseenter', () => {
    timeout = setTimeout(() => {
      card.classList.add('hover-active');
    }, 80);
  });

  card.addEventListener('mouseleave', () => {
    clearTimeout(timeout);
    card.classList.remove('hover-active');
  });
});
