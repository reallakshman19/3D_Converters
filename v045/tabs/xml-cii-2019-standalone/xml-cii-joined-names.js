// End-to-end plan E2c step 2 (Owner 20 Nov 2026: "When multiple Node are there in one location (POS), use "|" for
// join"; "Write | in output"): the names and AVEVA references of the duplicate nodes today's supports stage removed are
// written onto the node it kept, joined with "|", in step 10's Enriched XML only. The CII engine got the XML with the
// plain names, so the CII is today's. The kept nodes and their joined values come from the UXML document route
// (vendor/uxml-v2/supports/JoinNames.js); each must be found exactly once in the Enriched XML by its branch, node
// number and plain name, or no name is written and the log says why. A node whose input name already held "|" (an
// Enriched XML run through step 10 again; Owner 20 Nov, "Read it as history") is listed too: the engine got its first
// part, and its whole history is written back here.
// Names are values (entities resolved, trimmed), as the UXML names list holds them; each is escaped once when written,
// and an element written <NodeName/> counts as empty (PR 436 review B1, N3).
//   writeJoinedNames(xmlText, names) -> {ok, xmlText, written, message}
//   firstNameParts(xmlText, lockedNodes) -> {xmlText, cut, locked}: every NodeName and ComponentRefNo holding "|" cut to
//     its first part, for today's supports stage when the document route refused (review B3), so the "|" history never
//     reaches the CII; a value the transfer note protects (lockedNodes: the note's nodes, 'branch|node' -> [key]) is
//     left as the transfer set it and counted in `locked` (review B4, as a lock on the document route).

const KEYS = ['NodeName', 'ComponentRefNo'];
const unescape = (t) => String(t).replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e) => {
  const k = e.toLowerCase();
  if (k[0] === '#') return String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10));
  return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[k];
});
const escape = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** The kept node's value first, then the removed ones': once when the same on all, else joined with "|". */
const joined = (values) => (new Set(values).size === 1 ? values[0] : values.join('|'));
const elementOf = (key) => new RegExp(`<${key}>([^<]*)</${key}>|<${key}\\s*/>`);
/** An element's value (decoded, trimmed); '' when absent or empty. */
const elementText = (block, key) => {
  const m = block.match(elementOf(key));
  return m ? unescape(m[1] ?? '').trim() : '';
};

/** The <Node> blocks of each branch: [{branch, start, end, block}] in text order. */
function nodeBlocks(xmlText) {
  const out = [];
  for (const b of xmlText.matchAll(/<Branch(?:\s[^>]*)?>[\s\S]*?<\/Branch>/g)) {
    const branch = elementText(b[0].replace(/<Node(?:\s[^>]*)?>[\s\S]*?<\/Node>/g, ''), 'Branchname');
    for (const n of b[0].matchAll(/<Node(?:\s[^>]*)?>[\s\S]*?<\/Node>/g)) {
      const start = b.index + n.index;
      out.push({ branch, start, end: start + n[0].length, block: n[0] });
    }
  }
  return out;
}

export function writeJoinedNames(xmlText, names) {
  const text = String(xmlText || '');
  const blocks = nodeBlocks(text);
  const edits = [];
  for (const n of names || []) {
    const keys = KEYS.filter((k) => (n.written || []).includes(k));
    if (!keys.length) continue;
    const hits = blocks.filter((b) => b.branch === n.branch && elementText(b.block, 'NodeNumber') === String(n.nodeNumber)
      && KEYS.every((k) => elementText(b.block, k) === (n[k]?.[0] ?? '')));
    if (hits.length !== 1) {
      return { ok: false, xmlText: text, written: 0,
        message: `UXML route: the joined "|" names were not written to the Enriched XML: ${n.branch} node ${n.nodeNumber} was found ${hits.length} time(s) there.` };
    }
    let block = hits[0].block;
    for (const k of keys) block = block.replace(elementOf(k), () => `<${k}>${escape(joined(n[k]))}</${k}>`);
    edits.push({ ...hits[0], next: block });
  }
  let out = text;
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.next + out.slice(e.end);
  return { ok: true, xmlText: out, written: edits.length,
    message: `UXML route: ${edits.length} node(s) carry their name history joined with "|" (the duplicate nodes removed at their point, and any earlier history in the input; Enriched XML only, the CII has the plain names).` };
}

export function firstNameParts(xmlText, lockedNodes = {}) {
  const text = String(xmlText || '');
  let cut = 0, locked = 0, out = text;
  for (const b of nodeBlocks(text).sort((x, y) => y.start - x.start)) {
    const keep = lockedNodes?.[`${b.branch}|${elementText(b.block, 'NodeNumber')}`] || [];
    const block = b.block.replace(/<(NodeName|ComponentRefNo)>([^<]*)<\/\1>/g, (m, key, value) => {
      if (!value.includes('|')) return m;
      if (keep.includes(key)) { locked += 1; return m; }
      cut += 1;
      return `<${key}>${value.split('|')[0]}</${key}>`;
    });
    out = out.slice(0, b.start) + block + out.slice(b.end);
  }
  return { xmlText: out, cut, locked };
}
