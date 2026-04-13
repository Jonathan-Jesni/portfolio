// ============================================
// SKILLS GLOBE — Icon-based 3D rotating globe
// ============================================
// Encapsulated module — does NOT pollute global scope
// Uses its own requestAnimationFrame loop

(function () {
  'use strict';

  // ---- Icon Map ----
  const iconMap = {
    "Python": "assets/icons/python.svg",
    "Java": "assets/icons/java.svg",
    "C++": "assets/icons/cpp.svg",
    "Dart": "assets/icons/dart.svg",

    "Machine Learning": "assets/icons/ml.svg",
    "Deep Learning": "assets/icons/dl.svg",
    "YOLO": "assets/icons/yolo.svg",
    "Computer Vision": "assets/icons/cv.svg",

    "PyTorch": "assets/icons/pytorch.svg",
    "TensorFlow": "assets/icons/tensorflow.svg",
    "OpenCV": "assets/icons/opencv.svg",
    "NumPy": "assets/icons/numpy.svg",
    "Pandas": "assets/icons/pandas.svg",

    "Threat Detection": "assets/icons/threat.svg",
    "NetSec": "assets/icons/security.svg",
    "Forensics": "assets/icons/forensics.svg",

    "Docker": "assets/icons/docker.svg",
    "CI/CD": "assets/icons/cicd.svg",
    "Distributed": "assets/icons/distributed.svg",

    "Shader": "assets/icons/shader.svg",
    "OpenGL": "assets/icons/opengl.svg",
    "Vulkan": "assets/icons/vulkan.svg"
  };

  // ---- Preload Icons (avoid flicker) ----
  const loadedIcons = {};
  let iconsReady = 0;
  const iconTotal = Object.keys(iconMap).length;

  Object.keys(iconMap).forEach(function (key) {
    const img = new Image();
    img.src = iconMap[key];
    img.loading = 'eager';
    img.onload = function () { iconsReady++; };
    img.onerror = function () { iconsReady++; }; // count errors too so we don't stall
    loadedIcons[key] = img;
  });

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

  // ---- Group Colors ----
  const groupColors = {
    languages: { r: 100, g: 255, b: 218 },
    ai: { r: 199, g: 146, b: 234 },
    libs: { r: 130, g: 220, b: 255 },
    security: { r: 255, g: 203, b: 107 },
    systems: { r: 195, g: 232, b: 141 },
    graphics: { r: 255, g: 150, b: 150 },
  };

  const accentColor = { r: 100, g: 255, b: 218 };

  function initSkillsGlobe() {
    const canvas = document.getElementById('skills-globe-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const tooltip = document.getElementById('globe-tooltip');

    // Canvas for tinting
    const pCanvas = document.createElement("canvas");
    const pCtx = pCanvas.getContext("2d");

    // ---- Globe Parameters ----
    const perspective = 550;
    const radius = 205;
    let rotX = 0;
    let rotY = 0;
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let dragVelX = 0;
    let dragVelY = 0;
    let hoveredIndex = -1;
    let mouseX = -9999;
    let mouseY = -9999;
    let animId = null;
    let renderProgress = 0;
    let viewTransition = 0;
    let wasModeActive = false;
    let hasRevealedCanvas = false;

    // ---- Fibonacci Sphere Distribution ----
    const nodes = [];
    const n = skills.length;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = goldenAngle * i;

      nodes.push({
        x: Math.cos(theta) * radiusAtY * radius + (Math.random() - 0.5) * 3,
        y: y * radius + (Math.random() - 0.5) * 3,
        z: Math.sin(theta) * radiusAtY * radius + (Math.random() - 0.5) * 3,
        rx: 0, ry: 0, rz: 0,
        projX: 0,
        projY: 0,
        projScale: 0,
        skill: skills[i]
      });
    }

    // ---- Resize Handler ----
    function resizeCanvas() {
      var container = canvas.parentElement;
      var dpr = window.devicePixelRatio || 1;
      var rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resizeCanvas();
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resizeCanvas, 150);
    }, { passive: true });

    // ---- Rotation Matrices ----
    function rotateX(x, y, z, angle) {
      var cos = Math.cos(angle), sin = Math.sin(angle);
      return { x: x, y: y * cos - z * sin, z: y * sin + z * cos };
    }

    function rotateY(x, y, z, angle) {
      var cos = Math.cos(angle), sin = Math.sin(angle);
      return { x: x * cos + z * sin, y: y, z: -x * sin + z * cos };
    }

    // ---- Project ----
    function project(node, centerX, centerY) {
      var scale = perspective / (perspective + node.rz * 1.2);
      scale = Math.min(scale, 1.1);
      node.projX = centerX + node.rx * scale;
      node.projY = centerY + node.ry * scale;
      node.projScale = scale;
    }

    // ---- Mouse / Touch Events ----
    function getCanvasCoords(e) {
      var rect = canvas.getBoundingClientRect();
      var cx = e.touches ? e.touches[0].clientX : e.clientX;
      var cy = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: cx - rect.left, y: cy - rect.top };
    }

    canvas.addEventListener('mousedown', function (e) {
      isDragging = true;
      var coords = getCanvasCoords(e);
      lastMouseX = coords.x;
      lastMouseY = coords.y;
      dragVelX = 0;
      dragVelY = 0;
      canvas.style.cursor = 'grabbing';
    });

    canvas.addEventListener('touchstart', function (e) {
      if (e.touches.length === 1) {
        isDragging = true;
        var coords = getCanvasCoords(e);
        lastMouseX = coords.x;
        lastMouseY = coords.y;
        dragVelX = 0;
        dragVelY = 0;
      }
    }, { passive: true });

    window.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;

      if (isDragging) {
        var dx = mouseX - lastMouseX;
        var dy = mouseY - lastMouseY;
        dragVelY = dx * 0.004;
        dragVelX = dy * 0.004;
        rotY += dragVelY;
        rotX += dragVelX;
        lastMouseX = mouseX;
        lastMouseY = mouseY;
      }
    });

    window.addEventListener('touchmove', function (e) {
      if (isDragging && e.touches.length === 1) {
        var coords = getCanvasCoords(e);
        var dx = coords.x - lastMouseX;
        var dy = coords.y - lastMouseY;
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
      var rect = canvas.parentElement.getBoundingClientRect();
      var w = rect.width;
      var h = rect.height;

      // Ensure valid dimensions
      if (w === 0 || h === 0) {
        animId = requestAnimationFrame(render);
        return;
      }

      // Recover from display:none
      if (canvas.width === 0) {
        resizeCanvas();
      }

      var centerX = w / 2;
      var centerY = h / 2 - 16;
      // ---- Scroll Reveal & Transition ----
      var domRect = canvas.getBoundingClientRect();
      var inView = domRect.top < window.innerHeight * 0.85;
      var targetProgress = inView ? 1 : 0;
      renderProgress += (targetProgress - renderProgress) * 0.06; // easing

      // ---- View Mode Transition ----
      var visualView = document.getElementById('view-visual');
      var isModeActive = visualView && visualView.classList.contains('active');

      if (isModeActive && !wasModeActive) {
        viewTransition = 0; // Force reset to re-trigger scale/fade in
      }
      wasModeActive = isModeActive;

      var viewTransitionTarget = isModeActive ? 1 : 0;
      viewTransition += (viewTransitionTarget - viewTransition) * 0.08; // easing

      var combinedAlpha = renderProgress * viewTransition;

      if (!hasRevealedCanvas && combinedAlpha > 0.2) {
        canvas.classList.add('loaded');
        hasRevealedCanvas = true;
      }

      // Container-based scale fix:
      var containerWidth = canvas.parentElement.clientWidth;
      var safeWidth = containerWidth - 80;
      var safeRadius = safeWidth / 2;
      var maxScale = window.innerWidth <= 768 ? 0.92 : 1;

      var baseGlobeScale = Math.min(maxScale, safeRadius / radius);
      var introScale = 0.92 + combinedAlpha * 0.08;
      var globeScale = baseGlobeScale * introScale;

      ctx.globalAlpha = combinedAlpha;
      ctx.clearRect(0, 0, w, h);

      // ---- Rotation ----
      const dt = Math.max(1 / 240, Math.min(0.05, window.__frameDt || 1 / 60));
      const frameScale = dt * 60;
      if (!isDragging) {
        dragVelX *= Math.pow(0.95, frameScale);
        dragVelY *= Math.pow(0.95, frameScale);
        rotX += (dragVelX + 0.0015) * frameScale;
        const vel = Math.max(-2, Math.min(2, window.__scrollVel || 0));
        const scrollBoost = vel * 0.002;
        rotY += (dragVelY + 0.002 + Math.sin(rotX) * 0.0005 + scrollBoost) * frameScale;
      }

      // ---- Transform nodes ----
      var t = performance.now() * 0.001;
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];

        // Apply subtle independent drift using seeded phases per axis
        var seedX = i * 1.34;
        var seedY = i * 2.71;
        var seedZ = i * 0.89;

        var ampX = 4;
        var ampY = 3.5;
        var ampZ = 4.5;

        if (node.skill.name === "Python" || node.skill.name === "Vulkan") {
          ampX = 9.0;
          ampY = 1.0;
          ampZ = 8.0;
        }

        var driftX = Math.sin(t * 0.4 + seedX) * ampX;
        var driftY = Math.cos(t * 0.3 + seedY) * ampY;
        var driftZ = Math.sin(t * 0.5 + seedZ) * ampZ;

        var sx = (node.x + driftX) * globeScale;
        var sy = (node.y + driftY) * globeScale;
        var sz = (node.z + driftZ) * globeScale;

        var r1 = rotateY(sx, sy, sz, rotY);
        var r2 = rotateX(r1.x, r1.y, r1.z, rotX);
        node.rx = r2.x;
        node.ry = r2.y;
        node.rz = r2.z;

        project(node, centerX, centerY);
      }

      // ---- Sort by z ----
      var sorted = nodes.slice().sort(function (a, b) {
        return a.rz - b.rz;
      });

      // ---- Detect hover ----
      hoveredIndex = -1;
      var closestDist = 28;
      var margin = 12;
      for (var i = 0; i < sorted.length; i++) {
        var node = sorted[i];
        var drawX = Math.max(margin, Math.min(w - margin, node.projX));
        var drawY = Math.max(margin, Math.min(h - margin, node.projY));
        var dx = mouseX - drawX;
        var dy = mouseY - drawY;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < closestDist) {
          closestDist = dist;
          hoveredIndex = nodes.indexOf(node);
        }
      }

      // ---- Draw subtle sphere wireframe ----
      drawGlobeOutline(centerX, centerY, radius * globeScale);

      // ---- Draw connections ----
      ctx.lineWidth = 1;
      for (var i = 0; i < sorted.length; i++) {
        for (var j = i + 1; j < sorted.length; j++) {
          if (sorted[i].skill.group === sorted[j].skill.group) {
            var alphaMin = Math.min(sorted[i].projScale, sorted[j].projScale);
            var depthAlpha = ((alphaMin - 0.5) / 0.5) * 0.15;
            if (depthAlpha > 0.02) {
              var col = groupColors[sorted[i].skill.group] || accentColor;
              var lineAlpha = Math.min(0.65, depthAlpha * 1.8).toFixed(3);
              ctx.strokeStyle = 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + lineAlpha + ')';
              ctx.beginPath();

              var margin = 12;
              var drawXi = Math.max(margin, Math.min(w - margin, sorted[i].projX));
              var drawYi = Math.max(margin, Math.min(h - margin, sorted[i].projY));
              var drawXj = Math.max(margin, Math.min(w - margin, sorted[j].projX));
              var drawYj = Math.max(margin, Math.min(h - margin, sorted[j].projY));

              ctx.moveTo(drawXi, drawYi);
              ctx.lineTo(drawXj, drawYj);
              ctx.stroke();
            }
          }
        }
      }

      // ---- Add Center Glow ----
      var currentGlowRadius = radius * globeScale;
      var gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, currentGlowRadius);
      gradient.addColorStop(0, 'rgba(100,255,218,0.09)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentGlowRadius, 0, Math.PI * 2);
      ctx.fill();

      // ---- Draw nodes (icons) ----
      for (var i = 0; i < sorted.length; i++) {
        var node = sorted[i];

        var margin = 12;
        var drawX = Math.max(margin, Math.min(w - margin, node.projX));
        var drawY = Math.max(margin, Math.min(h - margin, node.projY));

        var nodeIndex = nodes.indexOf(node);
        var isHovered = nodeIndex === hoveredIndex;
        var col = groupColors[node.skill.group] || accentColor;

        // Depth-based alpha: improved mapping (0.6 base + 0.4 scale)
        var depthFactor = (node.projScale - 0.4) / 0.8;
        var alpha = Math.max(0.25, Math.min(1.0, 0.6 + depthFactor * 0.4));

        // Check if this is a front-facing node (positive z after rotation means closer)
        var isFront = node.rz < 0; // Negative rz = closer to camera in our projection

        // ---- Hover glow ----
        if (isHovered) {
          ctx.shadowColor = 'rgba(' + accentColor.r + ',' + accentColor.g + ',' + accentColor.b + ',0.6)';
          ctx.shadowBlur = 14;
        } else {
          ctx.shadowBlur = 0;
        }

        // ---- Draw icon or fallback ----
        var icon = loadedIcons[node.skill.name];
        var baseIconSize = 22;

        var isOfficialIcon = [
          "Python", "Java", "C++", "TensorFlow", "PyTorch",
          "OpenCV", "NumPy", "Pandas", "Docker"
        ].includes(node.skill.name);

        if (icon && icon.complete && icon.naturalWidth > 0) {
          // Icon rendering
          var rawSize = baseIconSize * node.projScale;
          var iconSize = Math.max(14, rawSize);

          // Front nodes slightly larger
          if (isFront) {
            iconSize *= 1.15;
          }

          // Hover scale-up
          if (isHovered) {
            iconSize *= 1.3;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";

          if (node.skill.name === "Java") {
            ctx.globalAlpha = combinedAlpha;
          } else {
            ctx.globalAlpha = combinedAlpha; // Native icons maintain base 1
          }

          if (!isOfficialIcon) {
            // Tint non-official icons offscreen to prevent background bleed
            pCanvas.width = iconSize;
            pCanvas.height = iconSize;
            pCtx.clearRect(0, 0, iconSize, iconSize);

            pCtx.drawImage(icon, 0, 0, iconSize, iconSize);

            pCtx.globalCompositeOperation = "source-in";
            pCtx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, 1)`;
            pCtx.fillRect(0, 0, iconSize, iconSize);

            pCtx.globalCompositeOperation = "source-over"; // Reset

            ctx.drawImage(
              pCanvas,
              drawX - iconSize / 2,
              drawY - iconSize / 2,
              iconSize,
              iconSize
            );
          } else {
            // Draw natively
            ctx.drawImage(
              icon,
              drawX - iconSize / 2,
              drawY - iconSize / 2,
              iconSize,
              iconSize
            );
          }
        } else {
          // Fallback: draw circle
          var baseSize = 5;
          var size = isHovered ? (baseSize + 3) * node.projScale : baseSize * node.projScale;

          ctx.beginPath();
          ctx.arc(drawX, drawY, size, 0, Math.PI * 2);
          if (isHovered) {
            ctx.fillStyle = 'rgba(' + accentColor.r + ',' + accentColor.g + ',' + accentColor.b + ',1)';
          } else {
            ctx.fillStyle = 'rgba(' + col.r + ',' + col.g + ',' + col.b + ',' + alpha.toFixed(3) + ')';
          }
          ctx.fill();

          var iconSize = size * 2; // Approximation for label alignment
        }

        // Drop shadow for subsequent texts or nodes
        ctx.shadowBlur = 0;

        // ---- Always Draw Label Below ----
        ctx.font = "11px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(220, 220, 220, 0.85)";
        ctx.fillText(
          node.skill.name,
          drawX,
          drawY + (iconSize / 2) + 12
        );

        // Reset shadow after every node
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
      }

      // ---- Tooltip ----
      if (tooltip) {
        if (hoveredIndex >= 0) {
          var hNode = nodes[hoveredIndex];
          var margin = 12;
          var drawX = Math.max(margin, Math.min(w - margin, hNode.projX));
          var drawY = Math.max(margin, Math.min(h - margin, hNode.projY));

          tooltip.textContent = hNode.skill.name;
          tooltip.classList.add('show');
          tooltip.style.left = (drawX + 20) + 'px';
          tooltip.style.top = (drawY - 16) + 'px';
        } else {
          tooltip.classList.remove('show');
        }
      }

      animId = requestAnimationFrame(render);
    }

    // ---- Subtle equator / meridian ----
    function drawGlobeOutline(cx, cy, currentRadius) {
      ctx.strokeStyle = 'rgba(100, 255, 218, 0.08)';
      ctx.lineWidth = 1;

      var eqScale = perspective / perspective; // z=0, scale = 1
      var eqRadius = currentRadius * eqScale;
      ctx.beginPath();
      ctx.ellipse(cx, cy, eqRadius, eqRadius * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(cx, cy, eqRadius * 0.3, eqRadius, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ---- Start ----
    animId = requestAnimationFrame(render);

    // ---- Cleanup ----
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
