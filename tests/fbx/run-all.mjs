const tests = [
  'test-parser.mjs',
  'test-transforms.mjs',
  'test-mapping.mjs',
  'test-worker.mjs',
  'test-determinism.mjs',
  'test-registry.mjs',
  'test-provenance.mjs',
  'test-static-guards.mjs',
];
for (const test of tests) await import(new URL(test, import.meta.url));
console.log('FBX test suite: PASS');
