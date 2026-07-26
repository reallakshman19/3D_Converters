import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { discoverComponentCatalog } from '../../tabs/model-converters/converters/fbx/benchmark/component-qualification.js';

const benchmarkUrl = new URL('../../Benchmarks/fbx%20BM/StaggedJsonBMforFBX', import.meta.url);
const benchmarkText = await readFile(benchmarkUrl, 'utf8');
const benchmark = JSON.parse(benchmarkText);
const inventory = discoverComponentCatalog(benchmark);

assert.deepEqual(inventory, {
  schema: 'FbxComponentCatalog.v1',
  branchCount: 37,
  componentCount: 354,
  supportCount: 145,
  countsByOuterType: {
    ELBO: 29,
    FLAN: 77,
    GASK: 88,
    INST: 17,
    OLET: 13,
    PIPE: 88,
    REDU: 8,
    TEE: 7,
    VALV: 27,
  },
  countsByRawType: {
    BEND: 7,
    ELBO: 22,
    FBLI: 8,
    FLAN: 69,
    GASK: 88,
    INST: 17,
    OLET: 13,
    PIPE: 88,
    REDU: 8,
    TEE: 7,
    VALV: 27,
  },
});
assert.equal(
  inventory.branchCount + inventory.componentCount + inventory.supportCount,
  536,
  'benchmark typed-record reconciliation failed',
);

console.log('test-component-benchmark-inventory: PASS');
