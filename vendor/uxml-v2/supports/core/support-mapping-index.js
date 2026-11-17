import { governedSupportKind } from './support-kind-precedence.js';
import { SUPPORT_KINDS } from './SupportKindResolver.js';
import { resolveKindDescriptor } from './SupportKindResolver-descriptor.js';
import { resolveKindFromAttrs } from './RvmSupportMapper.js';
import { migrateSupportMappingConfig } from './support-mapping-config.js';
import { toText, toFiniteNumber, normalizeCoordinatePoint, xmlPositionKey, walkStagedComponents, supportTagBase, supportTagsFromAttrs, applyDtxrPositionOffset, pointWithOffset, attrsWithoutGeneratedSupportKind, normalizeSupportKind } from './support-mapping-common.js';

const KIND_REF_FLAG = Symbol('xmlCiiSupportKindReference');

function createKindReference(descriptor, attrs) {
  const ref = new String(descriptor.primaryKind || '');
  ref[KIND_REF_FLAG] = true;
  ref.primaryKind = descriptor.primaryKind || '';
  ref.kinds = descriptor.kinds?.length ? [...descriptor.kinds] : (descriptor.primaryKind ? [descriptor.primaryKind] : []);
  ref.attrs = attrs || {};
  ref.toString = () => descriptor.primaryKind || '';
  ref.valueOf = () => descriptor.primaryKind || '';
  ref[Symbol.toPrimitive] = () => descriptor.primaryKind || '';
  return ref;
}

export function resolveXmlCiiSupportDescriptor(attrs, config = {}, onDecision) {
  let decision;
  const resolved=governedSupportKind(attrs,config,SUPPORT_KINDS,value=>{decision=value;});
  if(resolved.kind) {
    onDecision?.(decision);
    // Keep the unchanged default CA100 catalogue composite; a different
    // explicit Step 7 or NODETYPE decision remains authoritative.
    const composite=decision?.rule?.id==='builtin-ca100'&&resolved.kind==='GUIDE';
    const descriptor=resolveKindDescriptor(composite?attrs:{}, {userRules:[],defaultRules:[],kindMap:{},defaultKind:resolved.kind});
    return {...descriptor,source:'supportMapping',attrs};
  }
  if(resolved.source==='description-conflict'||resolved.source==='step7-not-governed')
    return {primaryKind:'',kinds:[],dofs:{},source:resolved.source};
  const ruleAttrs=attrsWithoutGeneratedSupportKind(attrs);
  const legacyKind=normalizeSupportKind(resolveKindFromAttrs(ruleAttrs));
  if(legacyKind) {
    onDecision?.({source:'legacyRvmSupportMapper',rule:{id:'resolveKindFromAttrs',evidenceStatus:'ROUTE_ONLY'}});
    return {primaryKind:legacyKind,kinds:[legacyKind],dofs:{},source:'legacyRvmSupportMapper'};
  }
  return {primaryKind:'',kinds:[],dofs:{},source:'none'};
}

export function resolveXmlCiiSupportKind(attrs, config = {}, onDecision) {
  return resolveXmlCiiSupportDescriptor(attrs, config, onDecision).primaryKind || '';
}

export function buildStagedSupportIndex(stagedJsonText, config = {}, diagnostics = []) {
  const empty = { byCoord: new Map(), byTag: new Map(), byBaseTag: new Map(), items: [], count: 0 };
  const supportMapping = migrateSupportMappingConfig(config);
  if (supportMapping.useJsonForRestraints === false) {
    diagnostics.push({ type: 'staged-support-index', supports: 0, coordinateKeys: 0, psTagKeys: 0, disabled: true });
    return empty;
  }
  if (!toText(stagedJsonText).trim()) return empty;

  let parsed = null;
  try { parsed = JSON.parse(stagedJsonText); } catch (error) {
    diagnostics.push({ type: 'staged-json-parse-error', message: toText(error?.message || error) });
    return empty;
  }

  const byCoord = new Map();
  const byTag = new Map();
  const byBaseTag = new Map();
  const items = [];
  const tolerance = toFiniteNumber(config.coordinateTolerance, 1);
  let count = 0;

  for (const entry of walkStagedComponents(parsed)) {
    const attrs = entry.attrs || {};
    let auditDecision=null;
    const descriptor = resolveXmlCiiSupportDescriptor(attrs, config,decision=>{auditDecision=decision;});
    if (!descriptor.primaryKind) continue;

    let point = null;
    let rawPoint = null;
    for (const key of ['SUPPORTCOORD', 'SUPPORT_COORD', 'POS', 'POSI', 'BPOS', 'APOS', 'LPOS', 'CPOS', 'HPOS', 'TPOS']) {
      rawPoint = normalizeCoordinatePoint(attrs[key]);
      point = key === 'POSI' ? applyDtxrPositionOffset(rawPoint, config) : rawPoint;
      if (point) break;
    }

    const kindRef = createKindReference(descriptor, attrs);
    const supportTags = supportTagsFromAttrs(attrs, entry.component?.name || '');
    const supportBaseTags = [...new Set(supportTags.map(supportTagBase).filter(Boolean))];
    const indexed = {
      ...entry,
      kind: kindRef,
      primaryKind: descriptor.primaryKind,
      kinds: descriptor.kinds?.length ? descriptor.kinds : [descriptor.primaryKind],
      dofs: descriptor.dofs || {},
      supportDescriptorSource: descriptor.source,
      auditDecision,
      supportTags,
      supportBaseTags,
      point,
      rawPoint,
    };
    items.push(indexed);

    if (point) {
      const coordinateKey = xmlPositionKey(`${point.x} ${point.y} ${point.z}`, tolerance);
      if (coordinateKey) {
        if (!byCoord.has(coordinateKey)) byCoord.set(coordinateKey, []);
        byCoord.get(coordinateKey).push(indexed);
      }
    }

    for (const tag of supportTags) {
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag).push(indexed);
      const baseTag = supportTagBase(tag);
      if (baseTag) {
        if (!byBaseTag.has(baseTag)) byBaseTag.set(baseTag, []);
        byBaseTag.get(baseTag).push(indexed);
      }
    }
    count += 1;
  }

  diagnostics.push({ type: 'staged-support-index', supports: count, coordinateKeys: byCoord.size, psTagKeys: byTag.size });
  return { byCoord, byTag, byBaseTag, items, count };
}

export function calibrateStagedSupportIndexCoordinates(stagedSupportIndex, offset, config = {}) {
  const normalizedOffset = normalizeCoordinatePoint(offset);
  if (!normalizedOffset || !stagedSupportIndex || !Array.isArray(stagedSupportIndex.items)) return stagedSupportIndex;

  const byCoord = new Map();
  const byTag = new Map();
  const byBaseTag = new Map();
  const tolerance = toFiniteNumber(config.coordinateTolerance, 1);
  const items = stagedSupportIndex.items.map((item) => {
    const point = pointWithOffset(item.rawPoint, normalizedOffset) || item.point || null;
    const indexed = { ...item, point, inferredOffset: normalizedOffset };

    if (point) {
      const coordinateKey = xmlPositionKey(`${point.x} ${point.y} ${point.z}`, tolerance);
      if (coordinateKey) {
        if (!byCoord.has(coordinateKey)) byCoord.set(coordinateKey, []);
        byCoord.get(coordinateKey).push(indexed);
      }
    }

    for (const tag of indexed.supportTags || []) {
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag).push(indexed);
      const baseTag = supportTagBase(tag);
      if (baseTag) {
        if (!byBaseTag.has(baseTag)) byBaseTag.set(baseTag, []);
        byBaseTag.get(baseTag).push(indexed);
      }
    }
    return indexed;
  });

  return { ...stagedSupportIndex, byCoord, byTag, byBaseTag, items, inferredOffset: normalizedOffset };
}
