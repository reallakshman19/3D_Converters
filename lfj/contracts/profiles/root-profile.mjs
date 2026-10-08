/**
 * LFJ/1.0 R01 root/profile authority (no I/O, JSON.parse, full-file copies or normalization).
 *
 * The caller supplies a parsed *small root descriptor* now. R04 will provide the
 * equivalent token-derived descriptor for large files without whole-document DOM.
 * This inspection never grants application edit/export authority; R12–R19 own that.
 *
 * Preservation invariant: The input object, its envelope fields, unknown metadata,
 * children, original bytes and engineering attributes are never modified here.
 */

export const ROOT_PROFILE_SCHEMA = 'lfj-root-profile/v1';
export const MANAGED_STAGE_SCHEMA = 'inputxml-managed-stage/v1';
export const MARKUP_RVM_PROFILE = 'AVEVA_JSON_FOR_3D_RVM_VIEWER';
export const RICH_TOPOLOGY_CONVERTER = 'INPUTXML->STAGEDJSON';
export const RICH_TOPOLOGY_CONVERTER_SCHEMA = 'inputxml-direct-managed-stage/v2-rich-topology';

const ENVELOPES = Object.freeze(['hierarchy', 'branches', 'objects']);
const SAFE_CAPABILITIES = Object.freeze({
  read: true,
  index: true,
  view: true,
  edit: false,
  export: false,
});

export class RootProfileError extends TypeError {
  constructor(code, description) {
    super(`${code}: ${description}`);
    this.name = 'RootProfileError';
    this.code = code;
  }
}

function refuse(code, description) {
  throw new RootProfileError(code, description);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function identifyRoot(value) {
  if (Array.isArray(value)) return { rootKind: 'array', rootKey: null, rootPath: '$' };
  if (!isObject(value)) refuse('UNSUPPORTED_ROOT', 'JSON root must be an array or recognized object');

  const matches = ENVELOPES.filter((key) => Array.isArray(value[key]));
  const typed = typeof value.type === 'string' && value.type.trim() !== ''
    && Array.isArray(value.children);

  if (matches.length + Number(typed) > 1) {
    refuse('AMBIGUOUS_ROOT', 'Multiple incompatible root collection strategies are present');
  }
  if (matches.length === 1) {
    const key = matches[0];
    return { rootKind: key, rootKey: key, rootPath: `$.${key}` };
  }
  if (typed) return { rootKind: 'typed-single', rootKey: null, rootPath: '$' };

  refuse('UNSUPPORTED_ROOT', 'No supported root collection is present');
}

function identifyProfile(value, root) {
  if (!isObject(value)) return 'staged-generic/v1';

  // Recognizing an array wrapper is not permission to accept an unknown dialect.
  if (value.schema !== undefined && value.schema !== MANAGED_STAGE_SCHEMA) {
    refuse('UNSUPPORTED_SCHEMA', 'Producer schema is unknown or unsupported');
  }

  if (value.profile === undefined) return 'staged-generic/v1';

  if (value.profile !== MARKUP_RVM_PROFILE) {
    refuse('UNSUPPORTED_PROFILE', 'Declared managed-stage consumer profile is unsupported');
  }
  if (value.schema !== MANAGED_STAGE_SCHEMA) {
    refuse('UNSUPPORTED_SCHEMA', 'Strict managed-stage viewer profile requires declared source version');
  }
  if (value.converter !== RICH_TOPOLOGY_CONVERTER ||
      value.converterSchema !== RICH_TOPOLOGY_CONVERTER_SCHEMA) {
    refuse('CONVERTER_MISMATCH', 'Strict managed-stage rich topology converter identity is incorrect');
  }
  if (value.units?.length !== 'mm') {
    refuse('UNITS_MISMATCH', 'Strict managed-stage RVM requires millimetre length units');
  }
  if (root.rootKind !== 'hierarchy') {
    refuse('INCOMPATIBLE_PROFILE', 'Strict rich-topology profile requires a hierarchy root');
  }
  if (!value.hierarchy.length) {
    refuse('EMPTY_RICH_HIERARCHY', 'Strict rich-topology profile cannot have an empty hierarchy');
  }
  return 'managed-stage-markup-rich/v2';
}

/**
 * Classify a structural source root, not a complete file parse or an edit/export grant.
 *
 * @param {unknown} documentRoot Input parsed root/descriptor; never mutated.
 * @returns {{schema:string, profileId:string, rootKind:string, rootKey:string|null,
 *   rootPath:string, capabilities:Readonly<Record<string,boolean>>, rightsBasis:string}}
 * @throws {RootProfileError} Typed unsupported/ambiguous or strict-profile errors.
 */
export function inspectStructuredJsonRoot(documentRoot) {
  const root = identifyRoot(documentRoot);
  const profileId = identifyProfile(documentRoot, root);

  return Object.freeze({
    schema: ROOT_PROFILE_SCHEMA,
    profileId,
    rootKind: root.rootKind,
    rootKey: root.rootKey,
    rootPath: root.rootPath,
    capabilities: SAFE_CAPABILITIES,
    rightsBasis: 'STRUCTURAL_INSPECTION_ONLY',
  });
}
