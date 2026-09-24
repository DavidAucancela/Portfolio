/**
 * gam-chess.js — reglas de ajedrez + IA sencilla para la estación del tablero.
 *
 * Lógica pura (sin Three.js): tablero de 64 casillas, índice = fila*8 + columna,
 * fila 0 = octava fila (lado negro), fila 7 = primera (lado blanco).
 * Blancas en MAYÚSCULA, negras en minúscula. Incluye enroque, al paso y
 * coronación (siempre a dama). Sin tablas por repetición ni regla de 50 jugadas.
 */

const START = 'rnbqkbnrpppppppp' + '-'.repeat(32) + 'PPPPPPPPRNBQKBNR';

export const isWhite = (p) => p !== null && p === p.toUpperCase();
const colorOf = (p) => (isWhite(p) ? 'w' : 'b');
const rowOf = (i) => i >> 3;
const colOf = (i) => i & 7;

export function newGame() {
  return {
    b: [...START].map((ch) => (ch === '-' ? null : ch)),
    turn: 'w',
    castle: { K: true, Q: true, k: true, q: true },
    ep: -1,
  };
}

const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const BISHOP_DIRS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const ROOK_DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;

/** ¿La casilla `sq` está atacada por el color `by`? */
function attacked(b, sq, by) {
  const r = rowOf(sq), c = colOf(sq);
  const own = (p, kind) => p !== null && colorOf(p) === by && p.toLowerCase() === kind;
  // peones: un peón blanco ataca hacia arriba (fila -1), por eso miramos desde la casilla
  const pr = by === 'w' ? r + 1 : r - 1;
  for (const dc of [-1, 1]) if (inside(pr, c + dc) && own(b[pr * 8 + c + dc], 'p')) return true;
  for (const [dr, dc] of KNIGHT) if (inside(r + dr, c + dc) && own(b[(r + dr) * 8 + c + dc], 'n')) return true;
  for (const [dr, dc] of KING) if (inside(r + dr, c + dc) && own(b[(r + dr) * 8 + c + dc], 'k')) return true;
  const ray = (dirs, kinds) => {
    for (const [dr, dc] of dirs) {
      let rr = r + dr, cc = c + dc;
      while (inside(rr, cc)) {
        const p = b[rr * 8 + cc];
        if (p !== null) { if (colorOf(p) === by && kinds.includes(p.toLowerCase())) return true; break; }
        rr += dr; cc += dc;
      }
    }
    return false;
  };
  return ray(BISHOP_DIRS, ['b', 'q']) || ray(ROOK_DIRS, ['r', 'q']);
}

function kingSquare(b, color) {
  const k = color === 'w' ? 'K' : 'k';
  return b.indexOf(k);
}

export function inCheck(state, color = state.turn) {
  const k = kingSquare(state.b, color);
  return k >= 0 && attacked(state.b, k, color === 'w' ? 'b' : 'w');
}

function pseudoMoves(state) {
  const { b, turn, castle, ep } = state;
  const moves = [];
  const push = (from, to, extra) => moves.push({ from, to, ...extra });
  for (let from = 0; from < 64; from++) {
    const p = b[from];
    if (p === null || colorOf(p) !== turn) continue;
    const r = rowOf(from), c = colOf(from);
    const kind = p.toLowerCase();
    if (kind === 'p') {
      const dir = turn === 'w' ? -1 : 1;
      const startRow = turn === 'w' ? 6 : 1;
      const lastRow = turn === 'w' ? 0 : 7;
      const addP = (to, extra) => push(from, to, rowOf(to) === lastRow ? { ...extra, promo: true } : extra);
      if (inside(r + dir, c) && b[(r + dir) * 8 + c] === null) {
        addP((r + dir) * 8 + c);
        if (r === startRow && b[(r + 2 * dir) * 8 + c] === null) push(from, (r + 2 * dir) * 8 + c, { double: true });
      }
      for (const dc of [-1, 1]) {
        if (!inside(r + dir, c + dc)) continue;
        const to = (r + dir) * 8 + c + dc;
        if (b[to] !== null && colorOf(b[to]) !== turn) addP(to);
        else if (to === ep) push(from, to, { enPassant: true });
      }
    } else if (kind === 'n' || kind === 'k') {
      for (const [dr, dc] of kind === 'n' ? KNIGHT : KING) {
        if (!inside(r + dr, c + dc)) continue;
        const to = (r + dr) * 8 + c + dc;
        if (b[to] === null || colorOf(b[to]) !== turn) push(from, to);
      }
      if (kind === 'k') {
        const row = turn === 'w' ? 7 : 0;
        const enemy = turn === 'w' ? 'b' : 'w';
        if (from === row * 8 + 4 && !attacked(b, from, enemy)) {
          const ks = turn === 'w' ? castle.K : castle.k;
          const qs = turn === 'w' ? castle.Q : castle.q;
          if (ks && b[row * 8 + 5] === null && b[row * 8 + 6] === null
            && !attacked(b, row * 8 + 5, enemy) && !attacked(b, row * 8 + 6, enemy)) push(from, row * 8 + 6, { castle: 'k' });
          if (qs && b[row * 8 + 3] === null && b[row * 8 + 2] === null && b[row * 8 + 1] === null
            && !attacked(b, row * 8 + 3, enemy) && !attacked(b, row * 8 + 2, enemy)) push(from, row * 8 + 2, { castle: 'q' });
        }
      }
    } else {
      const dirs = kind === 'b' ? BISHOP_DIRS : kind === 'r' ? ROOK_DIRS : [...BISHOP_DIRS, ...ROOK_DIRS];
      for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        while (inside(rr, cc)) {
          const to = rr * 8 + cc;
          if (b[to] === null) push(from, to);
          else { if (colorOf(b[to]) !== turn) push(from, to); break; }
          rr += dr; cc += dc;
        }
      }
    }
  }
  return moves;
}

/** Devuelve un estado nuevo con la jugada aplicada (no muta el original). */
export function applyMove(state, m) {
  const b = state.b.slice();
  const castle = { ...state.castle };
  const piece = b[m.from];
  const captured = m.enPassant ? b[m.to + (state.turn === 'w' ? 8 : -8)] : b[m.to];
  b[m.to] = piece;
  b[m.from] = null;
  if (m.enPassant) b[m.to + (state.turn === 'w' ? 8 : -8)] = null;
  if (m.promo) b[m.to] = state.turn === 'w' ? 'Q' : 'q';
  if (m.castle) {
    const row = state.turn === 'w' ? 7 : 0;
    if (m.castle === 'k') { b[row * 8 + 5] = b[row * 8 + 7]; b[row * 8 + 7] = null; }
    else { b[row * 8 + 3] = b[row * 8]; b[row * 8] = null; }
  }
  if (piece === 'K') { castle.K = castle.Q = false; }
  if (piece === 'k') { castle.k = castle.q = false; }
  for (const sq of [m.from, m.to]) {
    if (sq === 63) castle.K = false;
    if (sq === 56) castle.Q = false;
    if (sq === 7) castle.k = false;
    if (sq === 0) castle.q = false;
  }
  const ep = m.double ? (m.from + m.to) / 2 : -1;
  return { b, turn: state.turn === 'w' ? 'b' : 'w', castle, ep, captured };
}

export function legalMoves(state) {
  return pseudoMoves(state).filter((m) => {
    const next = applyMove(state, m);
    return !inCheck({ ...next, turn: next.turn }, state.turn);
  });
}

/** 'play' | 'check' | 'checkmate' | 'stalemate' | 'draw' (material insuficiente) */
export function status(state) {
  const moves = legalMoves(state);
  const chk = inCheck(state);
  if (moves.length === 0) return chk ? 'checkmate' : 'stalemate';
  const rest = state.b.filter((p) => p !== null && p.toLowerCase() !== 'k');
  if (rest.length === 0 || (rest.length === 1 && 'nb'.includes(rest[0].toLowerCase()))) return 'draw';
  return chk ? 'check' : 'play';
}

/* ── IA: negamax con poda alfa-beta sobre material + posición simple ── */
const VALUE = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 0 };

function evaluate(state) {
  let score = 0;
  for (let i = 0; i < 64; i++) {
    const p = state.b[i];
    if (p === null) continue;
    const kind = p.toLowerCase();
    const r = rowOf(i), c = colOf(i);
    const center = 3.5 - Math.max(Math.abs(r - 3.5), Math.abs(c - 3.5)) / 1.0; // 0..3
    let v = VALUE[kind];
    if (kind === 'n' || kind === 'b') v += center * 8;
    if (kind === 'p') {
      const adv = isWhite(p) ? 6 - r : r - 1;   // pasos avanzados
      v += adv * 6 + (c >= 2 && c <= 5 ? center * 2 : 0);
    }
    if (kind === 'k') v -= center * 4;          // el rey prefiere los bordes
    score += isWhite(p) ? v : -v;
  }
  return score;
}

function orderMoves(state, moves) {
  return moves.sort((a, b) => {
    const va = (state.b[a.to] ? VALUE[state.b[a.to].toLowerCase()] : 0) + (a.promo ? 800 : 0);
    const vb = (state.b[b.to] ? VALUE[state.b[b.to].toLowerCase()] : 0) + (b.promo ? 800 : 0);
    return vb - va;
  });
}

function search(state, depth, alpha, beta) {
  const moves = legalMoves(state);
  if (moves.length === 0) {
    if (inCheck(state)) return state.turn === 'w' ? -100000 - depth : 100000 + depth;
    return 0;
  }
  if (depth === 0) return evaluate(state);
  const maximizing = state.turn === 'w';
  let best = maximizing ? -Infinity : Infinity;
  for (const m of orderMoves(state, moves)) {
    const v = search(applyMove(state, m), depth - 1, alpha, beta);
    if (maximizing) { best = Math.max(best, v); alpha = Math.max(alpha, v); }
    else { best = Math.min(best, v); beta = Math.min(beta, v); }
    if (beta <= alpha) break;
  }
  return best;
}

/** Elige una jugada para el bando que mueve. depth 1 = fácil (con errores), 2–3 = normal. */
export function chooseMove(state, depth = 2) {
  const moves = legalMoves(state);
  if (moves.length === 0) return null;
  const maximizing = state.turn === 'w';
  const scored = orderMoves(state, moves).map((m) => ({
    m,
    v: search(applyMove(state, m), depth - 1, -Infinity, Infinity) + (Math.random() - 0.5) * (depth === 1 ? 160 : 12),
  }));
  scored.sort((a, b) => (maximizing ? b.v - a.v : a.v - b.v));
  return scored[0].m;
}
