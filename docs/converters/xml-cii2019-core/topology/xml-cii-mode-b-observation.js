const SUPPORT_TYPES = new Set(['ATTA', 'SUPPORT']);
const TEE_TYPES = new Set(['TEE']);

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function upper(value) {
  return text(value).toUpperCase();
}

function numeric(value) {
  const match = text(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?(?:[Ee][-+]?\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function tagValue(block, name) {
  const match = text(block).match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return text(match?.[1]?.replace(/<[^>]+>/g, ''));
}

function tagValues(block, name) {
  return [...text(block).matchAll(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'gi'))]
    .map((match) => text(match?.[1]?.replace(/<[^>]+>/g, '')))
    .filter(Boolean);
}

function branchBlocks(xmlText) {
  return text(xmlText).match(/<Branch\b[\s\S]*?<\/Branch>/gi) || [];
}

function nodeBlocks(branchBlock) {
  return text(branchBlock).match(/<Node\b[\s\S]*?<\/Node>/gi) || [];
}

function pointFromPosition(value) {
  const values = text(value).match(/-?\d+(?:\.\d+)?(?:[Ee][-+]?\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
  return values.length >= 3 ? { x: values[0], y: values[1], z: values[2] } : null;
}

function distancePoints(a, b) {
  if (!a || !b) return null;
  const value = Math.hypot(Number(b.x) - Number(a.x), Number(b.y) - Number(a.y), Number(b.z) - Number(a.z));
  return Number.isFinite(value) ? value : null;
}

function normalizeRef(value) {
  return text(value).replace(/^=/, '').replace(/\s+/g, '').toUpperCase();
}

function normalizedFileId(fileName, fallback = 'document') {
  return text(fileName || fallback).replace(/[^A-Za-z0-9._-]+/g, '_');
}

function positionKey(point, toleranceMm) {
  if (!point) return '';
  const tolerance = Number.isFinite(Number(toleranceMm)) && Number(toleranceMm) > 0 ? Number(toleranceMm) : 0.001;
  return [point.x, point.y, point.z].map((value) => Math.round(Number(value) / tolerance)).join('|');
}

function restraintFacts(block) {
  const facts = [];
  for (const match of text(block).matchAll(/<Restraint\b[^>]*>([\s\S]*?)<\/Restraint>/gi)) {
    const inner = match[1] || '';
    const types = tagValues(inner, 'Type');
    facts.push({
      types,
      rawType: types.join('|'),
    });
  }
  return facts;
}

function classifyRole(node) {
  if (TEE_TYPES.has(node.componentType)) return 'tee';
  if (SUPPORT_TYPES.has(node.componentType) && node.restraints.length) return 'support-restraint';
  if (SUPPORT_TYPES.has(node.componentType) && /\/SREF/i.test(node.nodeName || '')) return 'support-reference';
  if (node.componentType === 'GASK') return 'gasket-helper';
  if (['OLET', 'WELDOLET', 'SOCKOLET'].includes(node.componentType) && node.sourceNodeNumber === '-1') return 'olet-helper-endpoint';
  if (['ELBO', 'ELBOW', 'BEND'].includes(node.componentType) && node.sourceNodeNumber === '-1') return 'bend-helper-endpoint';
  if (node.point) return 'geometry-node';
  return 'unknown-node';
}

function parseDocument(xmlText, descriptor = {}, options = {}) {
  const sourceFileName = text(descriptor.fileName || descriptor.name || 'document.xml');
  const sourceDocumentId = text(descriptor.documentId) || normalizedFileId(sourceFileName);
  const documentRole = descriptor.role === 'combined-reference' ? 'combined-reference' : 'split-source';
  const branchOccurrenceByName = new Map();
  const nodes = [];
  const branches = [];

  const blocks = branchBlocks(xmlText);
  blocks.forEach((branchBlock, branchIndex) => {
    const branchName = tagValue(branchBlock, 'Branchname') || `__branch_${branchIndex + 1}`;
    const branchOccurrence = (branchOccurrenceByName.get(branchName) || 0) + 1;
    branchOccurrenceByName.set(branchName, branchOccurrence);
    const branchId = `${sourceDocumentId}::${branchName}::${branchOccurrence}`;
    const branchNodes = [];

    nodeBlocks(branchBlock).forEach((nodeBlock, nodeIndex) => {
      const sourceNodeNumber = tagValue(nodeBlock, 'NodeNumber');
      const componentRefNo = tagValue(nodeBlock, 'ComponentRefNo');
      const endpoint = tagValue(nodeBlock, 'Endpoint');
      const componentType = upper(tagValue(nodeBlock, 'ComponentType'));
      const connectionType = upper(tagValue(nodeBlock, 'ConnectionType'));
      const nodeName = tagValue(nodeBlock, 'NodeName');
      const position = tagValue(nodeBlock, 'Position');
      const point = pointFromPosition(position);
      const outsideDiameter = numeric(tagValue(nodeBlock, 'OutsideDiameter'));
      const bore = numeric(tagValue(nodeBlock, 'Bore') || tagValue(nodeBlock, 'NominalBore') || tagValue(nodeBlock, 'NominalDiameter'));
      const restraints = restraintFacts(nodeBlock);
      const sourceIdentity = [
        sourceDocumentId,
        branchName,
        branchOccurrence,
        nodeIndex,
        sourceNodeNumber || '_',
        normalizeRef(componentRefNo) || '_',
        endpoint || '_',
      ].join('::');
      const node = {
        sourceIdentity,
        sourceDocumentId,
        sourceFileName,
        documentRole,
        branchId,
        branchName,
        branchOccurrence,
        branchIndex,
        nodeIndex,
        sourceNodeNumber,
        nodeName,
        componentRefNo,
        normalizedComponentRefNo: normalizeRef(componentRefNo),
        endpoint,
        componentType,
        connectionType,
        position,
        point,
        positionKey: positionKey(point, options.positionToleranceMm),
        outsideDiameter,
        bore,
        restraints,
        hasRestraint: restraints.length > 0,
      };
      node.role = classifyRole(node);
      nodes.push(node);
      branchNodes.push(node);
    });

    for (let i = 0; i < branchNodes.length; i += 1) {
      branchNodes[i].previousSourceIdentity = branchNodes[i - 1]?.sourceIdentity || '';
      branchNodes[i].nextSourceIdentity = branchNodes[i + 1]?.sourceIdentity || '';
    }

    branches.push({
      branchId,
      sourceDocumentId,
      sourceFileName,
      branchName,
      branchOccurrence,
      branchIndex,
      nodeCount: branchNodes.length,
      nodeSourceIdentities: branchNodes.map((node) => node.sourceIdentity),
    });
  });

  return {
    document: {
      sourceDocumentId,
      sourceFileName,
      documentRole,
      fullName: tagValue(xmlText, 'FullName'),
      branchCount: branches.length,
      nodeCount: nodes.length,
    },
    branches,
    nodes,
  };
}

function buildBranchSegments(nodes) {
  const byBranch = new Map();
  for (const node of nodes) {
    if (!byBranch.has(node.branchId)) byBranch.set(node.branchId, []);
    byBranch.get(node.branchId).push(node);
  }
  const segments = [];
  for (const branchNodes of byBranch.values()) {
    const ordered = [...branchNodes].sort((a, b) => a.nodeIndex - b.nodeIndex);
    for (let i = 1; i < ordered.length; i += 1) {
      const from = ordered[i - 1];
      const to = ordered[i];
      const distanceMm = distancePoints(from.point, to.point);
      segments.push({
        segmentId: `${from.sourceIdentity}=>${to.sourceIdentity}`,
        sourceDocumentId: from.sourceDocumentId,
        branchId: from.branchId,
        branchName: from.branchName,
        fromSourceIdentity: from.sourceIdentity,
        toSourceIdentity: to.sourceIdentity,
        fromNodeNumber: from.sourceNodeNumber,
        toNodeNumber: to.sourceNodeNumber,
        fromComponentType: from.componentType,
        toComponentType: to.componentType,
        fromComponentRefNo: from.componentRefNo,
        toComponentRefNo: to.componentRefNo,
        fromEndpoint: from.endpoint,
        toEndpoint: to.endpoint,
        distanceMm: distanceMm === null ? null : Number(distanceMm.toFixed(6)),
        samePosition: distanceMm !== null && distanceMm <= 0.001,
      });
    }
  }
  return segments;
}

function buildSamePositionClusters(nodes, toleranceMm) {
  const byKey = new Map();
  for (const node of nodes) {
    if (!node.point) continue;
    const key = positionKey(node.point, toleranceMm);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(node);
  }
  return [...byKey.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([key, rows]) => ({
      positionKey: key,
      nodeCount: rows.length,
      documentCount: new Set(rows.map((row) => row.sourceDocumentId)).size,
      sourceIdentities: rows.map((row) => row.sourceIdentity).sort(),
      componentTypes: [...new Set(rows.map((row) => row.componentType).filter(Boolean))].sort(),
      restraintCount: rows.filter((row) => row.hasRestraint).length,
    }))
    .sort((a, b) => a.positionKey.localeCompare(b.positionKey));
}

function buildDuplicateSourceNodeNumbers(nodes) {
  const byNumber = new Map();
  for (const node of nodes) {
    const number = text(node.sourceNodeNumber);
    if (!number || number === '-1') continue;
    if (!byNumber.has(number)) byNumber.set(number, []);
    byNumber.get(number).push(node);
  }
  return [...byNumber.entries()]
    .filter(([, rows]) => new Set(rows.map((row) => row.sourceDocumentId)).size > 1)
    .map(([sourceNodeNumber, rows]) => ({
      sourceNodeNumber,
      documentCount: new Set(rows.map((row) => row.sourceDocumentId)).size,
      sourceIdentities: rows.map((row) => row.sourceIdentity).sort(),
    }))
    .sort((a, b) => Number(a.sourceNodeNumber) - Number(b.sourceNodeNumber) || a.sourceNodeNumber.localeCompare(b.sourceNodeNumber));
}

function diameterCompatibility(a, b, toleranceMm = 0.1) {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 'UNKNOWN';
  return Math.abs(a - b) <= toleranceMm ? 'MATCH' : 'CONFLICT';
}

function buildBoundaryCandidates(splitNodes, options = {}) {
  const toleranceMm = Number.isFinite(Number(options.positionToleranceMm)) ? Number(options.positionToleranceMm) : 0.001;
  const diameterToleranceMm = Number.isFinite(Number(options.diameterToleranceMm)) ? Number(options.diameterToleranceMm) : 0.1;
  const candidates = [];
  const positioned = splitNodes.filter((node) => node.point);

  for (let i = 0; i < positioned.length; i += 1) {
    const a = positioned[i];
    for (let j = i + 1; j < positioned.length; j += 1) {
      const b = positioned[j];
      if (a.sourceDocumentId === b.sourceDocumentId) continue;
      const distanceMm = distancePoints(a.point, b.point);
      if (distanceMm === null || distanceMm > toleranceMm) continue;
      const componentRefMatch = Boolean(a.normalizedComponentRefNo && b.normalizedComponentRefNo && a.normalizedComponentRefNo === b.normalizedComponentRefNo);
      const endpointMatch = Boolean(a.endpoint && b.endpoint && a.endpoint === b.endpoint);
      const componentTypeMatch = Boolean(a.componentType && b.componentType && a.componentType === b.componentType);
      const connectionTypeMatch = Boolean(a.connectionType && b.connectionType && a.connectionType === b.connectionType);
      const outsideDiameterCompatibility = diameterCompatibility(a.outsideDiameter, b.outsideDiameter, diameterToleranceMm);
      const boreCompatibility = diameterCompatibility(a.bore, b.bore, diameterToleranceMm);
      const corroborationCount = [
        componentRefMatch,
        endpointMatch,
        componentTypeMatch,
        connectionTypeMatch,
        outsideDiameterCompatibility === 'MATCH',
        boreCompatibility === 'MATCH',
      ].filter(Boolean).length;
      const conflict = outsideDiameterCompatibility === 'CONFLICT' || boreCompatibility === 'CONFLICT';
      const evidenceClass = conflict
        ? 'CONFLICTING_GEOMETRY'
        : (componentRefMatch && corroborationCount >= 2
          ? 'STRONG_CORROBORATION'
          : (corroborationCount >= 2 ? 'CORROBORATED' : 'POSITION_ONLY'));
      const pair = [a.sourceIdentity, b.sourceIdentity].sort();
      candidates.push({
        candidateId: `${pair[0]}<=>${pair[1]}`,
        sourceA: a.sourceIdentity,
        sourceB: b.sourceIdentity,
        documentA: a.sourceDocumentId,
        documentB: b.sourceDocumentId,
        distanceMm: Number(distanceMm.toFixed(6)),
        evidence: {
          componentRefMatch,
          endpointMatch,
          componentTypeMatch,
          connectionTypeMatch,
          outsideDiameterCompatibility,
          boreCompatibility,
          teeInvolved: a.role === 'tee' || b.role === 'tee',
          restraintInvolved: a.hasRestraint || b.hasRestraint,
          corroborationCount,
        },
        evidenceClass,
        authority: 'OBSERVATION_ONLY',
      });
    }
  }

  candidates.sort((a, b) => a.candidateId.localeCompare(b.candidateId));
  const countByNode = new Map();
  for (const candidate of candidates) {
    countByNode.set(candidate.sourceA, (countByNode.get(candidate.sourceA) || 0) + 1);
    countByNode.set(candidate.sourceB, (countByNode.get(candidate.sourceB) || 0) + 1);
  }
  const unique = [];
  const ambiguous = [];
  for (const candidate of candidates) {
    const row = {
      ...candidate,
      observationDisposition: countByNode.get(candidate.sourceA) === 1 && countByNode.get(candidate.sourceB) === 1
        ? 'UNIQUE_CANDIDATE_OBSERVATION'
        : 'AMBIGUOUS_CANDIDATE_OBSERVATION',
    };
    if (row.observationDisposition === 'UNIQUE_CANDIDATE_OBSERVATION') unique.push(row);
    else ambiguous.push(row);
  }
  return { candidates: [...unique, ...ambiguous].sort((a, b) => a.candidateId.localeCompare(b.candidateId)), unique, ambiguous };
}

function witnessScore(window, splitRefSet = new Set()) {
  const types = new Set(window.flatMap((segment) => [segment.fromNode.componentType, segment.toNode.componentType]).filter(Boolean));
  const tee = window.some((segment) => segment.fromNode.role === 'tee' || segment.toNode.role === 'tee');
  const restraint = window.some((segment) => segment.fromNode.hasRestraint || segment.toNode.hasRestraint);
  const positiveGeometry = window.filter((segment) => Number(segment.distanceMm) > 0).length;
  const refs = new Set(window.flatMap((segment) => [segment.fromNode.normalizedComponentRefNo, segment.toNode.normalizedComponentRefNo]).filter(Boolean));
  const splitRefOverlap = [...refs].filter((ref) => splitRefSet.has(ref)).length;
  return (splitRefOverlap * 100) + (types.size * 10) + (tee ? 20 : 0) + (restraint ? 10 : 0) + positiveGeometry;
}

function buildCombinedReferenceWitnesses(combinedNodes, count = 10, coverage = {}) {
  const allowedBranchNames = coverage.branchNames instanceof Set ? coverage.branchNames : new Set();
  const splitRefSet = coverage.splitRefSet instanceof Set ? coverage.splitRefSet : new Set();
  const byBranch = new Map();
  for (const node of combinedNodes) {
    if (!node.point) continue;
    if (allowedBranchNames.size && !allowedBranchNames.has(node.branchName)) continue;
    if (!byBranch.has(node.branchId)) byBranch.set(node.branchId, []);
    byBranch.get(node.branchId).push(node);
  }

  let best = null;
  for (const [branchId, branchNodes] of byBranch.entries()) {
    const ordered = [...branchNodes].sort((a, b) => a.nodeIndex - b.nodeIndex);
    if (ordered.length < count + 1) continue;
    for (let start = 0; start <= ordered.length - (count + 1); start += 1) {
      const slice = ordered.slice(start, start + count + 1);
      const segments = [];
      for (let i = 1; i < slice.length; i += 1) {
        const fromNode = slice[i - 1];
        const toNode = slice[i];
        const distanceMm = distancePoints(fromNode.point, toNode.point);
        segments.push({ fromNode, toNode, distanceMm: distanceMm === null ? null : Number(distanceMm.toFixed(6)) });
      }
      const score = witnessScore(segments, splitRefSet);
      const tie = `${branchId}::${String(start).padStart(6, '0')}`;
      if (!best || score > best.score || (score === best.score && tie.localeCompare(best.tie) < 0)) best = { score, tie, branchId, start, segments };
    }
  }

  if (!best) return [];
  return best.segments.map((segment, index) => ({
    witnessId: `W${String(index + 1).padStart(2, '0')}`,
    branchId: best.branchId,
    branchName: segment.fromNode.branchName,
    ordinal: index + 1,
    fromSourceIdentity: segment.fromNode.sourceIdentity,
    toSourceIdentity: segment.toNode.sourceIdentity,
    fromNodeNumber: segment.fromNode.sourceNodeNumber,
    toNodeNumber: segment.toNode.sourceNodeNumber,
    fromComponentType: segment.fromNode.componentType,
    toComponentType: segment.toNode.componentType,
    fromComponentRefNo: segment.fromNode.componentRefNo,
    toComponentRefNo: segment.toNode.componentRefNo,
    fromEndpoint: segment.fromNode.endpoint,
    toEndpoint: segment.toNode.endpoint,
    fromPosition: segment.fromNode.position,
    toPosition: segment.toNode.position,
    outsideDiameterFrom: segment.fromNode.outsideDiameter,
    outsideDiameterTo: segment.toNode.outsideDiameter,
    restraintFrom: segment.fromNode.restraints,
    restraintTo: segment.toNode.restraints,
    distanceMm: segment.distanceMm,
    splitRefEvidence: {
      fromRefPresentInSplit: splitRefSet.has(segment.fromNode.normalizedComponentRefNo),
      toRefPresentInSplit: splitRefSet.has(segment.toNode.normalizedComponentRefNo),
    },
  }));
}

function simpleFingerprint(value) {
  const source = JSON.stringify(value);
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function buildXmlCiiModeBObservation({ splitDocuments = [], combinedReference = null } = {}, options = {}) {
  const positionToleranceMm = Number.isFinite(Number(options.positionToleranceMm)) ? Number(options.positionToleranceMm) : 0.001;
  const parsedSplit = splitDocuments.map((descriptor, index) => parseDocument(descriptor.xmlText || '', {
    ...descriptor,
    documentId: descriptor.documentId || `split-${index + 1}-${normalizedFileId(descriptor.fileName)}`,
    role: 'split-source',
  }, { positionToleranceMm }));
  const parsedCombined = combinedReference
    ? parseDocument(combinedReference.xmlText || '', {
      ...combinedReference,
      documentId: combinedReference.documentId || `combined-${normalizedFileId(combinedReference.fileName)}`,
      role: 'combined-reference',
    }, { positionToleranceMm })
    : null;

  const splitNodes = parsedSplit.flatMap((entry) => entry.nodes);
  const combinedNodes = parsedCombined?.nodes || [];
  const splitBranches = parsedSplit.flatMap((entry) => entry.branches);
  const combinedBranches = parsedCombined?.branches || [];
  const splitBranchNames = [...new Set(splitBranches.map((row) => row.branchName))].sort();
  const combinedBranchNames = [...new Set(combinedBranches.map((row) => row.branchName))].sort();
  const splitBranchSet = new Set(splitBranchNames);
  const combinedBranchSet = new Set(combinedBranchNames);
  const sharedBranchNames = splitBranchNames.filter((name) => combinedBranchSet.has(name));
  const splitOnlyBranchNames = splitBranchNames.filter((name) => !combinedBranchSet.has(name));
  const combinedOnlyBranchNames = combinedBranchNames.filter((name) => !splitBranchSet.has(name));
  const splitRefSet = new Set(splitNodes.map((node) => node.normalizedComponentRefNo).filter(Boolean));
  const boundary = buildBoundaryCandidates(splitNodes, { ...options, positionToleranceMm });
  const witnesses = buildCombinedReferenceWitnesses(combinedNodes, Number(options.witnessSegmentCount || 10), {
    branchNames: new Set(sharedBranchNames),
    splitRefSet,
  });
  const samePositionClusters = buildSamePositionClusters(splitNodes, positionToleranceMm);
  const duplicateSourceNodeNumbers = buildDuplicateSourceNodeNumbers(splitNodes);
  const branchSegments = buildBranchSegments(splitNodes);
  const combinedReferenceSegments = buildBranchSegments(combinedNodes);
  const teeFacts = [...splitNodes, ...combinedNodes].filter((node) => node.role === 'tee').map((node) => ({
    sourceIdentity: node.sourceIdentity,
    sourceDocumentId: node.sourceDocumentId,
    branchName: node.branchName,
    sourceNodeNumber: node.sourceNodeNumber,
    componentRefNo: node.componentRefNo,
    endpoint: node.endpoint,
    position: node.position,
    previousSourceIdentity: node.previousSourceIdentity,
    nextSourceIdentity: node.nextSourceIdentity,
  }));
  const restraintFactsOut = [...splitNodes, ...combinedNodes].filter((node) => node.hasRestraint).map((node) => ({
    sourceIdentity: node.sourceIdentity,
    sourceDocumentId: node.sourceDocumentId,
    branchName: node.branchName,
    sourceNodeNumber: node.sourceNodeNumber,
    nodeName: node.nodeName,
    componentType: node.componentType,
    componentRefNo: node.componentRefNo,
    endpoint: node.endpoint,
    position: node.position,
    restraints: node.restraints,
  }));
  const corpusCoverage = {
    splitBranchNames,
    combinedBranchNames,
    sharedBranchNames,
    splitOnlyBranchNames,
    combinedOnlyBranchNames,
    splitNodeCount: splitNodes.length,
    combinedNodeCount: combinedNodes.length,
  };

  const observation = {
    schema: 'xml-cii-mode-b-observation/v1',
    authority: 'READ_ONLY_OBSERVATION',
    options: {
      positionToleranceMm,
      diameterToleranceMm: Number.isFinite(Number(options.diameterToleranceMm)) ? Number(options.diameterToleranceMm) : 0.1,
      witnessSegmentCount: Number(options.witnessSegmentCount || 10),
    },
    corpusCoverage,
    documents: [...parsedSplit.map((entry) => entry.document), ...(parsedCombined ? [parsedCombined.document] : [])],
    branches: [...splitBranches, ...combinedBranches],
    nodes: [...splitNodes, ...combinedNodes],
    branchSegments,
    combinedReferenceSegments,
    samePositionClusters,
    duplicateSourceNodeNumbers,
    teeFacts,
    restraintFacts: restraintFactsOut,
    boundaryCandidates: boundary.candidates,
    uniqueBoundaryCandidates: boundary.unique,
    ambiguousBoundaryCandidates: boundary.ambiguous,
    combinedReferenceWitnesses: witnesses,
    stats: {
      splitDocumentCount: parsedSplit.length,
      splitBranchCount: splitBranches.length,
      splitNodeCount: splitNodes.length,
      combinedBranchCount: combinedBranches.length,
      combinedNodeCount: combinedNodes.length,
      sharedBranchCount: sharedBranchNames.length,
      splitOnlyBranchCount: splitOnlyBranchNames.length,
      combinedOnlyBranchCount: combinedOnlyBranchNames.length,
      splitBranchSegmentCount: branchSegments.length,
      samePositionClusterCount: samePositionClusters.length,
      duplicateSourceNodeNumberCount: duplicateSourceNodeNumbers.length,
      teeFactCount: teeFacts.length,
      restraintFactCount: restraintFactsOut.length,
      boundaryCandidateCount: boundary.candidates.length,
      uniqueBoundaryCandidateCount: boundary.unique.length,
      ambiguousBoundaryCandidateCount: boundary.ambiguous.length,
      witnessSegmentCount: witnesses.length,
    },
    diagnostics: [
      {
        type: 'mode-b-observation-summary',
        message: `${parsedSplit.length} split document(s), ${splitNodes.length} split node(s), ${boundary.candidates.length} cross-document position candidate(s), ${boundary.ambiguous.length} ambiguous candidate(s), ${witnesses.length} split-covered combined-reference witness segment(s).`,
      },
      {
        type: 'mode-b-corpus-coverage',
        message: `${sharedBranchNames.length} branch name(s) are shared by split and combined corpus; ${combinedOnlyBranchNames.length} combined-only and ${splitOnlyBranchNames.length} split-only branch name(s) are retained as explicit coverage deltas.`,
      },
      {
        type: 'mode-b-authority-boundary',
        message: 'MODEB-01 emits observations only. No boundary candidate is an accepted join and no composite node numbering is produced.',
      },
    ],
  };
  observation.fingerprint = simpleFingerprint({ ...observation, fingerprint: undefined });
  return observation;
}
