/**
 * gam-audio.js — AudioContext compartido para todo el modo .gam
 *
 * Antes vivía privado dentro de gam-piano.js (un _ctx() propio, solo para
 * las notas del piano). Ahora es un único contexto real compartido por el
 * piano y el ambiente/footsteps/blips de gam-ambience.js, en vez de
 * instancias paralelas de AudioContext.
 */
let _audioCtx = null;

export function getAudioContext() {
  if (!_audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    _audioCtx = AC ? new AC() : null;
  }
  return _audioCtx;
}

/**
 * Envolvente simple para un SFX de un solo disparo: ataque rápido + decaimiento
 * exponencial. Antes vivía privada en gam-ambience.js (usada solo por
 * footstep/blip) — ahora exportada de acá para que cualquier módulo de .gam
 * (gam-scene.js, gam-piano.js, gam-juggling.js) pueda disparar un chime corto
 * sin reinventar el boilerplate de Web Audio.
 */
export function envelope(ctx, { freq, type, duration, gain }) {
  const osc  = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;

  const t0 = ctx.currentTime;
  gainNode.gain.setValueAtTime(0.0001, t0);
  gainNode.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  osc.connect(gainNode).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export const GamAudio = { getAudioContext, envelope };
