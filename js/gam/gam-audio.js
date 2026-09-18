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

export const GamAudio = { getAudioContext };
