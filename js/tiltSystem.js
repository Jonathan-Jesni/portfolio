// ============================================
// 3D TILT SYSTEM (project cards) + Micro Parallax
// ============================================

const projectCards = document.querySelectorAll('.project-card');
const tiltStates = [];

export function initTiltSystem(mouseState) {
  projectCards.forEach((card) => {
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
}

export function updateTilt(mouseState) {
  const { mouseX, mouseY } = mouseState;

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

    // Magnetic spotlight — use cached rect from above (no extra reflow)
    if (t.spotlightEl && t.inside && t.cachedRect) {
      const sx = ((mouseX - t.cachedRect.left) / t.cachedRect.width) * 100;
      const sy = ((mouseY - t.cachedRect.top) / t.cachedRect.height) * 100;
      t.spotlightEl.style.setProperty('--sx', sx.toFixed(1) + '%');
      t.spotlightEl.style.setProperty('--sy', sy.toFixed(1) + '%');
    }
  }
}
