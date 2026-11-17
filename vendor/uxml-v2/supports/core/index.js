export { migrateSupportMappingConfig, supportKindToXmlTypeFromMapping, DEFAULT_STEP7_MDS_ROWS } from './support-mapping-config.js';
export { governedSupportKind, projectSupportRuleEvidence, SUPPORT_KIND_EVIDENCE_FIELDS } from './support-kind-precedence.js';
export { restraintEntriesFromSupportKind, dedupeXmlCiiRestraintEntries, xmlCiiRestraintEntriesFromSupportMatch, xmlCiiTypeEntryFromExistingRestraint } from './support-mapping-entries.js';
export { buildStagedSupportIndex, calibrateStagedSupportIndexCoordinates, resolveXmlCiiSupportKind } from './support-mapping-index.js';
export { applyXmlRestraints } from './support-mapping.js';
export { SUPPORT_KINDS, MATCH_TYPES, DEFAULT_KIND_MAP, DEFAULT_RULES } from './SupportKindResolver.js';
export { DEFAULT_RESTRAINT_TYPE_MUTATION_ROWS } from './restraint-type-mutation.js';
export { NATIVE_RESTRAINT_TYPE_CODES } from './restraint-type-codes.js';
