import { mutateRestraintType } from './restraint-type-mutation.js';
import { resolveXmlCiiSupportDescriptor } from './support-mapping.js';

// Owner rule (12 Nov, RCA-04): which kind a staged support member is.
// 1. Source NODETYPE wins when present (after the 8 Config type mutation):
//    14 -> REST (+Y), 8 -> GUIDE (GUI), 9 -> LINESTOP (LIM).
// 2. Otherwise the Step 7 table ("Use JSON/support mapper for restraints")
//    decides. Its rules run without the generated SUPPORT_KIND/TYPE labels,
//    and a generated REST is its weakest evidence.
// MDSDTXR stands in as the description when DTXR/DESC/DESCRIPTION are blank.
const KIND_BY_CAESAR_CODE = Object.freeze({ 14: 'REST', 8: 'GUIDE', 9: 'LINESTOP' });
const DESCRIPTION_KEYS = Object.freeze(['DTXR', 'DESC', 'DESCRIPTION']);
const GOVERNED = Object.freeze(['REST', 'GUIDE', 'LINESTOP']);

const text = (value) => (value === undefined || value === null ? '' : String(value).trim());

const CODE_BY_LABEL = Object.freeze({ '+Y': 14, GUI: 8, LIM: 9 });

export function nodeTypeSupportKind(attrs = {}, config = {}) {
  const raw = text(attrs?.NODETYPE);
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
function describedKinds(evidence) {
  const primary = DESCRIPTION_KEYS.map((key) => text(evidence[key])).filter(Boolean);
  const desc = (primary.length ? primary.join(' ') : text(evidence.MDSDTXR)).toUpperCase();
  const stop = /\b(?:PIPE\s*STOP|LINE\s*STOP|LINESTOP|LIMIT\s*STOP|AXIAL\s*STOP|DIRECTIONAL\s+ANCHOR)\b/.test(desc);
  const guide = /\bGUIDE\b/.test(desc);
  const rest = /\b(?:PIPE[- ]?REST|REST)\b/.test(desc) || (!stop && !guide && /\bSHOE\b/.test(desc));
  return [stop && 'LINESTOP', guide && 'GUIDE', rest && 'REST'].filter(Boolean);
}

export function tableSupportKind(attrs = {}, config = {}) {
  const evidence = { ...(attrs || {}) };
  if (!DESCRIPTION_KEYS.some((key) => text(evidence[key])) && text(evidence.MDSDTXR)) {
    evidence.DESCRIPTION = text(evidence.MDSDTXR);
  }
  return resolveXmlCiiSupportDescriptor(evidence, config || {}).primaryKind || '';
}

export function governedSupportKind(attrs = {}, config = {}, governed = GOVERNED) {
  const byNodeType = nodeTypeSupportKind(attrs, config);
  if (byNodeType && governed.includes(byNodeType)) return { kind: byNodeType, source: 'NODETYPE' };
  // A description naming two kinds stays a review case (fail closed); the
  // table's priority order must not pick one silently.
  if (describedKinds(attrs || {}).length > 1) return { kind: '', source: 'description-conflict' };
  const byTable = tableSupportKind(attrs, config);
  if (governed.includes(byTable)) return { kind: byTable, source: 'step7-support-table' };
  return { kind: '', source: '' };
}

// The staged fields the rule reads; trace capture keeps them for the closure.
export const SUPPORT_KIND_EVIDENCE_FIELDS = Object.freeze([
  'DTXR', 'DESC', 'DESCRIPTION', 'MDSDTXR', 'SPRE', 'SKEY', 'NAME', 'CMPSUPTYPE', 'MDSSUPPTYPE',
  'SUPPORT_KIND', 'SUPPORT_TYPE', 'SUPPORT_MAPPER_KIND', 'NODETYPE', 'NODEGAP', 'CMPSUPGAP',
]);
