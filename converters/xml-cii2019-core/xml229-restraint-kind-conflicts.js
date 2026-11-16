/**
 * XML229 restraint source conflict custody.
 *
 * A named ST/GT physical support member and a conflicting NODETYPE are two
 * independent source claims, not permission to silently change the CII kind.
 * Preview may quarantine the conflict; native Final requires a source-bound,
 * explicitly reviewed resolution for that EXACT member and exact raw fields.
 */
import { nodeTypeSupportKind } from './support-kind-precedence.js';

const text = value => value == null ? '' : String(value).trim();
const kindField = Object.freeze({ ST: 'LINESTOP', GT: 'GUIDE' });

export function identifyXml229MdsKindConflict(attrs = {}, config = {}) {
  const functionCode = text(attrs.MDSSUPPFUNC).toUpperCase();
  const physicalKind = kindField[functionCode] || '';
  const mdsType = text(attrs.MDSSUPPTYPE).toUpperCase();
  const catalogue = text(attrs.CMPSUPTYPE).toUpperCase();
  const gap = text(attrs.CMPSUPGAP);
  // Use mutually corroborating original member fields, not a loosely matched
  // ST/GT substring from an unrelated catalogue path.
  if (!physicalKind || !new RegExp('^' + functionCode + '[0-9]+$').test(mdsType) ||
      !(functionCode === 'ST' ? /^LS-[A-Z0-9-]+$/.test(catalogue)
        : /^PG-[A-Z0-9-]+$/.test(catalogue))) return null;
  // ATT/RVM Step 7 exports may add a proposed NODETYPE. If the original
  // NODETYPE was retained separately, it still owns engineering classification.
  const rawNodeType=Object.prototype.hasOwnProperty.call(attrs,'SOURCE_NODETYPE')
    ?text(attrs.SOURCE_NODETYPE):text(attrs.NODETYPE);
  const typedKind = nodeTypeSupportKind({...attrs,NODETYPE:rawNodeType}, config);
  if (!typedKind || typedKind === physicalKind) return null;
  return {
    code: 'PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT',
    sourceKind: typedKind,
    candidateKind: physicalKind,
    sourceName: text(attrs.NAME),
    fields: {
      NAME: text(attrs.NAME), NODETYPE: rawNodeType,
      MDSSUPPFUNC: text(attrs.MDSSUPPFUNC),
      MDSSUPPTYPE: text(attrs.MDSSUPPTYPE),
      CMPSUPTYPE: text(attrs.CMPSUPTYPE),
      CMPSUPGAP: gap,
    },
  };
}

export function approvedXml229MdsKindResolution(attrs = {}, config = {}, conflict = null) {
  if (!conflict) return null;
  // A type approval without an explicit source gap would silently invent
  // zero clearance. Keep gapless ST/GT members in HOLD until evidenced.
  if (!/[-+]?\d+(?:\.\d+)?\s*mm/i.test(conflict.fields.CMPSUPGAP)) return null;
  const rows = config.xml229RestraintKindOverrides;
  if (!Array.isArray(rows)) return null;
  // Fail closed if duplicate records claim incompatible decisions for a
  // single source member, including when one is marked unapproved.
  const matches = rows.filter(row => text(row?.memberName) &&
    text(row.memberName) === conflict.sourceName);
  if (matches.length > 1) {
    const error = new Error('Duplicate source-bound restraint kind override for ' + conflict.sourceName);
    error.code = 'PREFINAL_RESTRAINT_OVERRIDE_AMBIGUOUS';
    throw error;
  }
  const row = matches[0];
  if (!row || row.approved !== true || text(row.kind).toUpperCase() !== conflict.candidateKind ||
      !text(row.evidenceRef) || !text(row.approvedBy)) return null;
  for (const [field, value] of Object.entries(conflict.fields)) {
    if (text(row.expected?.[field]) !== value) return null;
  }
  return {kind: conflict.candidateKind, source: 'approved-source-bound-conflict-resolution',
    rule: {id:'xml229-exact-mdssupport-override', evidenceRef:text(row.evidenceRef),
      approvedBy:text(row.approvedBy), memberName:conflict.sourceName,
      originalKind:conflict.sourceKind, candidateKind:conflict.candidateKind,
      sourceSnapshot:conflict.fields}};
}

export function isQuarantinableXml229RestraintError(error) {
  // A bad Step 7/8 configuration must NEVER be hidden as a local warning.
  // Only the exact source-bound ST/GT contradiction may quarantine this code.
  if (text(error?.code) === 'PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT')
    return !!(error?.sourceName && error?.candidateKind && error?.fields?.NODETYPE);
  return new Set([
    'PREFINAL_RESTRAINT_TYPE_AMBIGUOUS',
    'PREFINAL_RESTRAINT_GAP_AMBIGUOUS',
    'PREFINAL_RESTRAINT_GAP_INVALID',
    'PREFINAL_RESTRAINT_MATCH_AMBIGUOUS',
  ]).has(text(error?.code));
}

export function xml229RestraintConflictError(conflict) {
  const error = new Error(
    'Conflicting source classifications at ' + conflict.sourceName +
    ': NODETYPE=' + conflict.fields.NODETYPE + ' gives ' + conflict.sourceKind +
    ' while ' + conflict.fields.MDSSUPPTYPE + '/' + conflict.fields.CMPSUPTYPE +
    ' with ' + conflict.fields.CMPSUPGAP + ' indicates ' + conflict.candidateKind +
    '. A source-bound approved override is required for engineering acceptance.');
  Object.assign(error, conflict);
  return error;
}
