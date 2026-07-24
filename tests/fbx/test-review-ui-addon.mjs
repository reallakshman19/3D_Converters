import assert from 'node:assert/strict';
import { getConverterById } from '../../tabs/model-converters/converter-registry.js?v=20260617-basic-glb-3';
import {
  FBX_CONVERT_OPERATION,
  FBX_REVIEW_OPERATION,
  installFbxReviewUiAddon,
  runFbxWithReviewUi,
} from '../../tabs/model-converters/fbx-review-ui-addon.js';

const converter = getConverterById('fbx_to_stagedjson');
assert.ok(converter);
assert.equal(installFbxReviewUiAddon(), true);
assert.equal(installFbxReviewUiAddon(), false);
assert.equal(converter.defaults.fbxOperation, FBX_CONVERT_OPERATION);
assert.equal(converter.defaults.reviewMaxItemsPerShard, 500);
assert.deepEqual(
  converter.options.find((option) => option.key === 'fbxOperation')?.options,
  [FBX_CONVERT_OPERATION, FBX_REVIEW_OPERATION],
);
assert.equal(converter.options.find((option) => option.key === 'reviewMaxItemsPerShard')?.type, 'number');
assert.match(converter.description, /bounded-memory review execution remains available through the Node CLI/i);

let delegated = false;
const delegatedResult = await runFbxWithReviewUi(
  { options: { fbxOperation: FBX_CONVERT_OPERATION } },
  async () => {
    delegated = true;
    return { ok: true, conversionStatus: 'BASE_RUN' };
  },
);
assert.equal(delegated, true);
assert.equal(delegatedResult.conversionStatus, 'BASE_RUN');
await assert.rejects(
  () => runFbxWithReviewUi({ options: { fbxOperation: 'UNKNOWN' } }),
  /Unsupported FBX operation/,
);

console.log('test-review-ui-addon: PASS');
