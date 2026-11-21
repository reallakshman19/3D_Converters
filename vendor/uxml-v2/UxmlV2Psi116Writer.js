/**
 * UXML v2 -> PS116 writer (UXML revamp step 1; schema note section 9).
 *
 *   - Source records are written from their custody text; a value is replaced only when
 *     its `rev` is newer than read revision 0, so an unchanged file comes out byte for byte.
 *   - A value a stage added (no span in the source record) goes where its fieldOrder puts it: after the
 *     last value before it in the text (inside its group for a grouped key), else before the group's first
 *     value, else before the record's close tag (a branch: after its nodes; a whole new branch group is one
 *     new element there). Removing a source value is refused (set it to '' instead).
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

/** End of a value's whole element, from its span (a value span ends where its close tag starts). */
const elementEnd = (key, span) => (span[2] ? span[1] : span[1] + tagOf(key).length + 3);
const groupOf = key => key.split('#')[0].split('.').slice(0, -1).join('.');

/**
 * Value edits for one node, restraint or branch. A new value goes where its fieldOrder puts it (E2a, 19 Nov 2026: as
 * today's supports output has it): right after the last value before it that is in the text, so it lands before the
 * node's restraints; a new value in a group (Pressure.HydroPressure) goes after the group's last value before it.
 * `place.tail` (branches): a new top-level value goes at `insertAt` (after the branch's nodes, as today) instead.
 * With no value before it in the text, a new value goes at `insertAt`, as before.
 */
function valueEdits(entity, spans, insertAt, ws, stats, place = {}) {
  const edits = [];
  for (const key of Object.keys(spans)) {
    if (Object.hasOwn(entity.values, key)) continue;
    // E4 (Owner 21 Nov 2026, "Yes, as suggested"): a value the document removed (the CII engine's bend-radius step
    // drops zero BendRadius tags) loses its element and the whitespace run just before it, as a removed restraint does.
    if (place.raw == null) fail('PS116_WRITE_VALUE_REMOVED_UNSUPPORTED', {uid: entity.uid, key});
    const span = spans[key], start = span[2] ? span[0] : span[0] - tagOf(key).length - 2;
    // A branch value after the branch's nodes lies outside the text measured here: still refused.
    if (elementEnd(key, span) > place.raw.length) fail('PS116_WRITE_VALUE_REMOVED_UNSUPPORTED', {uid: entity.uid, key});
    edits.push({start: start - wsBefore(place.raw, start).length, end: elementEnd(key, span), text: ''});
    stats.removedValues += 1;
  }
  const lastIn = new Map(); // group ('' = top level) -> {end, ws} of the last element in the text seen so far
  const newGroups = new Map(); // group -> its one new element (branches only)
  const firstIn = new Map(); // group -> {start, ws} of its first element in the text (a new key before it goes there)
  for (const [key, span] of place.raw == null ? [] : Object.entries(spans)) {
    const start = span[2] ? span[0] : span[0] - tagOf(key).length - 2, group = groupOf(key);
    if (group && !(firstIn.get(group)?.start <= start)) firstIn.set(group, {start, ws: wsBefore(place.raw, start)});
  }
  for (const key of entity.fieldOrder || Object.keys(entity.values)) {
    const value = entity.values[key];
    const span = spans[key];
    if (span && place.raw != null) {
      const start = span[2] ? span[0] : span[0] - tagOf(key).length - 2;
      lastIn.set(groupOf(key), {end: elementEnd(key, span), ws: wsBefore(place.raw, start)});
    }
    if (!value || !changed(value)) continue;
    if (span) {
      edits.push({start: span[0], end: span[1], text: span[2] ? element(key, value) : renderValue(value)});
    } else {
      const group = groupOf(key);
      const after = place.tail && !group ? undefined : lastIn.get(group);
      if (group && !after && firstIn.has(group)) {
        // A new key ordered before its group's keys in the text (PR 299 review): inside the group, before its first key.
        const first = firstIn.get(group);
        edits.push({start: first.start, end: first.start, text: element(key, value) + first.ws});
        stats.patchedValues += 1;
        continue;
      }
      if (group && !after && place.tail && !group.includes('.') && insertAt != null) {
        // A whole new group on a branch (Pressure with no <Pressure> in the text): one element after the nodes, as today.
        let made = newGroups.get(group);
        if (!made) { made = {start: insertAt, end: insertAt, kids: [], group}; newGroups.set(group, made); edits.push(made); }
        made.kids.push(element(key, value));
        stats.patchedValues += 1;
        continue;
      }
      if (group && !after) fail('PS116_WRITE_NESTED_INSERT_UNSUPPORTED', {uid: entity.uid, key});
      if (after) {
        edits.push({start: after.end, end: after.end, text: after.ws + element(key, value)});
      } else {
        if (insertAt == null) fail('PS116_WRITE_INSERT_POSITION_UNKNOWN', {uid: entity.uid, key});
        edits.push({start: insertAt, end: insertAt, text: place.tail ? ws + element(key, value) : element(key, value) + ws});
      }
    }
    stats.patchedValues += 1;
  }
  for (const made of newGroups.values()) {
    made.text = ws + '<' + made.group + '>' + made.kids.join('') + '</' + made.group + '>';
    delete made.kids;
    delete made.group;
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
    edits = valueEdits(comp, xref.spans, closeAt, ws, stats, {raw});
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
  const stats = {patchedValues: 0, insertedNodes: 0, insertedRestraints: 0, removedRestraints: 0, removedValues: 0, nodes: 0};
  let out = '';
  for (const p of doc.pipelines) {
    const c = doc.custody[p.uid];
    if (!c) fail('PS116_WRITE_PIPELINE_INSERT_UNSUPPORTED', {uid: p.uid});
    const {spans, closeOffset} = c;
    // New top-level branch values go after the branch's nodes, where today's supports output has them (E2a).
    const branchEdits = valueEdits(p, spans, p.components.length ? closeOffset : null, wsBefore(c.open, c.open.length) || '\n', stats,
      {raw: c.open, tail: true});
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
