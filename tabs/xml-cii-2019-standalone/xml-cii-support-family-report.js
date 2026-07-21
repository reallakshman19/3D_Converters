import { serializeRowsToCsv } from './xml-cii-trace-export.js';

export const SUPPORT_FAMILY_REPORT_SCHEMA = 'xml-cii-support-family-report/v1';

export const SUPPORT_FAMILY_MEMBER_HEADERS = Object.freeze([
  'Report Row', 'Support Family Key', 'Support Family', 'Name of the element',
  'Reference of the element', 'TYPE', 'PIPE', 'Branch Root', 'Position',
  'Position Easting', 'Position Northing', 'Position Elevation', 'Position Source',
  'BORE', 'OUTSIDE DIAMETER', 'RTEXT of detailing text', 'ISOMETRIC NOTES',
  'DTXR', 'DTXR_POS', 'DTXR_PS', 'DTXR_SOURCE', 'DTXR_FALLBACK_USED',
  'DTXR_STATUS', 'SUPPORT GAP', 'ANCILIARY SUPPORT REFERENCE',
  'Component spec reference', 'SITE', 'JsonNodeNo', 'JSON Path',
  'DTXR Source Node No', 'DTXR Source Path', 'Resolver Group ID',
  'Candidate Count', 'Resolution Status', 'Diagnostics',
]);

export const SUPPORT_FAMILY_SUMMARY_HEADERS = Object.freeze([
  'Support Family Key', 'Support Family', 'PIPE', 'Branch Root', 'Member Count',
  'Member Identities', 'Datum Count', 'Positioned Member Count',
  'Unpositioned Member Count', 'Component Reference Count', 'Bores',
  'Outside Diameters', 'DTXR Count', 'DTXR_POS Count', 'DTXR_PS Count',
  'DTXR Fallback Count', 'Distinct DTXR Values', 'Derived Support Types',
  'Resolved Count', 'Ambiguous Count', 'Unresolved Count',
  'Duplicate Identity Count', 'Source JSON Paths', 'Family Status', 'Remarks',
]);

export const SUPPORT_FAMILY_DIAGNOSTIC_HEADERS = Object.freeze([
  'Severity', 'Code', 'Support Family Key', 'Support Family', 'Support Identity',
  'PIPE', 'JsonNodeNo', 'JSON Path', 'Raw Value', 'Message', 'Recommended Action',
]);

const IDENTITY_PATTERN = /(?:COPY\s*-\s*\(\s*(\d+)\s*\)\s*-\s*OF\s*-\s*)?\/?\s*PS\s*-?\s*(\d+)(?:\s*\.\s*(\d+))?(?:\s*\/\s*(DATUM))?/i;

function text(value) { return String(value ?? '').trim(); }
function rows(value) { return Array.isArray(value) ? value : []; }
function compareText(left, right) { const a = text(left); const b = text(right); return a < b ? -1 : (a > b ? 1 : 0); }
function uniqueSorted(values) { return [...new Set(values.map(text).filter(Boolean))].sort(compareText); }
function compact(value) { return text(value).toUpperCase().replace(/\s+/g, ' '); }
function numberOrBlank(value) { const numeric = Number(value); return Number.isFinite(numeric) ? numeric : ''; }
function pointIsValid(point) { return point && [point.x, point.y, point.z].map(Number).every(Number.isFinite); }

function pointLabel(point) {
  if (!pointIsValid(point)) return '';
  const format = (value) => String(Math.round(Number(value) * 1000) / 1000);
  return `E=${format(point.x)} N=${format(point.y)} EL=${format(point.z)}`;
}

export function normalizeSupportIdentity(value) {
  const match = text(value).match(IDENTITY_PATTERN);
  if (!match) return '';
  const copyPrefix = match[1] ? `Copy-(${Number(match[1])})-of-` : '';
  const memberSuffix = match[3] ? `.${match[3]}` : '';
  const datumSuffix = match[4] ? '/DATUM' : '';
  return `${copyPrefix}PS-${match[2]}${memberSuffix}${datumSuffix}`;
}

export function supportFamilyFromIdentity(value) {
  const match = text(value).match(/PS-(\d+)/i);
  return match ? `PS-${match[1]}` : '';
}

function identitySources(entry) {
  return [
    entry?.name,
    entry?.componentRef,
    entry?.dtxrPs,
    entry?.description,
    entry?.labeled,
    ...rows(entry?.tags),
  ];
}

export function supportIdentityFromEntry(entry) {
  for (const source of identitySources(entry)) {
    const identity = normalizeSupportIdentity(source);
    if (identity) return identity;
  }
  return '';
}

function dtxrModel(entry) {
  const dtxrPos = text(entry?.labeled || entry?.description);
  const dtxrPs = text(entry?.dtxrPs);
  const effective = dtxrPos || dtxrPs;
  const source = dtxrPos ? 'DTXR_POS' : (dtxrPs ? 'DTXR_PS_FALLBACK' : 'NONE');
  let status = 'DTXR_MISSING';
  if (dtxrPos && !dtxrPs) status = 'DTXR_POS_ONLY';
  else if (!dtxrPos && dtxrPs) status = 'DTXR_PS_ONLY';
  else if (dtxrPos && dtxrPs) status = compact(dtxrPos) === compact(dtxrPs)
    ? 'DTXR_POS_AND_PS_EQUAL'
    : 'DTXR_POS_AND_PS_DIFFERENT';
  return { dtxrPos, dtxrPs, effective, source, fallbackUsed: source === 'DTXR_PS_FALLBACK', status };
}

function diagnostic(severity, code, member, rawValue, message, recommendedAction) {
  return {
    Severity: severity,
    Code: code,
    'Support Family Key': member['Support Family Key'],
    'Support Family': member['Support Family'],
    'Support Identity': member['Name of the element'],
    PIPE: member.PIPE,
    JsonNodeNo: member.JsonNodeNo,
    'JSON Path': member['JSON Path'],
    'Raw Value': text(rawValue),
    Message: message,
    'Recommended Action': recommendedAction,
    _memberKey: member._memberKey,
  };
}

function baseDiagnostics(member) {
  const output = [];
  if (!member['Name of the element']) output.push(diagnostic('WARNING', 'SUPPORT_IDENTITY_MISSING', member, member.DTXR_POS || member.DTXR_PS, 'No canonical PS identity could be derived from the normalized ledger entry.', 'Review NAME, component reference, and detailing evidence in the staged source.'));
  if (!member['Support Family']) output.push(diagnostic('WARNING', 'SUPPORT_FAMILY_MISSING', member, member['Name of the element'], 'A support family root could not be derived.', 'Correct or map the support identity before family-level review.'));
  if (!member['Branch Root']) output.push(diagnostic('ERROR', 'BRANCH_MISSING', member, member.PIPE, 'The authoritative branch root is missing.', 'Restore branch ownership in the staged hierarchy.'));
  if (!member.Position) output.push(diagnostic('ERROR', 'POSITION_MISSING', member, '', 'The normalized ledger member has no position.', 'Expose position evidence through the authoritative resolver traversal.'));
  if (!member.BORE) output.push(diagnostic('INFO', 'BORE_MISSING', member, '', 'No bore value is present on the normalized ledger member.', 'Confirm whether inherited bore evidence is expected for this component.'));
  if (!member.DTXR) output.push(diagnostic('WARNING', 'DTXR_MISSING', member, '', 'Neither DTXR_POS nor DTXR_PS supplies detailing evidence.', 'Review staged detailing attributes for the support member.'));
  if (member.DTXR_FALLBACK_USED === 'TRUE') output.push(diagnostic('INFO', 'DTXR_PS_FALLBACK_USED', member, member.DTXR_PS, 'DTXR_PS supplies the effective DTXR because DTXR_POS is empty.', 'Review the fallback evidence; resolver precedence remains unchanged.'));
  if (member.DTXR_STATUS === 'DTXR_POS_AND_PS_DIFFERENT') output.push(diagnostic('WARNING', 'DTXR_POS_PS_CONFLICT', member, `${member.DTXR_POS} | ${member.DTXR_PS}`, 'DTXR_POS and DTXR_PS are both present and differ.', 'Retain DTXR_POS as primary and review the differing support-specific note.'));
  if (!member['JSON Path']) output.push(diagnostic('ERROR', 'SOURCE_PATH_MISSING', member, '', 'The normalized source path is missing.', 'Do not approve the row until exact staged provenance is restored.'));
  return output;
}

function recordsByGroup(result) {
  const index = new Map();
  const records = rows(result?.resolutionLedger).length
    ? rows(result.resolutionLedger)
    : rows(result?.traceResolutionLedger?.records);
  for (const record of records) {
    const groupId = text(record?.groupId);
    if (!groupId) continue;
    index.set(groupId, [...(index.get(groupId) || []), record]);
  }
  return index;
}

function groupResolution(records) {
  const values = rows(records);
  return {
    candidateCount: Math.max(0, ...values.map((record) => Number(record?.candidateCount) || 0)),
    statuses: uniqueSorted(values.map((record) => record?.status)),
    supportTypes: uniqueSorted(values.flatMap((record) => rows(record?.derivedSupportTypes))),
  };
}

function memberFromEntry(entry, group, groupRecords, rowNo) {
  const identity = supportIdentityFromEntry(entry);
  const family = supportFamilyFromIdentity(identity);
  const branchRoot = text(entry?.branch?.root || group?.branch?.root);
  const familyKey = branchRoot && family ? `${branchRoot}::${family}` : '';
  const dtxr = dtxrModel(entry);
  const resolution = groupResolution(groupRecords);
  const sourcePath = text(entry?.path);
  const jsonNodeNo = text(entry?.jsonNodeNo);
  const member = {
    'Report Row': rowNo,
    'Support Family Key': familyKey,
    'Support Family': family,
    'Name of the element': identity,
    'Reference of the element': text(entry?.componentRef),
    TYPE: text(entry?.type),
    PIPE: text(entry?.branchName || group?.branch?.original || group?.branch?.full),
    'Branch Root': branchRoot,
    Position: pointLabel(entry?.point || group?.anchor),
    'Position Easting': pointIsValid(entry?.point || group?.anchor) ? numberOrBlank((entry?.point || group?.anchor).x) : '',
    'Position Northing': pointIsValid(entry?.point || group?.anchor) ? numberOrBlank((entry?.point || group?.anchor).y) : '',
    'Position Elevation': pointIsValid(entry?.point || group?.anchor) ? numberOrBlank((entry?.point || group?.anchor).z) : '',
    'Position Source': 'RESOLVER_LEDGER',
    BORE: text(entry?.bore),
    'OUTSIDE DIAMETER': '',
    'RTEXT of detailing text': dtxr.dtxrPos,
    'ISOMETRIC NOTES': dtxr.dtxrPs,
    DTXR: dtxr.effective,
    DTXR_POS: dtxr.dtxrPos,
    DTXR_PS: dtxr.dtxrPs,
    DTXR_SOURCE: dtxr.source,
    DTXR_FALLBACK_USED: dtxr.fallbackUsed ? 'TRUE' : 'FALSE',
    DTXR_STATUS: dtxr.status,
    'SUPPORT GAP': text(entry?.cmpSupGap),
    'ANCILIARY SUPPORT REFERENCE': '',
    'Component spec reference': '',
    SITE: '',
    JsonNodeNo: jsonNodeNo,
    'JSON Path': sourcePath,
    'DTXR Source Node No': dtxr.effective ? jsonNodeNo : '',
    'DTXR Source Path': dtxr.effective ? sourcePath : '',
    'Resolver Group ID': text(group?.id),
    'Candidate Count': resolution.candidateCount,
    'Resolution Status': resolution.statuses.join(' | ') || 'UNREFERENCED',
    Diagnostics: '',
    _derivedSupportTypes: resolution.supportTypes,
    _memberKey: `${text(group?.id)}\u001f${sourcePath}\u001f${jsonNodeNo}\u001f${rowNo}`,
  };
  return member;
}

function memberSort(left, right) {
  return compareText(left['Branch Root'], right['Branch Root'])
    || compareText(left['Support Family'], right['Support Family'])
    || compareText(left['Name of the element'], right['Name of the element'])
    || (Number(left['Position Easting']) || 0) - (Number(right['Position Easting']) || 0)
    || (Number(left['Position Northing']) || 0) - (Number(right['Position Northing']) || 0)
    || (Number(left['Position Elevation']) || 0) - (Number(right['Position Elevation']) || 0)
    || compareText(left.JsonNodeNo, right.JsonNodeNo)
    || compareText(left['JSON Path'], right['JSON Path']);
}

function addCrossMemberDiagnostics(members, diagnostics) {
  const byFamilyIdentity = new Map();
  const rootsByIdentity = new Map();
  for (const member of members) {
    const identity = member['Name of the element'];
    const familyKey = member['Support Family Key'];
    if (identity && familyKey) {
      const key = `${familyKey}\u001f${identity}`;
      byFamilyIdentity.set(key, [...(byFamilyIdentity.get(key) || []), member]);
      const roots = rootsByIdentity.get(identity) || new Set();
      if (member['Branch Root']) roots.add(member['Branch Root']);
      rootsByIdentity.set(identity, roots);
    }
  }
  for (const duplicates of byFamilyIdentity.values()) {
    if (duplicates.length < 2) continue;
    for (const member of duplicates) diagnostics.push(diagnostic('WARNING', 'SUPPORT_IDENTITY_DUPLICATE', member, member['Name of the element'], 'The same full support identity occurs more than once in the branch-qualified family.', 'Review copy identity, source path, and member suffix before accepting the family.'));
  }
  for (const member of members) {
    const roots = rootsByIdentity.get(member['Name of the element']);
    if (roots?.size > 1) diagnostics.push(diagnostic('INFO', 'SUPPORT_MEMBER_MULTI_BRANCH', member, [...roots].sort(compareText).join(' | '), 'The same full support identity is present under multiple canonical branch roots.', 'Keep branch-qualified family keys; do not merge these occurrences globally.'));
  }
}

function applyDiagnosticCodes(members, diagnostics) {
  const byMember = new Map();
  for (const item of diagnostics) {
    const key = item._memberKey;
    if (!key) continue;
    byMember.set(key, [...(byMember.get(key) || []), item.Code]);
  }
  return members.map((member) => ({
    ...member,
    Diagnostics: uniqueSorted(byMember.get(member._memberKey) || []).join(' | '),
  }));
}

function familyStatus(group, diagnostics) {
  const codes = new Set(diagnostics.map((item) => item.Code));
  if (codes.has('SUPPORT_IDENTITY_DUPLICATE')) return 'DUPLICATE_MEMBER';
  if (group.some((member) => member['Resolution Status'].includes('AMBIGUOUS'))) return 'AMBIGUOUS_MEMBER';
  if (group.some((member) => !member.Position)) return 'PARTIAL_POSITION';
  if (group.some((member) => !member.DTXR)) return 'DTXR_INCOMPLETE';
  if (group.some((member) => /UNRESOLVED|UNREFERENCED/.test(member['Resolution Status']))) return 'UNRESOLVED';
  return 'COMPLETE';
}

function summaryRows(members, diagnostics) {
  const groups = new Map();
  for (const member of members) {
    if (!member['Support Family Key']) continue;
    groups.set(member['Support Family Key'], [...(groups.get(member['Support Family Key']) || []), member]);
  }
  const output = [];
  for (const [familyKey, familyMembers] of groups) {
    const familyDiagnostics = diagnostics.filter((item) => item['Support Family Key'] === familyKey);
    const resolved = familyMembers.filter((member) => member['Resolution Status'].includes('RESOLVED_')).length;
    const ambiguous = familyMembers.filter((member) => member['Resolution Status'].includes('AMBIGUOUS')).length;
    const unresolved = familyMembers.length - resolved - ambiguous;
    output.push({
      'Support Family Key': familyKey,
      'Support Family': familyMembers[0]['Support Family'],
      PIPE: uniqueSorted(familyMembers.map((member) => member.PIPE)).join(' | '),
      'Branch Root': familyMembers[0]['Branch Root'],
      'Member Count': familyMembers.length,
      'Member Identities': uniqueSorted(familyMembers.map((member) => member['Name of the element'])).join(' | '),
      'Datum Count': familyMembers.filter((member) => member['Name of the element'].endsWith('/DATUM')).length,
      'Positioned Member Count': familyMembers.filter((member) => member.Position).length,
      'Unpositioned Member Count': familyMembers.filter((member) => !member.Position).length,
      'Component Reference Count': uniqueSorted(familyMembers.map((member) => member['Reference of the element'])).length,
      Bores: uniqueSorted(familyMembers.map((member) => member.BORE)).join(' | '),
      'Outside Diameters': uniqueSorted(familyMembers.map((member) => member['OUTSIDE DIAMETER'])).join(' | '),
      'DTXR Count': familyMembers.filter((member) => member.DTXR).length,
      'DTXR_POS Count': familyMembers.filter((member) => member.DTXR_POS).length,
      'DTXR_PS Count': familyMembers.filter((member) => member.DTXR_PS).length,
      'DTXR Fallback Count': familyMembers.filter((member) => member.DTXR_FALLBACK_USED === 'TRUE').length,
      'Distinct DTXR Values': uniqueSorted(familyMembers.map((member) => member.DTXR)).join(' | '),
      'Derived Support Types': uniqueSorted(familyMembers.flatMap((member) => member._derivedSupportTypes)).join(' | '),
      'Resolved Count': resolved,
      'Ambiguous Count': ambiguous,
      'Unresolved Count': unresolved,
      'Duplicate Identity Count': familyDiagnostics.filter((item) => item.Code === 'SUPPORT_IDENTITY_DUPLICATE').length,
      'Source JSON Paths': uniqueSorted(familyMembers.map((member) => member['JSON Path'])).join(' | '),
      'Family Status': familyStatus(familyMembers, familyDiagnostics),
      Remarks: familyMembers.some((member) => member.DTXR_STATUS === 'DTXR_POS_AND_PS_DIFFERENT') ? 'DTXR_POS remains primary where DTXR_POS and DTXR_PS differ.' : '',
    });
  }
  return output.sort((left, right) => compareText(left['Branch Root'], right['Branch Root']) || compareText(left['Support Family'], right['Support Family']));
}

function publicRows(data) {
  return data.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => !key.startsWith('_'))));
}

export function buildSupportFamilyReport(resolverResult) {
  const groupIndex = recordsByGroup(resolverResult);
  const groups = rows(resolverResult?.traceResolutionLedger?.groups).length
    ? rows(resolverResult.traceResolutionLedger.groups)
    : rows(resolverResult?.positionIndex?.groups);
  let nextRow = 1;
  const members = [];
  for (const group of groups) {
    for (const entry of rows(group?.entries)) {
      members.push(memberFromEntry(entry, group, groupIndex.get(text(group?.id)) || [], nextRow));
      nextRow += 1;
    }
  }
  members.sort(memberSort);
  members.forEach((member, index) => { member['Report Row'] = index + 1; });
  const diagnostics = members.flatMap(baseDiagnostics);
  addCrossMemberDiagnostics(members, diagnostics);
  diagnostics.sort((left, right) => compareText(left['Support Family Key'], right['Support Family Key'])
    || compareText(left['Support Identity'], right['Support Identity'])
    || compareText(left.Code, right.Code)
    || compareText(left['JSON Path'], right['JSON Path']));
  const finalMembers = applyDiagnosticCodes(members, diagnostics);
  const summaries = summaryRows(finalMembers, diagnostics);
  return {
    schema: SUPPORT_FAMILY_REPORT_SCHEMA,
    sourceKind: 'resolver-ledger',
    sourceLedgerSchema: text(resolverResult?.traceResolutionLedger?.schema),
    members: publicRows(finalMembers),
    summaries: publicRows(summaries),
    diagnostics: publicRows(diagnostics),
    counts: {
      stagedEntries: finalMembers.length,
      supportIdentities: finalMembers.filter((member) => member['Name of the element']).length,
      supportFamilies: summaries.length,
      positionedEntries: finalMembers.filter((member) => member.Position).length,
      dtxrEntries: finalMembers.filter((member) => member.DTXR).length,
      diagnostics: diagnostics.length,
    },
    limitations: ['Only entries exposed by the authoritative resolver position groups are included; coordinate-less staged objects remain outside this projection.'],
  };
}

export function buildSupportFamilyMembersCsv(report) {
  return serializeRowsToCsv(SUPPORT_FAMILY_MEMBER_HEADERS, rows(report?.members));
}

export function buildSupportFamilySummaryCsv(report) {
  return serializeRowsToCsv(SUPPORT_FAMILY_SUMMARY_HEADERS, rows(report?.summaries));
}

export function buildSupportFamilyDiagnosticsCsv(report) {
  return serializeRowsToCsv(SUPPORT_FAMILY_DIAGNOSTIC_HEADERS, rows(report?.diagnostics));
}
