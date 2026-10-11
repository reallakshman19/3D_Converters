// 212-T6: temporary LFJ indexed-generation custody, not C05 persisted master restore.
// Deterministic Node Web-Lock/IndexedDB event harness; NOT native-browser acceptance.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  indexedGenerationNames, indexedGenerationLockName,
  recoverAbandonedIndexedGenerations,
} from '../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-lfj-cold-recovery.js';

const ids = [
  'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
];
function fixture() {
  const names = new Set(), held = new Set(), requests = [], failed = new Set();
  const locks = {
    async request(name, options, callback) {
      assert.match(name, /^lfj-a3-indexed-r2-/);
      assert.equal(options.mode, 'exclusive');
      if (held.has(name)) {
        assert.equal(options.ifAvailable, true, 'Cold recovery must not wait for a live tab');
        return callback(null);
      }
      held.add(name);
      try { return await callback({ name }); }
      finally { held.delete(name); }
    },
  };
  const databaseFactory = {
    async databases() { return [...names].map(name => ({ name, version: 1 })); },
    deleteDatabase(name) {
      requests.push(name);
      const request = {};
      queueMicrotask(() => {
        if (failed.has(name)) request.onerror?.();
        else { names.delete(name); request.onsuccess?.(); }
      });
      return request;
    },
  };
  return { names, held, requests, failed, locks, databaseFactory };
}
function addPair(fixture, id) {
  for (const name of indexedGenerationNames(id)) fixture.names.add(name);
}
test('212-T6 cold recovery protects live tab and unowned DB while reclaiming a different orphan', async () => {
  const f = fixture();
  addPair(f, ids[0]);
  addPair(f, ids[1]);
  const liveLock = indexedGenerationLockName(ids[1]);
  f.held.add(liveLock);
  const foreign = 'another-app-owned-indexeddb';
  const legacy = 'lfj-ui-preview-source-' + ids[0];
  f.names.add(foreign); f.names.add(legacy);

  const first = await recoverAbandonedIndexedGenerations(f);
  assert.deepEqual(
    { inspected: first.inspected, recovered: first.recovered, liveSkipped: first.liveSkipped },
    { inspected: 2, recovered: 1, liveSkipped: 1 },
  );
  assert.equal(first.safeToStartNewBuild, true);
  assert.deepEqual(f.requests, [...indexedGenerationNames(ids[0])]);
  assert.equal(f.held.has(liveLock), true);
  for (const name of indexedGenerationNames(ids[1])) assert.equal(f.names.has(name), true);
  assert.equal(f.names.has(foreign), true);
  assert.equal(f.names.has(legacy), true);

  f.held.delete(liveLock); // Only after the simulated other tab closes.
  const second = await recoverAbandonedIndexedGenerations(f);
  assert.deepEqual(
    { inspected: second.inspected, recovered: second.recovered, liveSkipped: second.liveSkipped },
    { inspected: 1, recovered: 1, liveSkipped: 0 },
  );
  assert.deepEqual([...f.names].sort(), [foreign, legacy].sort());
  assert.equal(f.held.size, 0, 'Recovery owns no generation lock after completion');
});
test('212-T6 corrupt/failed delete cannot advertise recovered and cannot touch later generation; retry heals', async () => {
  const f = fixture();
  addPair(f, ids[0]);
  addPair(f, ids[1]);
  const corrupt = indexedGenerationNames(ids[0])[0];
  f.failed.add(corrupt);
  await assert.rejects(
    recoverAbandonedIndexedGenerations(f),
    error => error?.code === 'LFJ_IDB_CLEANUP_ERROR',
  );
  assert.equal(f.held.size, 0, 'Lock must release after failed deletion');
  assert.equal(f.names.has(corrupt), true, 'Corrupt source store not falsely deleted');
  assert.deepEqual(f.requests, [...indexedGenerationNames(ids[0])],
    'Second orphan must not be touched after first incomplete recovery');
  for (const name of indexedGenerationNames(ids[1])) assert.equal(f.names.has(name), true);
  f.failed.clear();
  const recovered = await recoverAbandonedIndexedGenerations(f);
  assert.equal(recovered.recovered, 2);
  assert.equal(recovered.inspected, 2);
  assert.equal(recovered.safeToStartNewBuild, true);
  assert.equal(f.names.size, 0);
  assert.equal(f.held.size, 0);
});
test('212-T6 untrusted enumeration failure is fatal before any IDB deletion or lock acquisition', async () => {
  const f = fixture();
  addPair(f, ids[0]);
  const databaseFactory = {
    ...f.databaseFactory,
    async databases() { throw Object.assign(new Error('IDB enumeration denied'), { code: 'SECURITY_ERROR' }); },
  };
  await assert.rejects(
    recoverAbandonedIndexedGenerations({ ...f, databaseFactory }),
    error => error?.code === 'SECURITY_ERROR',
  );
  assert.equal(f.requests.length, 0);
  assert.equal(f.held.size, 0);
  assert.deepEqual([...f.names].sort(), [...indexedGenerationNames(ids[0])].sort());
});
