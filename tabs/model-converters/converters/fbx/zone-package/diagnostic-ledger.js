import { canonicalJson, deepFreeze } from '../canonical-json.js';
import { sha256Hex } from '../sha256.js';
import { classifyGeometryTopology } from './mesh-topology-classifier.js';
import { FBX_ZONE_PACKAGE_SCHEMAS, fail } from './constants.js';

const GOVERNED_DISPOSITIONS = Object.freeze([
  'CLOSED', 'CAPPED', 'MERGED', 'MULTI_SHELL', 'INVALID_TOPOLOGY', 'OTHER_GOVERNED',
]);

function ledgerEntry(manifestGeometry, raw) {
  const { disposition, reasonCode, stats } = classifyGeometryTopology(raw);
  if (!GOVERNED_DISPOSITIONS.includes(disposition)) fail('ZONE_PACKAGE_UNGOVERNED_DISPOSITION', `${disposition} is not a governed disposition.`);
  return {
    geometryId: manifestGeometry.geometryId,
    occurrenceId: manifestGeometry.occurrenceId,
    disposition,
    reasonCode,
    stats,
  };
}

function summarize(entries) {
  const countsByDisposition = Object.fromEntries(GOVERNED_DISPOSITIONS.map((disposition) => [disposition, 0]));
  for (const entry of entries) countsByDisposition[entry.disposition] += 1;
  return { totalGeometries: entries.length, countsByDisposition };
}

/**
 * Phase 5: explains every selected geometry in the Phase 1 manifest with a
 * governed topology disposition. Requires exact 1:1 coverage between the
 * manifest and the ledger — a geometry with no explanation is a defect, not
 * an omission. Does not widen FbxAutoPipeProfile.v1 admission; this is a
 * read-only diagnostic over already-selected geometry.
 */
export async function buildSelectedZoneDiagnosticLedger({ manifest, geometries } = {}) {
  if (!manifest || manifest.schema !== FBX_ZONE_PACKAGE_SCHEMAS.geometryManifest) {
    fail('ZONE_PACKAGE_INVALID_INPUT', 'manifest must be a validated FbxSelectedZoneGeometryManifest.v1.');
  }
  if (!Array.isArray(geometries)) fail('ZONE_PACKAGE_INVALID_INPUT', 'geometries must be an array.');
  const rawById = new Map(geometries.map((geometry) => [geometry.geometryId, geometry]));
  const entries = manifest.geometries.map((manifestGeometry) => {
    const raw = rawById.get(manifestGeometry.geometryId);
    if (!raw) fail('ZONE_PACKAGE_UNEXPLAINED_GEOMETRY', `no raw geometry supplied to explain manifest geometryId ${manifestGeometry.geometryId}.`);
    return ledgerEntry(manifestGeometry, raw);
  });
  if (entries.length !== manifest.geometries.length) {
    fail('ZONE_PACKAGE_UNEXPLAINED_GEOMETRY', 'the diagnostic ledger must explain every selected geometry exactly once.');
  }
  const payload = {
    schema: FBX_ZONE_PACKAGE_SCHEMAS.diagnosticLedger,
    selectedZoneDigest: manifest.selectedZoneDigest,
    manifestDigest: manifest.manifestDigest,
    entries,
    summary: summarize(entries),
  };
  const ledgerDigest = await sha256Hex(canonicalJson(payload));
  return deepFreeze({ ...payload, ledgerDigest });
}
