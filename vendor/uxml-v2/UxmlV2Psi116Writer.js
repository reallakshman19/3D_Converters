/**
 * UXML v2 -> PS116 writer (UXML revamp step 1; schema note section 9).
 *
 *   - Source records are written from their custody text; a value is replaced only when
 *     its `rev` is newer than read revision 0, so an unchanged file comes out byte for byte.
 *   - A value a stage added (no span in the source record) is inserted before the record's
 *     close tag. Removing a source value is refused (set it to '' instead).
 *   - A node a stage made (lineage insert/split, no custody) is written from the template of
 *     its first lineage source with EVERY tag taken from its own modelled values; a template
 *     tag with no value is refused (PS116_WRITE_REQUIRED_VALUE_MISSING).
 *   - Restraints: changed ones are patched in place, removed ones cut out, new ones appended
 *     before the node's close tag, written from modelled values only.
 *   - Branch and node order follow the document (source order + stage inserts).
 */
import {assertValid, UxmlRefusal} from './UxmlV2Kernel.js';
import {parseLiteral} from './UxmlV2Psi116Reader.js';

export const UXML_V2_PSI116_WRITER = 'uxml-v2-psi116-writer/1';
const fail = (code, details = {}) => { throw new UxmlRefusal(code, details); };
const escapeXml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tagOf = key => key.split('#')[0].split('.').at(-1);

/** Literal for a value: its `text` when it still means `v`, else v in shortest form. */
export function renderValue(value) {
  if (value == null) return '';
  if (typeof value.text === 'string' && parseLiteral(value.text) === value.v) return value.text;
  if (value.v == null) return '';
  if (typeof value.v === 'number') return String(value.v);
  return escapeXml(value.v);
}
const element = (key, value) => '<' + tagOf(key) + '>' + renderValue(value) + '</' + tagOf(key) + '>';
const changed = value => (value?.rev || 0) > 0;

function patch(text, edits) {
  // Applied back to front. Inserts at one position: the later edit goes in first, so the text
  // ends up in edit order (step 3: several new restraints or values on one node).
  const sorted = edits.map((e, i) => ({...e, i})).sort((a, b) => b.start - a.start || b.end - a.end || b.i - a.i);
  let out = text;
  let floor = Infinity;
  for (const e of sorted) {
    if (e.end > floor) fail('PS116_WRITE_OVERLAPPING_EDITS', {start: e.start});
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
    floor = e.start;
  }
  return out;
}
const wsBefore = (text, at) => /[ \t\r\n]*$/.exec(text.slice(0, at))[0];

/** Edits for the changed values of one entity (spans relative to its raw text). */
function valueEdits(entity, spans, insertAt, ws, stats) {
  const edits = [];
  for (const key of Object.keys(spans)) {
    if (!Object.hasOwn(entity.values, key))
      fail('PS116_WRITE_VALUE_REMOVED_UNSUPPORTED', {uid: entity.uid, key});
  }
  for (const key of entity.fieldOrder || Object.keys(entity.values)) {
    const value = entity.values[key];
    if (!value || !changed(value)) continue;
    const span = spans[key];
    if (span) {
      edits.push({start: span[0], end: span[1], text: span[2] ? element(key, value) : renderValue(value)});
    } else {
      if (key.includes('.')) fail('PS116_WRITE_NESTED_INSERT_UNSUPPORTED', {uid: entity.uid, key});
      if (insertAt == null) fail('PS116_WRITE_INSERT_POSITION_UNKNOWN', {uid: entity.uid, key});
      edits.push({start: insertAt, end: insertAt, text: element(key, value) + ws});
    }
    stats.patchedValues += 1;
  }
  return edits;
}

function renderNewRestraint(r, ws, stats) {
  const keys = r.fieldOrder || Object.keys(r.values);
  if (keys.some(k => k.includes('.'))) fail('PS116_WRITE_NESTED_INSERT_UNSUPPORTED', {uid: r.uid});
  stats.insertedRestraints += 1;
  return '<Restraint>' + ws + keys.map(k => element(k, r.values[k])).join(ws) + ws + '</Restraint>';
}

/**
 * An existing restraint: patched in place when only values changed; re-rendered from its modelled
 * values (with the record's own indentation) when a stage added or removed a field (step 3).
 */
function renderRestraint(r, custody, stats) {
  const raw = custody[r.uid]?.raw;
  if (raw == null) return null;
  const spans = custody[r.uid].spans;
  const keys = r.fieldOrder || Object.keys(r.values);
  const reshaped = Object.keys(spans).some(k => !Object.hasOwn(r.values, k)) || keys.some(k => r.values[k] && !spans[k]);
  if (!reshaped) {
    const edits = valueEdits(r, spans, null, '', stats);
    return edits.length ? patch(raw, edits) : raw;
  }
  const inner = /^<Restraint>(\s*)/.exec(raw)?.[1] ?? '';
  const outer = /(\s*)<\/Restraint>$/.exec(raw)?.[1] ?? '';
  stats.patchedValues += 1;
  return '<Restraint>' + inner + keys.filter(k => r.values[k]).map(k => element(k, r.values[k])).join(inner) + outer + '</Restraint>';
}

function renderNode(comp, doc, stats) {
  const own = doc.custody[comp.uid];
  let xref, fromTemplate = false;
  if (own?.raw != null) {
    xref = own;
  } else {
    const templateUid = comp.lineage?.from?.[0];
    xref = doc.custody[templateUid];
    if (!xref?.raw || !xref.spans) fail('PS116_WRITE_TEMPLATE_MISSING', {uid: comp.uid, template: templateUid ?? null});
    fromTemplate = true;
    stats.insertedNodes += 1;
  }
  const raw = xref.raw;
  if (!xref.closeTag) fail('PS116_WRITE_INSERT_POSITION_UNKNOWN', {uid: comp.uid});
  const closeAt = xref.closeTag[0];
  const ws = wsBefore(raw, closeAt) || '\n';
  let edits;
  if (fromTemplate) {
    edits = [];
    for (const [key, span] of Object.entries(xref.spans)) {
      const value = comp.values[key];
      if (!value) fail('PS116_WRITE_REQUIRED_VALUE_MISSING', {uid: comp.uid, key});
      edits.push({start: span[0], end: span[1], text: span[2] ? element(key, value) : renderValue(value)});
    }
    for (const key of comp.fieldOrder || Object.keys(comp.values)) {
      if (xref.spans[key]) continue;
      if (key.includes('.')) fail('PS116_WRITE_NESTED_INSERT_UNSUPPORTED', {uid: comp.uid, key});
      edits.push({start: closeAt, end: closeAt, text: element(key, comp.values[key]) + ws});
    }
    for (const original of xref.restraints) edits.push(cut(raw, original.span));
  } else {
    edits = valueEdits(comp, xref.spans, closeAt, ws, stats);
    const kept = new Map(comp.restraints.map(r => [r.uid, r]));
    for (const original of xref.restraints) {
      const r = kept.get(original.uid);
      if (!r) { edits.push(cut(raw, original.span)); stats.removedRestraints += 1; continue; }
      const text = renderRestraint(r, doc.custody, stats);
      if (text !== doc.custody[r.uid].raw) edits.push({start: original.span[0], end: original.span[1], text});
    }
  }
  for (const r of comp.restraints) {
    if (doc.custody[r.uid]?.raw != null && !fromTemplate) continue;
    edits.push({start: closeAt, end: closeAt, text: renderNewRestraint(r, ws, stats) + ws});
  }
  return edits.length ? patch(raw, edits) : raw;
}
/** Remove a restraint span plus the whitespace run just before it. */
function cut(raw, span) {
  return {start: span[0] - wsBefore(raw, span[0]).length, end: span[1], text: ''};
}


/** Write PS116 text from a sealed UXML v2 document. Returns {text, stats}. */
export function writePsi116FromUxmlV2(doc) {
  assertValid(doc);
  const stats = {patchedValues: 0, insertedNodes: 0, insertedRestraints: 0, removedRestraints: 0, nodes: 0};
  let out = '';
  for (const p of doc.pipelines) {
    const c = doc.custody[p.uid];
    if (!c) fail('PS116_WRITE_PIPELINE_INSERT_UNSUPPORTED', {uid: p.uid});
    const {spans, closeOffset} = c;
    const branchEdits = valueEdits(p, spans, p.components.length ? c.open.length : null, wsBefore(c.open, c.open.length) || '\n', stats);
    const openEdits = [], closeEdits = [];
    for (const e of branchEdits) {
      if (e.end <= c.open.length) openEdits.push(e);
      else if (e.start >= closeOffset) closeEdits.push({...e, start: e.start - closeOffset, end: e.end - closeOffset});
      else fail('PS116_WRITE_BRANCH_SPAN_INSIDE_NODES', {uid: p.uid});
    }
    const defaultSep = Object.values(p.components).map(x => doc.custody[x.uid]?.gapAfter)
      .find(g => g != null && /^[ \t\r\n]*$/.test(g)) ?? '\n';
    out += c.before + patch(c.open, openEdits);
    p.components.forEach((comp, i) => {
      out += renderNode(comp, doc, stats);
      stats.nodes += 1;
      if (i < p.components.length - 1) out += doc.custody[comp.uid]?.gapAfter ?? defaultSep;
    });
    out += patch(c.close, closeEdits);
  }
  out += doc.custody.$tail;
  return {text: out, stats, writer: UXML_V2_PSI116_WRITER};
}
