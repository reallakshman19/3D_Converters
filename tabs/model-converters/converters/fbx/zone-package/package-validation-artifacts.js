import { validateSupportAssemblyEvidence } from '../support-assembly/evidence.js';
import { validateSupportHostAssociationEvidence } from '../support-host/evidence.js';
import { packageArtifactSpecForRole, selectedZonePackageArtifactSpecs } from './artifact-roles.js';
import { parsePackagedArtifact } from './package-artifacts.js';
import { validateSelectedZoneQualificationRoot } from './qualification-root.js';
import { validateSelectedZoneEngineeringAttributeLedger } from './selected-engineering-attributes.js';
import { validateSelectedZoneSourceGraph } from './selected-source-graph.js';
import { fail } from './constants.js';

function recordsByRole(audit, role) {
  return audit.files.filter((record) => record.role === role);
}

export async function verifyPackagedSemanticArtifacts(audit, files) {
  const parsed = {};
  for (const spec of selectedZonePackageArtifactSpecs()) {
    const record = recordsByRole(audit, spec.role)[0];
    if (record.disposition !== 'PRESENT') continue;
    parsed[spec.role] = parsePackagedArtifact(spec.role, files.get(spec.path).bytes);
  }
  if (parsed.SELECTED_SOURCE_GRAPH) {
    await validateSelectedZoneSourceGraph(parsed.SELECTED_SOURCE_GRAPH);
  }
  if (parsed.ENGINEERING_ATTRIBUTES) {
    await validateSelectedZoneEngineeringAttributeLedger(parsed.ENGINEERING_ATTRIBUTES);
  }
  if (parsed.SUPPORT_HOST_ASSOCIATION_EVIDENCE) {
    await validateSupportHostAssociationEvidence(parsed.SUPPORT_HOST_ASSOCIATION_EVIDENCE);
  }
  if (parsed.SUPPORT_ASSEMBLY_EVIDENCE) {
    await validateSupportAssemblyEvidence(parsed.SUPPORT_ASSEMBLY_EVIDENCE);
  }
  if (parsed.QUALIFICATION_ROOT) {
    await validateSelectedZoneQualificationRoot(parsed.QUALIFICATION_ROOT);
    const expected = new Map(parsed.QUALIFICATION_ROOT.artifactDigests
      .map((item) => [item.role, item.sha256]));
    for (const [role, digest] of expected) {
      const spec = packageArtifactSpecForRole(role);
      const record = recordsByRole(audit, role)[0];
      if (!spec || record?.disposition !== 'PRESENT' || record.sha256 !== digest) {
        fail('ZONE_PACKAGE_INVALID_QUALIFICATION',
          `qualification root digest for ${role} differs from the package audit.`);
      }
    }
  }
  return parsed;
}
