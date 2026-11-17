import { PLAIN_DOCUMENT, childText, childrenByName, setChildText, elementsByName, parsePlainXml, serializePlainXml } from '../PlainDom.js';
import { decideMissingStagedRestRestraint } from './StagedRestraintFallbackPolicy.js';
import { buildStandaloneDtxrPositionGroups, buildStandaloneDtxrResolutionLedger, canonicalStandaloneDtxrBranch, standaloneDtxrBranchRelationship } from '../ledger/index.js';

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function attributeText(element, name) {
  return text(element?.attrs?.[name]);
}

function setChangedChildText(parent, name, value) {
  const clean = text(value);
  if (!clean) return false;
  const changed = childText(parent, name) !== clean;
  setChildText(parent, name, clean);
  return changed;
}

function recordsByXmlIndex(records) {
  return new Map((records || []).map((record) => [Number(record.xmlIndex), record]));
}

function stagedSupportKindsByPath(stagedJsonText, config = {}, core) {
  const out = new Map();
  let parsed;
  try { parsed = typeof stagedJsonText === 'string' ? JSON.parse(stagedJsonText) : stagedJsonText; } catch { return out; }
  const visit = (value, path) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (!value || typeof value !== 'object') return;
    const attrs = value.attributes && typeof value.attributes === 'object' ? value.attributes : {};
    // Preserve the recorded callback argument; the audit journal is intentionally out of scope.
    let decision;
    const kind = core.resolveXmlCiiSupportKind(attrs, config,value=>{decision=value;});
    if (kind) out.set(path, kind);
    if (Array.isArray(value.children)) value.children.forEach((child, index) => visit(child, `${path}.children[${index}]`));
  };
  visit(parsed, '$');
  return out;
}

function supportKindsForRecord(record, kindsByPath) {
  const paths = [
    ...(Array.isArray(record?.sourcePaths) ? record.sourcePaths : []),
    ...(Array.isArray(record?.positionMembers) ? record.positionMembers.map((member) => member?.sourcePath) : []),
  ].map(text).filter(Boolean);
  return [...new Set(paths.map((path) => kindsByPath.get(path)).filter(Boolean))];
}

export function resolveStandaloneStagedSupportTypes(stagedJsonText, record, config = {}, core) {
  return supportKindsForRecord(record, stagedSupportKindsByPath(stagedJsonText, config, core));
}

function existingRestraintSummary(restraint) {
  return {
    type: childText(restraint, 'Type'),
    stiffness: childText(restraint, 'Stiffness'),
    gap: childText(restraint, 'Gap'),
    friction: childText(restraint, 'Friction'),
    directionCosineX: childText(restraint, 'DirectionCosineX'),
    directionCosineY: childText(restraint, 'DirectionCosineY'),
    directionCosineZ: childText(restraint, 'DirectionCosineZ'),
    source: attributeText(restraint, 'source'),
    basis: attributeText(restraint, 'basis'),
    resolvedKey: attributeText(restraint, 'resolvedKey'),
    originalText: childText(restraint, 'OriginalText'),
    resolvedFrom: childText(restraint, 'ResolvedFrom'),
    sideloadRow: childText(restraint, 'SideloadRow'),
  };
}

function existingRestraintSummaries(node) {
  return childrenByName(node, 'Restraint').map(existingRestraintSummary);
}

function restGapAttributes(resolved,node,config,core) {
  const rows=(resolved?.positionMembers||[]).map(member=>member?.raw?.attributes||member?.attributes||member?.capturedFields||{})
    .filter(attrs=>core.resolveXmlCiiSupportKind(attrs,config)==='REST');
  const canonical=v=>text(v).replace(/^[/]+/,'').toUpperCase();
  const exact=rows.filter(attrs=>canonical(attrs.NAME)&&canonical(attrs.NAME)===canonical(childText(node,'NodeName')));
  const candidates=exact.length?exact:rows;
  if(!candidates.length)return {};
  const authored=candidates.filter(attrs=>core.sourceSupportGap(attrs).explicit);
  if(!authored.length)return candidates[0];
  const gaps=new Set(authored.map(attrs=>core.sourceSupportGap(attrs).gap));
  if(gaps.size>1)throw Error('NATIVE_PREFINAL_RESTRAINT_GAP_AMBIGUOUS');
  return authored[0];
}

export function materializeMissingStandaloneRestRestraint(document, node, resolved, config = {}, stagedSupportTypes = [], core) {
  const existing = childrenByName(node, 'Restraint');
  const supportMapping = core.migrateSupportMappingConfig(config);
  const decision = decideMissingStagedRestRestraint({
    componentType: childText(node, 'ComponentType'),
    hasExistingRestraint: existing.length > 0,
    existingRestraints: existingRestraintSummaries(node),
    ledgerSupportTypes: resolved?.derivedSupportTypes || [],
    stagedSupportTypes,
    jsonRestraintsEnabled: supportMapping.useJsonForRestraints !== false,
  });
  if (!decision.apply) return { added: false, ...decision, entries: [] };
  const attrs=decision.authority==='staged-json-rest'?restGapAttributes(resolved,node,config,core):{};
  const entries = core.restraintEntriesFromSupportKind('REST', attrs, node, config);
  if (!entries.length) return { added: false, ...decision, reason: 'rest-profile-empty', entries: [] };
  core.applyXmlRestraints(PLAIN_DOCUMENT, node, entries, config);
  const added = childrenByName(node, 'Restraint').length > 0;
  return {
    added,
    ...decision,
    reason: added ? decision.reason : 'restraint-write-failed',
    entries,
  };
}

function materializedDiagnostic(node, resolved, materialized) {
  const replacement = materialized.replaceExisting === true;
  const defaulted = materialized.authority === 'component-default-rest';
  const type = replacement
    ? 'zero-information-limit-restraint-replaced'
    : (defaulted ? 'atta-default-rest-restraint-materialized' : 'staged-json-rest-restraint-materialized');
  const message = replacement
    ? 'A zero-information LIM placeholder was replaced by the REST profile because no authoritative line-stop evidence existed.'
    : (defaulted
      ? 'ATTA had no authoritative restraint evidence; the configured ATTA default REST profile was materialized.'
      : 'Uploaded XML had no restraint; REST resolved from authoritative staged JSON evidence was materialized through the shared support-mapping profile.');
  return {
    type,
    nodeNumber: childText(node, 'NodeNumber'),
    nodeName: childText(node, 'NodeName'),
    componentType: childText(node, 'ComponentType'),
    effectiveSource: resolved?.effectiveSource || '',
    matchType: resolved?.matchType || '',
    status: resolved?.status || '',
    supportTypes: materialized.supportTypes,
    restraintTypes: materialized.entries.map((entry) => entry.type),
    replacedExistingPlaceholder: replacement,
    authority: materialized.authority,
    message,
  };
}

export function enrichStandaloneDtxrAnnotations(xmlText, stagedJsonText, config = {}, core) {
  const source = String(xmlText ?? '');
  const stats = {
    dtxrPositionGroups: 0,
    dtxrPosAnnotations: 0,
    dtxrPsAnnotations: 0,
    dtxrUnresolvedNodes: 0,
    dtxrAmbiguousNodes: 0,
    stagedRestRestraintsAdded: 0,
    stagedRestRestraintsPreserved: 0,
    zeroInformationLimitPlaceholdersReplaced: 0,
    attaDefaultRestRestraintsAdded: 0,
  };
  const ledgerResult = buildStandaloneDtxrResolutionLedger(source, stagedJsonText, config);
  const diagnostics = [...(Array.isArray(ledgerResult.diagnostics) ? ledgerResult.diagnostics : [])];
  stats.dtxrPositionGroups = ledgerResult.groups.length;
  stats.dtxrUnresolvedNodes = ledgerResult.records.filter((record) => record.status === 'UNRESOLVED').length;
  stats.dtxrAmbiguousNodes = ledgerResult.records.filter((record) => record.status === 'AMBIGUOUS_REVIEW').length;

  if (!source.trim() || !text(stagedJsonText)) {
    return { text: source, diagnostics, stats, ledger: ledgerResult.records, ledgerResult };
  }
  let root;
  try {
    ({ root } = parsePlainXml(source));
    if (root.__el === 'parsererror' || elementsByName(root, 'parsererror').length) throw new Error('XML parse failed');
  } catch {
    return {
      text: source,
      diagnostics: [...diagnostics, { type: 'standalone-dtxr-enrichment-skipped', reason: 'XML parse failed' }],
      stats,
      ledger: ledgerResult.records,
      ledgerResult,
    };
  }
  const byIndex = recordsByXmlIndex(ledgerResult.records);
  const kindsByPath = stagedSupportKindsByPath(stagedJsonText, config,core);
  let xmlIndex = 0;
  for (const branch of elementsByName(root, 'Branch')) {
    for (const node of childrenByName(branch, 'Node')) {
      xmlIndex += 1;
      const resolved = byIndex.get(xmlIndex);
      if (!resolved) continue;
      if (resolved.dtxrPosValue) {
        if (setChangedChildText(node, 'DTXR_POS', resolved.dtxrPosValue)) stats.dtxrPosAnnotations += 1;
      }
      if (resolved.dtxrPsValue) {
        if (setChangedChildText(node, 'DTXR_PS', resolved.dtxrPsValue)) stats.dtxrPsAnnotations += 1;
      }
      if (resolved.effectiveSource === 'DTXR_POS') {
        setChangedChildText(node, 'DTXR_SOURCE', 'staged-json-position-group');
      } else if (resolved.effectiveSource === 'DTXR_PS_FALLBACK') {
        setChangedChildText(node, 'DTXR_SOURCE', 'staged-json-ps-fallback');
      }
      const materialized = materializeMissingStandaloneRestRestraint(
        PLAIN_DOCUMENT,
        node,
        resolved,
        config,
        supportKindsForRecord(resolved, kindsByPath),
        core,
      );
      if (materialized.added) {
        stats.stagedRestRestraintsAdded += 1;
        if (materialized.replaceExisting) stats.zeroInformationLimitPlaceholdersReplaced += 1;
        if (materialized.authority === 'component-default-rest') stats.attaDefaultRestRestraintsAdded += 1;
        diagnostics.push(materializedDiagnostic(node, resolved, materialized));
      } else if (materialized.reason === 'existing-restraint-preserved') {
        stats.stagedRestRestraintsPreserved += 1;
      }
    }
  }

  return {
    text: serializePlainXml({ root }),
    diagnostics,
    stats,
    ledger: ledgerResult.records,
    ledgerResult,
  };
}
export {
  buildStandaloneDtxrPositionGroups,
  buildStandaloneDtxrResolutionLedger,
  canonicalStandaloneDtxrBranch,
  standaloneDtxrBranchRelationship,
};
