/**
 * gam-ambience.js — sonido ambiental del cuarto (modo .gam)
 *
 * Todo generado con Web Audio, sin archivos: un pad suave en loop
 * (startAmbience/stopAmbience) + dos efectos cortos con la envolvente
 * compartida de gam-audio.js (footstep al caminar, blip al entrar en rango
 * de un objeto). Usa el AudioContext compartido de gam-audio.js — no crea
 * el suyo propio.
 */
import { envelope } from './gam-audio.js';

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

export function playFootstep(ctx) {
  if (!ctx) return;
  envelope(ctx, { freq: 90 + Math.random() * 20, type: 'sine', duration: 0.06, gain: 0.08 });
}

export function playProximityBlip(ctx) {
  if (!ctx) return;
  envelope(ctx, { freq: 640, type: 'triangle', duration: 0.09, gain: 0.1 });
}

export const GamAmbience = { startAmbience, stopAmbience, playFootstep, playProximityBlip };
