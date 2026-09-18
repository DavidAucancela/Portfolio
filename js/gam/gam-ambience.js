/**
 * gam-ambience.js — sonido ambiental del cuarto (modo .gam)
 *
 * Todo generado con Web Audio, sin archivos: un pad suave en loop
 * (startAmbience/stopAmbience) + dos efectos cortos, envolvente simple
 * (misma técnica que _playNote en gam-piano.js, afinados distinto):
 * footstep al caminar, blip al entrar en rango de un objeto.
 * Usa el AudioContext compartido de gam-audio.js — no crea el suyo propio.
 */

let _pad = null; // referencias vivas del pad activo, para poder pararlo

export function startAmbience(ctx) {
  if (!ctx || _pad) return;
  if (ctx.state === 'suspended') ctx.resume();

  const master = ctx.createGain();
  master.gain.value = 0.05;
  master.connect(ctx.destination);

  // Quinta simple (A2 + E3) — colchón sin melodía, no compite con el piano
  const oscillators = [110, 164.81].map(freq => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(master);
    osc.start();
    return osc;
  });

  // LFO lento modulando la ganancia — "respiración" del pad, no un tono fijo
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.025;
  lfo.connect(lfoGain).connect(master.gain);
  lfo.start();

  _pad = { master, oscillators, lfo };
}

export function stopAmbience() {
  if (!_pad) return;
  const { master, oscillators, lfo } = _pad;
  oscillators.forEach(o => { try { o.stop(); } catch { /* ya estaba detenido */ } });
  try { lfo.stop(); } catch { /* ya estaba detenido */ }
  master.disconnect();
  _pad = null;
}

function _envelope(ctx, { freq, type, duration, gain }) {
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

export function playFootstep(ctx) {
  if (!ctx) return;
  _envelope(ctx, { freq: 90 + Math.random() * 20, type: 'sine', duration: 0.06, gain: 0.08 });
}

export function playProximityBlip(ctx) {
  if (!ctx) return;
  _envelope(ctx, { freq: 640, type: 'triangle', duration: 0.09, gain: 0.1 });
}

export const GamAmbience = { startAmbience, stopAmbience, playFootstep, playProximityBlip };
