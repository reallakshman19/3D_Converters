import { DEFAULT_RULES, SUPPORT_KINDS } from './SupportKindResolver.js';
import { toText, normalizeKind, normalizeMatch, LINE_LIMIT_KIND, normalizeXmlTypes, normalizeDirectionMode, normalizeFrictionMode, normalizeSupportTagMode, normalizeDirection, mergeRequiredSupportRules, completeStep7Rules } from './support-mapping-config-rules.js';
export { normalizeXmlTypes, DEFAULT_STEP7_MDS_ROWS } from './support-mapping-config-rules.js';

export function defaultSupportKindProfiles(config = {}) {
  const legacyKindToType = {
    REST: '+Y',
    GUIDE: 'GUI',
    [LINE_LIMIT_KIND]: 'LIM',
    LIMIT: 'LIM',
    ANCHOR: 'A',
    SPRING: 'Y',
    ...(config.supportKindToXmlType || {}),
  };

  const defaults = {
    REST: { xmlTypes: ['+Y'], directionMode: 'fixed', direction: { x: 0, y: 1, z: 0 }, stiffness: 'default', gap: '0', frictionMode: 'default', supportTagMode: 'kind' },
    GUIDE: { xmlTypes: ['GUI'], directionMode: 'pipe-normal', direction: null, stiffness: 'default', gap: '0', frictionMode: 'sentinel', supportTagMode: 'kind' },
    [LINE_LIMIT_KIND]: { xmlTypes: ['LIM'], directionMode: 'pipe-axis', direction: null, stiffness: 'default', gap: '0', frictionMode: 'sentinel', supportTagMode: 'kind' },
    LIMIT: { xmlTypes: ['LIM'], directionMode: 'from-staged', direction: null, stiffness: 'default', gap: '0', frictionMode: 'sentinel', supportTagMode: 'kind' },
    ANCHOR: { xmlTypes: ['A'], directionMode: 'none', direction: null, stiffness: 'default', gap: '0', frictionMode: 'sentinel', supportTagMode: 'kind' },
    SPRING: { xmlTypes: ['Y'], directionMode: 'fixed', direction: { x: 0, y: 1, z: 0 }, stiffness: 'default', gap: '0', frictionMode: 'default', supportTagMode: 'kind' },
  };

  const out = {};
  for (const kind of SUPPORT_KINDS) {
    const base = defaults[kind] || { xmlTypes: [], directionMode: 'none', direction: null, stiffness: 'default', gap: '0', frictionMode: 'default', supportTagMode: 'kind' };
    out[kind] = { ...base, xmlTypes: normalizeXmlTypes(legacyKindToType[kind] || base.xmlTypes) };
  }
  return out;
}

export function normalizeSupportRuleForConfig(rule, index = 0) {
  const kind = normalizeKind(rule?.kind);
  return {
    id: toText(rule?.id) || `support-rule-${index + 1}`,
    enabled: rule?.enabled !== false,
    priority: Number.isFinite(Number(rule?.priority)) ? Number(rule.priority) : (index + 1) * 10,
    source: toText(rule?.source) || 'all',
    field: toText(rule?.field || '*') || '*',
    match: normalizeMatch(rule?.match),
    pattern: toText(rule?.pattern),
    kind: SUPPORT_KINDS.includes(kind) ? kind : 'REST',
    label: toText(rule?.label),
    locked: rule?.locked === true,
  };
}

export function normalizeSupportKindProfile(profile = {}, fallback = {}) {
  const direction = normalizeDirection(profile.direction ?? fallback.direction);
  return {
    xmlTypes: normalizeXmlTypes(profile.xmlTypes ?? fallback.xmlTypes),
    directionMode: normalizeDirectionMode(profile.directionMode ?? fallback.directionMode),
    direction,
    stiffness: toText(profile.stiffness ?? fallback.stiffness ?? 'default') || 'default',
    gap: '0',
    frictionMode: normalizeFrictionMode(profile.frictionMode ?? fallback.frictionMode),
    fixedFriction: toText(profile.fixedFriction ?? fallback.fixedFriction ?? ''),
    supportTagMode: normalizeSupportTagMode(profile.supportTagMode ?? fallback.supportTagMode),
    supportTagValue: toText(profile.supportTagValue ?? fallback.supportTagValue ?? ''),
    notes: toText(profile.notes ?? fallback.notes ?? ''),
  };
}

export function migrateSupportMappingConfig(config = {}, mapperRules = null) {
  const defaultProfiles = defaultSupportKindProfiles(config);
  const existing = config.supportMapping;
  if (existing && typeof existing === 'object' && !Array.isArray(existing) && Number(existing.version) >= 2) {
    const profiles = {};
    for (const kind of SUPPORT_KINDS) {
      profiles[kind] = normalizeSupportKindProfile(existing.kindProfiles?.[kind] || {}, defaultProfiles[kind] || {});
    }
    const sourceRules = mergeRequiredSupportRules(Array.isArray(existing.rules) ? existing.rules : [], true);
    return { version: 2, useJsonForRestraints: existing.useJsonForRestraints !== false, rules: completeStep7Rules(sourceRules,config).map(normalizeSupportRuleForConfig), kindProfiles: profiles };
  }

  const baseRules = Array.isArray(mapperRules) && mapperRules.length ? mapperRules : DEFAULT_RULES;
  const sourceRules = mergeRequiredSupportRules(baseRules);
  return { version: 2, useJsonForRestraints: config.useRestraintTypeBasedOnJson !== false, rules: completeStep7Rules(sourceRules,config).map(normalizeSupportRuleForConfig), kindProfiles: defaultProfiles };
}

export function supportKindToXmlTypeFromMapping(supportMapping) {
  const out = {};
  for (const [kind, profile] of Object.entries(supportMapping?.kindProfiles || {})) {
    const xmlTypes = normalizeXmlTypes(profile.xmlTypes);
    out[kind] = xmlTypes.length === 1 ? xmlTypes[0] : xmlTypes;
  }
  return out;
}
