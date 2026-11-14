// Owner, 14 Nov 2026 (GOLDEN-30 rev 3, finding L): "based on Source xml". A wall thickness that
// the source XML states for a node (> 0) is kept; the piping-class master fills only nodes whose
// source wall is 0 or missing. One size can then carry two walls (a heavier nozzle spool).
// AVEVA PSI116 exports write wall 0 on every node, so for them nothing changes.
// Step 10 renumbers -1 nodes, so a node is identified by its branch and its component
// (type, reference, endpoint, and the occurrence of that triple in the branch), not by number.
// A transfer (Owner D5) is restored after this and still wins.

const kids = (el, name) => [...(el?.childNodes || [])].filter((c) => c.nodeType === 1 && (c.localName || c.nodeName) === name);
const first = (el, name) => kids(el, name)[0] || null;
const textOf = (el) => String(el?.textContent ?? '').trim();

function wallKeys(branch) {
  const seen = new Map();
  return kids(branch, 'Node').map((node) => {
    const ref = textOf(first(node, 'ComponentRefNo'));
    const base = ref
      ? `ref|${textOf(first(node, 'ComponentType'))}|${ref}|${textOf(first(node, 'Endpoint'))}`
      : `num|${textOf(first(node, 'NodeNumber'))}`;
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    return `${base}|${n}`;
  });
}

function namedBranches(document) {
  const branches = [...document.getElementsByTagName('Branch')].map((b) => [textOf(first(b, 'Branchname')), b]);
  const counts = new Map();
  for (const [name] of branches) counts.set(name, (counts.get(name) || 0) + 1);
  return branches.filter(([name]) => name && counts.get(name) === 1); // a shared name cannot be keyed safely
}

/** Source walls > 0, keyed by branch and component. Null when the source states none. */
export function snapshotSourceWalls(xmlText) {
  if (typeof DOMParser === 'undefined') return null;
  const document = new DOMParser().parseFromString(String(xmlText || ''), 'application/xml');
  if (document.getElementsByTagName('parsererror').length) return null;
  const walls = new Map();
  for (const [name, branch] of namedBranches(document)) {
    const keys = wallKeys(branch);
    for (const [i, node] of kids(branch, 'Node').entries()) {
      const raw = textOf(first(node, 'WallThickness'));
      if (Number(raw) > 0) walls.set(`${name}#${keys[i]}`, raw);
    }
  }
  return walls.size ? walls : null;
}

/** Put the source walls back into the run's XML; returns the nodes changed (final ordinals). */
export function restoreSourceWalls(xmlText, walls) {
  const out = { xmlText, kept: [], diagnostics: [] };
  if (!walls) return out;
  const document = new DOMParser().parseFromString(String(xmlText || ''), 'application/xml');
  if (document.getElementsByTagName('parsererror').length) return out;
  for (const [name, branch] of namedBranches(document)) {
    const keys = wallKeys(branch);
    for (const [nodeOrdinal, node] of kids(branch, 'Node').entries()) {
      const want = walls.get(`${name}#${keys[nodeOrdinal]}`);
      if (want === undefined) continue;
      let el = first(node, 'WallThickness');
      if (el && textOf(el) === want) continue;
      if (!el) {
        el = node.namespaceURI ? document.createElementNS(node.namespaceURI, 'WallThickness') : document.createElement('WallThickness');
        node.appendChild(el);
      }
      const runValue = textOf(el);
      el.textContent = want;
      out.kept.push({ branchName: name, nodeNumber: textOf(first(node, 'NodeNumber')), nodeOrdinal, value: want, runValue });
    }
  }
  if (!out.kept.length) return out;
  out.xmlText = new XMLSerializer().serializeToString(document);
  out.diagnostics.push({
    type: 'source-wall-kept', severity: 'info', count: out.kept.length,
    message: `${out.kept.length} node(s) keep the wall thickness stated in the source XML instead of the piping-class value.`,
  });
  return out;
}

/** The run's parity check expects the kept source walls. */
export function expectSourceWalls(entries, kept) {
  if (!kept?.length || !Array.isArray(entries)) return entries;
  const want = new Map(kept.map((k) => [`${k.branchName}|${k.nodeOrdinal}`, k.value]));
  return entries.map((e) => {
    const path = Array.isArray(e.path) ? e.path.join('/') : String(e.path || '');
    const k = `${e.branchName}|${e.nodeOrdinal}`;
    return e.scope === 'node' && path === 'WallThickness' && want.has(k) ? { ...e, expected: want.get(k), source: 'source-xml-wall' } : e;
  });
}
