import { findBestPipingClassRow, buildPipingClassIndex } from '../../../converters/xml-cii2019-core/piping-class-resolver.js';
import { buildStagedDtxrIndex, resolveXmlCiiNodeDtxr } from '../../../converters/xml-cii2019-core/dtxr-resolver.js';
import { rankXmlCiiWeightCandidates, formatValveHint } from '../../../converters/xml-cii2019-core/weight-valve-hints.js';
import { resolveXmlCiiRatingAuthority } from '../../../converters/xml-cii2019-core/dtxr-rating-resolver.js';
import {
  _deriveRatingFromPipingClass,
  _normaliseLineListMatch,
  _ratingOverride,
  _rowText,
  _toText,
  _uniqueKeys,
  _xmlChildrenByName,
  _xmlCiiFindLineListRow,
  _xmlText,
} from './xml-cii-adapted-preview-dryrun-core.js';

function classRowRating(row) {
  return _rowText(row, ['rating', 'Rating', 'RATING', 'Pressure Class', 'classRating', 'Class Rating', 'PRESSURE_CLASS']);
}

function branchDtxrEvidence(branch, stagedIndex, config) {
  const out = [];
  for (const node of _xmlChildrenByName(branch, 'Node')) {
    const componentType = _xmlText(node, 'ComponentType');
    const componentRefNo = _xmlText(node, 'ComponentRefNo');
    for (const key of ['DTXR', 'DTXR_POS', 'TEEDESC_POS', 'DTXR_PS']) {
      const dtxr = _xmlText(node, key);
      if (dtxr) out.push({ dtxr, source: `xml-${key.toLowerCase()}`, componentType, componentRefNo });
    }
    const resolved = resolveXmlCiiNodeDtxr(node, stagedIndex, config);
    if (resolved?.value) {
      out.push({
        dtxr: resolved.value,
        source: resolved.source || 'staged-dtxr',
        componentType,
        componentRefNo,
      });
    }
  }
  const seen = new Set();
  return out.filter((item) => {
    const key = `${item.dtxr}\u0000${item.source}\u0000${item.componentType}\u0000${item.componentRefNo}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function resolvePreviewPipingClassRating(row, pipingClassIndex, config) {
  const pipingClass = _toText(row?.pipingClass || row?.pipingClassDerived).trim();
  const boreMm = Number(row?.sizeMm);
  if (!pipingClass || !Number.isFinite(boreMm) || boreMm <= 0) return '';
  const match = findBestPipingClassRow({
    pipingClass,
    boreMm,
    componentType: 'PIPE',
    rating: '',
    schedule: '',
    pipingClassIndex,
    overrides: config?.overrides || {},
    config,
  });
  return classRowRating(match?.row);
}

function rerankNodeRows(nodeRows, branchRows, config) {
  const byBranch = new Map(branchRows.map((row) => [row.branchName, row]));
  return (nodeRows || []).map((nodeRow) => {
    const branch = byBranch.get(nodeRow.branchName);
    const rating = _toText(branch?.rating || nodeRow.rating).trim();
    if (!rating || !Number.isFinite(Number(nodeRow.boreMm)) || !Number.isFinite(Number(nodeRow.lengthMm))) {
      return { ...nodeRow, rating };
    }
    const ranking = rankXmlCiiWeightCandidates({
      boreMm: nodeRow.boreMm,
      rating,
      lengthMm: nodeRow.lengthMm,
      nodeName: nodeRow.nodeName || '',
      componentType: nodeRow.componentType || nodeRow.type || '',
      componentRefNo: nodeRow.componentRefNo || '',
      dtxr: nodeRow.dtxr || '',
    }, config, { includeRejected: true });
    const candidates = ranking.candidates.slice(0, 5);
    const selectedOverride = nodeRow.weightMatch?.selectedOverride === true;
    const selectedWeight = Number(nodeRow.weightMatch?.selectedWeight ?? nodeRow.weightMatch?.weight);
    const weightMatch = selectedOverride && Number.isFinite(selectedWeight) && selectedWeight > 0
      ? { ...(candidates[0] || nodeRow.weightMatch || {}), selectedWeight, suggestedWeight: selectedWeight, weight: selectedWeight, selectedOverride: true }
      : (ranking.best || null);
    return {
      ...nodeRow,
      rating,
      valveHint: formatValveHint(ranking.nodeHint),
      weightMatch,
      weightCandidates: candidates,
      rejectedWeightCandidates: ranking.rejectedCandidates.slice(0, 3),
    };
  });
}

export function applyPreviewRatingAuthority({ xmlText, config = {}, stagedJsonText = '', result } = {}) {
  const branchRows = Array.isArray(result?.branchRows) ? result.branchRows : [];
  if (!branchRows.length || typeof DOMParser === 'undefined') return result || { branchRows: [], nodeRows: [] };

  let document;
  try {
    document = new DOMParser().parseFromString(_toText(xmlText), 'application/xml');
    if (document.getElementsByTagName('parsererror').length) return result;
  } catch {
    return result;
  }

  const branches = [...document.getElementsByTagName('Branch')];
  const stagedIndex = buildStagedDtxrIndex(stagedJsonText || '', config);
  const pipingClassIndex = buildPipingClassIndex(config?.pipingClass?.masterRows || []);

  const ratedRows = branchRows.map((row, index) => {
    const branch = branches[index] || branches.find((item) => _xmlText(item, 'Branchname') === row.branchName);
    const lineListRaw = row.lineKey ? _xmlCiiFindLineListRow(row.lineKey, config) : null;
    const lineListRow = _normaliseLineListMatch(lineListRaw, config);
    const lineListRating = _rowText(lineListRow, ['rating', 'Rating', 'RATING', 'Pressure Class']);
    const ratingKeys = _uniqueKeys([row.lineKey, row.branchName, row.pipingClassDerived, row.pipingClass]);
    const manualRating = _ratingOverride(config, ratingKeys);
    const pipingClassRating = resolvePreviewPipingClassRating(row, pipingClassIndex, config);
    const prefixRating = _deriveRatingFromPipingClass(row.pipingClass || row.pipingClassDerived, config);
    const dtxrValues = branch ? branchDtxrEvidence(branch, stagedIndex, config) : [];
    const authority = resolveXmlCiiRatingAuthority({
      manualRating,
      lineListRating,
      pipingClassRating,
      prefixRating,
      dtxrValues,
    });

    return {
      ...row,
      rating: authority.rating || '',
      ratingDerived: pipingClassRating || prefixRating || authority.dtxrRating || '',
      ratingSource: authority.source,
      ratingResolvedSource: authority.resolvedSource,
      ratingDtxr: authority.dtxrRating,
      ratingDtxrRatings: authority.dtxrRatings,
      ratingDtxrEvidence: authority.dtxrEvidence,
      ratingConflict: authority.conflict,
      ratingNeedsReview: authority.needsReview,
    };
  });

  return {
    ...(result || {}),
    branchRows: ratedRows,
    nodeRows: rerankNodeRows(result?.nodeRows || [], ratedRows, config),
  };
}
