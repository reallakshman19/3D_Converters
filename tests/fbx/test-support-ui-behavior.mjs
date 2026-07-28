import assert from 'node:assert/strict';
import { buildFbxEngineeringPackageDownloadName, buildFbxSupportEvidenceDownloadName,
  supportPreviewMetaValue } from '../../tabs/model-converters/converters/fbx/support-analysis/ui.js';
import { buildFbxZoneWireframeMetaText } from '../../tabs/model-converters/converters/fbx/zone-geometry/wireframe-preview.js';

assert.equal(buildFbxSupportEvidenceDownloadName('TAY-A.fbx', '/TWGA-1000-CU-PI-P'),
  'TAY-A.TWGA-1000-CU-PI-P.FbxSupportEvidence.v1.json');
assert.equal(buildFbxEngineeringPackageDownloadName('TAY-A.fbx', '/TWGA-1000-CU-PI-P'),
  'TAY-A.TWGA-1000-CU-PI-P.FbxSelectedZoneEngineeringPackage.v1.zip');
assert.equal(supportPreviewMetaValue({ support: { state: { phase: 'not-evaluated' } } }), 'not evaluated');
const meta = buildFbxZoneWireframeMetaText({ previewSourceName: 'TAY-A', selectedZoneLabel: '/Z',
  previewZones: [], displayedPointCount: 1 }, { adapter: 'FbxZoneGeometryWireframePreview.v1',
  displayedSegmentCount: 2, sourceSegmentCount: 2 }, 'analysing');
assert.match(meta, /supports: analysing/);
assert.doesNotMatch(meta, /supports: 0/);
console.log('PASS test-support-ui-behavior');
