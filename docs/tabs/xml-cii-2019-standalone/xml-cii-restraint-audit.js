/** Private run evidence. Records existing decisions; never classifies or writes restraints. */
import {digestCanonical, digestUtf8} from '../../contracts/gc-pw-v1/contract.mjs';

import {restraintPrecedence,selectRestraintGap,selectRestraintScalar} from '../../converters/xml-cii2019-core/restraint-precedence-policy.js';
import {mappedCodePrecedenceEnabled} from '../../converters/xml-cii2019-core/support-kind-precedence.js';

export const RESTRAINT_AUDIT_SCHEMA = 'XML229.RestraintAudit.v1';
const local = n => String(n?.localName || n?.nodeName || '').replace(/^.*:/, '');
const children = (n, tag) => [...(n?.childNodes || [])].filter(c => c.nodeType === 1 && local(c) === tag);
const value = (n, tag) => String(children(n, tag)[0]?.textContent ?? '').trim();
const fields = ['Type', 'Stiffness', 'Gap', 'Friction',
  'DirectionCosineX', 'DirectionCosineY', 'DirectionCosineZ'];
const type = v => ({REST:'+Y', Y:'+Y', '14':'+Y', GUIDE:'GUI', '8':'GUI',
  LINESTOP:'LIM', LIMIT:'LIM', '9':'LIM'}[String(v).toUpperCase()] || String(v).toUpperCase());
const text = v => v == null ? '' : String(v).trim();
const clone = v => JSON.parse(JSON.stringify(v));
const sourceFields = ['NAME','REF','TYPE','RAW_TYPE','NODESTIFF','SOURCE_NODETYPE','SOURCE_NODEGAP','NODETYPE_CODES','NODETYPE_CLASSIFICATION_SOURCE','SUPPORT_EFFECTIVE_NODETYPE','SUPPORT_EFFECTIVE_GAP','SUPPORT_GAP_SOURCE','SUPPORT_MAPPING_STATUS','SUPPORT_MAPPING_RULE_ID','SUPPORT_MAPPING_REQUIRES_ENGINEERING_APPROVAL','MDSSUPPFUNC','CMPSTRESSN','ISONOTE','RTEXT', 'NODETYPE', 'NODEGAP', 'CMPSUPGAP', 'CMPSUPGAP_POS',
  'CMPSUPGAP_PS', 'DTXR', 'DESC', 'DESCRIPTION', 'MDSDTXR', 'MDSSUPPTYPE',
  'CMPSUPTYPE', 'SPRE', 'SKEY', 'CMPSUPSTIFF','CMPSUPFRICTION','SUPPORT_KIND', 'SUPPORT_MAPPER_KIND', 'SUPPORT_TYPE',
  'POS','POSI','COMPRE','ATTACHED_COMPONENT_REF','STIFFNESS','NODESTIFFNESS','FRICTION','NODEFRICTION',
  'DirectionCosineX','DirectionCosineY','DirectionCosineZ','DIRECTIONCOSINEX','DIRECTIONCOSINEY','DIRECTIONCOSINEZ'];
const configKeys = ['supportMapping', 'supportTypeMapper', 'inputXmlRestraintTypeMutation',
  'restraintTypeMutation', 'xml229RestraintKindOverrides', 'xml229SourceFieldPrecedence', 'xml229RestraintPrecedence', 'defaultStiffness', 'defaultGap', 'defaultFriction',
  'useFrictionSentinelForNonYSupports', 'supportKindToXmlType', 'dtxrPositionOffset',
  'dtxrCoordinateToleranceMm', 'coordinateTolerance', 'resolverJsonTrace', 'jsonTrace','xml229PhysicalVertexPrefinal','xml229SourceCoordinatePolicy','xml229SourceAttachmentPolicy'];

export function restraintAuditConfig(config = {}) {
  const selected=Object.fromEntries(configKeys.filter(k => config[k] !== undefined).map(k => [k, config[k]]));
  // Bind the effective V1 default into the native source-bound configuration receipt.
  if(config.xml229PhysicalVertexPrefinal!==true)
    selected.xml229SourceFieldPrecedence={...(selected.xml229SourceFieldPrecedence||{}),
      mappedCodes:mappedCodePrecedenceEnabled(config)};
  return clone(selected);
}

export function restraintAuditMember(member, decision, reason = 'selected-source-member') {
  const attrs = member?.raw?.attributes || member?.attributes || member?.capturedFields || {};
  return {path: text(member?.path || member?.sourcePath), name: text(attrs.NAME || member?.name),
    fields: Object.fromEntries(sourceFields.filter(k => attrs[k] != null).map(k => [k, attrs[k]])),
    decision: decision ? clone(decision) : null, reason,
    ...(member?.coordinateEvidence?{coordinateEvidence:clone(member.coordinateEvidence)}:{})};
}

export function inventoryRestraintAudit(document) {
  let xmlIndex = 0;
  return [...document.getElementsByTagName('Branch')].flatMap((branch, bi) =>
    children(branch, 'Node').map((node, ordinal) => ({target: {
      xmlIndex: ++xmlIndex, branch: value(branch, 'Branchname'), branchOccurrenceIndex: bi,
      sourceNodeOrdinal: ordinal, nodeNumber: value(node, 'NodeNumber'),
      nodeName: value(node, 'NodeName'), componentType:value(node,'ComponentType'), componentRefNo: value(node, 'ComponentRefNo'),
      position: value(node, 'Position'),
    }, nodeGap: ['CMPSUPGAP', 'CMPSUPGAP_POS', 'CMPSUPGAP_PS'].map(k => value(node, k)).find(Boolean) || '',
    restraints: children(node, 'Restraint').map(r => Object.fromEntries(fields.map(k => [k, value(r, k)]))),
  })));
}

function resolution(record) {
  return {xmlIndex: record.xmlIndex, status: record.status, method: record.matchType,
    sourcePaths: record.sourcePaths || [], groupId: record.groupId || null,
    matchedPosition: record.matchedPosition || null, distanceMm: record.positionDistanceMm,
    toleranceMm: record.coordinateToleranceMm, branchRelationship: record.branchRelationship};
}

function fieldEvidence(name, after, before, selected, nodeGap, config, preserved) {
  if (preserved) return {authority: 'original-xml', raw: before?.[name] ?? null};
  const attrs = selected?.fields || {};
  const individual=selected?.reason==='physical-vertex-source-member'&&{Stiffness:['STIFFNESS','NODESTIFFNESS'],Friction:['FRICTION','NODEFRICTION'],
    DirectionCosineX:['DirectionCosineX','DIRECTIONCOSINEX'],DirectionCosineY:['DirectionCosineY','DIRECTIONCOSINEY'],
    DirectionCosineZ:['DirectionCosineZ','DIRECTIONCOSINEZ']}[name]?.find(key=>attrs[key]!=null&&text(attrs[key]));
  if(individual)return {authority:'original-json',attribute:individual,raw:attrs[individual]};
  if (name === 'Type') return {authority: selected?.decision?.source || 'unresolved',
    rule: selected?.decision?.rule || null,
    attribute:selected?.decision?.rule?.matchEvidence?.sourceField||selected?.decision?.rule?.field||null,
    raw:selected?.decision?.rule?.matchEvidence?.value??attrs.NODETYPE??attrs.MDSDTXR??attrs.DTXR??null};
  const flag={Gap:'gap',Stiffness:'stiffness',Friction:'friction'}[name];
  if(flag&&restraintPrecedence(config)&&selected?.decision?.kind){
    const kind=selected.decision.kind;
    const decision=flag==='gap'?selectRestraintGap(attrs,config,kind):selectRestraintScalar(attrs,config,flag,kind);
    return {...decision,configuredRaw:decision.attribute?null:decision.raw};
  }
  if(flag&&config.xml229SourceFieldPrecedence?.[flag]===true&&selected){
    const keys={gap:['CMPSUPGAP','CMPSUPGAP_POS','CMPSUPGAP_PS'],
      stiffness:['STIFFNESS','NODESTIFFNESS','CMPSUPSTIFF'],friction:['FRICTION','CMPSUPFRICTION']}[flag];
    const selectedKey=keys.find(k=>text(attrs[k]));
    const legacy={gap:'NODEGAP',stiffness:'NODESTIFF',friction:'NODEFRICTION'}[flag];
    const receipt={policy:'xml229SourceFieldPrecedence.'+flag,legacyField:legacy,legacyRaw:attrs[legacy]??null};
    if(selectedKey)return {...receipt,authority:'original-json',attribute:selectedKey,raw:attrs[selectedKey]};
    const profile=config.supportMapping?.kindProfiles?.[selected.decision?.kind]||null;
    if(flag!=='gap'||(profile?.gap!=null&&text(profile.gap)!==''))
      return {...receipt,authority:'support-profile/config',profile,configuredRaw:profile?.[flag]??null};
  }
  if (name === 'Gap') {
    const key = ['CMPSUPGAP', 'CMPSUPGAP_POS', 'CMPSUPGAP_PS', 'NODEGAP'].find(k => text(attrs[k]));
    if (key) return {authority: 'original-json', attribute: key, raw: attrs[key], unit: 'mm'};
    if (nodeGap) return {authority: 'original-xml-node-gap', raw: nodeGap, unit: 'mm'};
  }
  const key = {Gap:'defaultGap', Stiffness:'defaultStiffness', Friction:'defaultFriction'}[name];
  return {authority: after ? 'support-profile/config' : 'native-type-default',
    ...(key ? {configField: key, configuredRaw: config[key] ?? null} : {}),
    profile: config.supportMapping?.kindProfiles?.[selected?.decision?.kind] || null};
}

function recordFor(row, original, snapshot, ordinal, note, config, used) {
  const same = original.restraints.findIndex((r, i) => !used.has(i) && JSON.stringify(r) === JSON.stringify(snapshot));
  const preserved = same >= 0;
  const beforeOrdinal=preserved?same:original.restraints.findIndex((r,i)=>!used.has(i)&&type(r.Type)===type(snapshot.Type));
  if (beforeOrdinal >= 0) used.add(beforeOrdinal);
  const before=beforeOrdinal<0?null:original.restraints[beforeOrdinal];
  const selection=note?.selections?.find(s=>s.restraintOrdinal===ordinal)||
    note?.selections?.find(s=>s.restraintOrdinal===undefined&&s.types.includes(type(snapshot.Type)));
  const selected = selection?.source || null;
  return {id: `${row.target.branchOccurrenceIndex}:${row.target.sourceNodeOrdinal}:${ordinal}`,
    target: row.target, restraintOrdinal: ordinal,
    disposition: preserved ? 'PRESERVED' : before ? 'REPLACED' : 'ADDED',
    source: preserved ? {kind: 'original-xml', restraintOrdinal:same,corroboration: selected} : {kind: 'staged-json', member: selected},
    match: note?.match || null, decision: preserved ? {source:'original-xml', rule:{id:'preserve-original-xml'}} : selected?.decision || null,
    ...(note?.physicalPlacement?{physicalPlacement:{...note.physicalPlacement,slotOrdinal:ordinal+1}}:{}),
    before: before || null, beforeOrdinal:beforeOrdinal<0?null:beforeOrdinal, after: snapshot,
    fields: fields.map(name => ({name, before: before?.[name] ?? null, after: snapshot[name],
      evidence: fieldEvidence(name, snapshot[name], before, selected, row.nodeGap, config, preserved)})),
  };
}

export function collectRestraintAudit(before, document, notes = new Map(), ledger = [], config = {}) {
  const originals = new Map(before.map(row => [row.target.xmlIndex, row]));
  const records = inventoryRestraintAudit(document).flatMap(row => {
    const original = originals.get(row.target.xmlIndex), used = new Set();
    const applied=row.restraints.map((snapshot, ordinal) => recordFor(row, original, snapshot, ordinal,
      notes.get(row.target.xmlIndex), config, used));
    const removed=original.restraints.flatMap((before,ordinal)=>applied.some(r=>r.beforeOrdinal===ordinal)?[]:[{
      id:`${row.target.branchOccurrenceIndex}:${row.target.sourceNodeOrdinal}:removed:${ordinal}`,
      target:row.target,restraintOrdinal:ordinal,disposition:'REMOVED',
      source:{kind:'original-xml',restraintOrdinal:ordinal},decision:{source:'prefinal-restraint-staging',
        rule:{id:'prefinal-removed-restraint'}},before,beforeOrdinal:ordinal,after:null,
      fields:fields.map(name=>({name,before:before[name],after:null,evidence:{authority:'original-xml',raw:before[name]}})),
    }]);
    return [...applied,...removed];
  });
  return clone({schema: RESTRAINT_AUDIT_SCHEMA, producer: 'standalone-restraint-closure/v1',
    privateOwnerLocalOnly: true, status: 'XML_RECORDED', records,
    resolutions: ledger.map(resolution),
    evaluations: [...notes.values()].flatMap(n => n.evaluations || []),
  });
}

export function completeRestraintAudit(audit, before, document, config) {
  const final = collectRestraintAudit(before,document,new Map(),[],config);
  const existing = new Map((audit?.records||[]).map(r=>[r.id,r]));
  return {...final,...audit,records:final.records.map(record=>{
    const prior=existing.get(record.id);
    if(prior&&JSON.stringify(prior.after)===JSON.stringify(record.after))return prior;
    if(record.disposition==='REMOVED')return record;
    if(record.disposition==='PRESERVED')return record;
    return {...record,source:{kind:'config-default'},decision:{source:'atta-default',
      rule:{id:'atta-default-restraint'}},fields:record.fields.map(f=>({...f,
        evidence:{authority:'atta-default/config',raw:f.after}}))};
  })};
}

export async function bindRestraintAudit(audit, {xmlText, stagedJsonText = '', config = {}, preparedXmlText}) {
  if (audit?.schema !== RESTRAINT_AUDIT_SCHEMA) throw new Error('RESTRAINT_AUDIT_REQUIRED');
  const [xmlSha256, jsonSha256, configSha256, recordsSha256, preparedXmlSha256] = await Promise.all([
    digestUtf8(xmlText), digestUtf8(stagedJsonText), digestCanonical(restraintAuditConfig(config)),
    digestCanonical(audit.records), digestUtf8(preparedXmlText),
  ]);
  const bound={...audit, basis: {xmlSha256, jsonSha256, configSha256}, recordsSha256,
    preparedXmlSha256, recordedConfig: restraintAuditConfig(config)};
  return {...bound,auditSha256:await digestCanonical(bound)};
}
