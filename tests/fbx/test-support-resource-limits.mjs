import assert from 'node:assert/strict';
import { runFbxSupportAnalysis } from '../../tabs/model-converters/converters/fbx/support-analysis/pipeline.js';
import { FBX_SUPPORT_PROFILE } from '../../tabs/model-converters/converters/fbx/support-analysis/profile.js';
import { fixture } from './test-support-fixtures.mjs';

const input = fixture();
const profile = { ...FBX_SUPPORT_PROFILE, maximumSourcePolygonsPerCandidate: 1 };
await assert.rejects(() => runFbxSupportAnalysis({ zoneGeometryEvidence: input.zoneGeometryEvidence,
  selections: input.selections, pipeClassifications: input.classifications, profile }),
/ BLOCKED_SUPPORT_RESOURCE|BLOCKED_SUPPORT_RESOURCE/);
const zoneProfile = { ...FBX_SUPPORT_PROFILE, maximumDerivedTrianglesPerZone: 1 };
await assert.rejects(() => runFbxSupportAnalysis({ zoneGeometryEvidence: input.zoneGeometryEvidence,
  selections: input.selections, pipeClassifications: input.classifications, profile: zoneProfile }),
  /BLOCKED_SUPPORT_RESOURCE/);
console.log('PASS test-support-resource-limits');
