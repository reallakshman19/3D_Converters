function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function distance(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return Math.hypot(Number(b.x) - Number(a.x), Number(b.y) - Number(a.y), Number(b.z) - Number(a.z));
}

function restraintSignature(node) {
  if (!Array.isArray(node?.restraints) || node.restraints.length === 0) return '';
  return JSON.stringify(node.restraints.map((row) => ({
    rawType: text(row?.rawType),
    types: Array.isArray(row?.types) ? row.types.map(text) : [],
  })));
}

export function buildXmlCiiModeBSourceSharedJunctionAliases(observation, numbering, options = {}) {
  const toleranceMm = Number.isFinite(Number(options.toleranceMm)) && Number(options.toleranceMm) > 0
    ? Number(options.toleranceMm)
    : 6.0;
  const numberById = new Map((numbering?.rows || []).map((row) => [row.sourceIdentity, row]));
  const groups = new Map();

  for (const node of observation?.nodes || []) {
    if (node.documentRole !== 'split-source') continue;
    const sourceNodeNumber = Number(node.sourceNodeNumber);
    if (!(Number.isFinite(sourceNodeNumber) && sourceNodeNumber > 0)) continue;
    const key = `${text(node.sourceDocumentId)}::${text(node.sourceNodeNumber)}`;
    const rows = groups.get(key) || [];
    rows.push(node);
    groups.set(key, rows);
  }

  const aliases = [];
  for (const rows of groups.values()) {
    if (new Set(rows.map((row) => row.branchId)).size < 2) continue;
    if (rows.some((row) => !row.point)) {
      throw new Error(`Mode B source shared junction ${rows[0]?.sourceDocumentId || ''}/${rows[0]?.sourceNodeNumber || ''} is missing Position custody.`);
    }
    const anchor = rows[0];
    if (rows.some((row) => distance(anchor.point, row.point) > toleranceMm)) continue;

    const nonEmptyRestraintSignatures = new Set(rows.map(restraintSignature).filter(Boolean));
    if (nonEmptyRestraintSignatures.size > 1) {
      throw new Error(`Mode B source shared junction ${anchor.sourceDocumentId}/${anchor.sourceNodeNumber} has conflicting restraint authority.`);
    }

    const numbered = rows.map((node) => {
      const numberRow = numberById.get(node.sourceIdentity);
      if (!numberRow || numberRow.numberClass !== 'POSITIVE_ENGINEERING' || !(Number(numberRow.outputNodeNumber) > 0)) {
        throw new Error(`Mode B source shared junction ${node.sourceIdentity} lost positive MODEB-03 numbering custody.`);
      }
      return { node, numberRow };
    }).sort((a, b) => Number(a.numberRow.outputNodeNumber) - Number(b.numberRow.outputNodeNumber)
      || a.node.sourceIdentity.localeCompare(b.node.sourceIdentity));

    const canonical = numbered[0];
    const renderedNodeNumber = Number(canonical.numberRow.outputNodeNumber);
    for (const entry of numbered.slice(1)) {
      if (Number(entry.numberRow.outputNodeNumber) === renderedNodeNumber) continue;
      aliases.push({
        schema: 'xml-cii-mode-b-junction-alias/v1',
        authority: 'SOURCE_SHARED_JUNCTION_RUNTIME_ALIAS',
        targetSourceIdentity: entry.node.sourceIdentity,
        canonicalSourceIdentity: canonical.node.sourceIdentity,
        sourceDocumentId: text(entry.node.sourceDocumentId),
        sourceNodeNumber: text(entry.node.sourceNodeNumber),
        renderedNodeNumber,
        canonicalPinnedOutputNodeNumber: renderedNodeNumber,
        branchId: text(entry.node.branchId),
        branchName: text(entry.node.branchName),
        componentRefNo: text(entry.node.componentRefNo),
        reason: 'Preserve source-authoritative same-document shared positive NodeNumber junction semantics after per-occurrence Mode B numbering.',
      });
    }
  }

  return aliases.sort((a, b) => a.targetSourceIdentity.localeCompare(b.targetSourceIdentity));
}
