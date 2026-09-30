const DEFAULT_TOLERANCE_MM = 6;

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function positiveSourceNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && Number.isInteger(number) && number > 0 ? number : null;
}

function distance(left, right) {
  if (!left || !right) return null;
  const value = Math.hypot(
    Number(right.x) - Number(left.x),
    Number(right.y) - Number(left.y),
    Number(right.z) - Number(left.z),
  );
  return Number.isFinite(value) ? value : null;
}

function traversalOrdinal(row) {
  const value = Number(row?.globalTraversalOrdinal);
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

function sourceGroupKey(node, sourceNodeNumber) {
  return `${text(node.sourceDocumentId)}::${sourceNodeNumber}`;
}

export function buildXmlCiiModeBSourceJunctionAliases(observation, numbering, options = {}) {
  const toleranceMm = Number.isFinite(Number(options.toleranceMm))
    ? Number(options.toleranceMm)
    : DEFAULT_TOLERANCE_MM;
  const numberByIdentity = new Map((numbering?.rows || []).map((row) => [row.sourceIdentity, row]));
  const grouped = new Map();

  for (const node of observation?.nodes || []) {
    if (node.documentRole !== 'split-source') continue;
    const sourceNodeNumber = positiveSourceNumber(node.sourceNodeNumber);
    if (sourceNodeNumber === null) continue;
    const key = sourceGroupKey(node, sourceNodeNumber);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(node);
  }

  const aliases = [];
  const groups = [];
  const incompatibleGroups = [];
  for (const [key, rows] of grouped.entries()) {
    const branchNames = [...new Set(rows.map((row) => text(row.branchName)))];
    if (rows.length < 2 || branchNames.length < 2) continue;
    const anchor = rows[0];
    const distances = rows.slice(1).map((row) => distance(anchor.point, row.point));
    const missingPosition = !anchor.point || distances.some((value) => value === null);
    const maxAnchorDistanceMm = distances.length ? Math.max(...distances.filter((value) => value !== null)) : 0;
    const sourceNodeNumber = positiveSourceNumber(anchor.sourceNodeNumber);
    const base = {
      groupId: `SOURCE_JUNCTION:${key}`,
      sourceDocumentId: text(anchor.sourceDocumentId),
      sourceNodeNumber,
      branchNames: branchNames.sort(),
      sourceIdentities: rows.map((row) => row.sourceIdentity).sort(),
      toleranceMm,
      maxAnchorDistanceMm: Number.isFinite(maxAnchorDistanceMm) ? Number(maxAnchorDistanceMm.toFixed(6)) : null,
    };
    if (missingPosition || maxAnchorDistanceMm > toleranceMm) {
      incompatibleGroups.push({
        ...base,
        state: 'NOT_ALIASED',
        reason: missingPosition ? 'missing-position' : 'position-spread-exceeds-native-junction-tolerance',
      });
      continue;
    }

    const numbered = rows.map((node) => {
      const numberRow = numberByIdentity.get(node.sourceIdentity);
      if (!numberRow || numberRow.numberClass !== 'POSITIVE_ENGINEERING' || !(Number(numberRow.outputNodeNumber) > 0)) {
        throw new Error(`Mode B source junction ${base.groupId} lost positive MODEB-03 numbering for ${node.sourceIdentity}.`);
      }
      return { node, numberRow };
    });
    numbered.sort((left, right) => traversalOrdinal(left.numberRow) - traversalOrdinal(right.numberRow)
      || left.node.sourceIdentity.localeCompare(right.node.sourceIdentity));
    const canonical = numbered[0];
    const renderedNodeNumber = Number(canonical.numberRow.outputNodeNumber);
    const group = {
      ...base,
      state: 'ALIASED',
      renderedNodeNumber,
      canonicalSourceIdentity: canonical.node.sourceIdentity,
      memberCount: numbered.length,
    };
    groups.push(group);
    for (const { node, numberRow } of numbered) {
      aliases.push({
        schema: 'xml-cii-mode-b-source-junction-alias/v1',
        authority: 'SOURCE_DOCUMENT_JUNCTION_RUNTIME_ALIAS',
        groupId: group.groupId,
        sourceDocumentId: group.sourceDocumentId,
        sourceNodeNumber,
        sourceIdentity: node.sourceIdentity,
        branchName: text(node.branchName),
        branchId: text(node.branchId),
        point: node.point ? { ...node.point } : null,
        originalOutputNodeNumber: Number(numberRow.outputNodeNumber),
        renderedNodeNumber,
        canonicalSourceIdentity: group.canonicalSourceIdentity,
        canonicalMember: node.sourceIdentity === group.canonicalSourceIdentity,
        reason: 'Preserve native writer same-document shared-junction degree across MODEB-03 occurrence numbering.',
      });
    }
  }

  groups.sort((a, b) => a.groupId.localeCompare(b.groupId));
  aliases.sort((a, b) => a.sourceIdentity.localeCompare(b.sourceIdentity));
  incompatibleGroups.sort((a, b) => a.groupId.localeCompare(b.groupId));
  return {
    schema: 'xml-cii-mode-b-source-junction-alias-set/v1',
    authority: 'SOURCE_DOCUMENT_JUNCTION_RUNTIME_ALIAS',
    toleranceMm,
    groups,
    aliases,
    incompatibleGroups,
    stats: {
      aliasedGroupCount: groups.length,
      aliasedOccurrenceCount: aliases.length,
      incompatibleGroupCount: incompatibleGroups.length,
    },
  };
}
