/**
 * effects.js
 * Efectos visuales interactivos premium del portfolio tri-modal.
 *
 * Módulos:
 *  - CustomCursor    → cursor dot + ring que siguen el ratón
 *  - CursorTrail     → trail de partículas en canvas (.dev y .ia)
 *  - MagneticButtons → botones que siguen ligeramente el cursor
 *  - TextScramble    → scramble de títulos al cambiar modo
 *  - HeroParallax    → parallax sutil en los elementos del hero
 *  - GlitchSuffix    → glitch en el sufijo hero al cambiar modo
 *  - SectionReveal   → IntersectionObserver unificado
 */

/* ════════════════════════════════════════════════════════════
   1. CURSOR PERSONALIZADO
════════════════════════════════════════════════════════════ */
const CustomCursor = (() => {
  // Solo en dispositivos con puntero preciso
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return { init: () => {} };

  let dot, ring;
  let mouseX = -100, mouseY = -100;
  let ringX  = -100, ringY  = -100;
  let isActive = false;

  function init() {
    // Crear elementos
    dot  = _createElement('cursor-dot');
    ring = _createElement('cursor-ring');
    document.body.append(dot, ring);

    window.addEventListener('mousemove', _onMove);
    window.addEventListener('mousedown', () => document.body.classList.add('cursor-click'));
    window.addEventListener('mouseup',   () => document.body.classList.remove('cursor-click'));

    // Hover sobre elementos interactivos
    _bindHoverTargets();

    isActive = true;
    _loop();
  }

  function _createElement(cls) {
    const el = document.createElement('div');
    el.className = cls;
    el.setAttribute('aria-hidden', 'true');
    return el;
  }

  function _onMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }

  // Animación suave del ring (lag detrás del dot)
  function _loop() {
    if (!isActive) return;
    const lerp = 0.14;
    ringX += (mouseX - ringX) * lerp;
    ringY += (mouseY - ringY) * lerp;

    dot.style.left  = `${mouseX}px`;
    dot.style.top   = `${mouseY}px`;
    ring.style.left = `${ringX}px`;
    ring.style.top  = `${ringY}px`;

    requestAnimationFrame(_loop);
  }

  function _bindHoverTargets() {
    const selector = 'a, button, .skill-card, .project-card, .logo-suffix, input, textarea, [role="button"]';
    document.addEventListener('mouseover', e => {
      if (e.target.closest(selector)) {
        document.body.classList.add('cursor-hover');
      }
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest(selector)) {
        document.body.classList.remove('cursor-hover');
      }
    });
  }

  // Actualizar color del cursor al cambiar tema
  window.addEventListener('portfolio:modeChange', () => {
    // El CSS se encarga del color vía var(--color-accent)
  });

  return { init };
})();

/* ════════════════════════════════════════════════════════════
   2. CURSOR TRAIL — partículas (.dev/.ia) + relámpago (.sec)
════════════════════════════════════════════════════════════ */
const CursorTrail = (() => {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return { init: () => {} };

  let canvas, ctx;
  let particles   = [];
  let trailPoints = [];        // historial de posiciones del cursor
  let mouseX = 0, mouseY = 0;
  let prevX  = 0, prevY  = 0;
  let currentMode = 'dev';

  const COLORS = {
    dev: { r: 59,  g: 130, b: 246 },
  };

  // Nodos de red neuronal para modo ia
  let iaNodos    = [];
  let iaPulses   = [];
  let iaOrbiters = [];

  // ── Thunderfury (.sec) ────────────────────────────────────
  let thunderOrbs  = [];
  let tfBoltCache  = new Map(); // key `minId_maxId` → {pts, branchPts}
  let tfFrame      = 0;
  let tfOrbId      = 0;
  const TF_ORB_LIFETIME = 620;  // ms
  const TF_ORB_MAX_R    = 6;
  const TF_CONNECT_DIST = 140;  // px máx entre orbes para conectar
  const TF_BRANCH_PROB  = 0.55; // probabilidad de rama lateral (más ramas)
  const TF_MAX_CONN     = 4;    // máx conexiones por orbe (evita O(n²) extremo)

  function init() {
    canvas = document.getElementById('cursor-trail-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    _resize();

    window.addEventListener('resize', _resize);
    window.addEventListener('mousemove', e => {
      prevX  = mouseX; prevY = mouseY;
      mouseX = e.clientX;
      mouseY = e.clientY;

      trailPoints.push({ x: mouseX, y: mouseY, age: 0 });
      if (trailPoints.length > 20) trailPoints.shift();

      if (currentMode === 'sec') {
        _spawnThunderfury();
      } else if (currentMode === 'ia') {
        _spawnIAEffect();
      } else {
        _spawnParticle();
      }
    });

    window.addEventListener('portfolio:modeChange', e => {
      currentMode  = e.detail.mode;
      particles    = [];
      trailPoints  = [];
      iaNodos      = [];
      iaPulses     = [];
      iaOrbiters   = [];
      thunderOrbs  = [];
      tfBoltCache  = new Map();
    });

    currentMode = localStorage.getItem('portfolio-mode') || 'dev';
    _loop();
  }

  function _resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  /* ── Efecto IA — red neuronal ─────────────────────────────── */
  function _spawnIAEffect() {
    const dist = Math.hypot(mouseX - prevX, mouseY - prevY);

    // Nodo en la posición actual
    iaNodos.push({
      x:     mouseX + (Math.random() - 0.5) * 12,
      y:     mouseY + (Math.random() - 0.5) * 12,
      vx:    (Math.random() - 0.5) * 0.4,
      vy:    (Math.random() - 0.5) * 0.4,
      r:     1.5 + Math.random() * 2,
      alpha: 0.9,
      decay: 0.012 + Math.random() * 0.008,
      pulse: Math.random() * Math.PI * 2,
    });
    if (iaNodos.length > 28) iaNodos.shift();

    // Anillo de pulso cada ciertos pixels de movimiento
    if (dist > 20 && Math.random() < 0.4) {
      iaPulses.push({
        x: mouseX, y: mouseY,
        r: 4, maxR: 28 + Math.random() * 16,
        alpha: 0.6, decay: 0.025,
      });
    }
    if (iaPulses.length > 10) iaPulses.shift();

    // Orbiter ocasional
    if (Math.random() < 0.12) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 18 + Math.random() * 14;
      iaOrbiters.push({
        cx: mouseX, cy: mouseY,
        angle, radius,
        speed:  0.06 + Math.random() * 0.08,
        alpha:  0.8,
        decay:  0.018 + Math.random() * 0.01,
        r:      1.2 + Math.random() * 1.2,
      });
    }
    if (iaOrbiters.length > 8) iaOrbiters.shift();
  }

  function _drawIA() {
    const connDist = 90;

    // Conexiones entre nodos cercanos (sinapsis)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < iaNodos.length; i++) {
      for (let j = i + 1; j < iaNodos.length; j++) {
        const dx   = iaNodos[i].x - iaNodos[j].x;
        const dy   = iaNodos[i].y - iaNodos[j].y;
        const dist = Math.hypot(dx, dy);
        if (dist < connDist) {
          const a = (1 - dist / connDist) * Math.min(iaNodos[i].alpha, iaNodos[j].alpha) * 0.5;
          ctx.beginPath();
          ctx.moveTo(iaNodos[i].x, iaNodos[i].y);
          ctx.lineTo(iaNodos[j].x, iaNodos[j].y);
          ctx.strokeStyle = `rgba(6,255,165,${a})`;
          ctx.lineWidth   = 0.6;
          ctx.stroke();
        }
      }
    }

    // Conexión de cada nodo al cursor
    for (const n of iaNodos) {
      const dist = Math.hypot(mouseX - n.x, mouseY - n.y);
      if (dist < connDist * 1.2) {
        const a = (1 - dist / (connDist * 1.2)) * n.alpha * 0.35;
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(mouseX, mouseY);
        ctx.strokeStyle = `rgba(177,78,255,${a})`;
        ctx.lineWidth   = 0.5;
        ctx.stroke();
      }
    }
    ctx.restore();

    // Nodos
    for (const n of iaNodos) {
      n.x    += n.vx;
      n.y    += n.vy;
      n.pulse += 0.08;
      n.alpha -= n.decay;

      const pr = n.r * (1 + Math.sin(n.pulse) * 0.25);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // Halo
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, pr * 4);
      g.addColorStop(0, `rgba(6,255,165,${n.alpha * 0.3})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(n.x, n.y, pr * 4, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();

      // Núcleo
      ctx.beginPath();
      ctx.arc(n.x, n.y, pr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(6,255,165,${n.alpha})`;
      ctx.fill();
      ctx.restore();
    }

    // Anillos de pulso
    for (const p of iaPulses) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(177,78,255,${p.alpha})`;
      ctx.lineWidth   = 1;
      ctx.stroke();
      ctx.restore();
      p.r     += (p.maxR - p.r) * 0.12;
      p.alpha -= p.decay;
    }

    // Orbiters
    for (const o of iaOrbiters) {
      o.angle += o.speed;
      o.alpha -= o.decay;
      const ox = o.cx + Math.cos(o.angle) * o.radius;
      const oy = o.cy + Math.sin(o.angle) * o.radius;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.arc(ox, oy, o.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(6,255,165,${o.alpha})`;
      ctx.fill();
      ctx.restore();
    }

    // Cursor central — punto brillante
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const cg = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 14);
    cg.addColorStop(0, 'rgba(6,255,165,0.5)');
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 14, 0, Math.PI * 2);
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.restore();

    // Limpiar elementos muertos
    iaNodos    = iaNodos.filter(n => n.alpha > 0.01);
    iaPulses   = iaPulses.filter(p => p.alpha > 0.01);
    iaOrbiters = iaOrbiters.filter(o => o.alpha > 0.01);
  }

  /* ── Partículas normales (dev) ────────────────────────────── */
  function _spawnParticle() {
    const col = COLORS[currentMode];
    if (!col) return;
    particles.push({
      x: mouseX, y: mouseY,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5 - 0.5,
      r:     1.5 + Math.random() * 2.5,
      alpha: 0.6  + Math.random() * 0.3,
      decay: 0.025 + Math.random() * 0.02,
      col,
    });
    if (particles.length > 80) particles.shift();
  }

  /* ══════════════════════════════════════════════════════════
     THUNDERFURY TRAIL (.sec)
  ══════════════════════════════════════════════════════════ */

  /* Spawner: un orbe por evento mousemove */
  function _spawnThunderfury() {
    const now = performance.now();
    thunderOrbs.push({
      x:    mouseX + (Math.random() - 0.5) * 5,
      y:    mouseY + (Math.random() - 0.5) * 5,
      born: now,
      id:   tfOrbId++,
    });
    if (thunderOrbs.length > 45) thunderOrbs.shift();

    // Chispas — más cantidad y más grandes
    const dist = Math.hypot(mouseX - prevX, mouseY - prevY);
    if (dist > 3) {
      const count = 4 + Math.floor(dist / 6);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 4.5;
        particles.push({
          x:     mouseX, y: mouseY,
          vx:    Math.cos(angle) * speed,
          vy:    Math.sin(angle) * speed - 1,
          r:     0.8 + Math.random() * 1.8,
          alpha: 0.9,
          decay: 0.03 + Math.random() * 0.04,
          col:   Math.random() < 0.55
            ? { r: 255, g: 255, b: 255 }
            : { r: 136, g: 204, b: 255 },
        });
      }
      if (particles.length > 200) particles.splice(0, particles.length - 200);
    }
  }

  /**
   * Midpoint displacement recursivo para rayos jagged.
   * Depth fijo = 3 → 8 segmentos: buen detalle sin coste excesivo.
   */
  function _jaggedLine(x1, y1, x2, y2, roughness, depth) {
    if (depth === 0) return [{ x: x1, y: y1 }, { x: x2, y: y2 }];
    const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * roughness;
    const my = (y1 + y2) / 2 + (Math.random() - 0.5) * roughness;
    const L  = _jaggedLine(x1, y1, mx, my, roughness / 1.7, depth - 1);
    const R  = _jaggedLine(mx, my, x2, y2, roughness / 1.7, depth - 1);
    return [...L, ...R.slice(1)];
  }

  /** 3 pasadas: halo externo · capa azul · núcleo blanco */
  function _drawBolt(pts, alpha, width, glowR, glowG, glowB) {
    if (pts.length < 2 || alpha < 0.03) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
    ctx.strokeStyle = `rgba(${glowR},${glowG},${glowB},${alpha * 0.13})`;
    ctx.lineWidth   = width * 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
    ctx.strokeStyle = `rgba(136,204,255,${alpha * 0.50})`;
    ctx.lineWidth   = width * 1.8;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
    ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
    ctx.lineWidth   = width;
    ctx.stroke();

    ctx.restore();
  }

  /* Dibuja orbes + rayos con caché de paths */
  function _drawThunderfury() {
    tfFrame++;
    const now   = performance.now();
    const regen = (tfFrame % 3 === 0); // regenerar caminos cada 3 frames

    // Filtrar orbes muertos
    thunderOrbs = thunderOrbs.filter(o => now - o.born < TF_ORB_LIFETIME);
    const living = thunderOrbs;

    // Limpiar entradas stale del caché cada 30 frames
    if (tfFrame % 30 === 0) {
      const liveSet = new Set(living.map(o => o.id));
      for (const k of tfBoltCache.keys()) {
        const u = k.indexOf('_');
        if (!liveSet.has(+k.slice(0, u)) || !liveSet.has(+k.slice(u + 1)))
          tfBoltCache.delete(k);
      }
    }

    // ── Rayos entre orbes cercanos ──────────────────────── //
    const connCount = new Int8Array(living.length); // conexiones por orbe

    for (let i = 0; i < living.length; i++) {
      if (connCount[i] >= TF_MAX_CONN) continue;
      const a    = living[i];
      const ageA = now - a.born;
      const ratA = 1 - ageA / TF_ORB_LIFETIME;

      for (let j = i + 1; j < living.length; j++) {
        if (connCount[i] >= TF_MAX_CONN || connCount[j] >= TF_MAX_CONN) continue;
        const b  = living[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d > TF_CONNECT_DIST) continue;

        const ageB  = now - b.born;
        const ratB  = 1 - ageB / TF_ORB_LIFETIME;
        const alpha = Math.min(ratA, ratB) * (1 - d / TF_CONNECT_DIST) * 1.1;
        if (alpha < 0.05) continue;

        connCount[i]++;
        connCount[j]++;

        // Caché: regenerar solo en frames múltiplo de 3
        const cKey = `${Math.min(a.id, b.id)}_${Math.max(a.id, b.id)}`;
        let cached = tfBoltCache.get(cKey);

        if (!cached || regen) {
          const rough = d * 0.42;
          const pts   = _jaggedLine(a.x, a.y, b.x, b.y, rough, 3);
          let branchPts = null;
          if (Math.random() < TF_BRANCH_PROB) {
            const mid   = pts[Math.floor(pts.length / 2)];
            const angle = Math.atan2(b.y - a.y, b.x - a.x)
                          + (Math.random() - 0.5) * Math.PI * 0.9;
            const len   = 16 + Math.random() * d * 0.45;
            branchPts   = _jaggedLine(mid.x, mid.y,
                                      mid.x + Math.cos(angle) * len,
                                      mid.y + Math.sin(angle) * len,
                                      rough * 0.65, 3);
          }
          cached = { pts, branchPts };
          tfBoltCache.set(cKey, cached);
        }

        const w = 0.7 + Math.random() * 0.4;
        _drawBolt(cached.pts, alpha, w, 160, 210, 255);
        if (cached.branchPts)
          _drawBolt(cached.branchPts, alpha * 0.65, w * 0.8, 200, 230, 255);
      }
    }

    // ── Orbes ──────────────────────────────────────────── //
    for (const o of living) {
      const ratio = 1 - (now - o.born) / TF_ORB_LIFETIME;
      const r     = TF_ORB_MAX_R * ratio;
      const alpha = ratio;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const g = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, r * 5.5);
      g.addColorStop(0,   `rgba(136,204,255,${alpha * 0.55})`);
      g.addColorStop(0.4, `rgba(100,180,255,${alpha * 0.20})`);
      g.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(o.x, o.y, r * 5.5, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();

      const c = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, r);
      c.addColorStop(0,   `rgba(255,255,255,${alpha})`);
      c.addColorStop(0.5, `rgba(136,204,255,${alpha * 0.85})`);
      c.addColorStop(1,   'rgba(80,160,255,0)');
      ctx.beginPath();
      ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();

      ctx.restore();
    }

    // ── Cursor central ─────────────────────────────────── //
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const cg = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 9);
    cg.addColorStop(0,   'rgba(255,255,255,0.85)');
    cg.addColorStop(0.5, 'rgba(136,204,255,0.25)');
    cg.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(mouseX, mouseY, 9, 0, Math.PI * 2);
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.restore();
  }

  /* ── Loop principal ───────────────────────────────────────── */
  function _loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Partículas (dev/ia normales + chispas sec)
    particles = particles.filter(p => p.alpha > 0.01);
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      p.vy    += 0.06;
      p.alpha -= p.decay;
      p.r     *= 0.96;

      ctx.save();
      if (currentMode === 'sec') ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(p.r, 0.1), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.col.r},${p.col.g},${p.col.b},${p.alpha})`;
      ctx.fill();
      ctx.restore();
    }

    // Thunderfury (solo sec)
    if (currentMode === 'sec') {
      _drawThunderfury();
    }

    // Red neuronal (solo ia)
    if (currentMode === 'ia') {
      _drawIA();
    }

    requestAnimationFrame(_loop);
  }

  return { init };
})();

/* ════════════════════════════════════════════════════════════
   3. BOTONES MAGNÉTICOS
════════════════════════════════════════════════════════════ */
const MagneticButtons = (() => {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return { init: () => {} };

  const STRENGTH = 0.35;

  function init() {
    // Re-aplicar cuando se rendericen nuevos botones
    _apply();
    window.addEventListener('portfolio:modeChange', () => {
      setTimeout(_apply, 400);
    });
  }

  function _apply() {
    document.querySelectorAll('.btn-primary, .btn-outline, .social-link').forEach(btn => {
      if (btn.dataset.magnetic) return; // ya procesado
      btn.dataset.magnetic = '1';

      btn.addEventListener('mousemove', e => {
        const rect   = btn.getBoundingClientRect();
        const cx     = rect.left + rect.width  / 2;
        const cy     = rect.top  + rect.height / 2;
        const dx     = (e.clientX - cx) * STRENGTH;
        const dy     = (e.clientY - cy) * STRENGTH;
        btn.style.transform  = `translate(${dx}px, ${dy}px)`;
        btn.style.transition = 'transform 0.15s ease';
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform  = '';
        btn.style.transition = 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
      });
    });
  }

  return { init };
})();

/* ════════════════════════════════════════════════════════════
   4. TEXT SCRAMBLE — títulos al cambiar modo
════════════════════════════════════════════════════════════ */
const TextScramble = (() => {
  const CHARS = '!<>-_\\/[]{}—=+*^?#0123456789ABCDEF';

  /**
   * Hace scramble de un elemento de texto y lo resuelve al nuevo texto.
   * @param {HTMLElement} el
   * @param {string} newText
   * @param {number} duration - ms para completar el efecto
   */
  function scramble(el, newText, duration = 600) {
    if (!el || el.dataset.scrambling) return;
    el.dataset.scrambling = '1';

    const finalText = newText;
    const len       = Math.max(el.textContent.length, finalText.length);
    const steps     = Math.ceil(duration / 40);
    let   frame     = 0;

    const timer = setInterval(() => {
      frame++;
      const progress = frame / steps;
      const resolvedCount = Math.floor(progress * finalText.length);

      let output = '';
      for (let i = 0; i < finalText.length; i++) {
        if (finalText[i] === ' ') {
          output += ' ';
        } else if (i < resolvedCount) {
          output += finalText[i];
        } else {
          output += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      }

      el.textContent = output;

      if (frame >= steps) {
        clearInterval(timer);
        el.textContent = finalText;
        delete el.dataset.scrambling;
      }
    }, 40);
  }

  return { scramble };
})();

/* ════════════════════════════════════════════════════════════
   5. PARALLAX DEL HERO
════════════════════════════════════════════════════════════ */
const HeroParallax = (() => {
  let ticking = false;

  function init() {
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(_update);
        ticking = true;
      }
    }, { passive: true });

    // Parallax también con el mouse en el hero
    const hero = document.getElementById('hero');
    if (hero) {
      hero.addEventListener('mousemove', _onMouseMove);
    }
  }

  function _update() {
    const scrollY   = window.scrollY;
    const heroEl    = document.getElementById('hero');
    if (!heroEl) { ticking = false; return; }

    const heroH = heroEl.offsetHeight;
    if (scrollY > heroH) { ticking = false; return; }

    const pct    = scrollY / heroH;
    const canvas = document.getElementById('hero-canvas');
    const bgText = document.getElementById('hero-bg-text');
    const content = heroEl.querySelector('.hero-content');

    // Mover el canvas más lento que el scroll (no en sec — las letras se pierden)
    const mode = localStorage.getItem('portfolio-mode') || 'dev';
    if (canvas && mode !== 'sec') canvas.style.transform = `translateY(${scrollY * 0.3}px)`;
    if (canvas && mode === 'sec') canvas.style.transform = '';

    // Texto decorativo con parallax inverso
    if (bgText)  bgText.style.transform  = `translateY(calc(-50% + ${scrollY * 0.15}px))`;

    // Contenido del hero se mueve hacia arriba más rápido
    if (content) content.style.transform = `translateY(${scrollY * 0.08}px)`;

    // Fade out del hero content al hacer scroll
    if (content) content.style.opacity = Math.max(0, 1 - pct * 2.5);

    ticking = false;
  }

  function _onMouseMove(e) {
    const bgText = document.getElementById('hero-bg-text');
    if (!bgText) return;

    const hero   = document.getElementById('hero');
    const rect   = hero.getBoundingClientRect();
    const cx     = rect.width  / 2;
    const cy     = rect.height / 2;
    const dx     = (e.clientX - rect.left - cx) / cx;
    const dy     = (e.clientY - rect.top  - cy) / cy;

    bgText.style.transform   = `translateY(-50%) translate(${dx * 12}px, ${dy * 8}px)`;
    bgText.style.transition  = 'transform 0.3s ease';
  }

  return { init };
})();

/* ════════════════════════════════════════════════════════════
   6. GLITCH EN EL SUFIJO DEL HERO AL CAMBIAR MODO
════════════════════════════════════════════════════════════ */
const GlitchSuffix = (() => {
  function init() {
    window.addEventListener('portfolio:modeChange', e => {
      const suffix = document.getElementById('hero-suffix-text');
      if (!suffix) return;

      suffix.dataset.text = suffix.textContent;
      suffix.classList.add('glitching');

      setTimeout(() => {
        suffix.classList.remove('glitching');
      }, 300);
    });
  }

  return { init };
})();

/* ════════════════════════════════════════════════════════════
   7. SCRAMBLE DE SECCIÓN TITLES AL CAMBIAR MODO
════════════════════════════════════════════════════════════ */
const SectionTitleScramble = (() => {
  const TITLES = {
    dev: {
      about:      'Quién soy',
      skills:     'Stack técnico',
      projects:   'Trabajo seleccionado',
      experience: 'Trayectoria',
      contact:    'Hablemos',
    },
    ia: {
      about:      'Quién soy',
      skills:     'Arsenal IA',
      projects:   'Sistemas IA',
      experience: 'Trayectoria',
      contact:    'Colaboremos',
    },
    sec: {
      about:      'Quién soy',
      skills:     'Arsenal Ofensivo',
      projects:   'Exploits & Builds',
      experience: 'Timeline',
      contact:    'Contacto Seguro',
    },
  };

  const SECTION_TITLE_IDS = {
    about:      '#about    .section-title',
    skills:     '#skills   .section-title',
    projects:   '#projects .section-title',
    experience: '#experience .section-title',
    contact:    '#contact  .section-title',
  };

  function init() {
    window.addEventListener('portfolio:modeChange', e => {
      const { mode } = e.detail;
      const titles   = TITLES[mode] || TITLES.dev;

      Object.entries(SECTION_TITLE_IDS).forEach(([key, selector], i) => {
        const el = document.querySelector(selector);
        if (!el || !titles[key]) return;

        setTimeout(() => {
          TextScramble.scramble(el, titles[key], 500);
        }, i * 60);
      });
    });
  }

  return { init };
})();

/* ════════════════════════════════════════════════════════════
   8. SECTION LABELS DINÁMICAS POR MODO
════════════════════════════════════════════════════════════ */
const SectionLabels = (() => {
  const LABELS = {
    dev: {
      about:      '// sobre mí',
      skills:     '// habilidades',
      projects:   '// proyectos',
      experience: '// experiencia',
      contact:    '// contacto',
    },
    ia: {
      about:      '// bio.md',
      skills:     '// stack.json',
      projects:   '// models/',
      experience: '// history.log',
      contact:    '// connect()',
    },
    sec: {
      about:      '> whoami',
      skills:     '> cat skills.txt',
      projects:   '> ls -la /projects',
      experience: '> history | grep work',
      contact:    '> nc -lvp 4444',
    },
  };

  const SELECTORS = {
    about:      '#about    .section-label',
    skills:     '#skills   .section-label',
    projects:   '#projects .section-label',
    experience: '#experience .section-label',
    contact:    '#contact  .section-label',
  };

  function init() {
    window.addEventListener('portfolio:modeChange', e => {
      const { mode } = e.detail;
      const labels   = LABELS[mode] || LABELS.dev;

      Object.entries(SELECTORS).forEach(([key, selector]) => {
        const el = document.querySelector(selector);
        if (el && labels[key]) {
          el.style.opacity    = '0';
          el.style.transition = 'opacity 0.2s ease';
          setTimeout(() => {
            el.textContent  = labels[key];
            el.style.opacity = '1';
          }, 200);
        }
      });
    });
  }

  return { init };
})();

/* ════════════════════════════════════════════════════════════
   9. INTERSECTION OBSERVER GLOBAL
════════════════════════════════════════════════════════════ */
const SectionReveal = (() => {
  let observer;

  function init() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.animate-on-scroll').forEach(el => el.classList.add('visible'));
      return;
    }

    observer = new IntersectionObserver(_onIntersect, {
      threshold:  0.08,
      rootMargin: '0px 0px -50px 0px',
    });

    _observeAll();
  }

  function _onIntersect(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }

  function _observeAll() {
    document.querySelectorAll('.animate-on-scroll, .timeline-item').forEach(el => {
      observer?.observe(el);
    });
  }

  // Re-observar tras renderizados dinámicos
  window.addEventListener('portfolio:modeChange', () => {
    setTimeout(_observeAll, 200);
  });

  return { init, reobserve: _observeAll };
})();

/* ════════════════════════════════════════════════════════════
   10. STAT COUNTERS — TRIGGER ON SCROLL
════════════════════════════════════════════════════════════ */
const StatCounters = (() => {
  function init() {
    const statsSection = document.getElementById('about');
    if (!statsSection || !('IntersectionObserver' in window)) return;

    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        _triggerCounters();
        obs.unobserve(statsSection);
      }
    }, { threshold: 0.3 });

    obs.observe(statsSection);

    // Re-triggear al cambiar modo
    window.addEventListener('portfolio:modeChange', () => {
      setTimeout(_triggerCounters, 300);
    });
  }

  function _triggerCounters() {
    // Los contadores reales los maneja sections.js._animateStats
    // Aquí solo aseguramos que se vean cuando son visibles
    document.querySelectorAll('.stat-value').forEach(el => {
      el.style.transition = 'color 0.4s ease, transform 0.3s ease';
      el.style.transform  = 'scale(1.08)';
      setTimeout(() => { el.style.transform = ''; }, 400);
    });
  }

  return { init };
})();

/* ════════════════════════════════════════════════════════════
   EXPORT — función de init global
════════════════════════════════════════════════════════════ */
export function initEffects() {
  CustomCursor.init();
  CursorTrail.init();
  MagneticButtons.init();
  GlitchSuffix.init();
  HeroParallax.init();
  SectionTitleScramble.init();
  SectionLabels.init();
  SectionReveal.init();
  StatCounters.init();

  // Aplicar modo inicial a los labels de sección
  const initMode = localStorage.getItem('portfolio-mode') || 'dev';
  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('portfolio:modeChange', {
      detail: {
        mode:   initMode,
        config: {},
      },
    }));
  }, 100);
}
