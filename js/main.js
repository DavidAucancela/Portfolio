/**
 * main.js
 * Coordinador principal del portfolio tri-modal.
 *
 * Responsabilidades exclusivas (todo lo demás está en módulos):
 *  - Navbar: scroll hide/show, link activo, hamburguesa
 *  - Scroll progress bar
 *  - Botón ciclar modo
 *  - Formulario de contacto (submit + validación + feedback)
 *  - Smooth scroll para anclas
 *  - Actualizaciones globales al cambiar modo (footer, hero bg text, projects subtitle)
 *
 * Delegaciones:
 *  - Temas:    theme-switcher.js
 *  - Secciones: sections.js
 *  - Proyectos: projects.js
 *  - Canvas:   animations.js
 */

document.addEventListener('DOMContentLoaded', () => {

  /* ────────────────────────────────────────────────────
     CONSTANTES
  ──────────────────────────────────────────────────── */
  const HERO_BG_TEXT = {
    dev: '</> ',
    ia:  '{ AI }',
    sec: '$_',
  };

  const PROJECTS_SUBTITLE = {
    dev: 'Sistemas y aplicaciones construidos con énfasis en calidad y arquitectura.',
    ia:  'Proyectos que integran inteligencia artificial para resolver problemas reales.',
    sec: 'Auditorías, herramientas y sistemas enfocados en seguridad y protección.',
  };

  /* ────────────────────────────────────────────────────
     NAVBAR — HIDE ON SCROLL DOWN, SHOW ON SCROLL UP
  ──────────────────────────────────────────────────── */
  const navbar   = document.getElementById('navbar');
  let   lastY    = 0;
  let   ticking  = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = window.scrollY;

        // Toggle clase para sombra reforzada
        if (navbar) navbar.classList.toggle('scrolled', y > 10);

        // Ocultar al bajar, mostrar al subir
        if (navbar) {
          if (y > 120 && y > lastY + 6) {
            navbar.style.transform  = 'translateY(-100%)';
            navbar.style.transition = 'transform 0.3s ease';
          } else if (y < lastY - 6 || y < 120) {
            navbar.style.transform = 'translateY(0)';
          }
        }

        lastY = y;
        _updateScrollProgress(y);
        _updateActiveSection();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  /* ────────────────────────────────────────────────────
     SCROLL PROGRESS BAR
  ──────────────────────────────────────────────────── */
  function _updateScrollProgress(y) {
    const bar  = document.getElementById('scroll-progress');
    if (!bar) return;
    const max  = document.documentElement.scrollHeight - window.innerHeight;
    const pct  = max > 0 ? (y / max) * 100 : 0;
    bar.style.width = `${Math.min(pct, 100)}%`;
  }

  /* ────────────────────────────────────────────────────
     NAVBAR — LINK ACTIVO POR SECCIÓN
  ──────────────────────────────────────────────────── */
  const SECTION_IDS = ['hero', 'about', 'skills', 'projects', 'experience', 'contact'];
  const navLinks    = document.querySelectorAll('[data-section]');

  function _updateActiveSection() {
    let active = '';
    for (const id of SECTION_IDS) {
      const el = document.getElementById(id);
      if (!el) continue;
      const { top, bottom } = el.getBoundingClientRect();
      if (top <= 90 && bottom >= 90) { active = id; break; }
    }
    navLinks.forEach(link => {
      const is = link.dataset.section === active;
      link.classList.toggle('active', is);
      link.setAttribute('aria-current', is ? 'page' : 'false');
    });
  }

  /* ────────────────────────────────────────────────────
     HAMBURGUESA MOBILE
  ──────────────────────────────────────────────────── */
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mobileMenu   = document.getElementById('mobile-menu');

  if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      hamburgerBtn.classList.toggle('open', open);
      hamburgerBtn.setAttribute('aria-expanded', String(open));
      mobileMenu.setAttribute('aria-hidden', String(!open));
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', _closeMobileMenu);
    });
  }

  function _closeMobileMenu() {
    mobileMenu?.classList.remove('open');
    hamburgerBtn?.classList.remove('open');
    hamburgerBtn?.setAttribute('aria-expanded', 'false');
    mobileMenu?.setAttribute('aria-hidden', 'true');
  }

  /* ────────────────────────────────────────────────────
     BOTÓN CICLAR MODO
  ──────────────────────────────────────────────────── */
  document.getElementById('cycle-mode-btn')?.addEventListener('click', () => {
    ThemeSwitcher?.cycleMode();
  });

  /* ────────────────────────────────────────────────────
     SMOOTH SCROLL
  ──────────────────────────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href').slice(1);
      if (['dev', 'ia', 'sec'].includes(id)) return; // los hashes de modo los maneja theme-switcher
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const navH = parseInt(
        getComputedStyle(document.documentElement).getPropertyValue('--nav-height')
      ) || 70;
      window.scrollTo({
        top:      target.getBoundingClientRect().top + window.scrollY - navH - 16,
        behavior: 'smooth',
      });
      _closeMobileMenu();
    });
  });

  /* ────────────────────────────────────────────────────
     FORMULARIO DE CONTACTO
  ──────────────────────────────────────────────────── */
  const contactForm    = document.getElementById('contact-form');
  const formFeedback   = document.getElementById('form-feedback');

  if (contactForm) {
    // Campo oculto requerido por Web3Forms
    const accessInput = document.createElement('input');
    accessInput.type  = 'hidden';
    accessInput.name  = 'access_key';
    accessInput.value = 'TU_ACCESS_KEY_WEB3FORMS'; // reemplazar en web3forms.com
    contactForm.appendChild(accessInput);

    const subjectInput = document.createElement('input');
    subjectInput.type  = 'hidden';
    subjectInput.name  = 'subject';
    subjectInput.value = 'Nuevo mensaje desde Jonathan.dev';
    contactForm.appendChild(subjectInput);

    const fromInput = document.createElement('input');
    fromInput.type  = 'hidden';
    fromInput.name  = 'from_name';
    fromInput.value = 'Portfolio Jonathan Aucancela';
    contactForm.appendChild(fromInput);

    contactForm.addEventListener('submit', async e => {
      e.preventDefault();

      const name    = document.getElementById('contact-name')?.value.trim()    || '';
      const email   = document.getElementById('contact-email')?.value.trim()   || '';
      const message = document.getElementById('contact-message')?.value.trim() || '';

      if (!name || !email || !message) {
        _showFeedback('⚠️ Por favor completa los campos obligatorios (nombre, email y mensaje).', 'error');
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        _showFeedback('⚠️ Ingresa un email válido.', 'error');
        return;
      }

      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const origHTML  = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
             style="animation:spinSlow 0.8s linear infinite;">
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
          <path d="M21 3v5h-5"/>
        </svg>
        Enviando...
      `;

      try {
        const formData = new FormData(contactForm);
        const res = await fetch('https://api.web3forms.com/submit', {
          method:  'POST',
          headers: { 'Accept': 'application/json' },
          body:    formData,
        });
        const data = await res.json();

        if (data.success) {
          _showFeedback('✅ ¡Mensaje enviado! Te responderé pronto.', 'success');
          contactForm.reset();
        } else {
          throw new Error(data.message || 'Error al enviar');
        }
      } catch (err) {
        // Fallback: abrir cliente de correo
        const body   = `Nombre: ${name}\nEmail: ${email}\n\nMensaje:\n${message}`;
        const mailto = `mailto:jonathan_jd@outlook.com?subject=${encodeURIComponent('Contacto desde portfolio')}&body=${encodeURIComponent(body)}`;
        window.location.href = mailto;
        _showFeedback('⚠️ Redirigiendo a tu cliente de email como alternativa.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origHTML;
      }
    });
  }

  function _showFeedback(msg, type) {
    if (!formFeedback) return;
    formFeedback.style.display     = 'block';
    formFeedback.textContent       = msg;
    formFeedback.style.padding     = '0.75rem 1rem';
    formFeedback.style.borderRadius = '8px';
    formFeedback.style.fontSize    = '0.875rem';
    const isOk = type === 'success';
    formFeedback.style.background = isOk ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)';
    formFeedback.style.border     = isOk ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.3)';
    formFeedback.style.color      = isOk ? '#4ade80' : '#f87171';
    setTimeout(() => { formFeedback.style.display = 'none'; }, 6000);
  }

  /* ────────────────────────────────────────────────────
     ACTUALIZAR UI GLOBAL AL CAMBIAR MODO
  ──────────────────────────────────────────────────── */
  window.addEventListener('portfolio:modeChange', e => {
    const { mode } = e.detail;

    // Subtítulo de proyectos
    const subtitle = document.getElementById('projects-subtitle');
    if (subtitle) subtitle.textContent = PROJECTS_SUBTITLE[mode] || '';

    // Texto decorativo del hero
    const heroBg = document.getElementById('hero-bg-text');
    if (heroBg) heroBg.textContent = HERO_BG_TEXT[mode] || '';

    // Footer
    const footerLabel = document.getElementById('footer-mode-label');
    if (footerLabel) footerLabel.textContent = `.${mode}`;
  });

  /* ────────────────────────────────────────────────────
     INICIALIZACIÓN
  ──────────────────────────────────────────────────── */
  // Esperar a que ThemeSwitcher esté listo para sincronizar el estado inicial
  let checkCount = 0;
  const waitForTheme = setInterval(() => {
    checkCount++;
    if (typeof ThemeSwitcher !== 'undefined' || checkCount > 40) {
      clearInterval(waitForTheme);
      const mode = ThemeSwitcher?.getCurrentMode() || 'dev';

      // Sincronizar footer y hero bg text con el modo inicial
      const footerLabel = document.getElementById('footer-mode-label');
      if (footerLabel) footerLabel.textContent = `.${mode}`;

      const heroBg = document.getElementById('hero-bg-text');
      if (heroBg) heroBg.textContent = HERO_BG_TEXT[mode] || '';
    }
  }, 50);

});
