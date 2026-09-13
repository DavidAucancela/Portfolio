/**
 * gam-tv.js — La "TV" del modo .gam: estática de ruido + botón de encendido.
 *
 * Dueño exclusivo del DOM del widget (canvas de estática, botón "Click para
 * comenzar", loading, hint de controles). No sabe nada de Phaser — solo
 * expone onStart(cb) para que gam-loader.js decida qué pasa al hacer click,
 * y onBooted()/enterMode()/leaveMode() para que ese mismo orquestador le
 * avise en qué momento del ciclo de vida está.
 */

const STATIC_W = 128;
const STATIC_H = 96;
const STATIC_INTERVAL_MS = 70; // ~14fps — más entrecortado = más "estática de TV"

let canvas, ctx, imageData, buf;
let staticTimer = null;
let startBtn, loadingEl, hintEl, screenEl, promptEl;
let _onStartCb = null;

function _initCanvas() {
  canvas = document.getElementById('gam-tv-static');
  if (!canvas) return;
  canvas.width  = STATIC_W;
  canvas.height = STATIC_H;
  ctx = canvas.getContext('2d');
  imageData = ctx.createImageData(STATIC_W, STATIC_H);
  buf = imageData.data;
}

function _drawStaticFrame() {
  if (!ctx) return;
  for (let i = 0; i < buf.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    buf[i] = v; buf[i + 1] = v; buf[i + 2] = v; buf[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
}

function _startStaticLoop() {
  if (staticTimer || !ctx) return;
  _drawStaticFrame();
  staticTimer = setInterval(_drawStaticFrame, STATIC_INTERVAL_MS);
}

function _stopStaticLoop() {
  if (staticTimer) {
    clearInterval(staticTimer);
    staticTimer = null;
  }
}

function init() {
  _initCanvas();
  startBtn  = document.getElementById('gam-tv-start');
  loadingEl = document.getElementById('gam-tv-loading');
  hintEl    = document.getElementById('gam-tv-hint');
  screenEl  = document.getElementById('gam-tv-screen');
  promptEl  = document.getElementById('gam-prompt');

  startBtn?.addEventListener('click', () => {
    if (!_onStartCb) return;
    _stopStaticLoop();
    // El canvas de estática se queda con el último frame dibujado si no
    // se oculta — se vería congelado alrededor del canvas de Phaser
    // (que letterboxea 4:3 dentro de la pantalla completa).
    if (canvas) canvas.hidden = true;
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

/** Entrando a .gam: TV "apagada" mostrando estática + botón de inicio. */
function enterMode() {
  if (canvas)    canvas.hidden    = false;
  if (startBtn)  startBtn.hidden  = false;
  if (loadingEl) loadingEl.hidden = true;
  if (hintEl)    hintEl.hidden    = true;
  if (promptEl)  promptEl.hidden  = true;
  _startStaticLoop();
}

/** Saliendo de .gam: apaga todo y deja la TV lista para la próxima visita. */
function leaveMode() {
  _stopStaticLoop();
  if (canvas)    canvas.hidden    = false;
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
