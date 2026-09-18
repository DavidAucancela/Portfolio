/**
 * gam-tv.js — Prompt "insertar moneda" del modo .gam.
 *
 * La estática ya no vive acá — es el fondo unificado de toda la página
 * (background.js, GamField), que se pausa solo al arrancar el juego (ver
 * el MutationObserver de `.gam-playing` en background.js). Este módulo
 * solo maneja el botón de inicio, el loading y el hint de controles — no
 * sabe nada de Phaser: expone onStart(cb) para que gam-loader.js decida
 * qué pasa al hacer click, y onBooted()/enterMode()/leaveMode() para que
 * ese mismo orquestador le avise en qué momento del ciclo de vida está.
 */

let startBtn, loadingEl, hintEl, screenEl, promptEl;
let _onStartCb = null;

function init() {
  startBtn  = document.getElementById('gam-tv-start');
  loadingEl = document.getElementById('gam-tv-loading');
  hintEl    = document.getElementById('gam-tv-hint');
  screenEl  = document.getElementById('gam-tv-screen');
  promptEl  = document.getElementById('gam-prompt');

  startBtn?.addEventListener('click', () => {
    if (!_onStartCb) return;
    startBtn.hidden = true;

    // Flash de "encendido" — puramente visual, no bloquea el boot de Phaser
    screenEl?.classList.add('is-powering-on');
    setTimeout(() => screenEl?.classList.remove('is-powering-on'), 520);

    if (loadingEl) loadingEl.hidden = false;
    _onStartCb();
  });
}

/** Registra el callback que arranca el juego real (gam-loader.js). */
function onStart(cb) {
  _onStartCb = cb;
}

/** Entrando a .gam: prompt "insertar moneda" visible. */
function enterMode() {
  if (startBtn)  startBtn.hidden  = false;
  if (loadingEl) loadingEl.hidden = true;
  if (hintEl)    hintEl.hidden    = true;
  if (promptEl)  promptEl.hidden  = true;
}

/** Saliendo de .gam: deja el prompt listo para la próxima visita. */
function leaveMode() {
  if (startBtn)  startBtn.hidden  = false;
  if (loadingEl) loadingEl.hidden = true;
  if (hintEl)    hintEl.hidden    = true;
  if (promptEl)  promptEl.hidden  = true;
}

/** El juego terminó de montarse — oculta el loading y muestra el hint. */
function onBooted() {
  if (loadingEl) loadingEl.hidden = true;
  if (hintEl)    hintEl.hidden    = false;
}

export const GamTV = { init, onStart, enterMode, leaveMode, onBooted };
