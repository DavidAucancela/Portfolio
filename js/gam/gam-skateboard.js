/**
 * gam-skateboard.js — Vista previa de la patineta (modo .gam)
 *
 * Todavía NO es el visor 3D real (@google/model-viewer + .glb) que pide
 * docs/gam-mode-plan.md — falta el modelo con el arte real del deck.
 * Mientras tanto, esto da un adelanto honesto: el deck dibujado (mismo
 * estilo flat que el resto del cuarto) dentro de una card grande con un
 * tilt 3D que sigue el drag del mouse/touch — se siente "agarrable" sin
 * fingir un modelo que no existe. Cuando llegue el .glb, este módulo se
 * reemplaza por el visor real (mount() se llama igual desde gam-loader.js).
 */

function mount(container) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const root = document.createElement('div');
  root.className = 'gam-skate';
  root.innerHTML = `
    <div class="gam-skate__stage" id="gam-skate-stage">
      <svg class="gam-skate__deck" viewBox="0 0 220 90" aria-hidden="true">
        <rect x="10" y="34" width="200" height="26" rx="13" fill="#06ffa5"/>
        <rect x="10" y="34" width="200" height="10" rx="5" fill="#3ef7c2" opacity="0.65"/>
        <circle cx="55" cy="66" r="9" fill="#0a0a0a"/>
        <circle cx="165" cy="66" r="9" fill="#0a0a0a"/>
        <circle cx="55" cy="66" r="3.5" fill="#5c6470"/>
        <circle cx="165" cy="66" r="3.5" fill="#5c6470"/>
      </svg>
    </div>
    <p class="gam-skate__hint">Arrastrá para girarla — el visor 3D real llega con el modelo del deck.</p>
  `;
  container.appendChild(root);

  const stage = root.querySelector('#gam-skate-stage');
  const deck  = root.querySelector('.gam-skate__deck');

  let dragging = false;
  let lastX = 0;
  let rotY = -18;

  const applyTilt = () => {
    deck.style.transform = `rotateY(${rotY}deg) rotateX(8deg)`;
  };
  applyTilt();

  if (!reducedMotion) {
    const onDown = (e) => {
      dragging = true;
      lastX = (e.touches ? e.touches[0].clientX : e.clientX);
      stage.classList.add('is-dragging');
    };
    const onMove = (e) => {
      if (!dragging) return;
      const x = (e.touches ? e.touches[0].clientX : e.clientX);
      rotY += (x - lastX) * 0.6;
      lastX = x;
      applyTilt();
    };
    const onUp = () => { dragging = false; stage.classList.remove('is-dragging'); };

    stage.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    let autoSpin = requestAnimationFrame(function spin() {
      if (!dragging) { rotY += 0.15; applyTilt(); }
      autoSpin = requestAnimationFrame(spin);
    });

    return function unmount() {
      cancelAnimationFrame(autoSpin);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      root.remove();
    };
  }

  return function unmount() {
    root.remove();
  };
}

export const GamSkateboard = { mount };
