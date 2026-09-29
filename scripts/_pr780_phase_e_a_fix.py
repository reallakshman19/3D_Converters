from pathlib import Path

path = Path('tabs/xml-cii-2019-standalone/workers/master-dataset-startup-hydration.js')
text = path.read_text(encoding='utf-8')
old = "  const metadataCount = Number(metadata.rowCount || 0);"
new = "  const metadataCount = metadata.rowCount == null ? Number(custody.rowCount || 0) : Number(metadata.rowCount || 0);"
if text.count(old) != 1:
    raise SystemExit(f'legacy metadata row-count compatibility: expected one match, found {text.count(old)}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
Path('docs/' + str(path)).write_text(path.read_text(encoding='utf-8'), encoding='utf-8')

test_path = Path('tests/xml-cii-master-dataset-rollback-custody.test.mjs')
test_text = test_path.read_text(encoding='utf-8')
old_assert = "    assert.equal(stateRef.current.masterContext.lineRows.length, 2);"
new_assert = "    assert.equal(stateRef.current.masterContext.lineRows.length, 0);\n    assert.equal(stateRef.current.masterContext.rowCounts.lineList, 2);\n    assert.equal(stateRef.current.masterContext.previewRows.lineList.length, 2);"
if test_text.count(old_assert) != 1:
    raise SystemExit(f'rollback custody metadata-only assertion: expected one match, found {test_text.count(old_assert)}')
test_path.write_text(test_text.replace(old_assert, new_assert, 1), encoding='utf-8')

print('PR780 Phase E-A legacy metadata compatibility and custody assertions applied.')
