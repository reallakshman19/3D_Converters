// TopoFix prototype kit: browser-safe core (no DOM, no fs, no network).
// Copied unchanged into every card's kit/ folder by new-card.mjs. Do not edit the copy.

/** A refusal: an expected, named failure. Never a crash. */
export class Refusal extends Error {
  constructor(code, where = '', detail = '') {
    super(code + (where ? ' @ ' + where : '') + (detail ? ': ' + detail : ''));
    this.code = code; this.where = String(where); this.detail = String(detail);
  }
}

const CODE_RX = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)+$/;

/** Throw a refusal. code must be UPPER_SNAKE with at least one underscore. */
export function refuse(code, where = '', detail = '') {
  if (!CODE_RX.test(code)) throw new Error('KIT_BAD_REFUSAL_CODE: ' + code);
  throw new Refusal(code, where, detail);
}

/** Refuse unless ok is truthy. */
export function require(ok, code, where = '', detail = '') {
  if (!ok) refuse(code, where, detail);
}

/**
 * Run an engine step all-or-nothing.
 * Returns {ok:true, ...result} or {ok:false, refusals:[{code,where,detail}]} with NO output.
 * Non-refusal exceptions are real bugs and are re-thrown.
 */
export async function attempt(fn) {
  try {
    const result = await fn();
    return { ok: true, ...(result && typeof result === 'object' ? result : { value: result }) };
  } catch (e) {
    if (e instanceof Refusal) return { ok: false, refusals: [{ code: e.code, where: e.where, detail: e.detail }] };
    if (e && Array.isArray(e.refusals)) return { ok: false, refusals: e.refusals };
    throw e;
  }
}

/** Collect several refusals, then throw them together (all-or-nothing). */
export class RefusalList {
  constructor() { this.refusals = []; }
  add(code, where = '', detail = '') {
    if (!CODE_RX.test(code)) throw new Error('KIT_BAD_REFUSAL_CODE: ' + code);
    this.refusals.push({ code, where: String(where), detail: String(detail) });
  }
  get size() { return this.refusals.length; }
  throwIfAny() { if (this.refusals.length) { const e = new Error('REFUSED'); e.refusals = this.refusals; throw e; } }
}

/** Lower-case hex sha256 of bytes (Uint8Array | ArrayBuffer | string as UTF-8). */
export async function sha256Hex(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input)
    : input instanceof Uint8Array ? input : new Uint8Array(input);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Refuse with INPUT_SHA256_MISMATCH unless bytes hash to expected. */
export async function requireSha256(bytes, expected, where = 'input') {
  const got = await sha256Hex(bytes);
  require(got === String(expected).toLowerCase(), 'INPUT_SHA256_MISMATCH', where, 'expected ' + expected + ' got ' + got);
  return got;
}

/** Median wall time (ms) of n runs of fn; returns {ms, runs, last}. */
export async function timeMedian(fn, n = 3) {
  const times = []; let last;
  for (let i = 0; i < n; i++) {
    const t0 = performance.now(); last = await fn(); times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  return { ms: Math.round(times[Math.floor(n / 2)] * 10) / 10, runs: times.map(t => Math.round(t * 10) / 10), last };
}

/** Line ending of a text: 'CRLF', 'LF', 'NONE'; refuses mixed endings. */
export function lineEnding(text, where = 'input') {
  const crlf = (text.match(/\r\n/g) || []).length, lf = (text.match(/\n/g) || []).length;
  if (!lf) return 'NONE';
  require(crlf === 0 || crlf === lf, 'INPUT_MIXED_EOL', where, crlf + ' CRLF of ' + lf);
  return crlf ? 'CRLF' : 'LF';
}
