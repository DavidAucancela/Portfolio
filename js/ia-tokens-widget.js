/* ============================================================
   IA TOKENS WIDGET — Total de tokens de LLM Observatory (modo .ia)
   ============================================================ */

function _countUp(el, to, suffix = '', duration = 1200) {
  const from = 0;
  const start = performance.now();

  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = Math.round(from + (to - from) * eased);
    el.textContent = value.toLocaleString('es-EC') + suffix;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

export const IaTokensWidget = (() => {
  let _loaded = false;

  function init() {
    window.addEventListener('portfolio:modeChange', (e) => {
      if (e.detail.mode === 'ia') _onEnterIa();
    });

    setTimeout(() => {
      if (document.body.getAttribute('data-theme') === 'ia' && !_loaded) {
        _onEnterIa();
      }
    }, 120);
  }

  async function _onEnterIa() {
    if (_loaded) return;
    _loaded = true;

    const valueEl  = document.getElementById('ia-tokens-value');
    const statusEl = document.getElementById('ia-tokens-status');
    if (!valueEl) return;

    try {
      const res  = await fetch('/api/llm-stats');
      const data = (await res.json()) || {};

      if (data.mock || !Number.isFinite(data.totalTokens)) {
        valueEl.textContent = '···';
        valueEl.classList.remove('ia-tokens__value--live');
        if (statusEl) statusEl.textContent = 'sincronizando…';
        return;
      }

      valueEl.classList.add('ia-tokens__value--live');
      _countUp(valueEl, data.totalTokens);
      if (statusEl) statusEl.textContent = 'en vivo · LLM Observatory';
    } catch (err) {
      console.error('[ia-tokens-widget] Error:', err.message);
      valueEl.textContent = '—';
      valueEl.classList.remove('ia-tokens__value--live');
      if (statusEl) statusEl.textContent = 'sin conexión';
      _loaded = false; // permite reintentar al reentrar al modo .ia
    }
  }

  return { init };
})();
