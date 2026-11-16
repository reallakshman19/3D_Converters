import {restraintPrecedence,selectRestraintGap,jsonNodeTypeAttrs,nodeTypeUsesMapper} from '../../converters/xml-cii2019-core/restraint-precedence-policy.js';
import {
  applyXmlRestraints,
  restraintEntriesFromSupportKind,sourceSupportGap,preferredStagedScalar,
} from '../../converters/xml-cii2019-core/support-mapping.js';
import { migrateSupportMappingConfig } from '../../converters/xml-cii2019-core/support-mapping-config.js';
import { governedSupportKind, stagedFieldKindDecision, mappedCodePrecedenceApplies, SUPPORT_KIND_EVIDENCE_FIELDS } from '../../converters/xml-cii2019-core/support-kind-precedence.js';
import {mutateRestraintType} from '../../converters/xml-cii2019-core/restraint-type-mutation.js';
import {identifyXml229MdsKindConflict, approvedXml229MdsKindResolution,
  isQuarantinableXml229RestraintError, xml229RestraintConflictError}
  from '../../converters/xml-cii2019-core/xml229-restraint-kind-conflicts.js';
import {classifySupportText,parseSupportTypeMapperConfig,createDefaultSupportTypeMapperConfig}
  from './xml-cii-support-type-mapper.js';
import { buildStandaloneDtxrResolutionLedger } from './xml-cii-trace-resolution-ledger.js';
import { decorateJsonTraceLedger } from './xml-cii-json-trace-fields.js';
import {isZeroInformationLimitRestraintElement}
  from '../../converters/xml-cii2019-core/atta-default-restraint-closure.js';

import {inventoryRestraintAudit, collectRestraintAudit, restraintAuditMember} from './xml-cii-restraint-audit.js';

const CARRIER_TYPES = new Set(['ANCI', 'ATTA']);
export {supportKindFromMember,supportGapNumber,sourceNodeType,isRestHardwareMember};
const GOVERNED_KINDS = Object.freeze(['REST', 'GUIDE', 'LINESTOP']);
const EXPECTED_XML_TYPE = Object.freeze({ REST: '+Y', GUIDE: 'GUI', LINESTOP: 'LIM' });

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function localName(node) {
  return text(node?.localName || node?.nodeName).replace(/^.*:/, '');
}

function childrenByName(parent, name) {
  return [...(parent?.childNodes || parent?.children || [])]
    .filter((node) => node?.nodeType === undefined || node.nodeType === 1)
    .filter((node) => localName(node) === name);
}

function firstChild(parent, name) {
  return childrenByName(parent, name)[0] || null;
}

function childText(parent, name) {
  return text(firstChild(parent, name)?.textContent);
}

function parserFailed(document) {
  return !!(document?.querySelector?.('parsererror') || document?.getElementsByTagName?.('parsererror')?.length);
}

function normalizeXmlType(value) {
  const type = text(value).toUpperCase();
  if (type === 'Y' || type === '+Y' || type === 'REST' || type === '14') return '+Y';
  if (type === 'GUIDE' || type === 'GUI' || type === 'X' || type === '8') return 'GUI';
  if (type === 'LINESTOP' || type === 'LIMIT' || type === 'LIM' || type === 'Z' || type === '9') return 'LIM';
  return type;
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function memberAttributes(member) {
  return safeObject(member?.raw?.attributes || member?.attributes || member?.capturedFields);
}

function configuredSupportRuleDecision(attrs, member, config) {
  // Re-evaluate the saved Tab 8 smart-regex rules in this exact Run. Built-in
  // defaults are already represented by the semantic/canonical fallbacks;
  // only user-authored rules can change their precedence.
  const rules = Array.isArray(config?.supportMapping?.rules)
    ? config.supportMapping.rules : [];
  const normalized = key => text(key) === '*' ? '*' :
    text(key).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const evidence = {...attrs, DESCRIPTION: text(attrs.DESCRIPTION || member?.description)};
  const matching = [];
  for (const [index, rule] of rules.entries()) {
    if (!rule || rule.enabled === false || /^builtin-|^standalone-mds-/.test(text(rule.id))) continue;
    const source = text(rule.source).toLowerCase();
    if (source && source !== 'all' && source !== 'staged-json' && source !== 'json') continue;
    const kind = text(rule.kind).toUpperCase().replace(/\s+/g, '');
    if (!kind) continue;
    const mode = text(rule.match) || 'contains';
    if (!['regex','contains','equals','startsWith'].includes(mode))
      throw Object.assign(new Error('Invalid Tab 8 smart-regex matching mode'),
        {code:'PREFINAL_RESTRAINT_CONFIG_INVALID'});
    const fields = text(rule.field).split(/[,;\n]/).map(normalized).filter(Boolean);
    const values = Object.entries(evidence)
      .filter(([field]) => !fields.length || fields.includes('*') || fields.includes('ANY') ||
        fields.includes(normalized(field)))
      .map(([,value]) => text(value)).filter(Boolean);
    const pattern = text(rule.pattern);
    if (!pattern) continue;
    let matches = false;
    if (mode === 'regex') {
      if (pattern.length > 512)
        throw Object.assign(new Error('Oversized Tab 8 regex'),
          {code:'PREFINAL_RESTRAINT_CONFIG_INVALID'});
      let compiled;
      try { compiled = new RegExp(pattern, 'i'); }
      catch { throw Object.assign(new Error('Invalid Tab 8 regex'),
        {code:'PREFINAL_RESTRAINT_CONFIG_INVALID'}); }
      matches = values.some(value => compiled.test(value));
    } else {
      const terms = pattern.split(/[,;\n]/).map(text).filter(Boolean);
      matches = values.some(value => terms.some(term => {
        const v = value.toUpperCase(), t = term.toUpperCase();
        return mode === 'equals' ? v === t :
          mode === 'startsWith' ? v.startsWith(t) : v.includes(t);
      }));
    }
    if (!matches) continue;
    const priority = Number.isFinite(Number(rule.priority)) ? Number(rule.priority) : (index + 1) * 10;
    matching.push({kind,priority,id:text(rule.id) || 'rule-' + index,
      field:text(rule.field),match:mode,pattern});
  }
  if (!matching.length) return null;
  matching.sort((a,b) => a.priority - b.priority || a.id.localeCompare(b.id));
  const first = matching[0], ties = matching.filter(row => row.priority === first.priority);
  if (new Set(ties.map(row => row.kind)).size > 1)
    throw Object.assign(new Error('Conflicting equal-priority Tab 8 support rules'),
      {code:'PREFINAL_RESTRAINT_KIND_AMBIGUOUS'});
  return first;
}

function memberDescription(attrs, member) {
  // member.description is a derived trace label (often the SPRE path), not a
  // source description, so it never suppresses the MDSDTXR fallback.
  const source = [attrs.DTXR, attrs.DESC, attrs.DESCRIPTION].map(text).filter(Boolean);
  return [...(source.length ? source : [text(attrs.MDSDTXR)]), text(member?.description)]
    .filter(Boolean).join(' ');
}

function assertTab7Compatible(attrs, member, config, pinnedKind) {
    // Compare *added* Tab 7 aliases against explicit semantic intent OR an
    // authored Tab 8 rule. Two independently edited high-confidence kinds
    // must not silently override each other.
    if (Array.isArray(config?.supportTypeMapper?.rows)) {
      const rows = parseSupportTypeMapperConfig({supportConfig:config}).mapperRows;
      const defaults = createDefaultSupportTypeMapperConfig();
      const custom = rows.map(row => {
        const original = defaults.find(base => base.kind === row.kind);
        const baseline = new Set((original?.aliases || [])
          .map(alias => text(alias).toUpperCase().replace(/[^A-Z0-9]/g,'')));
        return {...row, aliases:row.aliases.filter(alias =>
          !baseline.has(text(alias).toUpperCase().replace(/[^A-Z0-9]/g,'')))};
      }).filter(row => row.aliases.length);
      if (custom.length) {
        const descText = [memberDescription(attrs, member),attrs.CMPSUPTYPE,attrs.MDSSUPPTYPE,attrs.SPRE]
          .map(text).filter(Boolean).join(' ');
        const newly = classifySupportText(descText,custom);
        if (newly.status==='ambiguous' ||
            (newly.status==='matched'&&newly.confidence!=='LOW'&&
             newly.supportKind!==pinnedKind))
          throw Object.assign(new Error('Edited Tab 7 keyword conflicts with source/Tab 8 kind'),
            {code:'PREFINAL_RESTRAINT_KIND_AMBIGUOUS'});
      }
    }
}

function supportKindFromMember(member,config={},observe=null) {
  const attrs = memberAttributes(member);
  const decidedBy=(kind,source,rule={})=>{
    observe?.({kind,source,rule});
    return kind;
  };
  const physicalConflict=identifyXml229MdsKindConflict(attrs,config);
  if (physicalConflict) {
    const resolution=approvedXml229MdsKindResolution(attrs,config,physicalConflict);
    if(resolution)return decidedBy(resolution.kind,resolution.source,resolution.rule);
    const preferred=stagedFieldKindDecision(attrs,config);
    // Physical MDS corroboration cannot be contradicted by a generic rule.
    // Gapless reclassification needs a separately selected gap policy and
    // an explicitly saved profile gap (not an implicit zero).
    const catalogue=['CMPSUPGAP','CMPSUPGAP_POS','CMPSUPGAP_PS'].some(k=>text(attrs[k]));
    const saved=config.supportMapping?.kindProfiles?.[physicalConflict.candidateKind]?.gap;
    if(!preferred||preferred.kind!==physicalConflict.candidateKind||
       (!restraintPrecedence(config)&&!catalogue&&!(config.xml229SourceFieldPrecedence?.gap===true&&saved!=null&&text(saved)!==''))){
      const reason=config.xml229SourceFieldPrecedence?.type!==true&&nodeTypeUsesMapper(attrs,config)!==true&&!mappedCodePrecedenceApplies(attrs,config)?'STEP7_TYPE_PRECEDENCE_OFF':
        !preferred||preferred.kind!==physicalConflict.candidateKind?'STEP7_RULE_OR_EXPORTED_PROPOSAL_MISMATCH':
        'STEP7_GAP_POLICY_OR_SAVED_GAP_REQUIRED';
      const error=xml229RestraintConflictError(physicalConflict);
      error.resolutionReason=reason;
      error.message+=' [ '+reason+' ]';
      throw error;
    }
    assertTab7Compatible(attrs,member,config,preferred.kind);
    return decidedBy(preferred.kind,preferred.source,preferred.rule);
  }
  // Owner rule (12 Nov, RCA-04): source NODETYPE wins when present; otherwise
  // the Step 7 support table decides. The chain below is the fallback only.
  let decision=null;
  const decided = governedSupportKind({...safeObject(member?.capturedFields), ...attrs}, config,
    GOVERNED_KINDS,value=>{decision=value;});
  // A Step 7 table answer must still agree with edited Tab 7 keywords.
  if (decided.source === 'step7-support-table'||decided.source==='explicit-staged-field-precedence') assertTab7Compatible(attrs, member, config, decided.kind);
  if (decided.kind) return decidedBy(decided.kind,decision?.source||decided.source,decision?.rule);
  // An explicit source description wins over abbreviated MDS code aliases.
  // This mirrors the old confidence mapper, not its legacy axis defaults.
  // When the staged member has no DTXR/DESC text, its MDS description
  // (MDSDTXR, e.g. "LINE STOP ON BARE PIPE WITH WEAR PAD") is the explicit
  // engineering meaning; a stage-assigned SUPPORT_KIND must not override it.
  const desc = memberDescription(attrs, member).toUpperCase();
  const semantic = [
    /\b(?:PIPE\s*STOP|LINE\s*STOP|LINESTOP|LIMIT\s*STOP|AXIAL\s*STOP|DIRECTIONAL\s+ANCHOR)\b/.test(desc) && 'LINESTOP',
    /\bGUIDE\b/.test(desc) && 'GUIDE',
    (/(?:\bPIPE[- ]?REST\b|\bREST\b)/.test(desc) ||
      (!/\b(?:PIPE\s*STOP|LINE\s*STOP|LINESTOP|LIMIT\s*STOP|AXIAL\s*STOP|DIRECTIONAL\s+ANCHOR|GUIDE)\b/.test(desc)
        && /\bSHOE\b/.test(desc))) && 'REST',
  ].filter(Boolean);
  if (new Set(semantic).size > 1)
    throw Object.assign(new Error('Conflicting source support descriptions'),
      {code:'PREFINAL_RESTRAINT_KIND_AMBIGUOUS'});
  const configured = configuredSupportRuleDecision(attrs,member,config);
  // A Tab 8 keyword or regex is authoritative only when compatible with
  // an explicit engineering description. Never silently reclassify a
  // LINE STOP into REST because an edited catch-all keyword also matches.
  if (configured && semantic.length && configured.kind !== semantic[0])
    throw Object.assign(new Error('Tab 8 rule contradicts explicit source kind'),
      {code:'PREFINAL_RESTRAINT_KIND_AMBIGUOUS'});
  if (configured && !GOVERNED_KINDS.includes(configured.kind))
    throw Object.assign(new Error('Tab 8 rule resolves to unsupported governed kind'),
      {code:'PREFINAL_RESTRAINT_KIND_UNSUPPORTED'});
  const pinnedKind = semantic[0] || configured?.kind || '';
  if (pinnedKind) assertTab7Compatible(attrs, member, config, pinnedKind);
  if (semantic.length) return decidedBy(semantic[0],'source-description',
    {id:'semantic:'+semantic[0],field:attrs.DTXR?'DTXR':attrs.DESC?'DESC':attrs.DESCRIPTION?'DESCRIPTION':'MDSDTXR',pattern:desc});
  if (configured) return decidedBy(configured.kind,'configured-support-rule',configured);
  // Use the user-authored Step 7 mapper rows, not a second hard-coded alias list.
  // HIGH/MEDIUM semantic intent can override a stale generated REST label;
  // LOW GT/ST evidence cannot override a resolved canonical source kind.
  let mapper = null;
  if (Array.isArray(config?.supportTypeMapper?.rows)) {
    const rows = parseSupportTypeMapperConfig({supportConfig:config}).mapperRows;
    const evidence = [attrs.DTXR,attrs.DESC,attrs.DESCRIPTION,
      member?.description,attrs.CMPSUPTYPE,attrs.MDSSUPPTYPE,attrs.SPRE]
      .map(text).filter(Boolean).join(' ');
    mapper=classifySupportText(evidence,rows);
    if(mapper.status==='ambiguous')
      throw Object.assign(new Error('Conflicting Step 7 mapper classification'),
        {code:'PREFINAL_RESTRAINT_KIND_AMBIGUOUS'});
    if(mapper.status==='matched'&&mapper.confidence!=='LOW'&&
       GOVERNED_KINDS.includes(mapper.supportKind))return decidedBy(mapper.supportKind,'step7-keyword-mapper',mapper);
  }
  const canonical = [...new Set(['SUPPORT_KIND', 'SUPPORT_MAPPER_KIND', 'SUPPORT_TYPE']
    .map(key=>text(attrs[key]).toUpperCase().replace(/\s+/g,''))
    .filter(kind=>GOVERNED_KINDS.includes(kind)))];
  if (canonical.length > 1)
    throw Object.assign(new Error('Conflicting canonical support kinds'),
      {code:'PREFINAL_RESTRAINT_KIND_AMBIGUOUS'});
  if (canonical.length) return decidedBy(canonical[0],'generated-label',{id:'source:generated-label'});
  if(mapper?.status==='matched'&&GOVERNED_KINDS.includes(mapper.supportKind))
    return decidedBy(mapper.supportKind,'step7-keyword-mapper',mapper);
  const code = text(attrs.MDSSUPPTYPE || member?.capturedFields?.MDSSUPPTYPE).toUpperCase();
  if (code.startsWith('GT')) return decidedBy('GUIDE','source-code',{id:'code:GT',field:'MDSSUPPTYPE'});
  if (code.startsWith('ST')) return decidedBy('LINESTOP','source-code',{id:'code:ST',field:'MDSSUPPTYPE'});
  if (code === 'PIPE-REST' || code.startsWith('AT')) return decidedBy('REST','source-code',{id:'code:REST',field:'MDSSUPPTYPE'});
  return /\b(?:PIPE[- ]?REST|REST|SHOE)\b/.test(text(attrs.SPRE).toUpperCase())
    ? decidedBy('REST','catalogue-fallback',{id:'catalogue:REST',field:'SPRE'}) : '';
}

function sourceGapText(attrs){
  return ['CMPSUPGAP','CMPSUPGAP_POS','CMPSUPGAP_PS','NODEGAP']
    .map(key=>text(attrs?.[key])).find(Boolean)||'';
}

function supportGapNumber(attrs,config={},kind=''){
  if((restraintPrecedence(config)||config.xml229SourceFieldPrecedence?.gap===true)&&kind){
    try{return Number(sourceSupportGap(attrs,config,kind).gap);}
    catch(error){if(error.code)throw error;throw Object.assign(error,{code:String(error.message).includes('AMBIGUOUS')?'PREFINAL_RESTRAINT_GAP_AMBIGUOUS':'PREFINAL_RESTRAINT_GAP_INVALID'});}
  }
  // A legacy NODEGAP=0 is a placeholder only when an explicit
  // CMPSUPGAP is supplied on the SAME source member. Do not treat
  // two distinct nonzero source claims as equivalent or silently choose one.
  const explicit=text(attrs?.CMPSUPGAP);
  const legacy=text(attrs?.NODEGAP);
  const legacyZeroPlaceholder=!!explicit && !!legacy &&
    /^0+(?:\.0+)?(?:\s*mm)?$/i.test(legacy);
  const raw=['CMPSUPGAP','CMPSUPGAP_POS','CMPSUPGAP_PS',
             ...(legacyZeroPlaceholder?[]:['NODEGAP'])]
    .map(key=>text(attrs?.[key])).filter(Boolean);
  const values=raw.map(value=>Number(value.match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][+-]?\d+)?/)?.[0]));
  if(values.some(v=>!Number.isFinite(v)))throw Object.assign(
    new Error('Invalid JSON support gap'),{code:'PREFINAL_RESTRAINT_GAP_INVALID'});
  if(values.some(v=>v!==values[0]))throw Object.assign(
    new Error('Conflicting source gap aliases'),{code:'PREFINAL_RESTRAINT_GAP_AMBIGUOUS'});
  return values.length?values[0]:null;
}

function sourceNodeType(attrs,config){
  const preferred=stagedFieldKindDecision(attrs,config);
  if(preferred)return preferred.rule.effectiveXmlType;
  const raw=text(jsonNodeTypeAttrs(attrs,config)?.NODETYPE);
  if(!raw)return '';
  const selected=mutateRestraintType(raw,
    config.inputXmlRestraintTypeMutation||config.restraintTypeMutation||{});
  const number=Number(selected);
  if(!Number.isInteger(number)||number<1||number>62)
    throw Object.assign(new Error('Unsupported staged NODETYPE or type mutation'),
      {code:'PREFINAL_RESTRAINT_TYPE_INVALID'});
  return normalizeXmlType(String(number));
}

function isRestHardwareMember(attrs,kind) {
  if(kind!=='REST'||text(attrs?.NODETYPE)!=='4')return false;
  const code=text(attrs?.MDSSUPPTYPE).toUpperCase();
  const desc=[attrs?.DTXR,attrs?.DESC,attrs?.DESCRIPTION].map(text).join(' ').toUpperCase();
  return (code==='AT01'&&/\bPIPE\s+SHOE\b/.test(desc))||
         (code==='AT05'&&/\bWEAR\s+PLATE\b/.test(desc));
}

function evidenceByKind(record, config = {}, requireUnambiguous = false, selected=new Map(),
                        evaluations=[],warnings=[],quarantine=false) {
  const result=new Map(),blockedKinds=new Set();
  for(const member of Array.isArray(record?.positionMembers)?record.positionMembers:[]){
    let decision=null,kind='';
    try { kind=supportKindFromMember(member,config,value=>{decision=value;}); }
    catch(error) {
      if(!quarantine||!isQuarantinableXml229RestraintError(error))throw error;
      warnings.push({code:error.code,member:restraintAuditMember(member,null,'quarantined-kind-conflict'),
        candidateKind:error.candidateKind||null,sourceKind:error.sourceKind||null,
         resolutionReason:error.resolutionReason||null,
        message:String(error.message||error)});
      evaluations.push({xmlIndex:record.xmlIndex,kind:'QUARANTINED',
        source:restraintAuditMember(member,null,'quarantined-source-conflict')});
      continue;
    }
    evaluations.push({xmlIndex:record.xmlIndex,kind,source:restraintAuditMember(member,decision,'evaluated-member')});
    if(!kind||blockedKinds.has(kind))continue;
    const original=memberAttributes(member);
    let numeric=null;
    try {
      numeric=requireUnambiguous?supportGapNumber(original,config,kind):null;
      preferredStagedScalar(original,config,'stiffness',kind);preferredStagedScalar(original,config,'friction',kind);
    }
    catch(error) {
      if(!quarantine||!isQuarantinableXml229RestraintError(error))throw error;
      warnings.push({code:error.code,kind,member:restraintAuditMember(member,decision,'quarantined-gap'),
        message:String(error.message||error)});
      blockedKinds.add(kind);result.delete(kind);selected.delete(kind);
      continue;
    }
    const raw=sourceGapText(original);
    // The current XML writer understands CMPSUPGAP; the older source also
    // stored the same gap in NODEGAP. Preserve its value, including zero.
    const attrs=!restraintPrecedence(config)&&config.xml229SourceFieldPrecedence?.gap!==true&&raw&&!text(original.CMPSUPGAP)&&!text(original.CMPSUPGAP_POS)
      &&!text(original.CMPSUPGAP_PS)?{...original,CMPSUPGAP:raw}:original;
    const choose=reason=>{
      result.set(kind,attrs);
      selected.set(kind,restraintAuditMember(member,decision,reason));
    };
    const previous=result.get(kind);
    // A PIPE-REST datum and its AT01/AT05 hardware can share exact XYZ.
    // The shoe/plate is not an independent REST gap owner: first select the
    // structural restraint member, THEN compare gaps among equivalent owners.
    // Otherwise an actual 0mm REST and a shoe with 10mm clearance falsely
    // become a conflicting REST source for the same restraint.
    if (requireUnambiguous && previous && kind === 'REST') {
      const previousHardware = isRestHardwareMember(previous,kind);
      const currentHardware = isRestHardwareMember(attrs,kind);
      if (previousHardware !== currentHardware) {
        if (previousHardware) choose('structural-rest-owner-over-hardware');
        continue;
      }
    }
    if(requireUnambiguous&&previous&&(restraintPrecedence(config)||(sourceGapText(previous)&&raw))&&
       supportGapNumber(previous,config,kind)!==numeric)
      {
        const error=Object.assign(new Error('Conflicting JSON gaps for the same support kind '+kind+': '+
          sourceGapText(previous)+' vs '+raw+(text(previous.NAME)||text(attrs.NAME)
            ?' (members '+[text(previous.NAME)||'?',text(attrs.NAME)||'?'].join(' / ')+')':'')),
          {code:'PREFINAL_RESTRAINT_GAP_AMBIGUOUS',supportKind:kind,
            gaps:[sourceGapText(previous),raw],members:[text(previous.NAME),text(attrs.NAME)]});
        if(!quarantine)throw error;
        warnings.push({code:error.code,kind,member:restraintAuditMember(member,decision,'quarantined-same-kind-gap'),
          gaps:error.gaps,members:error.members,message:error.message});
        blockedKinds.add(kind);result.delete(kind);selected.delete(kind);continue;
      }
    if(requireUnambiguous&&previous&&text(previous.NODETYPE)&&text(attrs.NODETYPE)&&
       sourceNodeType(previous,config)!==sourceNodeType(attrs,config)){
      const earlierHardware=isRestHardwareMember(previous,kind);
      const laterHardware=isRestHardwareMember(attrs,kind);
      if(earlierHardware!==laterHardware){
        if(earlierHardware)choose('structural-rest-owner-over-hardware');
        continue;
      }
      if(!quarantine)throw Object.assign(new Error('Conflicting staged NODETYPE mutations for the same support kind'),
        {code:'PREFINAL_RESTRAINT_TYPE_AMBIGUOUS'});
      warnings.push({code:'PREFINAL_RESTRAINT_TYPE_AMBIGUOUS',kind,
        member:restraintAuditMember(member,decision,'quarantined-same-kind-type'),
        message:'Conflicting staged NODETYPE mutations for the same support kind'});
      blockedKinds.add(kind);result.delete(kind);selected.delete(kind);continue;
    }
    if(previous&&requireUnambiguous)for(const field of ['stiffness','friction']){
      const a=preferredStagedScalar(previous,config,field,kind),b=preferredStagedScalar(attrs,config,field,kind);
      if(a&&b&&Number(a)!==Number(b))throw Object.assign(Error('Conflicting same-kind '+field+' source members'),{code:'PREFINAL_RESTRAINT_'+field.toUpperCase()+'_AMBIGUOUS'});
    }
    if(!previous||(!sourceGapText(previous)&&raw))choose(previous?'explicit-source-gap':'first-qualified-kind-member');
  }
  // Aggregated trace kinds can contain a lower-confidence GT/ST alias that
  // the resolved source member explicitly contradicted. Never re-add it.
  if(!result.size&&!warnings.length){
    for(const kind of Array.isArray(record?.derivedSupportTypes)?record.derivedSupportTypes:[]){
      const normalized=text(kind).toUpperCase().replace(/\s+/g,'');
      if(GOVERNED_KINDS.includes(normalized))result.set(normalized,{});
    }
  }
  return result;
}

function existingTypes(node) {
  return new Set(childrenByName(node, 'Restraint')
    .map((restraint) => normalizeXmlType(childText(restraint, 'Type')))
    .filter(Boolean));
}

function createTemporaryNode(document, node) {
  return node?.namespaceURI && typeof document.createElementNS === 'function'
    ? document.createElementNS(node.namespaceURI, 'Node')
    : document.createElement('Node');
}

function appendGeneratedEntries(document, node, entries, config) {
  if (!entries.length) return 0;
  const temporary = createTemporaryNode(document, node);
  applyXmlRestraints(document, temporary, entries, config);
  const generated = [...childrenByName(temporary, 'Restraint')];
  for (const restraint of generated) node.appendChild(restraint);
  return generated.length;
}

function nodeDiagnostic(node, record, kinds, entries) {
  return {
    type: 'mds-position-restraints-materialized',
    nodeNumber: childText(node, 'NodeNumber'),
    nodeName: childText(node, 'NodeName'),
    componentType: childText(node, 'ComponentType'),
    effectiveSource: record?.effectiveSource || '',
    matchType: record?.matchType || '',
    supportKinds: kinds,
    restraintTypes: entries.map((entry) => normalizeXmlType(entry?.type || entry)),
    message: 'Missing governed restraints were appended from the matched DTXR_POS position-group MDSSUPPTYPE evidence.',
  };
}

export function closeGovernedMdsPositionRestraintsXml(xmlText, stagedJsonText, config = {}, runtime = {}) {
  const source = String(xmlText ?? '');
  const stats = {
    mdsPositionNodesChanged: 0,
    mdsRestRestraintsAdded: 0,
    mdsGuideRestraintsAdded: 0,
    mdsLineStopRestraintsAdded: 0,
  };
  const diagnostics = [],warnings=[];
  const quarantine = runtime.conflictPolicy === 'quarantine' && runtime.requireUnambiguous === true;
  const supportMapping = migrateSupportMappingConfig(config);
  if (supportMapping.useJsonForRestraints === false) {
    return { xmlText: source, changed: false, stats, diagnostics: [{ type: 'mds-position-restraint-closure-skipped', reason: 'json-restraints-disabled' }] };
  }
  if (!source.trim() || !text(stagedJsonText)) return { xmlText: source, changed: false, stats, diagnostics };
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
    return { xmlText: source, changed: false, stats, diagnostics: [{ type: 'mds-position-restraint-closure-skipped', reason: 'DOM unavailable' }] };
  }

  const rawLedger = buildStandaloneDtxrResolutionLedger(source, stagedJsonText, config);
  const traceConfig = {
    captureFields: [...new Set(['DTXR', 'SPRE', 'SPREF', 'MDSSUPPTYPE', 'NAME', 'CMPSUPGAP', ...SUPPORT_KIND_EVIDENCE_FIELDS])],
  };
  const ledger = decorateJsonTraceLedger(rawLedger, traceConfig);
  const byIndex = new Map((ledger.records || []).map((record) => [Number(record.xmlIndex), record]));
  const document = new DOMParser().parseFromString(source, 'application/xml');
  if (parserFailed(document)) {
    return { xmlText: source, changed: false, stats, diagnostics: [{ type: 'mds-position-restraint-closure-skipped', reason: 'XML parse failed' }] };
  }

  const auditBefore=inventoryRestraintAudit(document),auditNotes=new Map();

  let xmlIndex = 0;
  for (const branch of [...document.getElementsByTagName('Branch')]) {
    for (const node of childrenByName(branch, 'Node')) {
      xmlIndex += 1;
      const componentType = childText(node, 'ComponentType').toUpperCase();
      if (!CARRIER_TYPES.has(componentType)) continue;
      const record = byIndex.get(xmlIndex);
      if(runtime.requireUnambiguous&&record?.status==='AMBIGUOUS_REVIEW'){
        const error=Object.assign(new Error('Ambiguous source support match'),
          {code:'PREFINAL_RESTRAINT_MATCH_AMBIGUOUS'});
        if(!quarantine)throw error;
        const warning={code:error.code,xmlIndex,nodeNumber:childText(node,'NodeNumber'),
          branchName:childText(branch,'Branchname'),groupId:record.groupId||null,
          sourcePaths:record.sourcePaths||[],message:error.message};
        warnings.push(warning);diagnostics.push({type:'xml229-restraint-review-warning',...warning});
        continue;
      }
      if (!record || !String(record.status || '').startsWith('RESOLVED_')) continue;
      let evidence;
      const selected=new Map(),evaluations=[],nodeWarnings=[];
      const note={evaluations,selections:[],warnings:nodeWarnings,match:{method:record.matchType,status:record.status,
        groupId:record.groupId||null,matchedPosition:record.matchedPosition||null,
        distanceMm:record.positionDistanceMm,toleranceMm:record.coordinateToleranceMm,
        branchRelationship:record.branchRelationship}};
      auditNotes.set(xmlIndex,note);
      try { evidence = evidenceByKind(record,config,runtime.requireUnambiguous===true,
        selected,evaluations,nodeWarnings,quarantine); }
      catch (error) {
        // Name the XML node so the conflict can be found in the JSON Trace.
        const where = ' at XML Node '+(childText(node,'NodeNumber')||'?')+' ('+componentType+', '+
          (childText(node,'ComponentRefNo')||'no ref')+') in branch '+
          (childText(branch,'Branchname')||'?');
        throw Object.assign(new Error(String(error?.message||error)+where),{...error,
          code:error?.code,xmlIndex,nodeNumber:childText(node,'NodeNumber'),
          componentRefNo:childText(node,'ComponentRefNo'),branchName:childText(branch,'Branchname')});
      }
      for(const warning of nodeWarnings){
        const row={...warning,xmlIndex,nodeNumber:childText(node,'NodeNumber'),
          nodeName:childText(node,'NodeName'),branchName:childText(branch,'Branchname'),
          groupId:record.groupId||null,sourcePaths:record.sourcePaths||[]};
        warnings.push(row);diagnostics.push({type:'xml229-restraint-review-warning',...row});
      }
      if (!evidence.size) continue;
      for (const [kind, attrs] of evidence) {
        const authored = text(attrs.CMPSUPGAP);
        const legacy = text(attrs.NODEGAP);
        if (authored && legacy && Number(legacy) === 0 && supportGapNumber(attrs,config,kind) !== 0) {
          diagnostics.push({
            type: 'xml229-gap-authority-receipt',
            nodeNumber: childText(node, 'NodeNumber'),
            supportKind: kind,
            sourceField: 'CMPSUPGAP',
            sourceValue: authored,
            ignoredLegacyZero: legacy,
            reason: 'legacy-NODEGAP-zero-placeholder',
          });
        }
      }

      if(runtime.requireUnambiguous&&!quarantine){
        for(const restraint of childrenByName(node,'Restraint')){
          if(isZeroInformationLimitRestraintElement(restraint))node.removeChild(restraint);
        }
      }

      const present = existingTypes(node);
      const kinds = [];
      const entries = [];
      for (const kind of GOVERNED_KINDS) {
        if (!evidence.has(kind)) continue;
        const attrs=evidence.get(kind);
        const explicitGap=sourceGapText(attrs);
        const physicalConflict=identifyXml229MdsKindConflict(attrs,config);
        const approved=approvedXml229MdsKindResolution(attrs,config,physicalConflict);
        const selectedType=approved?EXPECTED_XML_TYPE[kind]:sourceNodeType(attrs,config);
        if (['+Y','GUI','LIM'].includes(selectedType)&&selectedType!==EXPECTED_XML_TYPE[kind])
          throw Object.assign(new Error('Configured NODETYPE mutation contradicts Step 7 support kind'),
            {code:'PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT'});
        const candidates=restraintEntriesFromSupportKind(kind, attrs, node, config)
          .map(entry=>({
            ...entry,type:selectedType||entry.type,
            gap:(restraintPrecedence(config)||config.xml229SourceFieldPrecedence?.gap===true)?entry.gap:explicitGap?String(supportGapNumber(attrs)):entry.gap,
          }));
        note.selections.push({kind,types:candidates.map(entry=>normalizeXmlType(entry?.type||entry)),
          source:selected.get(kind)||null});
        const generated=candidates.filter(entry=>!present.has(normalizeXmlType(entry?.type || entry)));
        if (!generated.length) continue;
        kinds.push(kind);
        entries.push(...generated);
        for (const entry of generated) present.add(normalizeXmlType(entry?.type || entry));
      }
      if (!entries.length) continue;

      const appended = appendGeneratedEntries(document, node, entries, config);
      if (!appended) continue;
      stats.mdsPositionNodesChanged += 1;
      if (kinds.includes('REST')) stats.mdsRestRestraintsAdded += 1;
      if (kinds.includes('GUIDE')) stats.mdsGuideRestraintsAdded += 1;
      if (kinds.includes('LINESTOP')) stats.mdsLineStopRestraintsAdded += 1;
      diagnostics.push(nodeDiagnostic(node, record, kinds, entries));
    }
  }

  const changed = stats.mdsPositionNodesChanged > 0;
  return {
    xmlText: changed ? new XMLSerializer().serializeToString(document) : source,
    changed,
    stats,
    diagnostics,
    warnings,
    engineeringRestraintAcceptance: warnings.length ? 'HOLD' : 'NOT_ASSESSED',
    ledger: ledger.records || [],
    restraintAudit:{...collectRestraintAudit(auditBefore,document,auditNotes,ledger.records||[],config),
      warnings,engineeringRestraintAcceptance:warnings.length?'HOLD':'NOT_ASSESSED',
      matching:{schema:rawLedger.schema,toleranceMm:rawLedger.toleranceMm,
        calibration:rawLedger.calibration||null}},
  };
}
