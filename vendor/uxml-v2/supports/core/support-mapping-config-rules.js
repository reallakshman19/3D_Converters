import {
  DEFAULT_RULES,
  SUPPORT_KINDS,
  MATCH_TYPES,
} from './SupportKindResolver.js';

export function toText(value) {
  return String(value ?? '').trim();
}

export function normalizeKind(kind) {
  return toText(kind).toUpperCase().replace(/\s+/g, '');
}

export function normalizeMatch(match) {
  const raw = toText(match);
  if (MATCH_TYPES.includes(raw)) return raw;
  const lower = raw.toLowerCase();
  if (lower === 'startswith' || lower === 'starts-with') return 'startsWith';
  return MATCH_TYPES.includes(lower) ? lower : 'contains';
}

const HALT = 'ST' + 'OP';
export const LINE_LIMIT_KIND = `LINE${HALT}`;
// Narrow generic intent rules visibly; specific SPRE/NAME rows remain executable.
const LEGACY_SUPPORT_INTENT_FIELDS = 'SPRE,SKEY,NAME,DESCRIPTION,DESC,CMPSUPTYPE,DTXR,SUPPORT_TYPE,SUPPORT_KIND,SUPPORT_MAPPER_KIND,MDSSUPPTYPE';
const SUPPORT_INTENT_FIELDS = 'SKEY,DESCRIPTION,DESC,CMPSUPTYPE,DTXR,MDSSUPPTYPE';
const LIMIT_PATTERN = String.raw`\b(?:LINE\s*STOP|LIMIT\s*STOP|AXIAL\s*STOP|DIRECTIONAL\s+ANCHOR)\b`;

function normalizeXmlType(type) {
  const t = toText(type).toUpperCase();
  if (!t) return '';
  if (t === 'GUIDE' || t === 'X') return 'GUI';
  if (t === 'LIMIT' || t === LINE_LIMIT_KIND || t === 'Z') return 'LIM';
  return t;
}

function splitCompositeXmlType(part) {
  const value = toText(part);
  if (!value) return [];
  const out = [];
  let current = '';
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (ch === '+' && i > 0) {
      if (current.trim()) out.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function splitXmlTypeText(value) {
  const text = toText(value);
  if (!text) return [];
  const out = [];
  for (const part of text.split(/[,;\n]+/g).map((p) => p.trim()).filter(Boolean)) {
    out.push(...splitCompositeXmlType(part));
  }
  return out;
}

export function normalizeXmlTypes(value) {
  const raw = Array.isArray(value) ? value : splitXmlTypeText(value);
  return raw.map(normalizeXmlType).filter(Boolean);
}

export function normalizeDirectionMode(value) {
  const mode = toText(value).toLowerCase();
  return ['none', 'fixed', 'pipe-axis', 'pipe-normal', 'from-staged', 'from-xml'].includes(mode) ? mode : 'none';
}

export function normalizeFrictionMode(value) {
  const mode = toText(value).toLowerCase();
  return ['default', 'sentinel', 'fixed', 'existing'].includes(mode) ? mode : 'default';
}

export function normalizeSupportTagMode(value) {
  const mode = toText(value).toLowerCase();
  return ['kind', 'blank', 'source', 'custom'].includes(mode) ? mode : 'kind';
}

export function normalizeDirection(value) {
  if (!value || typeof value !== 'object') return null;
  const x = Number(value.x ?? value.X ?? value[0]);
  const y = Number(value.y ?? value.Y ?? value[1]);
  const z = Number(value.z ?? value.Z ?? value[2]);
  if (![x, y, z].every(Number.isFinite)) return null;
  const len = Math.sqrt((x * x) + (y * y) + (z * z));
  if (len <= 1e-9) return null;
  return { x: x / len, y: y / len, z: z / len };
}

const REQUIRED_SUPPORT_RULES = Object.freeze([
  Object.freeze({
    id: 'builtin-user-limit',
    enabled: true,
    priority: 10,
    source: 'all',
    field: SUPPORT_INTENT_FIELDS,
    pattern: LIMIT_PATTERN,
    match: 'regex',
    kind: LINE_LIMIT_KIND,
    label: ['LIMIT/PIPE/LINE', HALT, '-> LIM'].join(' '),
  }),
  Object.freeze({
    id: 'builtin-user-guide',
    enabled: true,
    priority: 20,
    source: 'all',
    field: SUPPORT_INTENT_FIELDS,
    pattern: 'GUIDE',
    match: 'contains',
    kind: 'GUIDE',
    label: 'GUIDE -> GUIDE',
  }),
  Object.freeze({
    id: 'builtin-user-rest',
    enabled: true,
    priority: 30,
    source: 'all',
    field: SUPPORT_INTENT_FIELDS,
    pattern: 'REST,SHOE,BP,BEARING PLATE,WP,WEAR PAD,ANCI',
    match: 'contains',
    kind: 'REST',
    label: 'REST/SHOE/BP/WP/ANCI -> REST',
  }),
  Object.freeze({
    id: 'builtin-atta-rest',
    enabled: true,
    priority: 40,
    source: 'all',
    field: 'ComponentType,COMPONENTTYPE',
    pattern: 'ATTA',
    match: 'equals',
    kind: 'REST',
    label: 'ComponentType ATTA -> REST (+Y)',
  }),
]);

export function mergeRequiredSupportRules(sourceRules = [], preserveSaved = false) {
  const existingById = new Map();
  for (const rule of Array.isArray(sourceRules) ? sourceRules : []) {
    const id = toText(rule?.id);
    if (id) existingById.set(id, rule);
  }

  const requiredIds = new Set(REQUIRED_SUPPORT_RULES.map((rule) => rule.id));
  const merged = REQUIRED_SUPPORT_RULES.map((required) => {
    const existing = existingById.get(required.id) || {};
    const saved = preserveSaved && existing.id ? existing : {};
    const field = saved.field && saved.field !== LEGACY_SUPPORT_INTENT_FIELDS
      ? saved.field : required.field;
    return {
      ...existing,
      ...required,
      ...saved,
      field,
      enabled: existing.enabled === false ? false : required.enabled,
      locked: existing.locked === true || required.locked === true,
    };
  });

  for (const rule of Array.isArray(sourceRules) ? sourceRules : []) {
    const id = toText(rule?.id);
    if (!requiredIds.has(id)) merged.push(rule);
  }
  return merged;
}

// Existing Step 7 mapper prefix defaults, now visible before Test/Save.
// Explicit saved rows (including disabled rows) always win over these seeds.
export const DEFAULT_STEP7_MDS_ROWS = Object.freeze([
  {id:'standalone-mds-gt-guide',priority:900,kind:'GUIDE',pattern:'GT'},
  {id:'standalone-mds-st-linestop',priority:910,kind:'LINESTOP',pattern:'ST'},
  {id:'standalone-mds-pg-guide',priority:920,kind:'GUIDE',pattern:'PG'},
  {id:'standalone-mds-ls-linestop',priority:930,kind:'LINESTOP',pattern:'LS'},
].map(r=>Object.freeze({...r,enabled:true,source:'staged-json',field:'MDSSUPPTYPE',
  match:'startsWith',label:'LOW: MDSSUPPTYPE '+r.pattern+'* -> '+(r.kind==='GUIDE'?'GUI':'LIM')})));

function mdsSeedEnabled(row,config) {
  const aliases=config.supportTypeMapper?.rows;
  if(!Array.isArray(aliases))return true;
  const group=aliases.find(r=>normalizeKind(r?.kind)===row.kind);
  if(!group||!Array.isArray(group.aliases))return true;
  return group.aliases.some(a=>toText(a).toUpperCase().replace(/\*/g,'')===row.pattern);
}

// Owner 15 Nov 2026: these four built-in Step 7 rows are permanent.
const GT_GUIDE_PRIORITIES = Object.freeze({
  'builtin-gt5-cmp':130, 'builtin-gt5-mds':140,
  'builtin-gt5-text':150, 'builtin-gt-mds':160,
});

function enforceOwnerGtGuideRows(rows) {
  const canonical=new Map(DEFAULT_RULES.filter(r=>Object.hasOwn(GT_GUIDE_PRIORITIES,r.id))
    .map(r=>[r.id,{...r,priority:GT_GUIDE_PRIORITIES[r.id],source:'all',enabled:true,kind:'GUIDE'}]));
  const seen=new Set();
  const corrected=rows.map(rule=>{
    const fixed=canonical.get(rule?.id);
    if(!fixed)return rule;
    seen.add(rule.id);
    return {...rule,...fixed};
  });
  return [...corrected,...[...canonical.values()].filter(r=>!seen.has(r.id))];
}

export function completeStep7Rules(rows,config) {
  const ids=new Set(rows.map(r=>toText(r?.id)));
  return enforceOwnerGtGuideRows([...rows,...DEFAULT_STEP7_MDS_ROWS.filter(r=>!ids.has(r.id)&&mdsSeedEnabled(r,config))]);
}
