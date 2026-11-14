// Owner, 14 Nov 2026 (GOLDEN-30 H): a staged support that does not become a restraint is shown as
// a non-blocking warning instead of vanishing. Input is the DTXR position ledger of step 10
// (staged position groups, offset-calibrated, and the group each XML node took).
//   SUPPORT_NEAR_MISS  a node took the support's position group (ledger tolerance) but the group
//                      lies beyond the restraint tolerance, and the node's final restraints lack
//                      the support's kind: its label is attached, its restraint is missing.
//   SUPPORT_ORPHAN     no node took the group, and the support belongs to a line of this XML
//                      (the stress model has no node at the support; the nearest is named).
// Supports on lines that are not in this XML are other systems and are not reported.
const SUPPORT_ENTRY_TYPES = new Set(['SUPPORT', 'ATTA']);
const norm = (value) => String(value ?? '').trim().toUpperCase().replace(/^\/+/, '');
const supportEntries = (group) => (group?.entries || []).filter((entry) => SUPPORT_ENTRY_TYPES.has(String(entry?.type || '').toUpperCase()));
const fmt = (point) => (point ? `${point.x} ${point.y} ${point.z}` : 'no position');
const KIND_TYPES = { REST: ['+Y', 'Y'], GUIDE: ['GUI'], LINESTOP: ['LIM'], LIMIT: ['LIM'], ANCHOR: ['A', 'ANC'], SPRING: ['Y', '+Y'] };

// Restraint types per <Node>, in document order (1-based like the ledger's xmlIndex).
function nodeRestraintTypes(xmlText) {
  const out = [null];
  for (const node of String(xmlText ?? '').matchAll(/<Node>([\s\S]*?)<\/Node>/g)) {
    out.push(new Set([...node[1].matchAll(/<Type>([^<]*)<\/Type>/g)].map((m) => m[1].trim().toUpperCase())));
  }
  return out;
}

export function unmatchedStagedSupportWarnings(ledger, restraintToleranceMm = 1, finalXmlText = '') {
  const groups = Array.isArray(ledger?.groups) ? ledger.groups : [];
  const records = Array.isArray(ledger?.records) ? ledger.records : [];
  const tolerance = Number.isFinite(Number(restraintToleranceMm)) ? Number(restraintToleranceMm) : 1;
  const byId = new Map(groups.map((group) => [group.id, group]));
  const xmlLines = new Set(records.map((record) => norm(record.xmlBranch)).filter(Boolean));
  const usedIds = new Set();
  const typesByIndex = nodeRestraintTypes(finalXmlText);
  const out = [];
  const warn = (code, entry, extra, message) => out.push({
    type: 'staged-support-unmatched', severity: 'warning', code, tag: entry.name || '', stagedPath: entry.path || '',
    stagedBranch: entry.branchName || '', ...extra, message,
  });

  for (const record of records) {
    const group = byId.get(record.groupId);
    if (!group) continue;
    usedIds.add(group.id);
    const distance = Number(record.distanceMm);
    if (!Number.isFinite(distance) || distance <= tolerance || !supportEntries(group).length) continue;
    const present = typesByIndex[record.xmlIndex] || new Set();
    const missing = (record.derivedSupportTypes || []).filter((kind) => !(KIND_TYPES[kind] || [kind]).some((t) => present.has(t)));
    if (!missing.length) continue;
    const names = supportEntries(group).map((entry) => entry.name || entry.path).join(', ');
    warn('SUPPORT_NEAR_MISS', supportEntries(group)[0], { nearestNode: record.xmlNodeNumber || '', distanceMm: Number(distance.toFixed(3)), toleranceMm: tolerance, missingKinds: missing, supports: names },
      `staged support ${names} is ${distance.toFixed(1)} mm from node ${record.xmlNodeNumber} (restraint tolerance ${tolerance} mm): its label is attached but no ${missing.join('/')} restraint is written`);
  }
  const nodePoints = (Array.isArray(ledger?.nodes) ? ledger.nodes : records).filter((node) => node?.xmlPoint);
  for (const group of groups) {
    if (usedIds.has(group.id)) continue;
    const entries = supportEntries(group).filter((entry) => xmlLines.has(norm(entry.branchName)));
    if (!entries.length) continue;
    let nearest = null;
    for (const node of group.anchor ? nodePoints : []) {
      const d = Math.hypot(node.xmlPoint.x - group.anchor.x, node.xmlPoint.y - group.anchor.y, node.xmlPoint.z - group.anchor.z);
      if (!nearest || d < nearest.d) nearest = { nodeNumber: node.xmlNodeNumber, d };
    }
    const where = nearest ? `; nearest node ${nearest.nodeNumber} is ${Math.round(nearest.d)} mm away` : '';
    for (const entry of entries) {
      warn('SUPPORT_ORPHAN', entry, { position: fmt(group.anchor), nearestNode: nearest?.nodeNumber ?? '', distanceMm: nearest ? Number(nearest.d.toFixed(1)) : null },
        `staged support ${entry.name || entry.path} on line ${entry.branchName} at ${fmt(group.anchor)} has no node of this XML at its position${where}; no restraint was written`);
    }
  }
  return out;
}

// The warnings are judged on the XML that leaves step 10. Wrappers (ATTA default, MDS / Mode B
// closures) add restraints after the base run, so each one refreshes the warnings on its final XML.
const ledgers = new WeakMap();
const isSupportWarningLog = (line) => /^Warning SUPPORT_(NEAR_MISS|ORPHAN):/.test(String(line));

export function rememberSupportLedger(result, ledger, restraintToleranceMm = 1) {
  if (result && typeof result === 'object' && ledger) ledgers.set(result, { ledger, restraintToleranceMm });
}

export function refreshUnmatchedSupportWarnings(result) {
  const kept = result && ledgers.get(result);
  if (!kept) return result;
  const warnings = unmatchedStagedSupportWarnings(kept.ledger, kept.restraintToleranceMm, result.xmlText || '');
  result.diagnostics = [...(result.diagnostics || []).filter((d) => d?.type !== 'staged-support-unmatched'), ...warnings];
  result.logs = [...(result.logs || []).filter((line) => !isSupportWarningLog(line)), ...warnings.map((w) => `Warning ${w.code}: ${w.message}.`)];
  return result;
}
