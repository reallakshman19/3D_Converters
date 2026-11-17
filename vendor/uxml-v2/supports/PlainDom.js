/**
 * PlainDom: the DOM stand-in for the ported support sub-steps (UXML step 3, buddy batches 1-3).
 * A PSI116 model is a tree of PlainElements {__el: localName, attrs: {name: value}, kids: [PlainElement | {__text}]}:
 * exactly the shape in which the restraint-core calls were recorded (fixtures/uxml-v2-supports/core-calls), so
 * a node from this parser can be handed to CoreReplay and is found.
 *   - whitespace-only text is dropped; other text is kept as written (entities decoded); CDATA becomes {__text};
 *   - comments, processing instructions and DOCTYPE inside the root are dropped;
 *   - prefixed element names are refused (PLAIN_XML_PREFIX_UNSUPPORTED); PSI116 files use none.
 */
/** The Document as it crosses the restraint-core boundary (core-calls/1 format; CoreCallsLib re-exports it). */
export const PLAIN_DOCUMENT = Object.freeze({ __doc: true });
export const PLAIN_XML_ERRORS = Object.freeze({
  MALFORMED: 'PLAIN_XML_MALFORMED',
  PREFIX: 'PLAIN_XML_PREFIX_UNSUPPORTED',
});
const fail = (code, at) => { throw Object.assign(new Error(code + ' at ' + at), { code }); };
const ENT = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
const decode = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|amp|quot|apos);/gi, (m, e) => (e[0] !== '#' ? ENT[e.toLowerCase()]
  : String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1)))));
const NAME = /^[A-Za-z_][\w.\-:]*/;
const ATTR = /\s+([A-Za-z_][\w.\-:]*)\s*=\s*("([^"]*)"|'([^']*)')/y;

function readTag(text, at) {
  const name = NAME.exec(text.slice(at + 1, at + 200))?.[0];
  if (!name) fail(PLAIN_XML_ERRORS.MALFORMED, at);
  if (name.includes(':')) fail(PLAIN_XML_ERRORS.PREFIX, at);
  const attrs = {};
  let i = at + 1 + name.length;
  for (;;) {
    ATTR.lastIndex = i;
    const m = ATTR.exec(text);
    if (!m) break;
    attrs[m[1]] = decode(m[3] ?? m[4]);
    i = ATTR.lastIndex;
  }
  const close = /\s*(\/?)>/y;
  close.lastIndex = i;
  const c = close.exec(text);
  if (!c) fail(PLAIN_XML_ERRORS.MALFORMED, i);
  return { el: { __el: name, attrs, kids: [] }, selfClosing: c[1] === '/', end: close.lastIndex };
}

/** Parse PSI116 text -> {root: PlainElement}. */
export function parsePlainXml(text) {
  const s = String(text);
  const stack = [];
  let root = null;
  let i = 0;
  while (i < s.length) {
    const lt = s.indexOf('<', i);
    const chunk = s.slice(i, lt < 0 ? s.length : lt);
    if (stack.length && chunk.trim()) stack.at(-1).kids.push({ __text: decode(chunk) });
    if (lt < 0) break;
    if (s.startsWith('<!--', lt)) { i = s.indexOf('-->', lt) + 3; if (i < 3) fail(PLAIN_XML_ERRORS.MALFORMED, lt); continue; }
    if (s.startsWith('<?', lt)) { i = s.indexOf('?>', lt) + 2; if (i < 2) fail(PLAIN_XML_ERRORS.MALFORMED, lt); continue; }
    if (s.startsWith('<![CDATA[', lt)) {
      const e = s.indexOf(']]>', lt);
      if (e < 0 || !stack.length) fail(PLAIN_XML_ERRORS.MALFORMED, lt);
      const body = s.slice(lt + 9, e);
      if (body.trim()) stack.at(-1).kids.push({ __text: body });
      i = e + 3; continue;
    }
    if (s.startsWith('<!', lt)) { i = s.indexOf('>', lt) + 1; continue; }
    if (s[lt + 1] === '/') {
      const e = s.indexOf('>', lt);
      const name = s.slice(lt + 2, e).trim();
      if (!stack.length || stack.at(-1).__el !== name) fail(PLAIN_XML_ERRORS.MALFORMED, lt);
      stack.pop(); i = e + 1; continue;
    }
    const { el, selfClosing, end } = readTag(s, lt);
    if (stack.length) stack.at(-1).kids.push(el); else if (!root) root = el; else fail(PLAIN_XML_ERRORS.MALFORMED, lt);
    if (!selfClosing) stack.push(el);
    i = end;
  }
  if (!root || stack.length) fail(PLAIN_XML_ERRORS.MALFORMED, s.length);
  return { root };
}

const escText = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (t) => escText(t).replace(/"/g, '&quot;');
function render(el, pad, out) {
  const attrs = Object.entries(el.attrs || {}).map(([k, v]) => ` ${k}="${escAttr(v)}"`).join('');
  const kids = el.kids || [];
  if (!kids.length) { out.push(`${pad}<${el.__el}${attrs}/>`); return; }
  if (kids.every((k) => k.__text !== undefined)) { out.push(`${pad}<${el.__el}${attrs}>${escText(kids.map((k) => k.__text).join(''))}</${el.__el}>`); return; }
  out.push(`${pad}<${el.__el}${attrs}>`);
  for (const k of kids) if (k.__text !== undefined) out.push(pad + '  ' + escText(k.__text.trim())); else render(k, pad + '  ', out);
  out.push(`${pad}</${el.__el}>`);
}
/** PlainElement tree -> PSI116 text (2-space indent; the UXML reader reads it back to the same table). */
export function serializePlainXml({ root }) {
  const out = ['<?xml version="1.0" encoding="UTF-8"?>'];
  render(root, '', out);
  return out.join('\n') + '\n';
}

/** Elements only. */
export const elementKids = (el) => (el?.kids || []).filter((k) => k.__el);
/** Like DOM getElementsByTagName(localName): descendants in document order. */
export function elementsByName(el, name, out = []) {
  for (const k of elementKids(el)) { if (k.__el === name) out.push(k); elementsByName(k, name, out); }
  return out;
}
export const childrenByName = (el, name) => elementKids(el).filter((k) => k.__el === name);
export const firstChild = (el, name) => childrenByName(el, name)[0] || null;
/** Like DOM textContent: all descendant text joined. */
export const textContent = (el) => (el ? (el.kids || []).map((k) => (k.__el ? textContent(k) : k.__text)).join('') : '');
/** Like today's xmlText(node, name): trimmed textContent of the first child with that name ('' if none). */
export const childText = (el, name) => textContent(firstChild(el, name)).trim();
// As in the DOM, empty or whitespace-only text leaves no text child (the recordings show none).
const textKids = (text) => (text === undefined || !String(text).trim() ? [] : [{ __text: String(text) }]);
export const createElement = (name, text) => ({ __el: name, attrs: {}, kids: textKids(text) });
/** Set the first child with that name to `text`, or append a new child (as today's xmlSetText does). */
export function setChildText(el, name, text) {
  const child = firstChild(el, name);
  if (child) { child.kids = textKids(text); return child; }
  const made = createElement(name, text);
  el.kids.push(made);
  return made;
}
