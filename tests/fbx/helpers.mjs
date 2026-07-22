import { readFile } from 'node:fs/promises';

export const ROOT = new URL('../../', import.meta.url);
export const FIXTURE_URL = new URL('../fixtures/fbx/two-pipes.fbx', import.meta.url);
export const MAPPING_URL = new URL('../fixtures/fbx/two-pipes.fbxmap.json', import.meta.url);

export async function fixtureBytes() {
  return new Uint8Array(await readFile(FIXTURE_URL));
}

export async function fixtureMapping() {
  return JSON.parse(await readFile(MAPPING_URL, 'utf8'));
}

export function syntheticGraph() {
  const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
  return {
    schema: 'FbxSourceGraph.v1',
    file: { version: 7400, ascii: false },
    globalSettings: { unitMeters: 0.01, axes: { right: 0, up: 2, front: 5 } },
    sourceObjects: [
      { sourceObjectId: '201', class: 'NODE', name: 'anything' },
      { sourceObjectId: '202', class: 'NODE', name: 'anything' },
    ],
    occurrences: [
      { sourceOccurrenceId: 'occ:201', sourceModelObjectId: '201', geometryObjectIds: ['101'], inheritMode: 0, geometryMatrixMm: identity },
      { sourceOccurrenceId: 'occ:202', sourceModelObjectId: '202', geometryObjectIds: ['102'], inheritMode: 0, geometryMatrixMm: identity },
    ],
    geometries: [
      { geometryObjectId: '101', kind: 'MESH', verticesMm: [[0, 0, 0], [100, 0, 0]] },
      { geometryObjectId: '102', kind: 'MESH', verticesMm: [[100, 0, 0], [200, 0, 0]] },
    ],
    hierarchyEdges: [], connectionEdges: [], unsupportedRecords: [], unresolvedReferences: [], warnings: [],
  };
}
