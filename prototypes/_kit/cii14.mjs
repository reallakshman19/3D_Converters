// TopoFix prototype kit: CAESAR II neutral file (.CII) reader, VERSION 14 ONLY.
// Pure and browser-safe. Read-only: it never changes bytes; it tells you exactly
// which bytes hold each value so an editor can replace only those bytes.
//
// Layout facts (checked on the public v14 files S1/S2/S3/T/TEXPECTED and XCU physical.js / cii-index.js):
//  - Sections start with "#$ NAME". VERSION is first. Blank lines inside sections are ignored.
//  - Numbers sit in 13-character fields starting at character 2: field i = chars [2+13i, 15+13i).
//  - CONTROL row 0: NUMELT NUMNOZ NOHGRS NONAM NORED NUMFLG; rows 1-3: aux counts in AUX_ORDER.
//  - ELEMENTS: 15 rows per element. Row 0: FROM TO DX DY DZ DIAMETER. Row 1: WALL INSUL ...
//    Rows 12-14 hold the aux pointers in POINTER_ORDER (6 + 6 + 3).
//  - RIGID: 1 row per rigid; field 0 = weight, field 1 = type.
//  - NODENAME: 1 row per entry; FROM name chars [2,28), TO name chars [28,53).
//  - RESTRANT: 24 rows per pointer (6 restraints x 4 rows).
import { refuse, require } from './core.mjs';

export const POINTER_ORDER = Object.freeze(['BEND', 'RIGID', 'EXPJT', 'RESTRANT', 'DISPLMNT', 'FORCMNT',
  'UNIFORM', 'WIND', 'OFFSETS', 'ALLOWBLS', 'SIF&TEES', 'NODENAME', 'REDUCERS', 'FLANGES', 'EQUIPMNT']);
export const AUX_ORDER = Object.freeze(['BEND', 'RIGID', 'EXPJT', 'RESTRANT', 'DISPLMNT', 'FORCMNT',
  'UNIFORM', 'WIND', 'OFFSETS', 'ALLOWBLS', 'SIF&TEES', 'IZUP', 'EQUIPMNT']);
/** Rows per aux record, where known and checked. */
export const ROWS_PER_RECORD = Object.freeze({ RIGID: 1, RESTRANT: 24 });
/** Named element fields: [row, field index]. Field i covers chars [2+13i, 15+13i). */
export const ELEMENT_FIELDS = Object.freeze({
  FROM: [0, 0], TO: [0, 1], DX: [0, 2], DY: [0, 3], DZ: [0, 4], DIAMETER: [0, 5],
  WALL: [1, 0], INSUL: [1, 1], T1: [1, 3], P1: [3, 0],
});

const NUMBER_RX = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[EeDd][+-]?\d+)?$/;
const SECTION_RX = /^#\$ ([A-Z0-9_&]+) *$/;

/** Split bytes into lines with byte offsets. One byte = one character (latin1), so offsets are byte offsets. */
export function scanLines(bytes) {
  require(bytes instanceof Uint8Array, 'CII_BYTES_REQUIRED');
  const lines = []; let start = 0, crlf = 0, lf = 0;
  for (let i = 0; i < bytes.length; i++) {
    const c = bytes[i];
    if (c !== 10 && c !== 13) continue;
    const pair = c === 13 && bytes[i + 1] === 10;
    require(c === 10 || pair, 'CII_BARE_CR', 'byte ' + i);
    pair ? crlf++ : lf++;
    lines.push({ start, end: i, next: i + (pair ? 2 : 1), text: String.fromCharCode.apply(null, bytes.subarray(start, i)) });
    i += pair ? 1 : 0; start = i + 1;
  }
  if (start < bytes.length) lines.push({ start, end: bytes.length, next: bytes.length, text: String.fromCharCode.apply(null, bytes.subarray(start)) });
  require(!(crlf && lf), 'CII_MIXED_EOL', '', crlf + ' CRLF and ' + lf + ' LF');
  return { lines, eol: crlf ? 'CRLF' : lf ? 'LF' : 'NONE' };
}

/** The 13-character field `index` of a line: {start, end, token (trimmed), raw, value (number|null)}. */
export function field(line, index, where = '') {
  const a = 2 + 13 * index, b = a + 13;
  return span(line, a, b, where || 'field ' + index);
}

/** Any character span of a line, with byte offsets and parsed number. */
export function span(line, a, b, where = '') {
  require(line && line.end - line.start >= b, 'CII_ROW_SHORT', where, line ? 'row has ' + (line.end - line.start) + ' chars, needs ' + b : 'missing row');
  const raw = line.text.slice(a, b);
  require(/^[\x20-\x7e]*$/.test(raw), 'CII_NON_ASCII', where);
  const token = raw.trim();
  const value = token === '' ? 0 : NUMBER_RX.test(token) ? Number(token.replace(/[Dd]/g, 'E')) : null;
  return { start: line.start + a, end: line.start + b, raw, token, value };
}

function int(line, index, where) {
  const f = field(line, index, where);
  require(f.value !== null && Number.isSafeInteger(f.value), 'CII_NUMBER_INVALID', where, JSON.stringify(f.token));
  return f.value;
}
function num(line, index, where) {
  const f = field(line, index, where);
  require(f.value !== null && Number.isFinite(f.value), 'CII_NUMBER_INVALID', where, JSON.stringify(f.token));
  return f;
}

/**
 * Read a version-14 CII. Refuses anything else.
 * Returns {version, eol, bytes, lines, sectionOrder, sections: Map(name -> rows), counts,
 *          elements[], rigids[], nodeNames[]} — every value carries its byte span.
 */
export function readCii14(bytes) {
  const { lines, eol } = scanLines(bytes);
  const sections = new Map(), sectionOrder = [];
  let current = null;
  for (const line of lines) {
    if (/^\s*#\$/.test(line.text)) {
      const m = SECTION_RX.exec(line.text);
      require(m, 'CII_SECTION_MARKER_INVALID', 'byte ' + line.start, JSON.stringify(line.text));
      const name = m[1];
      require(!sections.has(name), 'CII_DUPLICATE_SECTION', name);
      sections.set(name, []); sectionOrder.push(name); current = name;
    } else if (current) {
      if (line.text.trim()) sections.get(current).push(line);
    } else {
      require(!line.text.trim(), 'CII_TEXT_BEFORE_VERSION', 'byte ' + line.start);
    }
  }
  require(sectionOrder[0] === 'VERSION', 'CII_VERSION_NOT_FIRST');
  for (const s of ['VERSION', 'CONTROL', 'ELEMENTS']) require(sections.has(s), 'CII_REQUIRED_SECTION_MISSING', s);

  const vline = sections.get('VERSION')[0];
  const vparts = (vline ? vline.text.trim().split(/\s+/) : []).map(Number);
  require(vparts[1] === 14, 'CII_VERSION_UNSUPPORTED', 'VERSION', 'found ' + vparts[1] + '; this reader is v14 only');

  const control = sections.get('CONTROL');
  require(control.length >= 4, 'CII_CONTROL_TRUNCATED', 'CONTROL', control.length + ' rows');
  const first = [0, 1, 2, 3, 4, 5].map(i => int(control[0], i, 'CONTROL row 1'));
  const aux = [...[0, 1, 2, 3, 4, 5].map(i => int(control[1], i, 'CONTROL row 2')),
    ...[0, 1, 2, 3, 4, 5].map(i => int(control[2], i, 'CONTROL row 3')), int(control[3], 0, 'CONTROL row 4')];
  const counts = { NUMELT: first[0], NUMNOZ: first[1], NOHGRS: first[2], NODENAME: first[3], REDUCERS: first[4], FLANGES: first[5] };
  AUX_ORDER.forEach((k, i) => { counts[k] = aux[i]; });
  require(counts.NUMELT > 0 && Object.entries(counts).every(([, n]) => n >= 0), 'CII_CONTROL_COUNT_INVALID', 'CONTROL');

  const rows = sections.get('ELEMENTS');
  require(rows.length % 15 === 0, 'CII_ELEMENT_ROWS_NOT_15', 'ELEMENTS', rows.length + ' rows');
  require(rows.length / 15 === counts.NUMELT, 'CII_NUMELT_MISMATCH', 'ELEMENTS', rows.length / 15 + ' elements, CONTROL says ' + counts.NUMELT);

  const used = Object.fromEntries(POINTER_ORDER.map(k => [k, new Map()]));
  const elements = [];
  for (let e = 0; e < counts.NUMELT; e++) {
    const r = rows.slice(e * 15, e * 15 + 15);
    const where = 'element ' + e;
    const from = int(r[0], 0, where + ' FROM'), to = int(r[0], 1, where + ' TO');
    require(from > 0 && to > 0, 'CII_ELEMENT_NODE_INVALID', where, from + '->' + to);
    const values = [...[0, 1, 2, 3, 4, 5].map(i => int(r[12], i, where + ' pointers row 13')),
      ...[0, 1, 2, 3, 4, 5].map(i => int(r[13], i, where + ' pointers row 14')),
      ...[0, 1, 2].map(i => int(r[14], i, where + ' pointers row 15'))];
    const pointers = Object.fromEntries(POINTER_ORDER.map((k, i) => [k, values[i]]));
    for (const k of POINTER_ORDER) {
      const p = pointers[k];
      if (!p) continue;
      const limit = k === 'NODENAME' ? counts.NODENAME : counts[k];
      require(p > 0 && (limit === undefined || p <= limit), 'CII_POINTER_OUT_OF_RANGE', where + ' ' + k, p + ' of ' + limit);
      if (k === 'RIGID' || k === 'NODENAME') require(!used[k].has(p), 'CII_SHARED_POINTER', where + ' ' + k, 'pointer ' + p + ' also used by element ' + used[k].get(p));
      used[k].set(p, e);
    }
    const fields = {};
    for (const [name, [row, idx]] of Object.entries(ELEMENT_FIELDS)) fields[name] = num(r[row], idx, where + ' ' + name);
    elements.push({ index: e, from, to, pointers, fields, rows: r });
  }

  for (const [k, n] of Object.entries(ROWS_PER_RECORD)) {
    const have = (sections.get(k) || []).length;
    require(have === counts[k] * n, 'CII_AUX_CARDINALITY', k, have + ' rows, CONTROL says ' + counts[k] + ' x ' + n);
  }
  require((sections.get('NODENAME') || []).length === counts.NODENAME, 'CII_AUX_CARDINALITY', 'NODENAME',
    (sections.get('NODENAME') || []).length + ' rows, CONTROL says ' + counts.NODENAME);

  const rigidRows = sections.get('RIGID') || [];
  const rigids = rigidRows.map((line, i) => {
    const pointer = i + 1;
    require(used.RIGID.has(pointer), 'CII_ORPHAN_RECORD', 'RIGID ' + pointer, 'no element points to it');
    return { pointer, element: used.RIGID.get(pointer), weight: num(line, 0, 'RIGID ' + pointer + ' weight'), type: num(line, 1, 'RIGID ' + pointer + ' type') };
  });
  const nodeNames = (sections.get('NODENAME') || []).map((line, i) => {
    const pointer = i + 1;
    return { pointer, element: used.NODENAME.has(pointer) ? used.NODENAME.get(pointer) : null,
      from: span(line, 2, 28, 'NODENAME ' + pointer + ' FROM'), to: span(line, 28, 53, 'NODENAME ' + pointer + ' TO') };
  });

  return { version: 14, eol, bytes, lines, sectionOrder, sections, counts, elements, rigids, nodeNames };
}

/** The rigid record of an element, or null. */
export function rigidOf(cii, elementIndex) {
  const p = cii.elements[elementIndex]?.pointers.RIGID;
  return p ? cii.rigids[p - 1] : null;
}

/**
 * Field-by-field difference of two CIIs with the same structure (re-check after an edit).
 * Refuses CII_STRUCTURE_CHANGED when section order, row counts, line count or line endings differ.
 * Returns [{section, row, start, end, before, after}] for every differing 13-character field
 * (and any differing text outside fields, as section 'TEXT').
 */
export function fieldDiff(a, b) {
  require(a.eol === b.eol, 'CII_STRUCTURE_CHANGED', 'eol', a.eol + ' vs ' + b.eol);
  require(a.lines.length === b.lines.length, 'CII_STRUCTURE_CHANGED', 'lines', a.lines.length + ' vs ' + b.lines.length);
  require(JSON.stringify(a.sectionOrder) === JSON.stringify(b.sectionOrder), 'CII_STRUCTURE_CHANGED', 'sections');
  for (const s of a.sectionOrder) require(a.sections.get(s).length === b.sections.get(s).length, 'CII_STRUCTURE_CHANGED', s, 'row count');
  const out = [];
  const owner = new Map();
  for (const [name, rows] of a.sections) rows.forEach((l, i) => owner.set(l.start, [name, i]));
  a.lines.forEach((la, i) => {
    const lb = b.lines[i];
    if (la.text === lb.text) return;
    const [section, row] = owner.get(la.start) || ['TEXT', i];
    const width = Math.max(la.text.length, lb.text.length);
    const cuts = [0, 2]; for (let c = 15; c < width; c += 13) cuts.push(c); cuts.push(width);
    for (let k = 0; k + 1 < cuts.length; k++) {
      const x = la.text.slice(cuts[k], cuts[k + 1]), y = lb.text.slice(cuts[k], cuts[k + 1]);
      if (x !== y) out.push({ section, row, start: la.start + cuts[k], end: la.start + cuts[k + 1], before: x, after: y });
    }
  });
  return out;
}
