import { runFbxAutoPipe } from '../auto-pipe/pipeline.js';
import { canonicalJson } from '../canonical-json.js';
import { buildDerivedPortEvidence } from './derived-ports.js';
import { asZoneGeometryError } from './errors.js';
import { prepareZoneGeometryEvidence } from './zone-evidence.js';
import { ZONE_GEOMETRY_STATUS } from './constants.js';

export async function analyseFbxZoneGeometry(input) {
  try {
    const prepared = await prepareZoneGeometryEvidence(input);
    const derivedPortEvidence = await buildDerivedPortEvidence(
      prepared.artifact, prepared.scope, prepared.selections);
    const autoPipe = await runFbxAutoPipe({
      zoneGeometryEvidence: prepared.artifact,
      derivedPortEvidence,
      selections: prepared.selections,
    });
    return Object.freeze({
      status: ZONE_GEOMETRY_STATUS.PASS,
      zoneGeometryEvidence: prepared.artifact,
      derivedPortEvidence,
      autoPipe,
      zoneGeometryJson: canonicalJson(prepared.artifact),
      derivedPortJson: canonicalJson(derivedPortEvidence),
      counts: Object.freeze({
        selectedOccurrences: prepared.artifact.conservation.selectedOccurrenceCount,
        selectedGeometries: prepared.artifact.conservation.selectedGeometryCount,
        admittedLoops: derivedPortEvidence.admittedPortCount,
        rejectedLoops: derivedPortEvidence.rejectedPortCount,
        admittedPipes: autoPipe.counts?.admittedPipes || 0,
        pipeLinks: autoPipe.counts?.links || 0,
        stagedBranches: autoPipe.counts?.branches || 0,
      }),
    });
  } catch (error) {
    throw asZoneGeometryError(error);
  }
}
