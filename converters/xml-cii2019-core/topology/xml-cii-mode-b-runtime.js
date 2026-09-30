import { buildXmlCiiModeBObservation } from './xml-cii-mode-b-observation.js';
import { buildXmlCiiModeBComposite } from './xml-cii-mode-b-composite.js';
import { buildXmlCiiModeBNumbering } from './xml-cii-mode-b-numbering.js';
import { buildXmlCiiModeBSourceJunctionAliases } from './xml-cii-mode-b-runtime-junctions.js';
function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}
function normalizeRef(value) {
  return text(value).replace(/^=/, '').replace(/\s+/g, '').toUpperCase();
}
function tagValue(block, name) {
  const match = text(block).match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return text(match?.[1]?.replace(/<[^>]+>/g, ''));
}
function replaceTagValue(block, name, value) {
  const re = new RegExp(`<${name}([^>]*)>[\\s\\S]*?<\\/${name}>`, 'i');
  if (!re.test(block)) throw new Error(`Mode B materializer cannot rewrite missing <${name}> tag.`);
  return block.replace(re, `<${name}$1>${value}</${name}>`);
}
function branchBlocks(xmlText) {
  return text(xmlText).match(/<Branch\b[\s\S]*?<\/Branch>/gi) || [];
}
function safeFileName(value) {
  return (text(value) || 'source.xml').replace(/[\\/:*?"<>|]+/g, '_');
}
function simpleFingerprint(value) {
  const source = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
function canonicalizeSplitDocuments(splitDocuments = []) {
  const rows = (Array.isArray(splitDocuments) ? splitDocuments : []).map((entry, originalIndex) => {
    const fileName = safeFileName(entry?.fileName || entry?.name || `source-${originalIndex + 1}.xml`);
    const xmlText = String(entry?.xmlText ?? '');
    if (!xmlText.trim()) throw new Error(`Mode B source ${fileName} is empty.`);
    if (!/<PipeStressExport\b/i.test(xmlText) || !/<Branch\b/i.test(xmlText)) {
      throw new Error(`Mode B source ${fileName} is not a PSI116 PipeStressExport with Branch content.`);
    }
    return { fileName, xmlText, originalIndex, contentFingerprint: simpleFingerprint(xmlText) };
  });
  if (rows.length < 2) throw new Error('Mode B runtime requires at least two PSI116 XML source documents.');
  rows.sort((a, b) => a.fileName.localeCompare(b.fileName)
    || a.contentFingerprint.localeCompare(b.contentFingerprint)
    || a.originalIndex - b.originalIndex);
  return rows.map((row, index) => ({ ...row, canonicalIndex: index, documentId: `split-${index + 1}-${row.fileName}` }));
}
function sourceIdentity({ documentId, branchName, branchOccurrence, nodeIndex, sourceNodeNumber, componentRefNo, endpoint }) {
  return [documentId, branchName, branchOccurrence, nodeIndex, text(sourceNodeNumber) || '_', normalizeRef(componentRefNo) || '_', text(endpoint) || '_'].join('::');
}
function buildAliasPlan(composite, numbering) {
  const vertexById = new Map((composite.vertices || []).map((row) => [row.sourceIdentity, row]));
  const numberById = new Map((numbering.rows || []).map((row) => [row.sourceIdentity, row]));
  const aliases = [];
  const targetNumbers = new Map();
  for (const edge of numbering.orientedAcceptedCrossDocumentEdges || []) {
    if (edge.orientation !== 'TAIL_TO_HEAD') {
      throw new Error(`Mode B runtime requires accepted edge ${edge.candidateId || edge.edgeId || ''} to orient uniquely TAIL_TO_HEAD.`);
    }
    const upstream = vertexById.get(edge.from);
    const downstream = vertexById.get(edge.to);
    const upstreamNumber = numberById.get(edge.from);
    const downstreamNumber = numberById.get(edge.to);
    if (!upstream || !downstream || !upstreamNumber || !downstreamNumber) {
      throw new Error(`Mode B runtime accepted edge ${edge.candidateId || ''} lost vertex/numbering custody.`);
    }
    if (!(Number(upstreamNumber.outputNodeNumber) > 0) || upstreamNumber.numberClass !== 'POSITIVE_ENGINEERING') {
      throw new Error(`Mode B runtime upstream junction ${edge.from} has no pinned positive output NodeNumber.`);
    }
    const downstreamSourceNumber = Number(downstream.sourceNodeNumber);
    if (!(Number.isFinite(downstreamSourceNumber) && downstreamSourceNumber <= 0)) {
      throw new Error(`Mode B runtime downstream junction ${edge.to} is not a non-positive source helper.`);
    }
    if (Number(downstream.nodeIndex) !== 0) throw new Error(`Mode B runtime downstream junction ${edge.to} is not the branch-head node.`);
    if (downstream.hasRestraint === true || (Array.isArray(downstream.restraints) && downstream.restraints.length)) {
      throw new Error(`Mode B runtime refuses to promote restraint-bearing helper ${edge.to} into a writer-visible junction.`);
    }
    if (!['BRAN', ''].includes(text(downstream.componentType).toUpperCase())
        && text(downstream.connectionType).toUpperCase() !== 'BRAN') {
      throw new Error(`Mode B runtime downstream helper ${edge.to} is not a BRAN boundary helper.`);
    }
    const renderedNodeNumber = Number(upstreamNumber.outputNodeNumber);
    const prior = targetNumbers.get(edge.to);
    if (prior != null && prior !== renderedNodeNumber) {
      throw new Error(`Mode B runtime helper ${edge.to} received incompatible junction aliases ${prior} and ${renderedNodeNumber}.`);
    }
    targetNumbers.set(edge.to, renderedNodeNumber);
    aliases.push({
      schema: 'xml-cii-mode-b-junction-alias/v1', authority: 'ACCEPTED_TOPOLOGY_RUNTIME_ALIAS',
      candidateId: text(edge.candidateId), upstreamSourceIdentity: edge.from, downstreamSourceIdentity: edge.to,
      sourceSentinelNodeNumber: text(downstream.sourceNodeNumber), renderedNodeNumber,
      upstreamPinnedOutputNodeNumber: renderedNodeNumber, orientation: edge.orientation,
      downstreamBranchId: text(downstream.branchId), downstreamBranchName: text(downstream.branchName),
      componentRefNo: text(downstream.componentRefNo),
      reason: 'Native XML→CII writer drops non-positive nodes and connects Branch routes through shared positive NodeNumbers.',
    });
  }
  return aliases.sort((a, b) => a.downstreamSourceIdentity.localeCompare(b.downstreamSourceIdentity));
}
function transformDocument(document, numbering, aliases, sourceJunctionAliases) {
  const numberingById = new Map((numbering.rows || []).map((row) => [row.sourceIdentity, row]));
  const aliasById = new Map((aliases || []).map((row) => [row.downstreamSourceIdentity, row]));
  const sourceAliasById = new Map((sourceJunctionAliases || []).map((row) => [row.sourceIdentity, row]));
  const branchOccurrenceByName = new Map();
  const seen = [];
  const transformedBranches = [];
  const stats = { positiveRewriteCount: 0, sentinelPreservedCount: 0, aliasRewriteCount: 0, sourceJunctionAliasRewriteCount: 0 };
  for (const originalBranch of branchBlocks(document.xmlText)) {
    const branchName = tagValue(originalBranch, 'Branchname');
    const branchOccurrence = (branchOccurrenceByName.get(branchName) || 0) + 1;
    branchOccurrenceByName.set(branchName, branchOccurrence);
    let nodeIndex = 0;
    const transformed = originalBranch.replace(/<Node\b[\s\S]*?<\/Node>/gi, (nodeBlock) => {
      const sourceNodeNumber = tagValue(nodeBlock, 'NodeNumber');
      const componentRefNo = tagValue(nodeBlock, 'ComponentRefNo');
      const endpoint = tagValue(nodeBlock, 'Endpoint');
      const identity = sourceIdentity({ documentId: document.documentId, branchName, branchOccurrence, nodeIndex, sourceNodeNumber, componentRefNo, endpoint });
      nodeIndex += 1;
      const row = numberingById.get(identity);
      if (!row) throw new Error(`Mode B materializer lost numbering row for ${identity}.`);
      const alias = aliasById.get(identity);
      const sourceAlias = sourceAliasById.get(identity);
      let renderedNodeNumber;
      let renderedAuthority;
      if (alias) {
        if (/<Restraint\b/i.test(nodeBlock)) throw new Error(`Mode B materializer refuses junction alias on restraint-bearing node ${identity}.`);
        renderedNodeNumber = alias.renderedNodeNumber;
        renderedAuthority = 'JUNCTION_ALIAS';
        stats.aliasRewriteCount += 1;
      } else if (sourceAlias) {
        renderedNodeNumber = sourceAlias.renderedNodeNumber;
        renderedAuthority = 'SOURCE_JUNCTION_ALIAS';
        stats.sourceJunctionAliasRewriteCount += 1;
      } else if (row.numberClass === 'POSITIVE_ENGINEERING') {
        renderedNodeNumber = row.outputNodeNumber;
        renderedAuthority = 'MODEB_GRAPH_TRAVERSAL';
        stats.positiveRewriteCount += 1;
      } else {
        renderedNodeNumber = sourceNodeNumber;
        renderedAuthority = 'SOURCE_SENTINEL_PRESERVED';
        stats.sentinelPreservedCount += 1;
      }
      seen.push({ sourceIdentity: identity, sourceNodeNumber, outputNodeNumber: row.outputNodeNumber, renderedNodeNumber,
        renderedAuthority, branchName, branchOccurrence, nodeIndex: nodeIndex - 1, componentRefNo, endpoint });
      return replaceTagValue(nodeBlock, 'NodeNumber', renderedNodeNumber);
    });
    transformedBranches.push(transformed);
  }
  return { transformedBranches, seen, stats };
}
function buildCompositeDocument(canonicalDocuments, transformedBranches, sourceName) {
  const template = canonicalDocuments[0]?.xmlText || '';
  const pipeMatch = template.match(/<Pipe\b[\s\S]*?<\/Pipe>/i);
  if (!pipeMatch) throw new Error('Mode B materializer could not locate the template <Pipe> element.');
  const pipe = pipeMatch[0];
  const pipeWithoutBranches = pipe.replace(/<Branch\b[\s\S]*?<\/Branch>\s*/gi, '');
  const allBranches = transformedBranches.join('\n');
  let compositePipe = pipeWithoutBranches.replace(/<\/Pipe>\s*$/i, `${allBranches}\n</Pipe>`);
  if (/<FullName[^>]*>[\s\S]*?<\/FullName>/i.test(compositePipe)) {
    compositePipe = replaceTagValue(compositePipe, 'FullName', `/MODEB-${safeFileName(sourceName).replace(/\.xml$/i, '')}`);
  }
  return template.replace(pipe, compositePipe);
}
export function prepareXmlCiiModeBRuntimeSource({ splitDocuments = [], sourceName = 'mode-b-composite.xml' } = {}, options = {}) {
  const documents = canonicalizeSplitDocuments(splitDocuments);
  const observation = buildXmlCiiModeBObservation({ splitDocuments: documents, combinedReference: null }, {
    positionToleranceMm: options.positionToleranceMm ?? 0.001,
    diameterToleranceMm: options.diameterToleranceMm ?? 0.1,
    witnessSegmentCount: 0,
  });
  const composite = buildXmlCiiModeBComposite(observation, options.composite || {});
  if ((composite.ambiguousCandidates || []).length) {
    throw new Error(`Mode B runtime has ${composite.ambiguousCandidates.length} ambiguous cross-document candidate(s); resolve topology before conversion.`);
  }
  const numbering = buildXmlCiiModeBNumbering(composite, options.numbering || {});
  const sourceJunctions = buildXmlCiiModeBSourceJunctionAliases(observation, numbering, options.sourceJunctions || {});
  if (sourceJunctions.incompatibleGroups.length) {
    throw new Error(`Mode B runtime found ${sourceJunctions.incompatibleGroups.length} incompatible same-document shared NodeNumber group(s); source junction authority is ambiguous.`);
  }
  const aliases = buildAliasPlan(composite, numbering);
  const transformedBranches = [];
  const custodyRows = [];
  const materializationStats = { positiveRewriteCount: 0, sentinelPreservedCount: 0, aliasRewriteCount: 0, sourceJunctionAliasRewriteCount: 0 };
  for (const document of documents) {
    const transformed = transformDocument(document, numbering, aliases, sourceJunctions.aliases);
    transformedBranches.push(...transformed.transformedBranches);
    custodyRows.push(...transformed.seen);
    for (const key of Object.keys(materializationStats)) materializationStats[key] += transformed.stats[key] || 0;
  }
  if (custodyRows.length !== numbering.rows.length || new Set(custodyRows.map((row) => row.sourceIdentity)).size !== numbering.rows.length) {
    throw new Error(`Mode B materializer source custody mismatch: materialized ${custodyRows.length}, numbering owns ${numbering.rows.length}.`);
  }
  for (const alias of aliases) {
    const rows = custodyRows.filter((row) => row.sourceIdentity === alias.downstreamSourceIdentity && row.renderedAuthority === 'JUNCTION_ALIAS');
    if (rows.length !== 1) throw new Error(`Mode B junction alias ${alias.downstreamSourceIdentity} was not rendered exactly once.`);
  }
  for (const sourceAlias of sourceJunctions.aliases) {
    const row = custodyRows.find((entry) => entry.sourceIdentity === sourceAlias.sourceIdentity);
    if (!row || row.renderedAuthority !== 'SOURCE_JUNCTION_ALIAS' || Number(row.renderedNodeNumber) !== sourceAlias.renderedNodeNumber) {
      throw new Error(`Mode B source junction alias ${sourceAlias.sourceIdentity} was not rendered with governed authority.`);
    }
  }
  const normalizedSourceName = safeFileName(sourceName || 'mode-b-composite.xml');
  const sourceText = buildCompositeDocument(documents, transformedBranches, normalizedSourceName);
  const evidence = {
    schema: 'xml-cii-mode-b-runtime-evidence/v1', sourceDocumentCount: documents.length,
    sourceDocumentIds: documents.map((row) => row.documentId), observationFingerprint: observation.fingerprint,
    compositeFingerprint: composite.fingerprint, numberingFingerprint: numbering.fingerprint,
    acceptedCrossDocumentEdgeCount: composite.acceptedCrossDocumentEdges.length,
    insufficientEvidenceCandidateCount: composite.insufficientEvidenceCandidates.length,
    ambiguousCandidateCount: composite.ambiguousCandidates.length, junctionAliasCount: aliases.length,
    sourceJunctionAliasGroupCount: sourceJunctions.groups.length, sourceJunctionAliasCount: sourceJunctions.aliases.length,
    materializedNodeCount: custodyRows.length, materializationStats, sourceDigest: simpleFingerprint(sourceText),
    aliases, sourceJunctionAliases: sourceJunctions.aliases,
  };
  evidence.fingerprint = simpleFingerprint({ ...evidence, fingerprint: undefined });
  return { schema: 'xml-cii-mode-b-runtime-source/v1', sourceKind: 'xml', sourceName: normalizedSourceName, sourceText,
    documents, observation, composite, numbering, aliases, sourceJunctions, custodyRows, evidence };
}
export function buildXmlCiiModeBRuntimeWorkflowJob(modeBInput = {}, baseJob = {}, options = {}) {
  const prepared = prepareXmlCiiModeBRuntimeSource(modeBInput, options);
  return { prepared, job: { ...baseJob, sourceKind: 'xml', sourceText: prepared.sourceText, sourceName: prepared.sourceName } };
}
