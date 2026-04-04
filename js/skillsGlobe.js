// ============================================
// SKILLS GLOBE — Independent 3D rotating globe
// ============================================
// Encapsulated module — does NOT pollute global scope
// Uses its own requestAnimationFrame loop

(function () {
  'use strict';

  // ---- Data ----
  const skills = [
    { name: "Python", group: "languages" },
    { name: "Java", group: "languages" },
    { name: "C++", group: "languages" },
    { name: "Dart", group: "languages" },

    { name: "Machine Learning", group: "ai" },
    { name: "Deep Learning", group: "ai" },
    { name: "YOLO", group: "ai" },
    { name: "Computer Vision", group: "ai" },

    { name: "PyTorch", group: "libs" },
    { name: "TensorFlow", group: "libs" },
    { name: "OpenCV", group: "libs" },
    { name: "NumPy", group: "libs" },
    { name: "Pandas", group: "libs" },

    { name: "Threat Detection", group: "security" },
    { name: "NetSec", group: "security" },
    { name: "Forensics", group: "security" },

    { name: "Docker", group: "systems" },
    { name: "CI/CD", group: "systems" },
    { name: "Distributed", group: "systems" },

    { name: "Shader", group: "graphics" },
    { name: "OpenGL", group: "graphics" },
    { name: "Vulkan", group: "graphics" }
  ];

  // ---- Group Colors (HSL-based, curated palette) ----
  const groupColors = {
    languages: { r: 100, g: 255, b: 218 },  // accent teal
    ai:        { r: 199, g: 146, b: 234 },  // purple
    libs:      { r: 130, g: 220, b: 255 },  // sky blue
    security:  { r: 255, g: 203, b: 107 },  // amber
    systems:   { r: 195, g: 232, b: 141 },  // lime
    graphics:  { r: 255, g: 150, b: 150 },  // coral
  };

  const accentColor = { r: 100, g: 255, b: 218 };

  function initSkillsGlobe() {
    const canvas = document.getElementById('skills-globe-canvas');
    if (!canvas || !canvas.getContext) return; // Fallback: don't init

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ---- Tooltip ----
    const tooltip = document.getElementById('globe-tooltip');

    // ---- Globe Parameters ----
    const perspective = 600;
    const radius = 200;
    let rotX = 0;
    let rotY = 0;
    let velX = 0;
    let velY = 0.002; // auto-rotate speed
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let dragVelX = 0;
    let dragVelY = 0;
    let hoveredIndex = -1;
    let mouseX = -9999;
    let mouseY = -9999;
    let animId = null;

    // ---- Fibonacci Sphere Distribution ----
    const nodes = [];
    const n = skills.length;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2; // -1 to 1
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = goldenAngle * i;

      nodes.push({
        x: Math.cos(theta) * radiusAtY * radius,
        y: y * radius,
        z: Math.sin(theta) * radiusAtY * radius,
        projX: 0,
        projY: 0,
        projScale: 0,
        skill: skills[i]
      });
    }

    // ---- Resize Handler ----
    function resizeCanvas() {
      const container = canvas.parentElement;
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resizeCanvas();
    let resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resizeCanvas, 150);
    }, { passive: true });

    // ---- Rotation Matrices ----
    function rotateX(x, y, z, angle) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return {
        x: x,
        y: y * cos - z * sin,
        z: y * sin + z * cos
      };
    }

    function rotateY(x, y, z, angle) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return {
        x: x * cos + z * sin,
        y: y,
        z: -x * sin + z * cos
      };
    }

    // ---- Project 3D → 2D ----
    function project(node, centerX, centerY) {
      const scale = perspective / (perspective + node.rz);
      node.projX = centerX + node.rx * scale;
      node.projY = centerY + node.ry * scale;
      node.projScale = scale;
    }

    // ---- Mouse/Touch Events ----
    function getCanvasCoords(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    }

    canvas.addEventListener('mousedown', function (e) {
      isDragging = true;
      const coords = getCanvasCoords(e);
      lastMouseX = coords.x;
      lastMouseY = coords.y;
      dragVelX = 0;
      dragVelY = 0;
      canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) {
        isDragging = true;
        const coords = getCanvasCoords(e);
        lastMouseX = coords.x;
        lastMouseY = coords.y;
        dragVelX = 0;
        dragVelY = 0;
      }
    }, { passive: true });

    window.addEventListener('mousemove', function (e) {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;

      if (isDragging) {
        const coords = { x: mouseX, y: mouseY };
        const dx = coords.x - lastMouseX;
        const dy = coords.y - lastMouseY;
        dragVelY = dx * 0.004;
        dragVelX = dy * 0.004;
        rotY += dragVelY;
        rotX += dragVelX;
        lastMouseX = coords.x;
        lastMouseY = coords.y;
      }
    });

    window.addEventListener('touchmove', function (e) {
      if (isDragging && e.touches.length === 1) {
        const coords = getCanvasCoords(e);
        const dx = coords.x - lastMouseX;
        const dy = coords.y - lastMouseY;
        dragVelY = dx * 0.004;
        dragVelX = dy * 0.004;
        rotY += dragVelY;
        rotX += dragVelX;
        lastMouseX = coords.x;
        lastMouseY = coords.y;
      }
    }, { passive: true });

    function endDrag() {
      isDragging = false;
      canvas.style.cursor = 'grab';
    }

    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);

    canvas.addEventListener('mouseleave', function () {
      mouseX = -9999;
      mouseY = -9999;
      hoveredIndex = -1;
      if (tooltip) tooltip.classList.remove('show');
    });

    canvas.style.cursor = 'grab';

    // ---- Render Loop ----
    function render() {
      const rect = canvas.parentElement.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const centerX = w / 2;
      const centerY = h / 2;

      ctx.clearRect(0, 0, w, h);

      // ---- Apply rotation ----
      if (!isDragging) {
        // Auto-rotate
        rotY += 0.002;
        // Inertia decay
        dragVelX *= 0.95;
        dragVelY *= 0.95;
        rotX += dragVelX;
        rotY += dragVelY;
      }

      // ---- Transform nodes ----
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        // Apply rotation
        const r1 = rotateY(node.x, node.y, node.z, rotY);
        const r2 = rotateX(r1.x, r1.y, r1.z, rotX);
        node.rx = r2.x;
        node.ry = r2.y;
        node.rz = r2.z;
        project(node, centerX, centerY);
      }

      // ---- Sort by z (back to front) ----
      const sorted = nodes.slice().sort(function (a, b) {
        return a.rz - b.rz;
      });

      // ---- Detect hover ----
      hoveredIndex = -1;
      let closestDist = 30; // hover radius threshold in px
      for (let i = 0; i < sorted.length; i++) {
        const node = sorted[i];
        const dx = mouseX - node.projX;
        const dy = mouseY - node.projY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closestDist = dist;
          hoveredIndex = nodes.indexOf(node);
        }
      }

      // ---- Draw connections (subtle lines between same-group nodes) ----
      ctx.lineWidth = 0.5;
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          if (sorted[i].skill.group === sorted[j].skill.group) {
            const alpha = Math.min(sorted[i].projScale, sorted[j].projScale);
            const depthAlpha = ((alpha - 0.5) / 0.5) * 0.12;
            if (depthAlpha > 0.01) {
              const col = groupColors[sorted[i].skill.group] || accentColor;
              ctx.strokeStyle = 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + depthAlpha.toFixed(3) + ')';
              ctx.beginPath();
              ctx.moveTo(sorted[i].projX, sorted[i].projY);
              ctx.lineTo(sorted[j].projX, sorted[j].projY);
              ctx.stroke();
            }
          }
        }
      }

      // ---- Draw nodes ----
      for (let i = 0; i < sorted.length; i++) {
        const node = sorted[i];
        const nodeIndex = nodes.indexOf(node);
        const isHovered = nodeIndex === hoveredIndex;
        const col = groupColors[node.skill.group] || accentColor;

        // Depth-based alpha: map projScale (roughly 0.5–1.5) to 0.15–1.0
        const depthFactor = (node.projScale - 0.5) / 0.8;
        const alpha = Math.max(0.15, Math.min(1.0, depthFactor));

        // Node size
        const baseSize = 4;
        const size = isHovered
          ? (baseSize + 3) * node.projScale
          : baseSize * node.projScale;

        // Glow for hovered
        if (isHovered) {
          ctx.shadowColor = 'rgba(' + accentColor.r + ',' + accentColor.g + ',' + accentColor.b + ',0.6)';
          ctx.shadowBlur = 18;
        }

        // Draw dot
        ctx.beginPath();
        ctx.arc(node.projX, node.projY, size, 0, Math.PI * 2);
        if (isHovered) {
          ctx.fillStyle = 'rgba(' + accentColor.r + ',' + accentColor.g + ',' + accentColor.b + ',1)';
        } else {
          ctx.fillStyle = 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + alpha.toFixed(3) + ')';
        }
        ctx.fill();

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // ---- Draw label ----
        const fontSize = isHovered ? 13 : Math.max(9, 11 * node.projScale);
        ctx.font = (isHovered ? '600 ' : '400 ') + fontSize.toFixed(1) + 'px "JetBrains Mono", "Fira Code", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const labelY = node.projY - size - 8;

        if (isHovered) {
          ctx.fillStyle = 'rgba(' + accentColor.r + ',' + accentColor.g + ',' + accentColor.b + ',1)';
        } else {
          ctx.fillStyle = 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + (alpha * 0.85).toFixed(3) + ')';
        }

        ctx.fillText(node.skill.name, node.projX, labelY);
      }

      // ---- Tooltip ----
      if (tooltip) {
        if (hoveredIndex >= 0) {
          const hNode = nodes[hoveredIndex];
          tooltip.textContent = hNode.skill.name;
          tooltip.classList.add('show');
          // Position tooltip relative to canvas container
          const containerRect = canvas.parentElement.getBoundingClientRect();
          tooltip.style.left = (hNode.projX + 16) + 'px';
          tooltip.style.top = (hNode.projY - 12) + 'px';
        } else {
          tooltip.classList.remove('show');
        }
      }

      // ---- Draw subtle sphere wireframe ----
      drawGlobeOutline(centerX, centerY);

      animId = requestAnimationFrame(render);
    }

    // ---- Subtle equator / meridian lines for depth ----
    function drawGlobeOutline(cx, cy) {
      ctx.strokeStyle = 'rgba(100, 255, 218, 0.04)';
      ctx.lineWidth = 1;

      // Equator ellipse
      const eqScale = perspective / (perspective + 0);
      const eqRadius = radius * eqScale;
      ctx.beginPath();
      ctx.ellipse(cx, cy, eqRadius, eqRadius * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Vertical meridian
      ctx.beginPath();
      ctx.ellipse(cx, cy, eqRadius * 0.3, eqRadius, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ---- Start ----
    animId = requestAnimationFrame(render);

    // ---- Cleanup on page unload ----
    window.addEventListener('beforeunload', function () {
      if (animId) cancelAnimationFrame(animId);
    });
  }

  // ---- Initialize when DOM is ready ----
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSkillsGlobe);
  } else {
    initSkillsGlobe();
  }
})();
