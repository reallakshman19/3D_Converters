import { PLAIN_DOCUMENT, childText, childrenByName, elementsByName, parsePlainXml, serializePlainXml } from '../PlainDom.js';

const PLACEHOLDER_TYPES = new Set(['LIM', 'LIMIT', 'LINESTOP']);

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function attributeText(element, name) {
  return text(element?.attrs?.[name]);
}

function zeroOrBlank(value) {
  const raw = text(value);
  if (!raw) return true;
  const numeric = Number(raw);
  return Number.isFinite(numeric) && numeric === 0;
}

function hasText(value) {
  return text(value) !== '';
}

export function isZeroInformationLimitRestraintElement(restraint) {
  const type = childText(restraint, 'Type').toUpperCase().replace(/\s+/g, '');
  if (!PLACEHOLDER_TYPES.has(type)) return false;
  if (!zeroOrBlank(childText(restraint, 'Stiffness'))) return false;
  if (!zeroOrBlank(childText(restraint, 'Gap'))) return false;
  if (['DirectionCosineX', 'DirectionCosineY', 'DirectionCosineZ']
    .some((name) => hasText(childText(restraint, name)))) return false;
  return ![
    attributeText(restraint, 'source'),
    attributeText(restraint, 'basis'),
    attributeText(restraint, 'resolvedKey'),
    childText(restraint, 'OriginalText'),
    childText(restraint, 'ResolvedFrom'),
    childText(restraint, 'SideloadRow'),
  ].some(hasText);
}

function diagnostic(node, kind, entries) {
  const replacement = kind === 'placeholder-replaced';
  return {
    type: replacement
      ? 'zero-information-limit-restraint-replaced'
      : 'atta-default-rest-restraint-materialized',
    nodeNumber: childText(node, 'NodeNumber'),
    nodeName: childText(node, 'NodeName'),
    componentType: childText(node, 'ComponentType'),
    authority: 'component-default-rest',
    restraintTypes: entries.map((entry) => entry.type),
    replacedExistingPlaceholder: replacement,
    message: replacement
      ? 'A zero-information LIM placeholder was replaced by the governed ATTA default REST profile.'
      : 'ATTA had no authoritative restraint evidence; the governed default REST profile was materialized.',
  };
}

function blockedDiagnostic(node, reason) {
  return {
    type: 'atta-default-restraint-closure-blocked',
    nodeNumber: childText(node, 'NodeNumber'),
    nodeName: childText(node, 'NodeName'),
    reason,
  };
}

function closeNode(node, config, core, stats, diagnostics) {
  if (childText(node, 'ComponentType').toUpperCase() !== 'ATTA') return;
  const restraints = childrenByName(node, 'Restraint');
  const missing = restraints.length === 0;
  const placeholderOnly = restraints.length > 0
    && restraints.every(isZeroInformationLimitRestraintElement);
  if (!missing && !placeholderOnly) {
    stats.authoritativeAttaRestraintsPreserved += 1;
    return;
  }

  const entries = core.restraintEntriesFromSupportKind('REST', {}, node, config);
  if (!entries.length) {
    diagnostics.push(blockedDiagnostic(node, 'rest-profile-empty'));
    return;
  }

  core.applyXmlRestraints(PLAIN_DOCUMENT, node, entries, config);
  if (!childrenByName(node, 'Restraint').length) {
    diagnostics.push(blockedDiagnostic(node, 'restraint-write-failed'));
    return;
  }

  if (placeholderOnly) stats.zeroInformationLimitPlaceholdersReplaced += 1;
  else stats.attaDefaultRestRestraintsAdded += 1;
  diagnostics.push(diagnostic(
    node,
    placeholderOnly ? 'placeholder-replaced' : 'missing-added',
    entries,
  ));
}

function closeGovernedAttaDefaultRestraints(root, config, core) {
  const stats = {
    attaDefaultRestRestraintsAdded: 0,
    zeroInformationLimitPlaceholdersReplaced: 0,
    authoritativeAttaRestraintsPreserved: 0,
  };
  const diagnostics = [];
  const supportMapping = core.migrateSupportMappingConfig(config);
  if (supportMapping.useJsonForRestraints === false) {
    return {
      changed: false,
      stats,
      diagnostics: [{
        type: 'atta-default-restraint-closure-skipped',
        reason: 'json-restraints-disabled',
      }],
    };
  }

  // A document-wide DOM query includes the root when its name matches.
  const nodes = [...(root.__el === 'Node' ? [root] : []), ...elementsByName(root, 'Node')];
  for (const node of nodes) closeNode(node, config, core, stats, diagnostics);

  return {
    changed: stats.attaDefaultRestRestraintsAdded > 0
      || stats.zeroInformationLimitPlaceholdersReplaced > 0,
    stats,
    diagnostics,
  };
}

function parseFailure(source) {
  return {
    xmlText: source,
    changed: false,
    stats: {},
    diagnostics: [{ type: 'atta-default-restraint-closure-skipped', reason: 'xml-parse-failed' }],
  };
}

export function closeGovernedAttaDefaultRestraintsXml(xmlText, config = {}, core) {
  const source = String(xmlText ?? '');
  if (!source.trim()) {
    return {
      xmlText: source,
      changed: false,
      stats: {},
      diagnostics: [{ type: 'atta-default-restraint-closure-skipped', reason: 'empty-xml' }],
    };
  }
  let root;
  try {
    ({ root } = parsePlainXml(source));
  } catch {
    return parseFailure(source);
  }
  if (root.__el === 'parsererror' || elementsByName(root, 'parsererror').length) {
    return parseFailure(source);
  }
  const result = closeGovernedAttaDefaultRestraints(root, config, core);
  return {
    ...result,
    xmlText: result.changed ? serializePlainXml({ root }) : source,
  };
}
