from pathlib import Path

path = Path('tabs/xml-cii-2019-standalone/workers/master-dataset-startup-hydration.js')
text = path.read_text(encoding='utf-8')
old = "  const metadataCount = Number(metadata.rowCount || 0);"
new = "  const metadataCount = metadata.rowCount == null ? Number(custody.rowCount || 0) : Number(metadata.rowCount || 0);"
if text.count(old) != 1:
    raise SystemExit(f'legacy metadata row-count compatibility: expected one match, found {text.count(old)}')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
Path('docs/' + str(path)).write_text(path.read_text(encoding='utf-8'), encoding='utf-8')
print('PR780 Phase E-A legacy metadata compatibility fix applied.')
