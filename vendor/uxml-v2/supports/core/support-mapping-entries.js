import { childText } from '../PlainDom.js';
import { migrateSupportMappingConfig, normalizeXmlTypes } from './support-mapping-config.js';
import { toText, normalizeDirectionVector, parseDirectionVectorText, normalizeSupportKind } from './support-mapping-common.js';

const XML_CII_NATIVE_RESTRAINT_TYPE_ALIASES = Object.freeze({
  GUI: 'GUI',
  GUIDE: 'GUI',
  LIM: 'LIM',
  LIMIT: 'LIM',
  LINESTOP: 'LIM',
  // Owner, 14 Nov (GOLDEN-30 G): X and Z are CAESAR restraint types of their own and stay
  // X / Z; they are never turned into GUI / LIM.
});

export function normalizeExistingXmlCiiRestraintType(typeText, config = {}) {
  const raw = toText(typeText).trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();
  const nativeType = XML_CII_NATIVE_RESTRAINT_TYPE_ALIASES[upper];
  if (nativeType) return nativeType;
  const sign = upper.startsWith('+') || upper.startsWith('-') ? upper[0] : '';
  const unsigned = sign ? upper.slice(1) : upper;
  const mapped = config.xmlAxisToCiiAxis?.[upper] || config.xmlAxisToCiiAxis?.[unsigned];
  return mapped ? toText(mapped).trim().toUpperCase() : upper;
}

function vectorFromAttrs(attrs, keys) {
  for (const key of keys || []) {
    const value = attrs?.[key];
    const parsed = value && typeof value === 'object' ? normalizeDirectionVector(value) : parseDirectionVectorText(value);
    if (parsed) return parsed;
  }
  return null;
}

function resolvePipeAxis(attrs) {
  return vectorFromAttrs(attrs, ['PIPE_AXIS_COSINES', 'PIPEAXISCOSINES', 'PIPE_AXIS', 'PIPEAXIS', 'PIPE_AXIS_VECTOR', 'PIPEAXISVECTOR', 'AXIS', 'DIRECTION_COSINES', 'DIRECTIONCOSINES']);
}

function cross(a, b) {
  return normalizeDirectionVector({ x: (a.y * b.z) - (a.z * b.y), y: (a.z * b.x) - (a.x * b.z), z: (a.x * b.y) - (a.y * b.x) });
}

function resolveSupportDirectionCosines({ profile, attrs, nodeElement }) {
  const mode = toText(profile.directionMode || 'none').toLowerCase();
  if (mode === 'none') return null;
  if (mode === 'fixed') return normalizeDirectionVector(profile.direction);
  if (mode === 'from-staged') return vectorFromAttrs(attrs, ['DIRECTION_COSINES', 'DIRECTIONCOSINES', 'SUPPORT_DIRECTION_COSINES', 'SUPPORTDIRECTIONCOSINES', 'DIRCOS', 'DIRECTION', 'SUPPORT_DIRECTION']);
  if (mode === 'from-xml') return normalizeDirectionVector({ x: childText(nodeElement, 'DirectionCosineX'), y: childText(nodeElement, 'DirectionCosineY'), z: childText(nodeElement, 'DirectionCosineZ') });
  if (mode === 'pipe-axis') return resolvePipeAxis(attrs);
  if (mode === 'pipe-normal') {
    const axis = resolvePipeAxis(attrs);
    if (!axis) return null;
    return cross(Math.abs(axis.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 }, axis);
  }
  return null;
}

function supportProfileForKind(kind, config = {}) {
  const supportMapping = migrateSupportMappingConfig(config);
  return supportMapping.kindProfiles?.[normalizeSupportKind(kind)] || {};
}

// Source-owned gap is independent of support classification. Explicit zero is
// evidence, not absence; NODEGAP=0 is the established placeholder only when
// the same source member supplies CMPSUPGAP.
export function sourceSupportGap(attrs = {}) {
  const aliases=['CMPSUPGAP','CMPSUPGAP_POS','CMPSUPGAP_PS','NODEGAP'];
  const fields=aliases.map(key=>({key,raw:toText(attrs?.[key]).trim()})).filter(f=>f.raw!=='');
  const parse=raw=>{
    const match=raw.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][+-]?\d+)?/);
    const number=match?Number(match[0]):NaN;
    if(!Number.isFinite(number))throw Error('NATIVE_PREFINAL_RESTRAINT_GAP_INVALID');
    return number;
  };
  const authored=fields.filter(f=>!(f.key==='NODEGAP'&&fields.some(v=>v.key==='CMPSUPGAP')&&parse(f.raw)===0));
  if(!authored.length)return {raw:'',gap:'0',explicit:false};
  const first=parse(authored[0].raw);
  if(authored.some(f=>parse(f.raw)!==first))throw Error('NATIVE_PREFINAL_RESTRAINT_GAP_AMBIGUOUS');
  return {raw:authored[0].raw,gap:String(first),explicit:true};
}

export function restraintTypeUsesSupportGap(type, entry = null) {
  const restraintType = normalizeXmlType(type);
  const supportKind = normalizeSupportKind(entry?.supportKind);
  return restraintType === 'LIM' || restraintType === 'GUI' || supportKind === 'LINESTOP' || supportKind === 'LIMIT' || supportKind === 'GUIDE';
}

export function firstNodeSupportGapText(nodeElement) {
  return toText(
    childText(nodeElement, 'CMPSUPGAP')
    || childText(nodeElement, 'CMPSUPGAP_POS')
    || childText(nodeElement, 'CMPSUPGAP_PS')
  ).trim();
}

export function normalizeXmlType(type) {
  const upper = toText(type).trim().toUpperCase();
  return XML_CII_NATIVE_RESTRAINT_TYPE_ALIASES[upper] || upper;
}

function createRestraintEntry(fields) {
  return { ...fields, toString() { return this.type || ''; }, valueOf() { return this.type || ''; }, [Symbol.toPrimitive]() { return this.type || ''; } };
}

export function restraintEntriesFromSupportKind(kind, attrs = {}, nodeElement = null, config = {}) {
  const upperKind = normalizeSupportKind(kind);
  if (!upperKind) return [];
  const profile = supportProfileForKind(upperKind, config);
  const values = normalizeXmlTypes(profile.xmlTypes || config.supportKindToXmlType?.[upperKind] || []);
  const direction = resolveSupportDirectionCosines({ profile, attrs, nodeElement });
  const sourceGap = sourceSupportGap(attrs);
  const gap = sourceGap.gap;
  return values.map(normalizeXmlType).filter(Boolean).map((type) => createRestraintEntry({
    type,
    stiffness: profile.stiffness && profile.stiffness !== 'default' ? profile.stiffness : config.defaultStiffness,
    gap,
    cmpSupGap: sourceGap.raw,
    sourceGapPolicy: true,
    frictionMode: profile.frictionMode || 'default',
    fixedFriction: profile.fixedFriction || '',
    supportTagMode: profile.supportTagMode || 'kind',
    supportTagValue: profile.supportTagValue || '',
    direction,
    supportKind: upperKind,
    directionMode: profile.directionMode || 'none',
  }));
}

export function dedupeXmlCiiRestraintEntries(entries = []) {
  const seen = new Set();
  const out = [];
  for (const entry of Array.isArray(entries) ? entries : []) {
    const type = normalizeXmlType(typeof entry === 'string' ? entry : entry?.type);
    if (!type) continue;
    const direction = normalizeDirectionVector(entry?.direction);
    const dir = direction ? `${direction.x.toFixed(6)},${direction.y.toFixed(6)},${direction.z.toFixed(6)}` : '';
    const key = `${type}|${dir}|${toText(entry?.stiffness)}|${toText(entry?.gap)}|${toText(entry?.frictionMode)}|${toText(entry?.fixedFriction)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

export function xmlCiiRestraintEntriesFromSupportMatch(match, nodeElement, config = {}) {
  const attrs = match?.attrs || {};
  const kinds = Array.isArray(match?.kinds) && match.kinds.length ? match.kinds : [match?.kind].filter(Boolean);
  const entries = [];
  for (const kind of kinds) {
    for (const entry of restraintEntriesFromSupportKind(kind, attrs, nodeElement, config)) {
      entry.fromStagedItem = true;
      entries.push(entry);
    }
  }
  return dedupeXmlCiiRestraintEntries(entries);
}

export function directionFromRestraint(restraint) {
  return normalizeDirectionVector({ x: childText(restraint, 'DirectionCosineX'), y: childText(restraint, 'DirectionCosineY'), z: childText(restraint, 'DirectionCosineZ') });
}

// A bare source axis letter the config re-maps to the CII frame (for example Z -> Y) gets that
// CII axis as its direction, so the CII writer never re-maps the letter a second time
// (GOLDEN-30 G, 14 Nov). A restraint with its own direction keeps it.
function remappedAxisDirection(sourceType, type) {
  const sourceAxis = toText(sourceType).trim().toUpperCase().replace(/^[+-]/, '');
  if (!/^[XYZ]$/.test(type) || !/^[XYZ]$/.test(sourceAxis) || type === sourceAxis) return null;
  return { x: type === 'X' ? 1 : 0, y: type === 'Y' ? 1 : 0, z: type === 'Z' ? 1 : 0 };
}

export function xmlCiiTypeEntryFromExistingRestraint(restraint, config = {}) {
  const type = normalizeExistingXmlCiiRestraintType(childText(restraint, 'Type'), config);
  return {
    type,
    stiffness: childText(restraint, 'Stiffness'),
    gap: childText(restraint, 'Gap'),
    friction: childText(restraint, 'Friction'),
    // A re-enriched restraint keeps its own direction (or none) and its own source gap note;
    // it never inherits a sibling restraint's direction (Owner, 14 Nov: second pass must not
    // turn a direction-less GUI into a vertical one).
    cmpSupGap: childText(restraint, 'CMPSUPGAP'),
    direction: directionFromRestraint(restraint) || remappedAxisDirection(childText(restraint, 'Type'), type),
    directionMode: 'from-xml',
    fromExistingRestraint: true,
  };
}

function xmlTypeAllowsRealFriction(type) {
  const t = toText(type).toUpperCase();
  return t === '+Y' || t === 'Y';
}

export function frictionForEntry(entry, type, existingFriction, config = {}) {
  if (typeof entry === 'string') return existingFriction || toText(config.defaultFriction || '0.3') || '0.3';
  if (toText(entry?.friction)) return toText(entry.friction);
  const mode = toText(entry?.frictionMode || 'default').toLowerCase();
  const defaultFriction = toText(config.defaultFriction || '0.3') || '0.3';
  if (mode === 'fixed' && toText(entry?.fixedFriction)) return toText(entry.fixedFriction);
  if (mode === 'existing' && toText(existingFriction)) return toText(existingFriction);
  if (mode === 'sentinel' && config.useFrictionSentinelForNonYSupports !== false && !xmlTypeAllowsRealFriction(type)) return '-1.010100';
  return defaultFriction;
}
