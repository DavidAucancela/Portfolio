export const SectionDivider = (() => {
  const CHARGE_DELAY  = 600;
  const BURST_COUNT   = 72;
  const AMBIENT_COUNT = 36;
  const ACCENT_RGB = { dev: '59,130,246', ia: '6,255,165', sec: '0,255,65' };

  let el, canvas, ctx, glowEl, chargeEl;
  let hoverTimer  = null;
  let burstParticles   = [];
  let ambientParticles = [];
  let rafId       = null;
  let reduced     = false;
  let isHovered   = false;
  let hoverX      = -1;
  let hoverY      = -1;
  let enterOrigin = 0.5;   // 0–1: fraction of width where mouse entered

  /* ── public ── */
  function init() {
    el = document.getElementById('section-divider');
    if (!el) return;

    canvas = document.getElementById('sdiv-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    glowEl   = el.querySelector('.sdiv__cursor-glow');
    chargeEl = el.querySelector('.sdiv__charge');
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

    /* Charge bar grows from the X position where the mouse entered */
    const rect = el.getBoundingClientRect();
    enterOrigin = (e.clientX - rect.left) / rect.width;
    if (chargeEl) chargeEl.style.transformOrigin = `${enterOrigin * 100}% 50%`;

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

  /* ── click: chispas horizontales + flash de línea ── */
  function _onClick(e) {
    if (reduced) return;
    const rect = el.getBoundingClientRect();
    const cx   = e.clientX - rect.left;
    const cy   = el.offsetHeight / 2;
    _wireSparks(cx, cy);
    _lineFlash();
  }

  /* Chispas que viajan horizontalmente a lo largo del eje de la línea */
  function _wireSparks(cx, cy) {
    const col = _getCol();
    /* 25 chispas a la izquierda, 25 a la derecha */
    for (let side = -1; side <= 1; side += 2) {
      for (let i = 0; i < 25; i++) {
        const speed = 5 + Math.random() * 11;
        burstParticles.push({
          x:     cx,
          y:     cy + (Math.random() - 0.5) * 10,
          vx:    side * speed,
          vy:    (Math.random() - 0.5) * 1.4,
          r:     0.9 + Math.random() * 1.8,
          a:     0.85 + Math.random() * 0.15,
          decay: 0.016 + Math.random() * 0.022,
          col,
          trail:    true,
          trailLen: 3 + Math.random() * 5,
        });
      }
    }
    /* Núcleo blanco — chispas rápidas muy cortas en el punto de impact */
    for (let i = 0; i < 12; i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      burstParticles.push({
        x:     cx, y: cy + (Math.random() - 0.5) * 4,
        vx:    side * (8 + Math.random() * 8),
        vy:    (Math.random() - 0.5) * 0.8,
        r:     0.5 + Math.random() * 0.8,
        a:     1,
        decay: 0.04 + Math.random() * 0.04,
        col:   '255,255,255',
        trail:    true,
        trailLen: 5 + Math.random() * 6,
      });
    }
  }

  /* Flash instantáneo de la línea entera */
  function _lineFlash() {
    el.classList.add('sdiv--flash');
    setTimeout(() => el.classList.remove('sdiv--flash'), 380);
  }

  /* ── rAF loop — ambient + ripples + burst ── */
  function _loop() {
    rafId = requestAnimationFrame(_loop);
    if (!ctx || !canvas) return;

    const hasWork = burstParticles.length > 0 || (!reduced && ambientParticles.length > 0);
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

    /* Wire sparks / burst particles */
    ctx.lineCap = 'round';
    for (let i = burstParticles.length - 1; i >= 0; i--) {
      const p = burstParticles[i];
      p.x  += p.vx;
      p.y  += p.vy;
      p.vx *= 0.91;
      p.vy *= 0.88;
      p.a  -= p.decay;
      if (p.a <= 0.01) { burstParticles.splice(i, 1); continue; }

      const alpha = Math.min(p.a, 1);
      if (p.trail && p.vx !== 0) {
        /* Trail: línea en la dirección de movimiento */
        const trailX = p.x - Math.sign(p.vx) * Math.min(Math.abs(p.vx) * p.trailLen, 48);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(trailX, p.y);
        ctx.strokeStyle = `rgba(${p.col},${alpha})`;
        ctx.lineWidth   = p.r * 1.6;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.col},${alpha})`;
        ctx.fill();
      }
    }
  }

  return { init };
})();
