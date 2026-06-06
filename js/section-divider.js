export const SectionDivider = (() => {
  const CHARGE_DELAY  = 600;
  const BURST_COUNT   = 72;
  const AMBIENT_COUNT = 36;
  const ACCENT_RGB = { dev: '59,130,246', ia: '6,255,165', sec: '0,255,65' };

  let el, canvas, ctx, glowEl;
  let hoverTimer  = null;
  let burstParticles  = [];
  let ambientParticles = [];
  let ripples     = [];
  let rafId       = null;
  let reduced     = false;
  let isHovered   = false;
  let hoverX      = -1;
  let hoverY      = -1;

  /* ── public ── */
  function init() {
    el = document.getElementById('section-divider');
    if (!el) return;

    canvas = document.getElementById('sdiv-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    glowEl = el.querySelector('.sdiv__cursor-glow');
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    _resize();
    if (!reduced) _initAmbient();

    window.addEventListener('resize', () => { _resize(); if (!reduced) _initAmbient(); });
    window.addEventListener('portfolio:modeChange', () => { if (!reduced) _initAmbient(); });

    el.addEventListener('mouseenter', _onEnter);
    el.addEventListener('mouseleave', _onLeave);
    el.addEventListener('mousemove',  _onMove);
    el.addEventListener('click',      _onClick);

    _loop();
  }

  /* ── internal helpers ── */
  function _resize() {
    if (!canvas || !el) return;
    canvas.width  = el.offsetWidth;
    canvas.height = el.offsetHeight;
  }

  function _getCol() {
    const mode = document.body.dataset.theme || 'dev';
    return ACCENT_RGB[mode] || ACCENT_RGB.dev;
  }

  /* Initialise ambient floating particles spread across the divider */
  function _initAmbient() {
    if (!canvas) return;
    const col = _getCol();
    const cy  = canvas.height / 2;
    ambientParticles = [];
    for (let i = 0; i < AMBIENT_COUNT; i++) {
      const spread = canvas.height * 0.38;
      ambientParticles.push({
        x:         Math.random() * canvas.width,
        y:         cy + (Math.random() - 0.5) * spread * 2,
        vx:        (Math.random() - 0.5) * 0.45,
        vy:        (Math.random() - 0.5) * 0.18,
        r:         0.7 + Math.random() * 1.8,
        baseA:     0.1 + Math.random() * 0.22,
        col,
        phase:     Math.random() * Math.PI * 2,
        phaseSpd:  0.007 + Math.random() * 0.013,
      });
    }
  }

  /* ── mouse events ── */
  function _onEnter(e) {
    isHovered = true;
    el.classList.add('sdiv--hovered');
    _moveGlow(e);
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => el.classList.add('sdiv--charged'), CHARGE_DELAY);
  }

  function _onLeave() {
    isHovered = false;
    hoverX = -1; hoverY = -1;
    el.classList.remove('sdiv--hovered', 'sdiv--charged');
    clearTimeout(hoverTimer);
    if (glowEl) glowEl.style.left = '-9999px';
  }

  function _onMove(e) {
    const rect = el.getBoundingClientRect();
    hoverX = e.clientX - rect.left;
    hoverY = e.clientY - rect.top;
    _moveGlow(e);
  }

  function _moveGlow(e) {
    if (!glowEl) return;
    const rect = el.getBoundingClientRect();
    glowEl.style.left = (e.clientX - rect.left) + 'px';
  }

  /* ── click: burst + ripple waves + scroll ── */
  function _onClick(e) {
    if (reduced) {
      document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const rect = el.getBoundingClientRect();
    const cx   = e.clientX - rect.left;
    const cy   = el.offsetHeight / 2;

    _burst(cx, cy);
    _addRipples(cx, cy);          // second action: energy ripple waves

    setTimeout(() => {
      document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 480);
  }

  /* Radial particle explosion from click point */
  function _burst(cx, cy) {
    const col = _getCol();
    for (let i = 0; i < BURST_COUNT; i++) {
      const angle = (Math.PI * 2 / BURST_COUNT) * i + (Math.random() - 0.5) * 0.45;
      const speed = 2.2 + Math.random() * 5.8;
      burstParticles.push({
        x:  cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.32,
        r:  1.2 + Math.random() * 3.2,
        a:  0.9 + Math.random() * 0.1,
        decay: 0.014 + Math.random() * 0.018,
        col,
      });
    }
    /* White-core flash */
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2.8;
      burstParticles.push({
        x:  cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.4,
        r:  0.7 + Math.random() * 1.8,
        a:  1,
        decay: 0.03 + Math.random() * 0.032,
        col: '255,255,255',
      });
    }
  }

  /* Horizontal energy ripple waves (flat ellipses expanding outward) */
  function _addRipples(cx, cy) {
    const col = _getCol();
    for (let i = 0; i < 4; i++) {
      ripples.push({
        x:    cx,
        y:    cy,
        rx:   0,
        maxRx: 200 + i * 90,
        a:    0.72 - i * 0.12,
        speed: 5 + i * 1.4,
        col,
        lw:   2.2 - i * 0.3,
      });
    }
  }

  /* ── rAF loop — ambient + ripples + burst ── */
  function _loop() {
    rafId = requestAnimationFrame(_loop);
    if (!ctx || !canvas) return;

    const hasWork = burstParticles.length > 0 || ripples.length > 0 ||
                    (!reduced && ambientParticles.length > 0);
    if (!hasWork) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* Ambient field */
    if (!reduced) {
      const cy = canvas.height / 2;
      for (const p of ambientParticles) {
        p.phase += p.phaseSpd;

        /* Cursor interaction */
        if (isHovered && hoverX >= 0) {
          const dx   = hoverX - p.x;
          const dy   = hoverY - p.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 90 && dist > 1) {
            /* Repel from cursor */
            const f = 0.08 / dist;
            p.vx -= dx * f;
            p.vy -= dy * f;
          } else {
            /* Drift toward cursor X */
            p.vx += dx * 0.00014;
          }
        }

        p.vx *= 0.97;
        p.vy *= 0.97;
        p.x  += p.vx;
        p.y  += p.vy;

        /* Wrap X */
        if (p.x < -6) p.x = canvas.width + 6;
        if (p.x > canvas.width + 6) p.x = -6;

        /* Soft gravity toward center line */
        const dy  = cy - p.y;
        p.vy += dy * 0.0007;
        const maxSpread = canvas.height * 0.4;
        if (Math.abs(p.y - cy) > maxSpread) p.vy += (cy - p.y) * 0.005;

        /* Pulse brightness */
        const pulse = 0.5 + 0.5 * Math.sin(p.phase);
        const alpha = p.baseA * (0.45 + 0.55 * pulse);

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.col},${alpha})`;
        ctx.fill();
      }
    }

    /* Ripple waves */
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      rp.rx += rp.speed;
      rp.a  *= 0.966;
      if (rp.rx >= rp.maxRx || rp.a < 0.01) { ripples.splice(i, 1); continue; }
      const ry = rp.rx * 0.26;             // flatten: horizontal ellipse
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, rp.rx, ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${rp.col},${rp.a})`;
      ctx.lineWidth   = rp.lw;
      ctx.stroke();
    }

    /* Burst particles */
    for (let i = burstParticles.length - 1; i >= 0; i--) {
      const p = burstParticles[i];
      p.x  += p.vx;
      p.y  += p.vy;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.a  -= p.decay;
      if (p.a <= 0.01) { burstParticles.splice(i, 1); continue; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.col},${Math.min(p.a, 1)})`;
      ctx.fill();
    }
  }

  return { init };
})();
