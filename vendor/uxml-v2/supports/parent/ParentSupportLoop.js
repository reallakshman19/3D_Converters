import { PLAIN_DOCUMENT, parsePlainXml, serializePlainXml, elementsByName, childText, childrenByName, setChildText } from '../PlainDom.js';
import { xmlPositionKey, xmlNodeSupportTags, relaxedSameDtxrPosSupportMatches } from './ParentMatching.js';
import { buildStagedComponentIndex } from './StagedComponentIndex.js';
import { buildStagedDtxrIndex, resolveXmlCiiNodeDtxr, xmlCiiDtxrPsForNode, xmlCiiDtxrPosForNode, buildStagedDtxrPositionIndex, xmlCiiCalibrateDtxrPositionIndex } from '../dtxr/DtxrResolver.js';

function buildParentIndexes(sourceRoot, stagedJsonText, config, diagnostics, core) {
  let stagedSupportIndex = core.buildStagedSupportIndex(stagedJsonText, config, diagnostics);
  const stagedComponentIndex = buildStagedComponentIndex(stagedJsonText, config);
  let stagedDtxrPositionIndex = buildStagedDtxrPositionIndex(stagedJsonText, config);
  stagedDtxrPositionIndex = xmlCiiCalibrateDtxrPositionIndex(stagedDtxrPositionIndex, sourceRoot, config);
  const stagedDtxrRefIndex = buildStagedDtxrIndex(stagedJsonText, config);
  if (stagedDtxrPositionIndex?.inferredOffset) {
    stagedSupportIndex = core.calibrateStagedSupportIndexCoordinates(stagedSupportIndex, stagedDtxrPositionIndex.inferredOffset, config);
    diagnostics.push({
      type: 'dtxr-position-offset-calibrated',
      samples: stagedDtxrPositionIndex.calibration?.samples || 0,
      uniqueTags: stagedDtxrPositionIndex.calibration?.uniqueTags || 0,
      xOffset: stagedDtxrPositionIndex.inferredOffset.x,
      yOffset: stagedDtxrPositionIndex.inferredOffset.y,
      zOffset: stagedDtxrPositionIndex.inferredOffset.z,
    });
  }
  return { stagedSupportIndex, stagedComponentIndex, stagedDtxrPositionIndex, stagedDtxrRefIndex };
}

function matchNode(node, stagedSupportIndex, tolerance, config, core) {
  const componentType = childText(node, 'ComponentType').toUpperCase();
  const positionKey = xmlPositionKey(childText(node, 'Position'), tolerance);
  const coordMatches = positionKey ? (stagedSupportIndex.byCoord.get(positionKey) || []) : [];
  const supportTags = xmlNodeSupportTags(node);
  const tagMatches = supportTags.flatMap((tag) => stagedSupportIndex.byTag.get(tag) || []);
  const relaxedTagMatches = tagMatches.length ? [] : relaxedSameDtxrPosSupportMatches(supportTags, coordMatches);
  
  const stagedMatches = coordMatches.length > 0
    ? coordMatches
    : (tagMatches.length > 0 ? tagMatches : relaxedTagMatches);
  const supportMatchMethod = coordMatches.length > 0
    ? 'dtxr-pos-coordinate'
    : (tagMatches.length > 0 ? 'dtxr-ps-tag-fallback' : (relaxedTagMatches.length > 0 ? 'dtxr-ps-tag-relaxed-fallback' : 'unmatched'));
  const staged = stagedMatches[0] || null;
  const restraints = childrenByName(node, 'Restraint');
  const supportCandidates=stagedMatches.map(match=>({match,entries:core.xmlCiiRestraintEntriesFromSupportMatch(match,node,config)}));
  const combinedTypes = core.dedupeXmlCiiRestraintEntries(supportCandidates.flatMap(candidate=>candidate.entries));
  return { componentType, positionKey, coordMatches, supportTags, stagedMatches, supportMatchMethod, staged, restraints, combinedTypes };
}

function annotateNode(node, componentType, indexes, root, config, stats, diagnostics) {
  const { stagedComponentIndex, stagedDtxrPositionIndex, stagedDtxrRefIndex } = indexes;
  const dtxrPs = xmlCiiDtxrPsForNode(node, stagedComponentIndex);
  if (dtxrPs.text) {
    setChildText(node, 'DTXR_PS', dtxrPs.text);
    stats.dtxrPsAnnotations += 1;
    diagnostics.push({ type: 'dtxr-ps', nodeNumber: childText(node, 'NodeNumber'), nodeName: childText(node, 'NodeName'), componentType, tags: dtxrPs.tags.join('|'), count: dtxrPs.values.length, matchedBy: 'DTXR_PS', matchedKey: dtxrPs.tags.join('|'), finalValue: dtxrPs.text, status: 'applied' });
  }
  const dtxrPos = xmlCiiDtxrPosForNode(node, stagedDtxrPositionIndex, config);
  if (dtxrPos.text) {
    setChildText(node, 'DTXR_POS', dtxrPos.text);
    stats.dtxrPosAnnotations += 1;
    diagnostics.push({ type: 'dtxr-pos', nodeNumber: childText(node, 'NodeNumber'), nodeName: childText(node, 'NodeName'), componentType, position: childText(node, 'Position'), count: dtxrPos.values.length, matchedBy: 'DTXR_POS', matchedKey: childText(node, 'Position'), sourcePath: dtxrPos.matchedPath || '', method: 'DTXR_POS exact or within +/-6mm trace tolerance', finalValue: dtxrPos.text, status: 'applied' });
  } else {
    // Fallback: component-refno based DTXR when position match misses (e.g. INST/VALV with POSI ≠ XML node endpoint positions)
    const _existingDtxrPos = childText(node, 'DTXR_POS');
    if (!_existingDtxrPos) {
      const _dtxrRef = resolveXmlCiiNodeDtxr(node, stagedDtxrRefIndex, config, root);
      if (_dtxrRef?.value && _dtxrRef.matchedBy === 'component-refno') {
        setChildText(node, 'DTXR_POS', _dtxrRef.value);
        stats.dtxrPosAnnotations += 1;
        diagnostics.push({ type: 'dtxr-pos', nodeNumber: childText(node, 'NodeNumber'), nodeName: childText(node, 'NodeName'), componentType, matchedBy: 'component-refno', matchedKey: _dtxrRef.matchedKey || '', sourcePath: _dtxrRef.sourcePath || _dtxrRef.matchedKey || '', jsonNodeNo: '', method: `component-refno: ${_dtxrRef.matchedKey || ''}`, finalValue: _dtxrRef.value, status: 'applied' });
      }
    }
  }
}

function recordSupportMatch(node, match, diagnostics) {
  const { componentType, positionKey, coordMatches, supportTags, stagedMatches, supportMatchMethod, staged, restraints, combinedTypes } = match;
  if (staged) {
    const allKinds = Array.from(new Set(stagedMatches.map(m => m.kind).filter(Boolean)));
    const xmlTypes = restraints.map((r) => childText(r, 'Type')).filter(Boolean).join('+');
    // Today's restraint entry string conversion returns its type; PlainDom replay records only the function marker.
    const restraintTypes = combinedTypes.map((entry) => typeof entry === 'string' ? entry : entry.type || '').join('+');
    diagnostics.push({ type: 'support-match', nodeNumber: childText(node, 'NodeNumber'), nodeName: childText(node, 'NodeName'), componentType, method: supportMatchMethod, matchedBy: supportMatchMethod, matchedKey: coordMatches.length > 0 ? positionKey : supportTags.join('|'), kind: allKinds.map((kind) => typeof kind === 'string' ? kind : kind.primaryKind || '').join('+'), xmlRestraintTypes: xmlTypes, restraintTypes, finalValue: restraintTypes, stagedName: staged.component?.name || staged.attrs?.NAME || '', tags: supportTags, status: 'applied' });
  }

}

function normalizeNodeRestraints(node, match, config, stats, core) {
  const { componentType, staged, restraints, combinedTypes } = match;
  let targetEntries = [];
  if (staged) {
    targetEntries = combinedTypes.length > 0 ? combinedTypes : [config.defaultXmlSupportType || 'Y'];
  } else if (restraints.length) {
    targetEntries = restraints
      .map((restraint) => core.xmlCiiTypeEntryFromExistingRestraint(restraint, config))
      .filter((entry) => !!entry.type);
  }

  if (componentType === 'ATTA' && targetEntries.length > 0) {
    core.applyXmlRestraints(PLAIN_DOCUMENT, node, targetEntries, config);
    if (staged) stats.stagedSupportsMapped += 1;
    stats.normalizedRestraints += targetEntries.length;
  } else if (restraints.length) {
    core.applyXmlRestraints(PLAIN_DOCUMENT, node, targetEntries, config);
    stats.normalizedRestraints += targetEntries.length;
  }
}

export function parentSupportLoop({ sourceXmlText, loopStartXmlText, stagedJsonText, config, tolerance, diagnostics }, core) {
  const { root: sourceRoot } = parsePlainXml(sourceXmlText);
  const indexes = buildParentIndexes(sourceRoot, stagedJsonText, config, diagnostics, core);
  const stats = { removedDuplicateSupports: 0, normalizedRestraints: 0, stagedSupportsMapped: 0, dtxrPsAnnotations: 0, dtxrPosAnnotations: 0, branchLineKeys: 0, lineListMatches: 0, processAnnotations: 0, ratingAnnotations: 0, weightAnnotations: 0 };
  const { root } = parsePlainXml(loopStartXmlText);
  for (const node of elementsByName(root, 'Node')) {
    const match = matchNode(node, indexes.stagedSupportIndex, tolerance, config, core);
    annotateNode(node, match.componentType, indexes, root, config, stats, diagnostics);
    recordSupportMatch(node, match, diagnostics);
    normalizeNodeRestraints(node, match, config, stats, core);
  }
  return { xmlText: serializePlainXml({ root }), stats, diagnostics };
}
