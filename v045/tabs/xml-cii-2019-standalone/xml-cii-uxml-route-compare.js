// Step-10 UXML route: compares the XML the UXML supports stage gives the CII engine with today's route XML.
// Per branch: its own values (everything but nodes). Per node: every value and the restraints in order.
// Where a tag sits inside its record is ignored: the CII writer reads by tag name, and the stage puts restraints last.

const elementKids = (el) => [...el.childNodes].filter((c) => c.nodeType === 1);

function leafText(el) {
  const kids = elementKids(el);
  if (!kids.length) return el.textContent.trim();
  return kids.map((k) => `${k.localName}=${leafText(k)}`).join(';');
}

function valuesOf(el, skip) {
  const values = {};
  for (const kid of elementKids(el)) {
    if (skip.has(kid.localName)) continue;
    const name = kid.localName;
    values[name] = values[name] === undefined ? leafText(kid) : `${values[name]} | ${leafText(kid)}`;
  }
  return values;
}

/** Branches of a PSI116 XML: their own values and their nodes (values + restraints in order). */
export function uxmlRouteRows(xmlText) {
  const doc = new DOMParser().parseFromString(String(xmlText || ''), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('UXML_ROUTE_XML_UNREADABLE');
  return [...doc.getElementsByTagName('Branch')].map((branch) => ({
    name: elementKids(branch).find((k) => k.localName === 'Branchname')?.textContent.trim() || '',
    values: valuesOf(branch, new Set(['Node'])),
    nodes: elementKids(branch).filter((k) => k.localName === 'Node').map((node) => ({
      values: valuesOf(node, new Set(['Restraint'])),
      restraints: elementKids(node).filter((k) => k.localName === 'Restraint').map(leafText),
    })),
  }));
}

function changedKeys(a, b) {
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => a[k] !== b[k]).sort();
}

function compareBranch(today, uxml, at, out) {
  const head = changedKeys(today.values, uxml.values);
  if (head.length) {
    out.branchesDiffer += 1;
    out.examples.push({ branch: today.name, values: head });
  }
  if (today.nodes.length !== uxml.nodes.length) {
    out.nodeCountDiffer.push({ branch: today.name, today: today.nodes.length, uxml: uxml.nodes.length });
    return;
  }
  today.nodes.forEach((node, i) => {
    const other = uxml.nodes[i];
    const values = changedKeys(node.values, other.values);
    const restraints = node.restraints.join('\n') !== other.restraints.join('\n');
    if (!values.length && !restraints) return;
    out.nodesDiffer += 1;
    for (const key of [...values, ...(restraints ? ['Restraint'] : [])]) out.fields[key] = (out.fields[key] || 0) + 1;
    out.examples.push({ branch: today.name, branchIndex: at, nodeIndex: i, NodeNumber: node.values.NodeNumber || '', values, restraints });
  });
}

/** {equal, branches, nodes, branchesDiffer, nodesDiffer, nodeCountDiffer[], fields {name: nodes differing}, examples[] (first 20)} */
export function compareUxmlRouteXml(todayXmlText, uxmlXmlText) {
  const today = uxmlRouteRows(todayXmlText);
  const uxml = uxmlRouteRows(uxmlXmlText);
  const out = { branches: today.length, nodes: today.reduce((n, b) => n + b.nodes.length, 0), branchesDiffer: 0, nodesDiffer: 0,
    nodeCountDiffer: [], fields: {}, examples: [] };
  if (today.length !== uxml.length) out.nodeCountDiffer.push({ branch: '(branches)', today: today.length, uxml: uxml.length });
  else today.forEach((branch, i) => compareBranch(branch, uxml[i], i, out));
  out.examples = out.examples.slice(0, 20);
  out.equal = !out.branchesDiffer && !out.nodesDiffer && !out.nodeCountDiffer.length;
  return out;
}
