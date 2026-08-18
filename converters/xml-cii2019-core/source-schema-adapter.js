const DEFAULT_FIELDS = Object.freeze({
  objectName: ['NAME', 'NodeName'],
  objectType: ['TYPE', 'ComponentType', 'COMPONENTTYPE'],
  directLink: ['MDSLINKREF'],
  supportGroupRef: ['CMPSUPREFN'],
  parentRef: ['OWNER'],
  previousRef: ['PREV-NAME'],
  nextRef: ['NEXT-NAME'],
  componentRef: ['ComponentRefNo', 'COMPONENTREFNO', 'COMPRE', 'RefNo', 'REFNO', 'REF'],
  nodeNumber: ['NodeNumber', 'NODE', 'NODE_NO', 'JsonNodeNo', 'JSON_NODE_NO', 'SEQ', 'SEQUENCE'],
  nodeName: ['NodeName', 'NAME'],
  supportTag: ['SupportTag', 'PS', 'supportPs', 'psNo'],
  supportType: ['MDSSUPPTYPE', 'CMPSUPTYPE', 'SUPPORT_TYPE'],
  supportFunction: ['MDSSUPPFUNC'],
  supportKind: ['SUPPORT_KIND', 'SUPPORT_MAPPER_KIND'],
  supportGap: ['CMPSUPGAP', 'CMPSUPGAP_POS', 'CMPSUPGAP_PS', 'SUPPORT GAP'],
  dtxrPosition: ['DTXR_POS'],
  dtxrPs: ['DTXR_PS', 'DTXRPS'],
  dtxr: ['DTXR', 'DESC', 'DESCRIPTION', 'RTEXT', 'SPRE'],
  position: ['SUPPORTCOORD', 'SUPPORT_COORD', 'POS', 'POSI', 'BPOS', 'APOS', 'LPOS', 'CPOS', 'HPOS', 'TPOS', 'SPOS', 'EPOS'],
  bore: ['ABORE', 'LBORE', 'HBORE', 'BORE'],
});

const CANONICAL_LEGACY_FIELD = Object.freeze({
  objectName: 'NAME',
  objectType: 'TYPE',
  directLink: 'MDSLINKREF',
  supportGroupRef: 'CMPSUPREFN',
  parentRef: 'OWNER',
  previousRef: 'PREV-NAME',
  nextRef: 'NEXT-NAME',
  componentRef: 'ComponentRefNo',
  nodeNumber: 'NodeNumber',
  nodeName: 'NodeName',
  supportTag: 'SupportTag',
  supportType: 'MDSSUPPTYPE',
  supportFunction: 'MDSSUPPFUNC',
  supportKind: 'SUPPORT_KIND',
  supportGap: 'CMPSUPGAP',
  dtxrPosition: 'DTXR_POS',
  dtxrPs: 'DTXR_PS',
  dtxr: 'DTXR',
  bore: 'BORE',
});

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function finite(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function normalizeFieldList(value, fallback) {
  const raw = Array.isArray(value)
    ? value
    : Array.isArray(value?.aliases)
      ? value.aliases
      : typeof value === 'string'
        ? [value]
        : fallback;
  return [...new Set((raw || []).map(text).filter(Boolean))];
}

export function resolveSourceSchema(config = {}) {
  const supplied = safeObject(config?.sourceSchema);
  const suppliedFields = safeObject(supplied.fields);
  const fields = {};
  for (const [role, defaults] of Object.entries(DEFAULT_FIELDS)) {
    fields[role] = normalizeFieldList(suppliedFields[role], defaults);
  }
  const identity = safeObject(supplied.identity);
  return {
    fields,
    identity: {
      supportPrefixes: Array.isArray(identity.supportPrefixes) && identity.supportPrefixes.length
        ? identity.supportPrefixes.map((value) => text(value).toUpperCase()).filter(Boolean)
        : ['PS', 'SL'],
      allowOptionalHyphen: identity.allowOptionalHyphen !== false,
      allowHierarchicalSuffix: identity.allowHierarchicalSuffix !== false,
    },
  };
}

function caseInsensitiveValue(source, aliases = []) {
  const object = safeObject(source);
  const wanted = new Set(aliases.map((value) => text(value).toUpperCase()));
  for (const [key, value] of Object.entries(object)) {
    if (wanted.has(text(key).toUpperCase()) && text(value)) return value;
  }
  return '';
}

function attributeObject(value) {
  const raw = safeObject(value);
  return safeObject(raw.attributes || raw.ATTRIBUTES || raw.rawAttributes || raw.attrs || raw);
}

export function readSourceField(value, role, config = {}) {
  const schema = resolveSourceSchema(config);
  const aliases = schema.fields[role] || [];
  const raw = safeObject(value);
  const attrs = attributeObject(value);
  return caseInsensitiveValue(attrs, aliases) || caseInsensitiveValue(raw, aliases) || '';
}

export function sourceFieldName(value, role, config = {}) {
  const schema = resolveSourceSchema(config);
  const aliases = schema.fields[role] || [];
  const raw = safeObject(value);
  const attrs = attributeObject(value);
  const sources = [attrs, raw];
  for (const source of sources) {
    for (const [key, fieldValue] of Object.entries(source)) {
      if (!text(fieldValue)) continue;
      if (aliases.some((alias) => text(alias).toUpperCase() === text(key).toUpperCase())) return key;
    }
  }
  return '';
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function supportIdentityRegex(config = {}) {
  const identity = resolveSourceSchema(config).identity;
  const prefix = identity.supportPrefixes.map(escapeRegex).join('|') || 'PS|SL';
  const separator = identity.allowOptionalHyphen ? '-?' : '-';
  const suffix = identity.allowHierarchicalSuffix ? '(?:\\.\\d+)*' : '(?:\\.\\d+)?';
  return new RegExp(`\\/?(${prefix})${separator}(\\d+${suffix})`, 'i');
}

export function normalizeSupportIdentity(value, config = {}) {
  const source = text(value).toUpperCase();
  if (!source) return '';
  const match = supportIdentityRegex(config).exec(source);
  if (!match) return '';
  return `${match[1].toUpperCase()}-${match[2]}`;
}

export function supportIdentityVariants(value, config = {}) {
  const normalized = normalizeSupportIdentity(value, config);
  if (!normalized) return [];
  const [root, ...suffix] = normalized.split('.');
  const out = [normalized];
  for (let length = suffix.length - 1; length >= 0; length -= 1) {
    const candidate = [root, ...suffix.slice(0, length)].filter(Boolean).join('.');
    if (candidate && !out.includes(candidate)) out.push(candidate);
  }
  return out;
}

export function supportIdentityRoot(value, config = {}) {
  const variants = supportIdentityVariants(value, config);
  return variants.length ? variants[variants.length - 1] : '';
}

export function sourceSupportIdentities(value, config = {}) {
  const roles = ['objectName', 'directLink', 'supportGroupRef', 'parentRef', 'previousRef', 'nextRef', 'supportTag'];
  const out = [];
  for (const role of roles) {
    const raw = readSourceField(value, role, config);
    for (const variant of supportIdentityVariants(raw, config)) {
      if (!out.includes(variant)) out.push(variant);
    }
  }
  const raw = safeObject(value);
  for (const candidate of [raw.name, raw.component?.name, raw.componentName]) {
    for (const variant of supportIdentityVariants(candidate, config)) {
      if (!out.includes(variant)) out.push(variant);
    }
  }
  return out;
}

export function sourceRelationshipRoots(value, config = {}) {
  const strongRoles = ['supportGroupRef', 'directLink', 'objectName'];
  const out = [];
  for (const role of strongRoles) {
    const root = supportIdentityRoot(readSourceField(value, role, config), config);
    if (root && !out.includes(root)) out.push(root);
  }
  return out;
}

export function normalizeOwnerBranchName(value) {
  return text(value)
    .replace(/<\/?Branchname[^>]*>/gi, '')
    .replace(/^\s*=\s*/, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\s+/g, '')
    .replace(/\/B0*(\d+)$/i, '/B$1')
    .replace(/^\/*/, '/')
    .toUpperCase();
}

export function ownerBranchVariants(value) {
  const full = normalizeOwnerBranchName(value);
  const variants = new Set();
  if (full) variants.add(full);
  if (full.endsWith('/')) variants.add(full.slice(0, -1));
  const noBranch = full.replace(/\/B\d+$/i, '');
  if (noBranch && noBranch !== full) variants.add(noBranch);
  const noQuotes = full.replace(/["']/g, '');
  if (noQuotes && noQuotes !== full) variants.add(noQuotes);
  const noQuotesNoBranch = noQuotes.replace(/\/B\d+$/i, '');
  if (noQuotesNoBranch && noQuotesNoBranch !== noQuotes) variants.add(noQuotesNoBranch);
  return [...variants].filter(Boolean);
}

export function parseSourcePoint(point) {
  if (point === undefined || point === null || point === '') return null;
  if (Array.isArray(point) && point.length >= 3) {
    const x = Number(point[0]);
    const y = Number(point[1]);
    const z = Number(point[2]);
    return [x, y, z].every(Number.isFinite) ? { x, y, z } : null;
  }
  if (typeof point === 'object') {
    const x = Number(point.x ?? point.X ?? point.E ?? point.east);
    const y = Number(point.y ?? point.Y ?? point.N ?? point.north);
    const z = Number(point.z ?? point.Z ?? point.U ?? point.EL ?? point.elev ?? point.elevation);
    return [x, y, z].every(Number.isFinite) ? { x, y, z } : null;
  }
  const source = text(point);
  if (!source) return null;
  const directional = {};
  source.replace(/\b(E|W|N|S|U|D|EL)\s*[:=]?\s*(-?\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?)/gi, (_, axis, raw) => {
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) return '';
    const key = axis.toUpperCase();
    if (key === 'E') directional.x = numeric;
    else if (key === 'W') directional.x = -numeric;
    else if (key === 'N') directional.y = numeric;
    else if (key === 'S') directional.y = -numeric;
    else if (key === 'U' || key === 'EL') directional.z = numeric;
    else if (key === 'D') directional.z = -numeric;
    return '';
  });
  if ([directional.x, directional.y, directional.z].every(Number.isFinite)) return directional;
  const values = source.match(/-?\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
  return values.length >= 3 ? { x: values[0], y: values[1], z: values[2] } : null;
}

export function resolveCoordinateAlignment(config = {}) {
  const explicit = safeObject(config?.coordinateAlignment);
  if (Object.keys(explicit).length) {
    const mode = text(explicit.mode || 'NONE').toUpperCase();
    const rawOffset = safeObject(explicit.manualOffsetMm || explicit.offsetMm || explicit.offset);
    return {
      explicit: true,
      mode: ['NONE', 'MANUAL', 'AUTO'].includes(mode) ? mode : 'NONE',
      offsetMm: {
        x: finite(rawOffset.x ?? rawOffset.xOffset, 0),
        y: finite(rawOffset.y ?? rawOffset.yOffset, 0),
        z: finite(rawOffset.z ?? rawOffset.zOffset, 0),
      },
      applyToFields: normalizeFieldList(explicit.applyToFields, ['POSI']).map((value) => value.toUpperCase()),
      matchToleranceMm: Math.max(finite(explicit.matchToleranceMm ?? explicit.tolerance, finite(config.coordinateTolerance, 1)), 0),
      calibrationToleranceMm: Math.max(finite(explicit.calibrationToleranceMm, 1), 0),
      minimumCalibrationSamples: Math.max(1, Math.round(finite(explicit.minimumCalibrationSamples, 3))),
    };
  }

  const legacy = safeObject(config?.dtxrPositionOffset);
  return {
    explicit: false,
    mode: legacy.enabled === true ? 'MANUAL' : 'NONE',
    offsetMm: {
      x: finite(legacy.xOffset, 0),
      y: finite(legacy.yOffset, 0),
      z: finite(legacy.zOffset, 0),
    },
    applyToFields: ['POSI'],
    matchToleranceMm: Math.max(finite(legacy.tolerance, finite(config.coordinateTolerance, 1)), 0),
    calibrationToleranceMm: Math.max(finite(legacy.autoCalibratePrecision, 1), 0.001),
    minimumCalibrationSamples: Math.max(1, Math.round(finite(legacy.autoCalibrateMinSamples, 2))),
  };
}

export function shouldAutoCalibrateCoordinates(config = {}) {
  const alignment = resolveCoordinateAlignment(config);
  if (alignment.explicit) return alignment.mode === 'AUTO';
  const legacy = safeObject(config?.dtxrPositionOffset);
  return legacy.enabled !== false && legacy.autoCalibrate !== false;
}

export function applyCoordinateAlignment(point, fieldName, config = {}) {
  if (!point) return null;
  const alignment = resolveCoordinateAlignment(config);
  if (alignment.mode !== 'MANUAL') return { ...point };
  const field = text(fieldName).toUpperCase();
  if (alignment.applyToFields.length && !alignment.applyToFields.includes(field)) return { ...point };
  return {
    x: point.x + alignment.offsetMm.x,
    y: point.y + alignment.offsetMm.y,
    z: point.z + alignment.offsetMm.z,
  };
}

export function readSourcePosition(value, config = {}) {
  const schema = resolveSourceSchema(config);
  const attrs = attributeObject(value);
  const raw = safeObject(value);
  for (const alias of schema.fields.position || []) {
    const rawValue = caseInsensitiveValue(attrs, [alias]) || caseInsensitiveValue(raw, [alias]);
    const rawPoint = parseSourcePoint(rawValue);
    if (!rawPoint) continue;
    return {
      field: alias,
      rawValue,
      rawPoint,
      point: applyCoordinateAlignment(rawPoint, alias, config),
      alignment: resolveCoordinateAlignment(config),
    };
  }
  const fallback = parseSourcePoint(raw.position || raw.point || '');
  return fallback ? { field: 'position', rawValue: raw.position || raw.point, rawPoint: fallback, point: fallback, alignment: resolveCoordinateAlignment(config) } : null;
}

export function canonicalizeStagedAttributes(attrs = {}, config = {}, rawObject = {}) {
  const out = { ...safeObject(attrs) };
  const source = { ...safeObject(rawObject), attributes: out };
  for (const [role, canonical] of Object.entries(CANONICAL_LEGACY_FIELD)) {
    const value = readSourceField(source, role, config);
    if (text(value) && !text(out[canonical])) out[canonical] = value;
  }
  const position = readSourcePosition(source, config);
  if (position?.point) {
    out.SUPPORTCOORD = { ...position.point };
    out.__SOURCE_POSITION_FIELD = position.field;
    out.__SOURCE_POSITION_RAW = position.rawValue;
  }
  return out;
}

export function walkStagedSource(stagedJson, config = {}) {
  let parsed = stagedJson;
  if (typeof stagedJson === 'string') {
    try { parsed = JSON.parse(stagedJson); } catch { return []; }
  }
  const out = [];
  function walk(value, branchName = '', path = '$') {
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, branchName, `${path}[${index}]`));
      return;
    }
    if (!value || typeof value !== 'object') return;
    const rawAttrs = attributeObject(value);
    const attrs = canonicalizeStagedAttributes(rawAttrs, config, value);
    const type = text(value.type || readSourceField({ ...value, attributes: attrs }, 'objectType', config)).toUpperCase();
    const hasChildren = Array.isArray(value.children);
    const branch = (type === 'BRANCH' || hasChildren)
      ? text(value.name || readSourceField({ ...value, attributes: attrs }, 'parentRef', config) || branchName)
      : branchName;
    const record = {
      component: value,
      attrs,
      rawAttrs,
      branchName: branch,
      type,
      _path: path,
      position: readSourcePosition({ ...value, attributes: rawAttrs }, config),
    };
    record.supportIdentities = sourceSupportIdentities({ ...value, attributes: attrs, component: value }, config);
    record.relationshipRoots = sourceRelationshipRoots({ ...value, attributes: attrs, component: value }, config);
    out.push(record);
    if (hasChildren) value.children.forEach((child, index) => walk(child, branch, `${path}.children[${index}]`));
  }
  walk(parsed);
  return out;
}

export function sourceSchemaDefaults() {
  return {
    fields: Object.fromEntries(Object.entries(DEFAULT_FIELDS).map(([key, value]) => [key, [...value]])),
    identity: {
      supportPrefixes: ['PS', 'SL'],
      allowOptionalHyphen: true,
      allowHierarchicalSuffix: true,
    },
  };
}
