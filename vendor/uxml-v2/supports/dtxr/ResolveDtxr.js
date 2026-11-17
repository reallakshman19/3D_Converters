import { elementKids, childText } from '../PlainDom.js';
import { toFiniteNumber, getXmlNodeProperty, normalizePoint, canonicalRoot, euclideanDistance, xmlNodeSupportTags, supportTagsFromAttrs, normalizeSupportTag, supportTagBase } from './ResolverPrimitives.js';
import { cleanDtxr, stagedComponentDtxr, stagedComponentDtxrPs, canonKey, coordKey } from './StagedDtxrIndex.js';
import { DTXR_PURPOSE_RULES, emptyDtxrResult, suppressIfUnsafe, chooseBestDtxrCandidate, candidateArrayFromMap, relaxedPsTagCandidates, resultFromStagedItem, resultFromExistingXml, findNearestCoordinateMatch, dtxrPsByOwnerBranch } from './ResolverCandidates.js';

function xmlAncestorBranchName(root, node) {
  function visit(current, branch) {
    if (current === node) return { found: true, branch };
    const nextBranch = current.__el === 'Branch' ? childText(current, 'Branchname') : branch;
    for (const child of elementKids(current)) {
      const result = visit(child, nextBranch);
      if (result.found) return result;
    }
    return { found: false, branch: '' };
  }
  return root ? visit(root, '').branch : '';
}

export function resolveDtxrForXmlNode({ xmlNode, context, purpose = 'component-description', config = {}, trustExistingXmlDtxr = true, root } = {}) {
  const rules = DTXR_PURPOSE_RULES[purpose] || DTXR_PURPOSE_RULES['component-description'];
  const stagedIndex = context?.stagedIndex || context;
  if (!xmlNode) return emptyDtxrResult('not-found');

  if (purpose === 'support-restraint') {
    const xmlNodeNumber = getXmlNodeProperty(xmlNode, 'NodeNumber');
    const xmlNodeName = getXmlNodeProperty(xmlNode, 'NodeName');
    const xmlBranch = xmlAncestorBranchName(root, xmlNode);
    const xmlPosition = normalizePoint(getXmlNodeProperty(xmlNode, 'Position'));
    const tolerance = toFiniteNumber(config.coordinateToleranceMm, 6.0);
    const xmlRoot = canonicalRoot(xmlBranch);

    let group = [];
    let minXmlDist = Infinity;
    let matchedPosition = null;

    if (stagedIndex && xmlRoot && xmlPosition) {
      for (const item of stagedIndex.items) {
        const itemRoot = canonicalRoot(item.owner);
        if (itemRoot !== xmlRoot) continue;

        let itemCoord = item.coord;
        if (!itemCoord) {
          const attrs = item.attrs || {};
          for (const key of ['SUPPORTCOORD', 'POS', 'POSI', 'BPOS', 'APOS', 'LPOS', 'CPOS', 'HPOS', 'TPOS']) {
            itemCoord = normalizePoint(attrs[key]);
            if (itemCoord) break;
          }
        }
        if (!itemCoord) continue;

        const dist = euclideanDistance(xmlPosition, itemCoord);
        if (dist <= tolerance) {
          group.push({ item, dist, coord: itemCoord });
          if (dist < minXmlDist) {
            minXmlDist = dist;
            matchedPosition = itemCoord;
          }
        }
      }
    }

    const formatCoord = (c) => c ? `${c.x.toFixed(2)} ${c.y.toFixed(2)} ${c.z.toFixed(2)}` : '';
    let record = {
      xmlNodeNumber, xmlNodeName, xmlBranch, xmlPosition: formatCoord(xmlPosition),
      sourceBranch: '', branchRelationship: '', coordinateToleranceMm: tolerance,
      matchedPosition: '', positionDistanceMm: null, maxInternalDistanceMm: null,
      dtxrPosNodeNumbers: '', dtxrPsNodeNumbers: '', dtxrPosValue: '', dtxrPsName: '', dtxrPsValue: '',
      effectiveSource: 'NONE', derivedSupportTypes: '', matchType: 'UNRESOLVED', status: 'UNRESOLVED', sourcePaths: '',
      
      // Legacy compatibility
      canonicalText: '', dtxrPos: '', dtxrPs: '', effectiveDtxr: '', fallbackUsed: false,
      supportTags: xmlNodeSupportTags(xmlNode), matchedBy: '', matchedKey: ''
    };

    if (group.length > 0) {
      let maxInternalDist = 0;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const d = euclideanDistance(group[i].coord, group[j].coord);
          if (d > maxInternalDist) maxInternalDist = d;
        }
      }

      const dtxrPosVals = new Set();
      const posItems = [];
      const psItems = [];
      let derivedDtxrPs = '';
      let derivedDtxrPsName = '';

      for (const g of group) {
        const pos = cleanDtxr(g.item.dtxr || stagedComponentDtxr(g.item));
        if (pos) {
          dtxrPosVals.add(pos);
          posItems.push(g.item);
        }
      }
      
      const dtxrPosValue = [...dtxrPosVals].join('+');

      if (xmlNodeName) {
        for (const g of group) {
          const itemTags = supportTagsFromAttrs(g.item.attrs, g.item.component?.name || '');
          const itemName = cleanDtxr(g.item.attrs.NAME || g.item.component?.name || '');
          const normXmlName = xmlNodeName.toUpperCase();
          if (itemName.includes(normXmlName) || itemTags.includes(normalizeSupportTag(xmlNodeName))) {
            derivedDtxrPsName = xmlNodeName;
            derivedDtxrPs = cleanDtxr(g.item.dtxrPs || stagedComponentDtxrPs(g.item)) || cleanDtxr(g.item.dtxr || stagedComponentDtxr(g.item));
            psItems.push(g.item);
            break; 
          }
        }
      }

      const hasPos = !!dtxrPosValue;
      const hasPs = !!derivedDtxrPs;
      const status = hasPos && hasPs ? 'RESOLVED_POS_PS' : (hasPos ? 'RESOLVED_POS' : (hasPs ? 'RESOLVED_PS_FALLBACK' : 'UNRESOLVED'));

      record.sourceBranch = group[0].item.owner || '';
      record.branchRelationship = 'same-root';
      record.matchedPosition = formatCoord(matchedPosition);
      record.positionDistanceMm = minXmlDist;
      record.maxInternalDistanceMm = maxInternalDist;
      record.dtxrPosNodeNumbers = posItems.map(i => i.attrs?.NodeNumber || i._jsonSeq || '').join(',');
      record.dtxrPsNodeNumbers = psItems.map(i => i.attrs?.NodeNumber || i._jsonSeq || '').join(',');
      record.dtxrPosValue = dtxrPosValue;
      record.dtxrPsName = derivedDtxrPsName;
      record.dtxrPsValue = derivedDtxrPs;
      record.effectiveSource = hasPos ? 'DTXR_POS' : (hasPs ? 'DTXR_PS' : 'NONE');
      record.matchType = 'COORDINATE_GROUP';
      record.status = status;
      record.sourcePaths = group.map(g => g.item._path).join('|');
      
      record.canonicalText = hasPos ? dtxrPosValue : derivedDtxrPs;
      record.dtxrPos = dtxrPosValue;
      record.dtxrPs = derivedDtxrPs;
      record.effectiveDtxr = hasPos ? dtxrPosValue : derivedDtxrPs;
      record.fallbackUsed = !hasPos && hasPs;
      record.matchedBy = 'coordinate-group';
      record.matchedKey = `${group.length} items within ${tolerance}mm`;
    }

    const checked = suppressIfUnsafe(record, { xmlNode, purpose, rules });
    return checked.suppressed ? { ...record, status: 'UNRESOLVED', effectiveDtxr: '', canonicalText: '' } : checked;
  }

  const attempts = [];
  const accept = (result) => {
    if (!result) return null;
    const checked = suppressIfUnsafe(result, { xmlNode, purpose, rules });
    attempts.push(checked);
    return checked.suppressed ? null : checked;
  };
  const xmlType = getXmlNodeProperty(xmlNode, 'ComponentType').toUpperCase();
  const allowStagedConfig = { ...config, _allowedStagedTypes: rules.allowedStagedTypes || [] };

  const resolveByPsTags = () => {
    if (!rules.allowPsTag || !stagedIndex) return null;
    const tags = xmlNodeSupportTags(xmlNode);
    for (const tag of tags) {
      const byPs = chooseBestDtxrCandidate(candidateArrayFromMap(stagedIndex.byPsTag, tag), xmlNode, allowStagedConfig);
      if (byPs) {
        const hit = accept(resultFromStagedItem(byPs, { purpose, source: 'staged-ps-tag', matchedBy: 'ps-tag', matchedKey: tag, confidence: 1 }));
        if (hit) return { ...hit, supportTags: tags, candidates: attempts };
      }
    }
    for (const tag of tags) {
      const byRelaxedPs = chooseBestDtxrCandidate(relaxedPsTagCandidates(stagedIndex, xmlNode, tag, config), xmlNode, allowStagedConfig);
      if (byRelaxedPs) {
        const hit = accept(resultFromStagedItem(byRelaxedPs, { purpose, source: 'staged-ps-tag-relaxed-same-dtxr-pos', matchedBy: 'ps-tag-relaxed-same-dtxr-pos', matchedKey: `${tag} -> ${supportTagBase(tag)}`, confidence: 0.95 }));
        if (hit) return { ...hit, supportTags: tags, candidates: attempts };
      }
    }
    if (purpose === 'support-restraint' && tags.length) return { ...emptyDtxrResult('not-found'), stagedType: xmlType, supportTags: tags, matchedBy: 'ps-tag', matchedKey: tags.join('|'), candidates: attempts };
    return null;
  };

  if (purpose === 'support-restraint' && trustExistingXmlDtxr && rules.allowExistingXmlDtxr !== false) {
    const existing = resultFromExistingXml(xmlNode, { purpose });
    if (existing?.dtxrPos) {
      const hit = accept(existing);
      if (hit) return { ...hit, supportTags: xmlNodeSupportTags(xmlNode), candidates: attempts };
    }
  }

  if (purpose !== 'support-restraint') {
    const psHit = resolveByPsTags();
    if (psHit) return psHit;
  }

  if (rules.allowComponentRef && stagedIndex) {
    const componentRefNo = getXmlNodeProperty(xmlNode, 'ComponentRefNo');
    const byRef = chooseBestDtxrCandidate(candidateArrayFromMap(stagedIndex.byComponentRefNo, componentRefNo), xmlNode, allowStagedConfig);
    if (byRef) {
      const hit = accept(resultFromStagedItem(byRef, { purpose, source: 'staged-component-refno', matchedBy: 'component-refno', matchedKey: componentRefNo, confidence: 1 }));
      if (hit) return { ...hit, supportTags: xmlNodeSupportTags(xmlNode), candidates: attempts };
    }
  }

  if (rules.allowCoordinate && stagedIndex) {
    const coord = normalizePoint(getXmlNodeProperty(xmlNode, 'Position'));
    if (coord) {
      const precisionKey = coordKey(coord, config.coordinatePrecision ?? 1);
      const exact = chooseBestDtxrCandidate(stagedIndex.byCoordKey?.get(precisionKey) || [], xmlNode, allowStagedConfig);
      if (exact) {
        const hit = accept(resultFromStagedItem(exact, { purpose, source: 'staged-coordinate-key', matchedBy: 'coordinate', matchedKey: precisionKey, confidence: 0.9 }));
        if (hit) return { ...hit, supportTags: xmlNodeSupportTags(xmlNode), candidates: attempts };
      }
      if (rules.allowNearestCoordinate) {
        const nearest = findNearestCoordinateMatch(coord, stagedIndex.items, config.dtxrCoordinateToleranceMm ?? 2.0);
        if (nearest) {
          const hit = accept(resultFromStagedItem(nearest.item, { purpose, source: 'staged-nearest-coordinate', matchedBy: 'nearest-coordinate', matchedKey: `${nearest.distanceMm.toFixed(3)} mm`, confidence: 0.65 }));
          if (hit) return { ...hit, supportTags: xmlNodeSupportTags(xmlNode), candidates: attempts };
        }
      }
    }
  }

  if (purpose === 'support-restraint') {
    const psHit = resolveByPsTags();
    if (psHit) return psHit;
  }

  if (trustExistingXmlDtxr && rules.allowExistingXmlDtxr !== false) {
    const hit = accept(resultFromExistingXml(xmlNode, { purpose }));
    if (hit) return { ...hit, supportTags: xmlNodeSupportTags(xmlNode), candidates: attempts };
  }

  if (rules.allowNodeNumber && stagedIndex) {
    const nodeNumber = getXmlNodeProperty(xmlNode, 'NodeNumber');
    const byNode = nodeNumber ? stagedIndex.byNodeNumber?.get(nodeNumber) : null;
    if (byNode) {
      const hit = accept(resultFromStagedItem(byNode, { purpose, source: 'staged-node-number', matchedBy: 'node-number', matchedKey: nodeNumber, confidence: 0.75 }));
      if (hit) return { ...hit, supportTags: xmlNodeSupportTags(xmlNode), candidates: attempts };
    }
  }

  if (rules.allowNodeNameAsDtxr && stagedIndex) {
    const nodeName = getXmlNodeProperty(xmlNode, 'NodeName');
    const byName = nodeName ? stagedIndex.byNodeName?.get(canonKey(nodeName)) : null;
    if (byName) {
      const hit = accept(resultFromStagedItem(byName, { purpose, source: 'staged-node-name', matchedBy: 'node-name', matchedKey: nodeName, confidence: 0.7 }));
      if (hit) return { ...hit, supportTags: xmlNodeSupportTags(xmlNode), candidates: attempts };
    }
  }

  if (rules.allowOwnerFallback && stagedIndex) {
    const hit = accept(dtxrPsByOwnerBranch(xmlAncestorBranchName(root, xmlNode), stagedIndex, config));
    if (hit) return { ...hit, supportTags: xmlNodeSupportTags(xmlNode), candidates: attempts };
  }

  return { ...emptyDtxrResult('not-found'), stagedType: xmlType, supportTags: xmlNodeSupportTags(xmlNode), candidates: attempts };
}

