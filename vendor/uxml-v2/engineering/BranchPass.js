// Ported from 3D_Converters v045/tabs/model-converters/converters/xmltocii2019_helper/enrichment-core.js lines 542-684
// (UXML step 4): today's branch pass, on PlainElements, in place. Per Branch: line key and line-list process data,
// duplicate-ATTA removal (prefer_datum), class, rating, material, bore, element length and rigid-weight overrides.
import { childText, childrenByName, elementsByName, firstChild, setChildText } from '../supports/PlainDom.js';
import { toText } from '../supports/config/EnrichmentConfig.js';
import { xmlPositionKey } from '../supports/parent/ParentMatching.js';
import {
  buildPipingClassIndex, deriveLineKeyFromBranchName, qualifiedXmlCiiNominalBoreFromOd, resolveBranchProcessData,
  xmlCiiForwardElementLengths, xmlCiiNumberText, xmlCiiRigidWeightOverrideForNode,
} from './index.js';
import {
  deriveBoreFromBranchName, derivePipingClassFromBranchName, deriveRatingFromPipingClass, elementTextMap,
  rowNumber, rowText, xmlCiiApplyLineListProcessData, xmlCiiFindLineListRow,
} from './BranchPassHelpers.js';

/** Remove duplicate ATTA nodes at one position (policy prefer_datum): keep DATUM, else restrained, else first. */
function removeDuplicateSupports(branch, config, tolerance, stats, diagnostics) {
  const groups = new Map();
  for (const node of childrenByName(branch, 'Node')) {
    if (childText(node, 'ComponentType').toUpperCase() !== 'ATTA') continue;
    const key = xmlPositionKey(childText(node, 'Position'), tolerance);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(node);
  }
  for (const group of groups.values()) {
    if (group.length <= 1 || toText(config.duplicateSupportPolicy).toLowerCase() !== 'prefer_datum') continue;
    const datumNode = group.find((node) => childText(node, 'NodeName').toUpperCase().includes('DATUM'));
    const restrainedNode = group.find((node) => !!firstChild(node, 'Restraint'));
    const keepNode = datumNode || restrainedNode || group[0];
    for (const node of group) {
      const at = branch.kids.indexOf(node);
      if (node === keepNode || at < 0) continue;
      branch.kids.splice(at, 1);
      stats.removedDuplicateSupports += 1;
      diagnostics.push({ type: 'duplicate-support-removed', keptNode: childText(keepNode, 'NodeNumber'), removedNode: childText(node, 'NodeNumber'),
        position: childText(node, 'Position'), reason: datumNode ? 'DATUM' : restrainedNode ? 'restrained-node' : 'first-node' });
    }
  }
}

function materialMethod(source) {
  if (source === 'override') return 'override';
  return source === 'line-list-material-map' || source === 'piping-class-material-map' ? 'exact' : source;
}

function annotateNode(ctx, node, nodeIdx, lengthMm) {
  const { branch, branchName, pipingClass, branchRating, branchBore, resolved, pcMaster, config, stats, diagnostics } = ctx;
  if (pipingClass) setChildText(node, 'PipingClass', pipingClass);
  if (branchRating) { setChildText(node, 'Rating', branchRating); stats.ratingAnnotations += 1; }
  // Nominal DN is NODE-scoped across reducers; the branch name is only a fallback for nodes with no OD.
  const nodeOd = xmlCiiNumberText(childText(node, 'OutsideDiameter'));
  const nodeBore = nodeOd !== null && nodeOd > 0 ? qualifiedXmlCiiNominalBoreFromOd(nodeOd) : branchBore;
  if (nodeBore !== null) {
    const oldBore = childText(node, 'BoreMm');
    setChildText(node, 'BoreMm', nodeBore.toFixed(3));
    if (oldBore && Number(oldBore) !== nodeBore) diagnostics.push({ type: 'node-bore-rederived-from-outside-diameter', branchName,
      nodeNumber: childText(node, 'NodeNumber'), outsideDiameterMm: nodeOd, previousBoreMm: oldBore, revisedBoreMm: nodeBore,
      authority: nodeOd !== null && nodeOd > 0 ? 'node-outside-diameter' : 'branch-fallback-no-od' });
  } else if (nodeOd !== null && nodeOd > 0) {
    diagnostics.push({ type: 'node-bore-unqualified-od', branchName, nodeNumber: childText(node, 'NodeNumber'), outsideDiameterMm: nodeOd,
      reason: 'Unknown OD-to-DN mapping; branch regex must not overwrite BoreMm' });
  }
  if (lengthMm !== null) setChildText(node, 'ElementLengthMm', lengthMm.toFixed(3));
  if (resolved.wallThicknessMm) setChildText(node, 'WallThickness', Number(resolved.wallThicknessMm.toPrecision(6)).toString());
  if (resolved.corrosionAllowanceMm != null) setChildText(node, 'CorrosionAllowance', String(resolved.corrosionAllowanceMm));
  if (resolved.material) setChildText(node, 'MaterialName', resolved.material);
  if (resolved.materialCode) {
    setChildText(node, 'MaterialCode', resolved.materialCode);
    setChildText(branch, 'MaterialNumber', resolved.materialCode); // branch-level MaterialNumber (CII native field)
  }
  if (pcMaster) stats.classMasterAnnotations = (stats.classMasterAnnotations || 0) + 1;
  const manualRigidWeight = xmlCiiRigidWeightOverrideForNode(branchName, node, config, nodeIdx);
  if (manualRigidWeight !== null) {
    setChildText(node, 'Weight', String(manualRigidWeight));
    stats.weightAnnotations += 1;
    diagnostics.push({ type: 'rigid-weight-manual-override', nodeNumber: childText(node, 'NodeNumber'), branchName, boreMm: branchBore,
      rating: branchRating, lengthMm, weight: manualRigidWeight });
  }
}

function lineListStep(branch, branchName, config, stats, diagnostics) {
  const lineKey = deriveLineKeyFromBranchName(branchName, config);
  const lineListMatch = lineKey ? xmlCiiFindLineListRow(lineKey, config) : null;
  if (lineKey) {
    setChildText(branch, 'PipelineReference', lineKey);
    setChildText(branch, 'LineNo', lineKey);
    stats.branchLineKeys += 1;
  }
  if (lineListMatch) {
    stats.lineListMatches += 1;
    stats.processAnnotations += xmlCiiApplyLineListProcessData(branch, lineListMatch, config, lineKey);
    const m = lineListMatch;
    diagnostics.push({ type: 'linelist-match', branchName, lineKey, lineSeqNo: m.lineSeqNo || '', p1: m.p1 || '', t1: m.t1 || '', t2: m.t2 || '', t3: m.t3 || '', density: m.density || '' });
  } else if (lineKey) {
    const pd = config?.overrides?.processData?.[lineKey];
    if (pd) {
      xmlCiiApplyLineListProcessData(branch, pd, config, lineKey);
      diagnostics.push({ type: 'process-override', branchName, lineKey, p1: pd.p1 || '', t1: pd.t1 || '', t2: pd.t2 || '', t3: pd.t3 || '', density: pd.density || '' });
    }
  }
  return { lineKey, lineListMatch };
}

/**
 * Today's branch pass. `root` is the PlainElement document root; `stats` is today's stats object (fields added in place).
 * Returns { stats, diagnostics }.
 */
export function branchEngineeringPass({ root, config, tolerance, stats = {}, diagnostics = [] }) {
  for (const k of ['removedDuplicateSupports', 'branchLineKeys', 'lineListMatches', 'processAnnotations', 'ratingAnnotations', 'weightAnnotations']) stats[k] ??= 0;
  const pipingClassIndex = buildPipingClassIndex(config.pipingClass?.masterRows || []);
  const materialMap = config.material?.mapRows || [];
  for (const branch of elementsByName(root, 'Branch')) {
    const branchName = childText(branch, 'Branchname');
    const { lineKey, lineListMatch } = lineListStep(branch, branchName, config, stats, diagnostics);
    removeDuplicateSupports(branch, config, tolerance, stats, diagnostics);

    const derivedClassRaw = derivePipingClassFromBranchName(branchName, config) || rowText(lineListMatch, ['pipingClass', 'PipingClass']);
    const branchBore = deriveBoreFromBranchName(branchName, config) || rowNumber(lineListMatch, ['convertedBore', 'Bore']);
    const resolved = resolveBranchProcessData({ branchName, lineKey, lineRow: lineListMatch, boreMm: branchBore, componentType: 'PIPE',
      rating: deriveRatingFromPipingClass(derivedClassRaw, config) || rowText(lineListMatch, ['rating', 'Rating']),
      materialMap, pipingClassIndex, overrides: config.overrides || {}, xmlNode: null, xmlBranch: branch, config });
    const pipingClass = resolved.pipingClass || derivedClassRaw;
    const pcMaster = resolved.pipingClassMatchedRow;
    const branchRating = pcMaster?.rating || deriveRatingFromPipingClass(pipingClass, config) || rowText(lineListMatch, ['rating', 'Rating']);
    if (pcMaster || resolved.pipingClassMatchMethod !== 'none') {
      diagnostics.push({ type: 'class-master-match', branchName, derivedClass: derivedClassRaw, pipingClass, classMethod: resolved.pipingClassMatchMethod,
        classConfidence: resolved.pipingClassConfidence, wallThickness: resolved.wallThicknessMm ? String(resolved.wallThicknessMm) : '',
        corrosion: resolved.corrosionAllowanceMm != null ? String(resolved.corrosionAllowanceMm) : '', materialName: resolved.material || '',
        materialCode: resolved.materialCode || '', materialMethod: materialMethod(resolved.materialSource),
        needsReview: resolved.pipingClassNeedsReview || (!resolved.materialCode && !!resolved.material) });
    }
    diagnostics.push({ type: 'branch-derived', branchName, pipingClass, rating: branchRating, boreMm: branchBore,
      processParameters: { temperature: elementTextMap(firstChild(branch, 'Temperature')), pressure: elementTextMap(firstChild(branch, 'Pressure')) } });
    const nodes = childrenByName(branch, 'Node');
    const forwardLengths = xmlCiiForwardElementLengths(nodes);
    const ctx = { branch, branchName, pipingClass, branchRating, branchBore, resolved, pcMaster, config, stats, diagnostics };
    nodes.forEach((node, nodeIdx) => annotateNode(ctx, node, nodeIdx, forwardLengths[nodeIdx]));
  }
  return { stats, diagnostics };
}

/**
 * Owner 16 Nov ("measure after renumbering"): the branch pass measures lengths before the split-condensed renumbering, so a
 * node right after a renumbered valve/flange block is measured across the whole block, and a second run measures again.
 * The stage calls this once, after renumbering: every numbered node's ElementLengthMm becomes the straight distance from
 * the previous numbered node in its branch, which is the CII element length (today's CII writer takes DX/DY/DZ from the
 * two end positions and never reads ElementLengthMm). Negative (not written to CII) nodes keep their in-line lengths.
 * Same rule as today's branch pass, so a second run finds nothing to change. Returns the number of lengths changed.
 */
export function measureElementLengthsFromFinalNumbering(root, stats = {}) {
  let changed = 0;
  for (const branch of elementsByName(root, 'Branch')) {
    const nodes = childrenByName(branch, 'Node');
    xmlCiiForwardElementLengths(nodes).forEach((lengthMm, i) => {
      if (lengthMm === null) return;
      const value = lengthMm.toFixed(3);
      if (childText(nodes[i], 'ElementLengthMm') === value) return;
      setChildText(nodes[i], 'ElementLengthMm', value);
      changed += 1;
    });
  }
  stats.lengthsMeasuredAfterRenumbering = changed;
  return changed;
}
