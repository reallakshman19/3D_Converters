import { mutateRestraintType } from './restraint-type-mutation.js';
import { migrateSupportMappingConfig, supportRulesFromMapping } from './support-mapping-config.js';
import { resolveKindDescriptor } from '../../support/SupportKindResolver.js';

// Owner rule (12 Nov, RCA-04): which kind a staged support member is.
// 1. Source NODETYPE wins when present (after the 8 Config type mutation):
//    14 -> REST (+Y), 8 -> GUIDE (GUI), 9 -> LINESTOP (LIM).
// 2. Otherwise the Step 7 support table ("Use JSON/support mapper for
//    restraints"): its enabled rows in priority order, then the resolver's
//    built-in text pass, over the source evidence fields only. Generated
//    labels (SUPPORT_KIND / SUPPORT_MAPPER_KIND / SUPPORT_TYPE) never take part
//    in the table; they are the weakest evidence, used only when nothing else
//    decides. MDSDTXR stands in as the description when DTXR/DESC/DESCRIPTION
//    are blank.
// 3. A description that names two kinds, or one kind the table contradicts,
//    is not decided here: the caller's fail-closed checks handle it.
// Python mirror: converters/scripts/xml229_support_type_mapper.py owner_rule_kind().
const KIND_BY_CAESAR_CODE = Object.freeze({ 14: 'REST', 8: 'GUIDE', 9: 'LINESTOP' });
const CODE_BY_LABEL = Object.freeze({ '+Y': 14, GUI: 8, LIM: 9 });
const GOVERNED = Object.freeze(['REST', 'GUIDE', 'LINESTOP']);
const DESCRIPTION_KEYS = Object.freeze(['DTXR', 'DESC', 'DESCRIPTION']);
const TABLE_FIELDS = Object.freeze(['DTXR', 'DESC', 'DESCRIPTION', 'MDSDTXR', 'SPRE', 'SKEY', 'NAME',
  'CMPSUPTYPE', 'MDSSUPPTYPE', 'COMPONENTTYPE']);
const GENERATED_FIELDS = Object.freeze(['SUPPORTKIND', 'SUPPORTMAPPERKIND', 'SUPPORTTYPE']);

const text = (value) => (value === undefined || value === null ? '' : String(value).trim());
const fieldKey = (key) => text(key).toUpperCase().replace(/[^A-Z0-9]/g, '');

function fields(attrs = {}) {
  const out = {};
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value !== null && typeof value === 'object') continue;
    const name = fieldKey(key);
    if (!(name in out) && text(value)) out[name] = text(value);
  }
  return out;
}

export function nodeTypeSupportKind(attrs = {}, config = {}) {
  const raw = text(fields(attrs).NODETYPE);
  if (!raw) return '';
  const mutation = config?.inputXmlRestraintTypeMutation || config?.restraintTypeMutation || {};
  // A saved 8 Config row whose label contradicts its target code (e.g. a
  // legacy "LIM 7 -> 8") must never decide the kind silently.
  const row = mutation.enabled === false || !Array.isArray(mutation.rows) ? null
    : mutation.rows.find((entry) => text(entry?.from) !== '' && Number(text(entry?.from)) === Number(raw));
  const labelCode = CODE_BY_LABEL[text(row?.label).toUpperCase()];
  if (row && labelCode && Number(text(row.to)) !== labelCode) {
    throw Object.assign(new Error(`8 Config row ${text(row.label)} maps NODETYPE ${text(row.from)} to ${text(row.to)}, not ${labelCode}`),
      { code: 'PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT' });
  }
  const code = Number(mutateRestraintType(raw, mutation));
  return Number.isInteger(code) ? (KIND_BY_CAESAR_CODE[code] || '') : '';
}

// Kinds the source description itself names (same patterns as the Run closure).
export function describedKinds(attrs = {}) {
  const f = fields(attrs);
  const primary = DESCRIPTION_KEYS.map((key) => text(f[key])).filter(Boolean);
  const desc = (primary.length ? primary.join(' ') : text(f.MDSDTXR)).toUpperCase();
  const stop = /\b(?:PIPE\s*STOP|LINE\s*STOP|LINESTOP|LIMIT\s*STOP|AXIAL\s*STOP|DIRECTIONAL\s+ANCHOR)\b/.test(desc);
  const guide = /\bGUIDE\b/.test(desc);
  const rest = /\b(?:PIPE[- ]?REST|REST)\b/.test(desc) || (!stop && !guide && /\bSHOE\b/.test(desc));
  return [stop && 'LINESTOP', guide && 'GUIDE', rest && 'REST'].filter(Boolean);
}

export function tableSupportKind(attrs = {}, config = {}) {
  const f = fields(attrs);
  const evidence = {};
  for (const key of TABLE_FIELDS) if (f[key]) evidence[key] = f[key];
  if (!DESCRIPTION_KEYS.some((key) => evidence[key]) && evidence.MDSDTXR) evidence.DESCRIPTION = evidence.MDSDTXR;
  const rules = supportRulesFromMapping(migrateSupportMappingConfig(config || {}));
  return resolveKindDescriptor(evidence, { userRules: rules, defaultRules: [], kindMap: {}, defaultKind: '' }).primaryKind || '';
}

export function generatedSupportKind(attrs = {}) {
  const f = fields(attrs);
  for (const key of GENERATED_FIELDS) {
    const kind = text(f[key]).toUpperCase().replace(/\s+/g, '');
    if (kind) return kind;
  }
  return '';
}

export function governedSupportKind(attrs = {}, config = {}, governed = GOVERNED) {
  const byNodeType = nodeTypeSupportKind(attrs, config);
  if (byNodeType && governed.includes(byNodeType)) return { kind: byNodeType, source: 'NODETYPE' };
  const described = describedKinds(attrs);
  if (described.length > 1) return { kind: '', source: 'description-conflict' };
  const byTable = tableSupportKind(attrs, config);
  if (byTable) {
    if (described.length === 1 && byTable !== described[0]) return { kind: '', source: 'description-conflict' };
    return governed.includes(byTable) ? { kind: byTable, source: 'step7-support-table' } : { kind: '', source: 'step7-not-governed' };
  }
  const generated = generatedSupportKind(attrs);
  if (governed.includes(generated)) return { kind: generated, source: 'generated-label' };
  return { kind: '', source: '' };
}

// The staged fields the rule reads; trace capture keeps them for the closure.
export const SUPPORT_KIND_EVIDENCE_FIELDS = Object.freeze([
  'DTXR', 'DESC', 'DESCRIPTION', 'MDSDTXR', 'SPRE', 'SKEY', 'NAME', 'CMPSUPTYPE', 'MDSSUPPTYPE',
  'SUPPORT_KIND', 'SUPPORT_TYPE', 'SUPPORT_MAPPER_KIND', 'NODETYPE', 'NODEGAP', 'CMPSUPGAP',
]);
