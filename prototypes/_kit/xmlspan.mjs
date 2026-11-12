// TopoFix prototype kit: byte-offset XML scanner for PSI116 and InputXML (same for CII v11 and v14 work:
// the XML source does not change, only the CII written from it).
// Pure and browser-safe. Read-only. Every element, attribute value and leaf text carries its exact
// BYTE offsets in the original file, so an editor replaces only those bytes and nothing else moves.
//
// Why not DOMParser: it throws positions away, and serialising it back rewrites quotes, attribute
// order, whitespace, entities and line endings. Never re-serialise; patch spans.
//
// Accepted: UTF-8 (with or without BOM), comments, processing instructions, CDATA, namespaces
// (matched by local name), the 5 predefined entities and numeric character references.
// Refused: DOCTYPE / internal entities, other encodings, invalid UTF-8, unknown entities,
// malformed or unbalanced tags, duplicate attributes, text outside the root, several roots.
import { require } from './core.mjs';

const NAME_RX = /^[A-Za-z_][\w.:-]*$/;
const ENTITY = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const utf8 = new TextDecoder('utf-8', { fatal: true });

/** Decode entities in a raw text or attribute value; refuses XML_ENTITY_UNKNOWN. */
export function decodeEntities(raw, where = '') {
  return raw.replace(/&([^;&\s]{0,12});?/g, (m, body) => {
    require(m.endsWith(';'), 'XML_ENTITY_UNKNOWN', where, JSON.stringify(m));
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      require(Number.isInteger(code) && code > 0 && code <= 0x10ffff, 'XML_ENTITY_UNKNOWN', where, m);
      return String.fromCodePoint(code);
    }
    require(Object.hasOwn(ENTITY, body), 'XML_ENTITY_UNKNOWN', where, m);
    return ENTITY[body];
  });
}
/** Escape a value for element text. */
export function escapeText(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
/** Escape a value for an attribute quoted with `quote`. */
export function escapeAttr(s, quote = '"') {
  const t = escapeText(s);
  return quote === '"' ? t.replace(/"/g, '&quot;') : t.replace(/'/g, '&apos;');
}

/**
 * Scan XML bytes. Returns {bytes, bom, eol, root, elements[], comments}.
 * element: {name, local, start, openEnd, closeStart, end, selfClosing, attrs[], children[], parent, depth}
 * attr: {name, local, nameStart, start, end, quote, raw, value}   (start/end = the value only, without quotes)
 * All offsets are byte offsets into `bytes`.
 */
export function scanXml(bytes) {
  require(bytes instanceof Uint8Array, 'XML_BYTES_REQUIRED');
  require(bytes.length > 0, 'XML_EMPTY');
  try { utf8.decode(bytes); } catch { require(false, 'XML_NOT_UTF8'); }
  const bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  const s = Buffer_like_latin1(bytes); // one char per byte: string offsets == byte offsets
  const crlf = (s.match(/\r\n/g) || []).length, lf = (s.match(/\n/g) || []).length;
  const eol = !lf ? 'NONE' : crlf === lf ? 'CRLF' : crlf === 0 ? 'LF' : 'MIXED';

  const doc = { name: '#document', local: '#document', children: [], depth: -1 };
  const stack = [doc], elements = [];
  let pos = bom ? 3 : 0, comments = 0;
  const textCheck = (a, b) => {
    if (a >= b) return;
    const t = s.slice(a, b);
    if (stack.length === 1) require(!t.trim(), 'XML_TEXT_OUTSIDE_ROOT', 'byte ' + a);
    else decodeEntities(t, 'text at byte ' + a);
  };
  while (pos < s.length) {
    const lt = s.indexOf('<', pos);
    if (lt < 0) { textCheck(pos, s.length); break; }
    textCheck(pos, lt);
    if (s.startsWith('<!--', lt)) {
      const e = s.indexOf('-->', lt + 4); require(e >= 0, 'XML_UNTERMINATED', 'comment at byte ' + lt);
      comments++; pos = e + 3; continue;
    }
    if (s.startsWith('<![CDATA[', lt)) {
      const e = s.indexOf(']]>', lt + 9); require(e >= 0, 'XML_UNTERMINATED', 'CDATA at byte ' + lt);
      require(stack.length > 1, 'XML_TEXT_OUTSIDE_ROOT', 'byte ' + lt);
      stack.at(-1).cdata = true; pos = e + 3; continue;
    }
    if (s.startsWith('<?', lt)) {
      const e = s.indexOf('?>', lt + 2); require(e >= 0, 'XML_UNTERMINATED', 'declaration at byte ' + lt);
      const pi = s.slice(lt, e + 2);
      if (/^<\?xml\s/.test(pi)) {
        const enc = /encoding\s*=\s*["']([^"']+)["']/.exec(pi);
        require(!enc || /^utf-?8$/i.test(enc[1]), 'XML_ENCODING_UNSUPPORTED', 'declaration', enc && enc[1]);
      }
      pos = e + 2; continue;
    }
    require(!s.startsWith('<!', lt), 'XML_DOCTYPE_REFUSED', 'byte ' + lt);
    // tag: find the closing '>' outside quotes
    let q = '', gt = lt + 1;
    for (; gt < s.length; gt++) {
      const c = s[gt];
      if (q) { if (c === q) q = ''; else require(c !== '<', 'XML_TAG_INVALID', 'byte ' + lt, '"<" inside an attribute value'); continue; }
      if (c === '"' || c === "'") { q = c; continue; }
      if (c === '>') break;
      require(c !== '<', 'XML_TAG_INVALID', 'byte ' + lt, 'tag not closed before next "<"');
    }
    require(gt < s.length && !q, 'XML_UNTERMINATED', 'tag at byte ' + lt);
    if (s[lt + 1] === '/') {
      const name = s.slice(lt + 2, gt).trim();
      const top = stack.at(-1);
      require(stack.length > 1 && top.name === name, 'XML_TAG_MISMATCH', 'byte ' + lt, '</' + name + '> closes <' + top.name + '>');
      top.closeStart = lt; top.end = gt + 1; stack.pop();
    } else {
      const selfClosing = s[gt - 1] === '/';
      const inner = s.slice(lt + 1, selfClosing ? gt - 1 : gt);
      const nm = /^[^\s/>]+/.exec(inner);
      require(nm && NAME_RX.test(nm[0]), 'XML_TAG_INVALID', 'byte ' + lt, 'bad tag name');
      const parent = stack.at(-1);
      require(parent !== doc || doc.children.length === 0, 'XML_MULTIPLE_ROOTS', 'byte ' + lt);
      const el = { name: nm[0], local: nm[0].split(':').pop(), start: lt, openEnd: gt + 1, selfClosing,
        attrs: [], children: [], parent, depth: stack.length - 1 };
      // attributes
      let i = nm[0].length;
      const base = lt + 1;
      const rx = /\s+([^\s=/>]+)\s*=\s*("([^"]*)"|'([^']*)')/y;
      while (i < inner.length) {
        if (/^\s*$/.test(inner.slice(i))) break;
        rx.lastIndex = i;
        const m = rx.exec(inner);
        require(m && NAME_RX.test(m[1]), 'XML_TAG_INVALID', 'byte ' + lt, 'bad attribute near ' + JSON.stringify(inner.slice(i, i + 20)));
        require(!el.attrs.some(a => a.name === m[1]), 'XML_DUPLICATE_ATTRIBUTE', el.name, m[1]);
        const quote = m[2][0], rawBytes = m[3] ?? m[4];
        const vStart = base + i + m[0].length - 1 - rawBytes.length;
        const raw = utf8.decode(bytes.subarray(vStart, vStart + rawBytes.length));
        el.attrs.push({ name: m[1], local: m[1].split(':').pop(), nameStart: base + m.index + m[0].indexOf(m[1]),
          start: vStart, end: vStart + rawBytes.length, quote, raw,
          value: decodeUtf8(bytes, vStart, vStart + raw.length, el.name + '@' + m[1]) });
        i = rx.lastIndex;
      }
      parent.children.push(el); elements.push(el);
      if (selfClosing) { el.closeStart = gt + 1; el.end = gt + 1; } else stack.push(el);
    }
    pos = gt + 1;
  }
  require(stack.length === 1, 'XML_UNCLOSED', stack.at(-1).name, 'missing </' + stack.at(-1).name + '>');
  require(doc.children.length === 1, 'XML_NO_ROOT');
  return { bytes, bom, eol, root: doc.children[0], elements, comments };
}

function Buffer_like_latin1(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return out;
}
function decodeUtf8(bytes, a, b, where) { return decodeEntities(utf8.decode(bytes.subarray(a, b)), where); }

/** Direct children with this local name. */
export function children(el, local) { return el.children.filter(c => c.local === local); }
/** Exactly one direct child with this local name; refuses XML_CHILD_MISSING / XML_CHILD_NOT_UNIQUE. */
export function child(el, local, optional = false) {
  const found = children(el, local);
  if (!found.length && optional) return null;
  require(found.length > 0, 'XML_CHILD_MISSING', el.name, local);
  require(found.length === 1, 'XML_CHILD_NOT_UNIQUE', el.name, local + ' x' + found.length);
  return found[0];
}
/** Attribute by (local) name, or null. */
export function attr(el, name) { return el.attrs.find(a => a.name === name || a.local === name) || null; }

/**
 * The text of a leaf element: {start, end, raw, value, rawStart, rawEnd, empty, selfClosing}.
 * start/end span the TRIMMED value, so a replacement keeps the surrounding whitespace.
 * Refuses XML_NOT_LEAF (has child elements) and XML_TEXT_CDATA (CDATA content).
 */
export function text(doc, el) {
  require(el.children.length === 0, 'XML_NOT_LEAF', el.name, el.children.length + ' child elements');
  require(!el.cdata, 'XML_TEXT_CDATA', el.name);
  if (el.selfClosing) return { start: el.openEnd, end: el.openEnd, rawStart: el.openEnd, rawEnd: el.openEnd, raw: '', value: '', empty: true, selfClosing: true };
  const rawStart = el.openEnd, rawEnd = el.closeStart, b = doc.bytes;
  let a = rawStart, z = rawEnd;
  const ws = c => c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;
  while (a < z && ws(b[a])) a++;
  while (z > a && ws(b[z - 1])) z--;
  const raw = utf8.decode(b.subarray(a, z));
  return { start: a, end: z, rawStart, rawEnd, raw, value: decodeEntities(raw, el.name), empty: a === z, selfClosing: false };
}

/**
 * PSI116 index, with the same numbering as 3D_Converters step 10 (inspectXmlWeightSources):
 * branchOrdinal = 0-based over ALL <Branch> elements in document order; nodeOrdinal = 0-based over the
 * branch's direct <Node> children. Field values are leaf texts of the node's direct children.
 */
export function psi116Index(doc) {
  require(doc.root.local === 'PipeStressExport', 'XML_PROFILE_UNEXPECTED', doc.root.name, 'expected PipeStressExport');
  const branches = doc.elements.filter(e => e.local === 'Branch');
  const nodes = [];
  branches.forEach((br, bi) => {
    const nameEl = child(br, 'Branchname', true);
    const branchName = nameEl ? text(doc, nameEl).value : '';
    children(br, 'Node').forEach((node, ni) => {
      const f = tag => { const c = child(node, tag, true); return c ? text(doc, c) : null; };
      nodes.push({ branchOrdinal: bi, branchName, nodeOrdinal: ni,
        nodeNumber: f('NodeNumber')?.value ?? '', componentRefNo: f('ComponentRefNo')?.value ?? '',
        componentType: f('ComponentType')?.value ?? '', rigid: f('Rigid')?.value ?? '', element: node });
    });
  });
  return { branches, nodes };
}

/**
 * Locate a Change-set xml ref + field (e.g. 'Node/Weight' or 'Weight') to the exact text span.
 * The ref must agree on branchName, nodeNumber and componentRefNo; refuses XML_REF_NOT_FOUND / XML_REF_MISMATCH.
 */
export function locatePsi116(doc, index, ref, fieldName) {
  const row = index.nodes.find(n => n.branchOrdinal === ref.branchOrdinal && n.nodeOrdinal === ref.nodeOrdinal);
  require(row, 'XML_REF_NOT_FOUND', 'branch ' + ref.branchOrdinal + ' node ' + ref.nodeOrdinal);
  for (const k of ['branchName', 'nodeNumber', 'componentRefNo'])
    require(String(row[k]) === String(ref[k]), 'XML_REF_MISMATCH', k, 'file has ' + JSON.stringify(row[k]) + ', ref has ' + JSON.stringify(ref[k]));
  const tag = String(fieldName).split('/').pop();
  return { row, span: text(doc, child(row.element, tag)) };
}

/** InputXML (CAESARII/PIPINGMODEL/PIPINGELEMENT) index: elements in order with attribute spans. */
export function inputXmlIndex(doc) {
  require(doc.root.local === 'CAESARII', 'XML_PROFILE_UNEXPECTED', doc.root.name, 'expected CAESARII');
  const elements = doc.elements.filter(e => e.local === 'PIPINGELEMENT').map((el, index) => ({
    index, from: attr(el, 'FROM_NODE')?.value, to: attr(el, 'TO_NODE')?.value, element: el,
    attr: name => attr(el, name) }));
  return { elements };
}

/**
 * Re-check after an edit. Compares two scans: the element tree (names, nesting, attribute names and
 * quotes) must be identical (else XML_STRUCTURE_CHANGED), and every byte OUTSIDE value spans (attribute
 * values and leaf texts) must be identical (else XML_MARKUP_CHANGED). Returns the changed values:
 * [{kind:'attr'|'text', path, element, name?, start, end, before, after}] with offsets in `a`.
 */
export function xmlDiff(a, b) {
  require(a.bom === b.bom, 'XML_MARKUP_CHANGED', 'byte order mark');
  require(a.elements.length === b.elements.length, 'XML_STRUCTURE_CHANGED', 'element count', a.elements.length + ' vs ' + b.elements.length);
  const spans = (d) => {
    const out = [];
    d.elements.forEach((el, i) => {
      for (const at of el.attrs) out.push({ kind: 'attr', i, name: at.name, start: at.start, end: at.end, raw: d.bytes.subarray(at.start, at.end) });
      if (!el.children.length && !el.selfClosing && !el.cdata) out.push({ kind: 'text', i, start: el.openEnd, end: el.closeStart, raw: d.bytes.subarray(el.openEnd, el.closeStart) });
    });
    return out.sort((x, y) => x.start - y.start);
  };
  a.elements.forEach((x, i) => {
    const y = b.elements[i];
    require(x.name === y.name && x.depth === y.depth && x.selfClosing === y.selfClosing &&
      x.children.length === y.children.length && x.attrs.length === y.attrs.length &&
      x.attrs.every((at, k) => at.name === y.attrs[k].name && at.quote === y.attrs[k].quote),
      'XML_STRUCTURE_CHANGED', pathOf(x), 'differs from ' + pathOf(y));
  });
  const sa = spans(a), sb = spans(b);
  require(sa.length === sb.length, 'XML_STRUCTURE_CHANGED', 'value count');
  const eq = (p, q) => p.length === q.length && p.every((v, k) => v === q[k]);
  let pa = 0, pb = 0;
  const out = [];
  for (let k = 0; k <= sa.length; k++) {
    const ea = k < sa.length ? sa[k].start : a.bytes.length, eb = k < sb.length ? sb[k].start : b.bytes.length;
    require(eq(a.bytes.subarray(pa, ea), b.bytes.subarray(pb, eb)), 'XML_MARKUP_CHANGED', 'near byte ' + pa,
      'bytes outside attribute values and leaf texts differ');
    if (k === sa.length) break;
    const x = sa[k], y = sb[k];
    if (!eq(x.raw, y.raw)) {
      const el = a.elements[x.i];
      out.push({ kind: x.kind, path: pathOf(el), element: x.i, name: x.name, start: x.start, end: x.end,
        before: utf8.decode(x.raw), after: utf8.decode(y.raw) });
    }
    pa = x.end; pb = y.end;
  }
  return out;
}

/** A readable path like PipeStressExport/Pipe[0]/Branch[2]/Node[5]/Weight[0] (0-based same-name ordinals). */
export function pathOf(el) {
  const parts = [];
  for (let e = el; e && e.parent; e = e.parent) {
    const same = e.parent.children.filter(c => c.local === e.local);
    parts.unshift(e.local + '[' + same.indexOf(e) + ']');
  }
  return parts.join('/');
}

/**
 * Apply value edits to the original bytes: [{start, end, newText}] (newText already escaped).
 * Spans must not overlap (XML_SPANS_OVERLAP). Returns new bytes; the caller must re-scan and
 * check xmlDiff(old, new) lists exactly the planned edits.
 */
export function replaceSpans(bytes, edits) {
  const sorted = [...edits].sort((x, y) => x.start - y.start);
  for (let k = 1; k < sorted.length; k++) require(sorted[k].start >= sorted[k - 1].end, 'XML_SPANS_OVERLAP', 'byte ' + sorted[k].start);
  const enc = new TextEncoder(), parts = []; let at = 0, size = 0;
  for (const e of sorted) {
    require(e.start >= at && e.end >= e.start && e.end <= bytes.length, 'XML_SPANS_OVERLAP', 'byte ' + e.start);
    parts.push(bytes.subarray(at, e.start)); const t = enc.encode(e.newText); parts.push(t); at = e.end;
  }
  parts.push(bytes.subarray(at));
  for (const p of parts) size += p.length;
  const out = new Uint8Array(size); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
