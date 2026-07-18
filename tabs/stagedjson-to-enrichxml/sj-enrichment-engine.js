/**
 * Functionality: pipeline orchestrator. Parses StagedJSON, runs all
 * resolvers, generates canonical and sequential XML, then atomically selects
 * the production XML, trace records, and audit through a fail-closed policy.
 */

import { parseStagedJson, groupByBranch } from './sj-parser.js?v=4';
import { resolveRating } from './sj-rating-resolver.js';
import { resolveWall } from './sj-wall-resolver.js';
import { resolveCorrosion } from './sj-corrosion-resolver.js';
import { resolveRestraint } from './sj-restraint-resolver.js';
import { resolveRigidWeight } from './sj-weight-resolver.js';
import { buildEnrichedXml } from './sj-xml-writer.js?v=4';
import { buildAudit } from './sj-audit.js';
import { attaConnectionType, isRigidType, isSupportType } from './sj-type-mapper.js';
import { DN_TO_OD_MM } from './sj-weight-db.js';
import { bestPosition, formatPosition } from './sj-point-resolver.js';
import { applyAuthoritativeEnrichment } from './sj-enrichment-authority.js';
import { buildPsiSequencePlan } from './sj-psi-sequence-planner.js?v=1';
import { buildSequentialWriterShadow, selectPsiWriterOutput } from './sj-sequential-writer-shadow.js?v=2';

export function runEnrichment(input) {
  const { stagedJsonText, config = {} } = input;
  const parsed = typeof stagedJsonText === 'string' ? JSON.parse(stagedJsonText) : stagedJsonText;
  const records = parseStagedJson(parsed, config);
  const enriched = records.map((record) => enrichRecord(record, {
    config,
    ratingSeq: config.ratingSequence,
    vertAxis: config.verticalAxis || 'Y',
  }));

  let grouped = groupSupportsHierarchy(enriched);
  grouped = groupSupportsByPos(grouped);

  const sequencePlan = buildPsiSequencePlan(parsed, grouped);
  const canonicalXmlText = buildEnrichedXml(groupByBranch(grouped), config);
  const writerShadow = buildSequentialWriterShadow({ sequencePlan, canonicalXmlText, config });
  const writerSelection = selectPsiWriterOutput({
    canonicalXmlText,
    canonicalRecords: grouped,
    writerShadow,
    config,
  });
  const selectedRecords = writerSelection.records;
  const audit = buildAudit(selectedRecords, groupByBranch(selectedRecords));

  return {
    xmlText: writerSelection.xmlText,
    audit,
    records: selectedRecords,
    canonicalXmlText,
    canonicalRecords: grouped,
    sequencePlan,
    writerShadow,
    writerSelection,
  };
}

function groupSupportsHierarchy(records) {
  const byName = new Map(records.map((record) => [record.attrs?.NAME || record.name, record]));
  const toRemove = new Set();
  const getRoot = (record) => {
    let current = record;
    const visited = new Set();
    while (current && !visited.has(current)) {
      visited.add(current);
      const parentRef = [current.attrs?.MDSSREF, current.attrs?.MDSGUIDEREF, current.attrs?.['PREV-NAME']]
        .find((reference) => reference && byName.has(reference));
      if (parentRef && parentRef !== (current.attrs?.NAME || current.name)) current = byName.get(parentRef);
      else break;
    }
    return current;
  };

  records.forEach((record) => {
    if (record.componentType !== 'ATTA' && record.componentType !== 'SUPPORT') return;
    const root = getRoot(record);
    if (!root || root === record) return;
    appendRestraints(root, record);
    if (record.dtxr) root.dtxr = (root.dtxr ? `${root.dtxr} + ` : '') + record.dtxr;
    toRemove.add(record);
  });

  deduplicateRootRestraints(records, toRemove);
  return records.filter((record) => !toRemove.has(record));
}

function groupSupportsByPos(records) {
  const byPos = new Map();
  const toRemove = new Set();
  records.forEach((record) => {
    if (record.componentType !== 'ATTA' && record.componentType !== 'SUPPORT') return;
    const point = bestPosition(record.attrs);
    if (!point) return;
    const posKey = formatPosition(point);
    if (!byPos.has(posKey)) {
      byPos.set(posKey, record);
      return;
    }

    const root = byPos.get(posKey);
    appendRestraints(root, record);
    if (record.dtxr && (!root.dtxr || !root.dtxr.includes(record.dtxr))) {
      root.dtxr = (root.dtxr ? `${root.dtxr} + ` : '') + record.dtxr;
    }
    if (record.componentType === 'SUPPORT' && root.componentType === 'ATTA') {
      root.componentType = 'SUPPORT';
      root.isSupport = true;
    }
    if (record.name && !record.name.includes('/SREF') && root.name?.includes('/SREF')) root.name = record.name;
    toRemove.add(record);
  });

  deduplicateRootRestraints(records, toRemove);
  return records.filter((record) => !toRemove.has(record));
}

function appendRestraints(root, record) {
  if (!record.resolved?.restraint) return;
  if (!root.resolved) root.resolved = {};
  if (!root.resolved.restraint) root.resolved.restraint = [];
  else if (!Array.isArray(root.resolved.restraint)) root.resolved.restraint = [root.resolved.restraint];
  if (Array.isArray(record.resolved.restraint)) root.resolved.restraint.push(...record.resolved.restraint);
  else root.resolved.restraint.push(record.resolved.restraint);
}

function deduplicateRootRestraints(records, toRemove) {
  records.forEach((record) => {
    if (toRemove.has(record) || !record.resolved?.restraint) return;
    if (!Array.isArray(record.resolved.restraint)) record.resolved.restraint = [record.resolved.restraint];
    const seen = new Set();
    record.resolved.restraint = record.resolved.restraint.filter((restraint) => {
      const key = typeof restraint === 'object' && restraint !== null ? (restraint.type || restraint.kind) : restraint;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
}

function enrichRecord(record, context) {
  const { config, ratingSeq, vertAxis } = context;
  const attrs = record.attrs;
  const boreMm = record.boreMm || 100;
  const dtxrValues = [record.dtxr, attrs?.DTXR, attrs?.RAW_TYPE].filter(Boolean);
  let ratingResult = resolveRating(attrs, ratingSeq, config);
  let wallResult = resolveWall({ boreMm, dtxrValues, spre: record.spre }, config);
  let corrResult = resolveCorrosion(record.spre || '', boreMm, config);
  const odMm = lookupOd(boreMm);
  let restraintResult = isSupportType(record.componentType) ? resolveRestraint(attrs, vertAxis) : null;
  const connectionType = isSupportType(record.componentType) ? attaConnectionType(record.supportKind) : null;
  let weightResult = isRigidType(record.componentType) ? resolveRigidWeight({
    componentType: record.componentType,
    boreMm,
    rating: ratingResult.rating,
    dtxr: record.dtxr,
  }) : null;

  const nodeOverrides = config.nodeOverrides?.[record.name] || {};
  const branchOverrides = config.branchOverrides?.[record.branchName]
    || config.branchOverrides?.[record.sourceBranchName]
    || {};
  if (nodeOverrides.rating || branchOverrides.rating) {
    ratingResult = { rating: Number(nodeOverrides.rating || branchOverrides.rating), source: 'manual-override', confidence: 'HIGH' };
  }
  if (nodeOverrides.wall || branchOverrides.wall) {
    wallResult = { wallMm: nodeOverrides.wall || branchOverrides.wall, source: 'manual-override', confidence: 'HIGH' };
  }
  if (nodeOverrides.corr || branchOverrides.corr) {
    corrResult = { corrMm: Number(nodeOverrides.corr || branchOverrides.corr), source: 'manual-override', confidence: 'HIGH' };
  }
  if (nodeOverrides.weight || branchOverrides.weight) {
    weightResult = { weightKg: Number(nodeOverrides.weight || branchOverrides.weight), source: 'manual-override', confidence: 'HIGH' };
  }
  if (nodeOverrides.restraint || branchOverrides.restraint) restraintResult = nodeOverrides.restraint || branchOverrides.restraint;

  const resolved = {
    rating: ratingResult.rating,
    ratingSource: ratingResult.source,
    ratingConfidence: ratingResult.confidence,
    wallMm: wallResult?.wallMm ?? null,
    wallSource: wallResult?.source ?? 'unresolved',
    wallConfidence: wallResult?.confidence ?? 'NONE',
    corrMm: corrResult.corrMm,
    corrSource: corrResult.source,
    corrConfidence: corrResult.confidence,
    odMm,
    restraint: restraintResult,
    restraintSource: restraintResult ? 'resolved' : 'unresolved',
    restraintConfidence: restraintResult ? 'HIGH' : 'NONE',
    connectionType,
    weightKg: weightResult?.weightKg ?? null,
    weightSource: weightResult?.source ?? null,
    weightConfidence: weightResult?.confidence ?? 'NONE',
  };
  return { ...record, resolved: applyAuthoritativeEnrichment(record, resolved) };
}

function lookupOd(boreMm) {
  const bore = Math.round(Number(boreMm));
  if (DN_TO_OD_MM[bore]) return DN_TO_OD_MM[bore];
  const keys = Object.keys(DN_TO_OD_MM).map(Number).sort((a, b) => a - b);
  const nearest = keys.reduce((best, key) => Math.abs(key - bore) < Math.abs(best - bore) ? key : best);
  return DN_TO_OD_MM[nearest] ?? null;
}
