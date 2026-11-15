import { mutateRestraintType } from './restraint-type-mutation.js';
import { migrateSupportMappingConfig } from './support-mapping-config.js';

// Owner rule (12 Nov, RCA-04): which kind a staged support member is.
// 1. Source NODETYPE wins when present (after the 8 Config type mutation):
//    14 -> REST (+Y), 8 -> GUIDE (GUI), 9 -> LINESTOP (LIM).
// 2. Otherwise the Step 7 support table ("Use JSON/support mapper for
//    restraints"): its enabled rows for staged JSON, in priority order, then
//    the keyword text pass. Explicit field rules execute against source values;
//    generic intent rows visibly exclude catalogue paths and generated labels.
//    Generated labels (SUPPORT_KIND / SUPPORT_MAPPER_KIND / SUPPORT_TYPE) are
//    the weakest evidence, used only when nothing else decides.
// 3. Fail closed, as before: rows of equal priority that match with different
//    kinds, and a regex outside the shared JS/Python subset or over 512 chars,
//    are refused. A description naming two kinds, or one kind the table
//    contradicts, is left to the caller's fail-closed chain.
// Python mirror: converters/scripts/xml229_support_type_mapper.py owner_rule_kind().
const KIND_BY_CAESAR_CODE = Object.freeze({ 14: 'REST', 8: 'GUIDE', 9: 'LINESTOP' });
const CODE_BY_LABEL = Object.freeze({ '+Y': 14, GUI: 8, LIM: 9 });
const GOVERNED = Object.freeze(['REST', 'GUIDE', 'LINESTOP']);
const SUPPORT_KINDS = Object.freeze(['REST', 'GUIDE', 'LINESTOP', 'LIMIT', 'ANCHOR', 'SPRING']);
const DESCRIPTION_KEYS = Object.freeze(['DTXR', 'DESC', 'DESCRIPTION']);
const TEXT_FALLBACK_FIELDS = Object.freeze(['DTXR', 'DESC', 'DESCRIPTION', 'MDSDTXR', 'CMPSUPTYPE', 'MDSSUPPTYPE',
  'SKEY', 'COMPONENTTYPE']);
const GENERATED_FIELDS = Object.freeze(['SUPPORTKIND', 'SUPPORTMAPPERKIND', 'SUPPORTTYPE']);
const STAGED_SOURCES = Object.freeze(['', 'ALL', 'STAGED-JSON', 'JSON']);
// Regex syntax that JS and Python read differently (or only one reads).
const REGEX_OUTSIDE_SUBSET = /\(\?(?![:=!]|<[=!])|\\[AZzGpPk]|\$\{|\(\?P/;

const text = (value) => (value === undefined || value === null ? '' : String(value).trim());
const fieldKey = (key) => text(key).toUpperCase().replace(/[^A-Z0-9]/g, '');
const refuse = (code, message) => Object.assign(new Error(`${code}: ${message}`), { code });

function fields(attrs = {}) {
  const out = Object.create(null);
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
    throw refuse('PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT',
      `8 Config row ${text(row.label)} maps NODETYPE ${text(row.from)} to ${text(row.to)}, not ${labelCode}`);
  }
  const code = Number(mutateRestraintType(raw, mutation));
  if(!Number.isInteger(code)||code<1||code>62)
    throw refuse('PREFINAL_RESTRAINT_TYPE_INVALID','Source NODETYPE or its configured mutation is outside CAESAR codes 1–62');
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

// The Step 7 rows that apply to staged JSON, enabled, in priority order.
export function tableRules(config = {}) {
  return (migrateSupportMappingConfig(config || {}).rules || [])
    .filter((rule) => rule && rule.enabled !== false && STAGED_SOURCES.includes(text(rule.source).toUpperCase()))
    .map((rule) => ({ id: text(rule.id), priority: Number(rule.priority ?? 0), field: text(rule.field || '*') || '*',
      match: rule.match, pattern: text(rule.pattern), kind: text(rule.kind).toUpperCase() }))
    .sort((a, b) => a.priority - b.priority);
}

const terms = (value) => String(value || '').split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean);
const fieldName = (name) => {
  const trimmed = String(name || '').trim();
  return trimmed === '*' ? '*' : trimmed.replace(/^<+|>+$/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
};

function ruleEvidence(evidence, rule) {
  const wanted = terms(rule.field).map(fieldName);
  const wildcard=!wanted.length||wanted.includes('*')||wanted.includes('ANY');
  return Object.entries(evidence).filter(([key])=>wildcard||wanted.includes(key));
}

function compiledRegex(rule) {
  const pattern = rule.pattern.trim();
  if (pattern.length > 512 || REGEX_OUTSIDE_SUBSET.test(pattern)) {
    throw refuse('PREFINAL_RESTRAINT_CONFIG_INVALID', `Step 7 row ${rule.id} regex is not in the shared subset`);
  }
  try { return new RegExp(pattern, 'i'); } catch {
    throw refuse('PREFINAL_RESTRAINT_CONFIG_INVALID', `Step 7 row ${rule.id} regex does not compile`);
  }
}

function ruleMatches(rule, value) {
  const raw = String(value), upper = raw.toUpperCase();
  if (rule.match === 'regex') return rule.pattern.trim() !== '' && compiledRegex(rule).test(raw);
  return terms(rule.pattern).some((p) => {
    const up = p.toUpperCase();
    if (rule.match === 'startsWith') return upper.startsWith(up);
    if (rule.match === 'equals') return upper === up;
    return upper.includes(up);
  });
}

function kindFromText(value) {
  const t = String(value || '').toUpperCase();
  if (/\bDIRECTIONAL\s+ANCHOR\b|\bLINE\s*STOP\b|\bLINESTOP\b|\bLIMIT\s*STOP\b|\bAXIAL\s*STOP\b/.test(t)) return 'LINESTOP';
  if (/\bANC(HOR)?\b|\bFIX(ED)?\b|\bRIGID\b/.test(t)) return 'ANCHOR';
  if (/\bGUIDE\b|\bGDE\b|\bGUI\b|\bSLIDE\b|\bSLID\b|\bLATERAL\b/.test(t)) return 'GUIDE';
  if (/\bSPRING\b|\bHANGER\b/.test(t)) return 'SPRING';
  if (/\bREST(ING)?\b|\bRST\b|\bSHOE\b|\bBASE\s*PLATE\b|\bBEARING\s*PLATE\b|\bWEAR\s*PAD\b|\bBP\b|\bWP\b|\bANCI\b|\+Y\b/.test(t)) return 'REST';
  return '';
}

function matchTableRules(attrs,evidence,rules,observe) {
  let first = null;
  for (const rule of rules) {
    if (first && rule.priority !== first.priority) break;
    if (!SUPPORT_KINDS.includes(rule.kind)) continue;
    let matchEvidence=null;
    if (!ruleEvidence(evidence, rule).some(([field,value]) => {
      if(!ruleMatches(rule,value))return false;
      const sourceKey=field==='DESCRIPTION'&&!DESCRIPTION_KEYS.some(key=>fields(attrs)[key])&&
        fields(attrs).MDSDTXR?'MDSDTXR':field;
      matchEvidence={field,value,sourceField:Object.keys(attrs).find(key=>fieldKey(key)===sourceKey)||sourceKey};
      return true;
    })) continue;
    if (!first) { first = {...rule,matchEvidence}; continue; }
    if (rule.kind !== first.kind) {
      throw refuse('PREFINAL_RESTRAINT_KIND_AMBIGUOUS', `Step 7 rows ${first.id} and ${rule.id} have equal priority and different kinds`);
    }
  }
  if (first) {
    observe?.({ source: 'step7-support-table', rule: { ...first,value:first.matchEvidence.value } });
    return first.kind;
  }
  return '';
}

export function tableSupportKind(attrs = {}, config = {}, onlyUserRows = false, observe = null) {
  const f=fields(attrs),rules=tableRules(config);
  const evidence=Object.fromEntries(Object.entries(f).filter(([key])=>!GENERATED_FIELDS.includes(key)));
  if(!DESCRIPTION_KEYS.some(key=>evidence[key])&&evidence.MDSDTXR)evidence.DESCRIPTION=evidence.MDSDTXR;
  const isUserRow=rule=>!/^(?:builtin-|standalone-mds-)/.test(rule.id);
  const first=matchTableRules(attrs,evidence,rules.filter(row=>!onlyUserRows||isUserRow(row)),observe);
  if(first)return first;
  if (onlyUserRows) return '';
  const kind = kindFromText(TEXT_FALLBACK_FIELDS.map(key=>evidence[key]||'').join(' '));
  if (kind) observe?.({ source: 'step7-keywords',
    rule: { id: 'builtin-keyword:' + kind, field: Object.keys(evidence).join(','),
      match: 'engineering-keywords', pattern: Object.values(evidence).join(' ') } });
  return kind||matchTableRules(attrs,Object.fromEntries(Object.entries(f)
    .filter(([key])=>GENERATED_FIELDS.includes(key))),rules,observe);
}

// Project original scalar attributes for Preview independently of display fields.
export function projectSupportRuleEvidence(rawValue, config = {}, baseline = []) {
  const raw=rawValue&&typeof rawValue==='object'?rawValue:{};
  const attrs=raw.attributes||raw.ATTRIBUTES||raw.rawAttributes||raw;
  const rules=config.supportMapping?.rules;
  const names=(Array.isArray(rules)?rules:[]).filter(r=>r&&r.enabled!==false&&
    STAGED_SOURCES.includes(text(r.source||'all').toUpperCase()))
    .flatMap(r=>terms(r.field||'*')).map(fieldName);
  const wildcard=names.includes('*')||names.includes('ANY');
  const wanted=new Set([...baseline.map(fieldName),...names]);
  return Object.fromEntries(Object.entries(attrs).filter(([key,value])=>
    value!=null&&typeof value!=='object'&&text(value)&&(wildcard||wanted.has(fieldName(key)))));
}

export function generatedSupportKind(attrs = {}) {
  const f = fields(attrs);
  for (const key of GENERATED_FIELDS) {
    const kind = text(f[key]).toUpperCase().replace(/\s+/g, '');
    if (kind) return kind;
  }
  return '';
}

export function governedSupportKind(attrs = {}, config = {}, governed = GOVERNED, observe = null) {
  const byNodeType = nodeTypeSupportKind(attrs, config);
  if (byNodeType && governed.includes(byNodeType)) {
    // A user-authored Step 7 row that names this member as another governed
    // kind is a configuration clash: refuse instead of picking one.
    const userKind = tableSupportKind(attrs, config, true);
    if (governed.includes(userKind) && userKind !== byNodeType) {
      throw refuse('PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT', `NODETYPE gives ${byNodeType} but a Step 7 user row gives ${userKind}`);
    }
    observe?.({ kind: byNodeType, source: 'NODETYPE', rule: {
      id: 'source:NODETYPE', field: 'NODETYPE', rawValue: text(fields(attrs).NODETYPE),
      mutation: config.inputXmlRestraintTypeMutation || config.restraintTypeMutation || null,
    } });
    return { kind: byNodeType, source: 'NODETYPE' };
  }
  const described = describedKinds(attrs);
  if (described.length > 1) return { kind: '', source: 'description-conflict' };
  let decision = null;
  const byTable = tableSupportKind(attrs, config, false, value => { decision = value; });
  if (byTable) {
    if (described.length === 1 && byTable !== described[0]) return { kind: '', source: 'description-conflict' };
    if (governed.includes(byTable)) observe?.({ ...decision, kind: byTable });
    return governed.includes(byTable) ? { kind: byTable, source: 'step7-support-table' } : { kind: '', source: 'step7-not-governed' };
  }
  const generated = generatedSupportKind(attrs);
  if (governed.includes(generated)) {
    observe?.({ kind: generated, source: 'generated-label',
      rule: { id: 'source:generated-label', field: GENERATED_FIELDS.find(key => fields(attrs)[key]) } });
    return { kind: generated, source: 'generated-label' };
  }
  return { kind: '', source: '' };
}

// The staged fields the rule reads; trace capture keeps them for the closure.
export const SUPPORT_KIND_EVIDENCE_FIELDS = Object.freeze([
  'DTXR', 'DESC', 'DESCRIPTION', 'MDSDTXR', 'SPRE', 'SKEY', 'NAME', 'CMPSUPTYPE', 'MDSSUPPTYPE',
  'SUPPORT_KIND', 'SUPPORT_TYPE', 'SUPPORT_MAPPER_KIND', 'NODETYPE', 'NODEGAP', 'CMPSUPGAP',
]);
