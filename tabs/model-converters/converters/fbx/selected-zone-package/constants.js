import { deepFreeze } from '../canonical-json.js';

export const FBX_SELECTED_ZONE_GEOMETRY_MANIFEST_SCHEMA = 'FbxSelectedZoneGeometryManifest.v1';
export const FBX_SELECTED_ZONE_PACKAGE_AUDIT_SCHEMA = 'FbxSelectedZonePackageAudit.v1';
export const FBX_SELECTED_ZONE_PACKAGE_SCHEMA = 'FbxSelectedZonePackage.v1';

export const SELECTED_ZONE_PACKAGE_PATHS = deepFreeze({
  sourceGraph: 'source-graph.selected-zone.json',
  zoneGeometryEvidence: 'zone-geometry-evidence.json',
  geometryManifest: 'geometry-bundle.manifest.json',
  supportEvidence: 'support-evidence.json',
  stagedJson: 'selected-zone.staged.json',
  audit: 'package-audit.json',
});

export const SELECTED_ZONE_PACKAGE_STATUS = deepFreeze({
  evidenceReady: 'EVIDENCE_READY',
  blocked: 'BLOCKED',
  present: 'PRESENT',
  omittedBlocked: 'OMITTED_BLOCKED',
  notAuthorized: 'NOT_AUTHORIZED',
});

export class SelectedZonePackageError extends Error {
  constructor(code, message, evidence = null) {
    super(`${code} ${message}`);
    this.name = 'SelectedZonePackageError';
    this.code = code;
    this.evidence = evidence;
  }
}

export function failSelectedZonePackage(code, message, evidence = null) {
  throw new SelectedZonePackageError(code, message, evidence);
}
