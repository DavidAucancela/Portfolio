/**
 * animations.js
 * Motor de fondos animados para el hero section.
 *
 * 3 modos de animación:
 *  dev → Partículas azules que flotan y se conectan con líneas
 *  ia  → Red neuronal con nodos que pulsan y sinapsis que brillan
 *  sec → Matrix rain (columnas de caracteres cayendo en verde terminal)
 *
 * Diseño:
 * - Cada animación usa requestAnimationFrame para 60fps
 * - Solo una animación activa a la vez
 * - Se detiene si el canvas no es visible (IntersectionObserver)
 * - Redimensionamiento responsivo con debounce
 */

const HeroAnimations = (() => {

  /* ────────────────────────────────────────────────────
     ESTADO INTERNO
  ──────────────────────────────────────────────────── */
  let canvas        = null;
  let ctx           = null;
  let animFrameId   = null;    // ID del requestAnimationFrame activo
  let currentMode   = null;
  let isVisible     = true;
  let resizeTimer   = null;

  // Respetar preferencia de movimiento reducido del sistema operativo
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ────────────────────────────────────────────────────
     INICIALIZACIÓN
  ──────────────────────────────────────────────────── */
  function init() {
    canvas = document.getElementById('hero-canvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    _resize();

    // Observar si el canvas está en pantalla para pausar si no
    _setupIntersectionObserver();

    // Redimensionar al cambiar tamaño de ventana
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        _resize();
        // Reiniciar la animación actual con las nuevas dimensiones
        if (currentMode) startAnimation(currentMode);
      }, 200);
    });

    // Escuchar cambios de modo desde theme-switcher
    window.addEventListener('portfolio:modeChange', (e) => {
      startAnimation(e.detail.mode);
    });
  }

  function _resize() {
    if (!canvas) return;
    const parent = canvas.parentElement;
    canvas.width  = parent ? parent.offsetWidth  : window.innerWidth;
    canvas.height = parent ? parent.offsetHeight : window.innerHeight;
  }

  function _setupIntersectionObserver() {
    if (!canvas || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      isVisible = entries[0].isIntersecting;
      if (!isVisible) {
        _stopLoop();
      } else if (currentMode) {
        _startLoop(_getRunner(currentMode));
      }
    }, { threshold: 0.05 });

    observer.observe(canvas);
  }

  /* ────────────────────────────────────────────────────
     CONTROL DEL LOOP
  ──────────────────────────────────────────────────── */
  function startAnimation(mode) {
    _stopLoop();
    currentMode = mode;
    if (!isVisible || reducedMotion.matches) return;
    _startLoop(_getRunner(mode));
  }

  function _stopLoop() {
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
  }

  function _startLoop(runner) {
    if (!runner || !ctx) return;
    runner.reset(canvas, ctx);

    function tick() {
      if (!isVisible) return;
      // MatrixRain gestiona su propio fondo; los otros necesitan clearRect
      if (currentMode !== 'sec') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      runner.draw(canvas, ctx);
      animFrameId = requestAnimationFrame(tick);
    }

    animFrameId = requestAnimationFrame(tick);
  }

  function _getRunner(mode) {
    switch (mode) {
      case 'dev': return DevParticles;
      case 'ia':  return NeuralNetwork;
      case 'sec': return MatrixRain;
      default:    return DevParticles;
    }
  }

  /* ══════════════════════════════════════════════════════
     ANIMACIÓN 1: DEV — PARTÍCULAS FLOTANTES
     Partículas azules que flotan y se conectan con líneas
     cuando están suficientemente cerca.
  ══════════════════════════════════════════════════════ */
  const DevParticles = (() => {
    const COLOR_PARTICLE = '#3b82f6';
    const COLOR_LINE     = 'rgba(59,130,246,';
    const MAX_PARTICLES  = 70;
    const MAX_DIST       = 130;   // distancia máxima para dibujar línea
    const SPEED          = 0.4;
    const RADIUS_MIN     = 1.5;
    const RADIUS_MAX     = 3;

    let particles = [];

    function _createParticle(w, h) {
      return {
        x:   Math.random() * w,
        y:   Math.random() * h,
        vx:  (Math.random() - 0.5) * SPEED,
        vy:  (Math.random() - 0.5) * SPEED,
        r:   RADIUS_MIN + Math.random() * (RADIUS_MAX - RADIUS_MIN),
        alpha: 0.3 + Math.random() * 0.5,
      };
    }

    function reset(canvas) {
      particles = [];
      for (let i = 0; i < MAX_PARTICLES; i++) {
        particles.push(_createParticle(canvas.width, canvas.height));
      }
    }

    function draw(canvas, ctx) {
      const w = canvas.width;
      const h = canvas.height;

      // Actualizar posiciones
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Rebotar en los bordes
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
      }

      // Dibujar líneas entre partículas cercanas
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx   = particles[i].x - particles[j].x;
          const dy   = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MAX_DIST) {
            const opacity = (1 - dist / MAX_DIST) * 0.35;
            ctx.beginPath();
            ctx.strokeStyle = COLOR_LINE + opacity + ')';
            ctx.lineWidth   = 0.8;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Dibujar partículas
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59,130,246,${p.alpha})`;
        ctx.fill();

        // Halo suave
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
        grad.addColorStop(0, `rgba(59,130,246,0.15)`);
        grad.addColorStop(1, `rgba(59,130,246,0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    return { reset, draw };
  })();

  /* ══════════════════════════════════════════════════════
     ANIMACIÓN 2: IA — RED NEURONAL
     Nodos que pulsan conectados por sinapsis que brillan
     con colores violeta y cyan neón.
  ══════════════════════════════════════════════════════ */
  const NeuralNetwork = (() => {
    const NODE_COUNT   = 55;
    const MAX_CONN     = 170;
    const NODE_R_MIN   = 3;
    const NODE_R_MAX   = 7;
    const MOUSE_RADIUS = 120;
    const MOUSE_FORCE  = 0.018;

    let nodes      = [];
    let signals    = [];
    let frameCount = 0;
    let mouse      = { x: -9999, y: -9999 };

    function _createNode(w, h) {
      return {
        x:       Math.random() * w,
        y:       Math.random() * h,
        vx:      (Math.random() - 0.5) * 0.28,
        vy:      (Math.random() - 0.5) * 0.28,
        r:       NODE_R_MIN + Math.random() * (NODE_R_MAX - NODE_R_MIN),
        pulse:   Math.random() * Math.PI * 2,
        pSpeed:  0.03 + Math.random() * 0.03,
        isMajor: Math.random() < 0.2,
      };
    }

    function reset(canvas) {
      nodes   = [];
      signals = [];

      for (let i = 0; i < NODE_COUNT; i++) {
        nodes.push(_createNode(canvas.width, canvas.height));
      }

      canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
      });
      canvas.addEventListener('mouseleave', () => {
        mouse.x = -9999; mouse.y = -9999;
      });
      canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        let closest = null, minD = Infinity;
        for (const n of nodes) {
          const d = Math.hypot(n.x - mx, n.y - my);
          if (d < minD) { minD = d; closest = n; }
        }
        if (closest) {
          const targets = [...nodes]
            .filter(n => n !== closest)
            .sort(() => Math.random() - 0.5)
            .slice(0, 6);
          for (const t of targets) _spawnSignal(closest, t, true);
        }
      });
    }

    function _spawnSignal(fromNode, toNode, burst = false) {
      signals.push({
        from:  fromNode,
        to:    toNode,
        t:     0,
        speed: burst ? 0.025 + Math.random() * 0.015 : 0.008 + Math.random() * 0.012,
        color: Math.random() < 0.5 ? '#06ffa5' : '#b14eff',
      });
    }

    function draw(canvas, ctx) {
      const w = canvas.width;
      const h = canvas.height;
      frameCount++;

      for (const n of nodes) {
        const mdx = mouse.x - n.x;
        const mdy = mouse.y - n.y;
        const md  = Math.hypot(mdx, mdy);
        if (md < MOUSE_RADIUS && md > 0) {
          const force = (1 - md / MOUSE_RADIUS) * MOUSE_FORCE;
          n.vx += (mdx / md) * force;
          n.vy += (mdy / md) * force;
        }
        const speed = Math.hypot(n.vx, n.vy);
        if (speed > 1.2) { n.vx *= 0.95; n.vy *= 0.95; }

        n.x += n.vx;
        n.y += n.vy;
        n.pulse += n.pSpeed;

        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }

      if (frameCount % 18 === 0 && nodes.length > 1) {
        const a = nodes[Math.floor(Math.random() * nodes.length)];
        const b = nodes[Math.floor(Math.random() * nodes.length)];
        if (a !== b) {
          const dx = a.x - b.x, dy = a.y - b.y;
          if (Math.sqrt(dx*dx + dy*dy) < MAX_CONN) _spawnSignal(a, b);
        }
      }

      signals = signals.filter(s => s.t < 1);
      for (const s of signals) s.t += s.speed;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx   = nodes[i].x - nodes[j].x;
          const dy   = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_CONN) {
            const opacity = (1 - dist / MAX_CONN) * 0.18;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(177,78,255,${opacity})`;
            ctx.lineWidth   = 0.7;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      for (const s of signals) {
        const sx    = s.from.x + (s.to.x - s.from.x) * s.t;
        const sy    = s.from.y + (s.to.y - s.from.y) * s.t;
        const alpha = Math.sin(s.t * Math.PI);
        const isGreen = s.color === '#06ffa5';

        ctx.beginPath();
        ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = isGreen ? `rgba(6,255,165,${alpha*0.9})` : `rgba(177,78,255,${alpha*0.9})`;
        ctx.fill();

        const haloGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 10);
        haloGrad.addColorStop(0, isGreen ? `rgba(6,255,165,${alpha*0.3})` : `rgba(177,78,255,${alpha*0.3})`);
        haloGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(sx, sy, 10, 0, Math.PI * 2);
        ctx.fillStyle = haloGrad;
        ctx.fill();
      }

      for (const n of nodes) {
        const nearMouse  = Math.hypot(mouse.x - n.x, mouse.y - n.y) < MOUSE_RADIUS;
        const pulseScale = nearMouse ? 1 + Math.sin(n.pulse) * 0.3 : 1 + Math.sin(n.pulse) * 0.15;
        const pulseAlpha = nearMouse ? 0.85 + Math.sin(n.pulse) * 0.15 : 0.5 + Math.sin(n.pulse) * 0.3;
        const rDraw      = n.r * pulseScale;

        const halo = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, rDraw * (nearMouse ? 7 : 5));
        if (n.isMajor) {
          halo.addColorStop(0, `rgba(177,78,255,${pulseAlpha * 0.35})`);
        } else {
          halo.addColorStop(0, `rgba(6,255,165,${pulseAlpha * 0.28})`);
        }
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(n.x, n.y, rDraw * (nearMouse ? 7 : 5), 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, rDraw, 0, Math.PI * 2);
        ctx.fillStyle = n.isMajor ? `rgba(177,78,255,${pulseAlpha})` : `rgba(6,255,165,${pulseAlpha * 0.8})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, rDraw, 0, Math.PI * 2);
        ctx.strokeStyle = n.isMajor
          ? `rgba(177,78,255,${nearMouse ? 1 : 0.6})`
          : `rgba(6,255,165,${nearMouse ? 1 : 0.5})`;
        ctx.lineWidth = nearMouse ? 1.5 : 1;
        ctx.stroke();
      }
    }

    return { reset, draw };
  })();

  /* ══════════════════════════════════════════════════════
     ANIMACIÓN 3: SEC — MATRIX RAIN
     Columnas de caracteres cayendo en verde terminal,
     con variaciones de brillo y velocidad por columna.
  ══════════════════════════════════════════════════════ */
  const MatrixRain = (() => {
    const CHARS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF<>/\\|{}[]!@#$%^&*';
    const FONT_SIZE    = 14;
    const SPEED_MIN    = 0.3;
    const SPEED_MAX    = 0.8;
    const OPACITY_MAX  = 0.42;   // reducido para distinguirse del fondo
    const FADE_IN_RATE = 0.004;  // velocidad de aparición gradual por columna

    let columns    = [];
    let initiated  = false;    // evita reiniciar si ya hay columnas activas

    function _initColumns(w, h) {
      columns   = [];
      initiated = true;
      const count = Math.floor(w / FONT_SIZE);

      for (let i = 0; i < count; i++) {
        columns.push({
          x:        i * FONT_SIZE,
          // Distribuir columnas en distintos puntos del canvas desde el inicio
          y:        Math.random() * h,
          speed:    SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN),
          length:   8 + Math.floor(Math.random() * 20),
          chars:    [],
          opacity:  0.12 + Math.random() * (OPACITY_MAX - 0.12),
          // Entrada gradual: cada columna empieza invisible y aparece a distinta velocidad
          fadeIn:      0,
          fadeInRate:  FADE_IN_RATE * (0.4 + Math.random() * 1.2),
          fadeDelay:   Math.floor(Math.random() * 140), // frames de retraso inicial
          isGlitch: Math.random() < 0.1,
        });

        for (let j = 0; j < 30; j++) {
          columns[i].chars.push(_randomChar());
        }
      }
    }

    function _randomChar() {
      return CHARS[Math.floor(Math.random() * CHARS.length)];
    }

    function reset(canvas) {
      // Solo reiniciar si cambia el ancho (resize real) o es la primera vez
      const newCount = Math.floor(canvas.width / FONT_SIZE);
      if (!initiated || columns.length !== newCount) {
        _initColumns(canvas.width, canvas.height);
      }
    }

    function draw(canvas, ctx) {
      const w = canvas.width;
      const h = canvas.height;

      // Semi-transparente para el efecto de rastro
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, w, h);

      ctx.font = `${FONT_SIZE}px 'Fira Code', 'Courier New', monospace`;

      for (const col of columns) {
        // Animación de entrada: esperar el delay y luego incrementar fadeIn
        if (col.fadeDelay > 0) {
          col.fadeDelay--;
          continue;
        }
        if (col.fadeIn < 1) col.fadeIn = Math.min(1, col.fadeIn + col.fadeInRate);

        col.y += col.speed;

        // Cambiar caracteres aleatoriamente
        if (Math.random() < 0.05) {
          const idx = Math.floor(Math.random() * col.chars.length);
          col.chars[idx] = _randomChar();
        }

        const visibleOpacity = col.opacity * col.fadeIn;

        // Dibujar la columna de caracteres
        for (let i = 0; i < col.length; i++) {
          const charY = col.y - i * FONT_SIZE;
          if (charY < 0 || charY > h) continue;

          const charIdx = i % col.chars.length;
          const char    = col.chars[charIdx];

          // El primer caracter (cabeza) es el más brillante (blanco/verde claro)
          if (i === 0) {
            ctx.fillStyle = `rgba(200, 255, 200, ${visibleOpacity})`;
          } else if (col.isGlitch && i < 2) {
            // Columna glitch: tinte rojo en los primeros chars
            ctx.fillStyle = `rgba(255, 0, 51, ${visibleOpacity * (1 - i / col.length)})`;
          } else {
            // Fade gradual: los más "viejos" (abajo) se ven más apagados
            const fade = 1 - (i / col.length);
            ctx.fillStyle = `rgba(0, 255, 65, ${visibleOpacity * fade * 0.8})`;
          }

          ctx.fillText(char, col.x, charY);
        }

        // Reiniciar columna cuando sale del canvas
        if (col.y - col.length * FONT_SIZE > h) {
          col.y = Math.random() * -100;
          col.speed    = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);
          col.isGlitch = Math.random() < 0.1;
          col.opacity  = 0.12 + Math.random() * (OPACITY_MAX - 0.12);
          // Al reiniciar el ciclo la columna ya no necesita fade-in
          col.fadeIn   = 1;
          col.fadeDelay = 0;
        }
      }
    }

    return { reset, draw };
  })();

  /* ────────────────────────────────────────────────────
     API PÚBLICA
  ──────────────────────────────────────────────────── */
  return {
    init,
    startAnimation,
    stop: _stopLoop,
  };

})();

// Auto-inicializar
document.addEventListener('DOMContentLoaded', () => HeroAnimations.init());
