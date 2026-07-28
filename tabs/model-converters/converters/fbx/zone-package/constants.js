export const FBX_ZONE_PACKAGE_SCHEMAS = Object.freeze({
  geometryManifest: 'FbxSelectedZoneGeometryManifest.v1',
  packageAudit: 'FbxSelectedZonePackageAudit.v1',
  supportEvidence: 'FbxSupportEvidence.v1',
  hostAuthorityBinding: 'FbxHostAuthorityBinding.v1',
  diagnosticLedger: 'FbxSelectedZoneDiagnosticLedger.v1',
});

export const FBX_ZONE_PACKAGE_BUFFER_ROLES = Object.freeze([
  'control-points-mm', 'polygon-offsets', 'polygon-vertex-indices',
]);

export const FBX_ZONE_PACKAGE_ROLE_SPECS = Object.freeze({
  'control-points-mm': { scalarType: 'Float64', componentCount: 3 },
  'polygon-offsets': { scalarType: 'Uint32', componentCount: 1 },
  'polygon-vertex-indices': { scalarType: 'Uint32', componentCount: 1 },
});

export const FBX_ZONE_PACKAGE_FILE_ROLES = Object.freeze([
  'MANIFEST', 'AUDIT', 'STAGEDJSON', 'SUPPORT_EVIDENCE',
]);

export const FBX_ZONE_PACKAGE_LIMITS = Object.freeze({
  maxSelectedGeometries: 20000,
  maxGeometryBufferBytes: 64 * 1024 * 1024,
  maxPackageFiles: 200000,
});

export class FbxZonePackageError extends Error {
  constructor(code, message) {
    super(`${code} ${message}`);
    this.name = 'FbxZonePackageError';
    this.code = code;
  }
}

export function fail(code, message) {
  throw new FbxZonePackageError(code, message);
}
