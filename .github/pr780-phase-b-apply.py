from pathlib import Path
import re

NEW = '20260929-pr780-bounded-ui-1'
OLD_RUNTIME = '20260929-pr780-worker-search-1'
OLD_TOP = '20260929-pr780-metadata-1'


def read(path):
    return Path(path).read_text()


def write(path, text):
    Path(path).write_text(text)


def replace(path, old, new, count=None):
    text = read(path)
    hits = text.count(old)
    if count is not None and hits != count:
        raise SystemExit(f'{path}: expected {count} occurrences of {old!r}, found {hits}')
    if hits == 0:
        raise SystemExit(f'{path}: missing expected text {old!r}')
    write(path, text.replace(old, new))


def replace_once(path, old, new):
    replace(path, old, new, 1)


def mirror(path):
    src = Path(path)
    dst = Path('docs') / src
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_text(src.read_text())


protocol = 'tabs/xml-cii-2019-standalone/workers/master-dataset-protocol.js'
replace_once(
    protocol,
    "  GET_ROWS: 'GET_ROWS',\n  GET_RAW_ROWS: 'GET_RAW_ROWS',",
    "  GET_ROWS: 'GET_ROWS',\n  GET_ROWS_BY_INDEXES: 'GET_ROWS_BY_INDEXES',\n  GET_RAW_ROWS: 'GET_RAW_ROWS',",
)
mirror(protocol)

client = 'tabs/xml-cii-2019-standalone/workers/master-dataset-client.js'
replace_once(client, "from './master-dataset-protocol.js';", f"from './master-dataset-protocol.js?v={NEW}';")
replace_once(
    client,
    "new URL('./master-dataset-worker.js?v=20260929-dataset-worker-2', import.meta.url)",
    f"new URL('./master-dataset-worker.js?v={NEW}', import.meta.url)",
)
replace_once(
    client,
    "  function getRawRows(datasetId, offset = 0, limit = 150) {\n    return request(MASTER_DATASET_COMMAND.GET_RAW_ROWS, { datasetId, offset, limit });\n  }",
    "  function getRowsByIndexes(datasetId, indexes = []) {\n"
    "    return request(MASTER_DATASET_COMMAND.GET_ROWS_BY_INDEXES, {\n"
    "      datasetId,\n"
    "      indexes: Array.isArray(indexes) ? indexes : [],\n"
    "    });\n"
    "  }\n\n"
    "  function getRawRows(datasetId, offset = 0, limit = 150) {\n"
    "    return request(MASTER_DATASET_COMMAND.GET_RAW_ROWS, { datasetId, offset, limit });\n"
    "  }",
)
replace_once(
    client,
    "    openBuffer, openFile, selectSheet, search, getRows, getRawRows,",
    "    openBuffer, openFile, selectSheet, search, getRows, getRowsByIndexes, getRawRows,",
)
mirror(client)

service = 'tabs/xml-cii-2019-standalone/workers/master-dataset-service.js'
replace_once(service, "from './master-dataset-protocol.js';", f"from './master-dataset-protocol.js?v={NEW}';")
replace_once(
    service,
    "    await store.persistDataset(publicMetadata(metadata), prepared.rows);\n"
    "    return {\n"
    "      metadata: publicMetadata(metadata),\n"
    "      previewRows: prepared.rows.slice(0, MASTER_DATASET_PREVIEW_ROWS),\n"
    "      mappingRows: rawRows.slice(0, MASTER_DATASET_PREVIEW_ROWS),\n"
    "    };",
    "    const mappingRows = rawRows.slice(0, MASTER_DATASET_PREVIEW_ROWS);\n"
    "    await store.persistDataset({ ...publicMetadata(metadata), mappingRows }, prepared.rows);\n"
    "    return {\n"
    "      metadata: publicMetadata(metadata),\n"
    "      previewRows: prepared.rows.slice(0, MASTER_DATASET_PREVIEW_ROWS),\n"
    "      mappingRows,\n"
    "    };",
)
marker = "  async function release(message) {\n"
service_text = read(service)
if marker not in service_text:
    raise SystemExit('service: release marker missing')
indexed_fn = """  async function indexedRowsResult(message) {
    const dataset = await ensureDataset(message.datasetId);
    const requested = Array.isArray(message.indexes) ? message.indexes.slice(0, MASTER_DATASET_CHUNK_ROWS) : [];
    const indexes = [];
    const rows = [];
    for (const value of requested) {
      const index = Number(value);
      if (!Number.isInteger(index) || index < 0 || index >= dataset.rows.length) continue;
      indexes.push(index);
      rows.push(dataset.rows[index]);
    }
    return response(MASTER_DATASET_EVENT.ROWS_RESULT, message.requestId, {
      datasetId: message.datasetId,
      indexes,
      rows,
      rowCount: dataset.rows.length,
      raw: false,
    });
  }

"""
write(service, service_text.replace(marker, indexed_fn + marker, 1))
replace_once(
    service,
    "      case MASTER_DATASET_COMMAND.GET_ROWS: return rowsResult(message, false);\n"
    "      case MASTER_DATASET_COMMAND.GET_RAW_ROWS: return rowsResult(message, true);",
    "      case MASTER_DATASET_COMMAND.GET_ROWS: return rowsResult(message, false);\n"
    "      case MASTER_DATASET_COMMAND.GET_ROWS_BY_INDEXES: return indexedRowsResult(message);\n"
    "      case MASTER_DATASET_COMMAND.GET_RAW_ROWS: return rowsResult(message, true);",
)
mirror(service)

worker = 'tabs/xml-cii-2019-standalone/workers/master-dataset-worker.js'
replace_once(worker, "from './master-dataset-protocol.js';", f"from './master-dataset-protocol.js?v={NEW}';")
replace_once(worker, "from './master-dataset-service.js';", f"from './master-dataset-service.js?v={NEW}';")
mirror(worker)

coordinator = 'tabs/xml-cii-2019-standalone/workers/master-dataset-import-coordinator.js'
replace_once(coordinator, "from './master-dataset-client.js';", f"from './master-dataset-client.js?v={NEW}';")
replace_once(coordinator, "from './master-dataset-protocol.js';", f"from './master-dataset-protocol.js?v={NEW}';")
search_block = """  function search(masterKey, query, datasetIdOverride = '') {
    const datasetId = datasetIdOverride || activeDatasets.get(masterKey);
    if (!datasetId) throw new Error(`No active dataset exists for ${masterKey}.`);
    return client.search(datasetId, query);
  }

"""
coord_text = read(coordinator)
if search_block not in coord_text:
    raise SystemExit('coordinator: search block missing')
bounded_block = search_block + """  function getRows(masterKey, offset = 0, limit = 150, datasetIdOverride = '') {
    const datasetId = datasetIdOverride || activeDatasets.get(masterKey);
    if (!datasetId) throw new Error(`No active dataset exists for ${masterKey}.`);
    return client.getRows(datasetId, offset, limit);
  }

  function getRowsByIndexes(masterKey, indexes = [], datasetIdOverride = '') {
    const datasetId = datasetIdOverride || activeDatasets.get(masterKey);
    if (!datasetId) throw new Error(`No active dataset exists for ${masterKey}.`);
    return client.getRowsByIndexes(datasetId, indexes);
  }

"""
write(coordinator, coord_text.replace(search_block, bounded_block, 1))
replace_once(
    coordinator,
    "  return Object.freeze({ openFile, openBuffer, selectSheet, workbookJob, materialize, releaseMaster, search, dispose });",
    "  return Object.freeze({ openFile, openBuffer, selectSheet, workbookJob, materialize, releaseMaster, search, getRows, getRowsByIndexes, dispose });",
)
mirror(coordinator)

runtime = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-dataset-runtime.js'
write(
    runtime,
    f"""import {{ createMasterDatasetImportCoordinator }} from '../workers/master-dataset-import-coordinator.js?v={NEW}';

export const masterDatasetCoordinator = createMasterDatasetImportCoordinator();

export function searchMasterDatasetRows(masterKey, datasetId, query) {{
  return masterDatasetCoordinator.search(masterKey, query, datasetId);
}}

export function getMasterDatasetRows(masterKey, datasetId, offset = 0, limit = 150) {{
  return masterDatasetCoordinator.getRows(masterKey, offset, limit, datasetId);
}}

export function getMasterDatasetRowsByIndexes(masterKey, datasetId, indexes = []) {{
  return masterDatasetCoordinator.getRowsByIndexes(masterKey, indexes, datasetId);
}}
""",
)
mirror(runtime)

master_runtime = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-runtime.js'
replace_once(
    master_runtime,
    "    rawRows: { ...EMPTY_RAW, ...(context.rawRows || {}) },\n    appliedMappingRevision: applied,",
    "    rawRows: { ...EMPTY_RAW, ...(context.rawRows || {}) },\n"
    "    mappingRows: { ...(context.mappingRows || {}) },\n"
    "    appliedMappingRevision: applied,",
)
replace_once(
    master_runtime,
    "    rawRows: { ...runtime.rawRows, [key]: Array.isArray(rawRows) ? rawRows : [] },\n    datasetRefs:",
    "    rawRows: { ...runtime.rawRows, [key]: Array.isArray(rawRows) ? rawRows : [] },\n"
    "    mappingRows: { ...runtime.mappingRows, [key]: Array.isArray(rawRows) ? rawRows.slice(0, 150) : [] },\n"
    "    datasetRefs:",
)
mirror(master_runtime)

startup = 'tabs/xml-cii-2019-standalone/workers/master-dataset-startup-hydration.js'
replace_once(
    startup,
    "    rawRows: { ...(base.rawRows || {}) },\n    datasetRefs:",
    "    rawRows: { ...(base.rawRows || {}) },\n"
    "    mappingRows: { ...(base.mappingRows || {}) },\n"
    "    datasetRefs:",
)
replace_once(
    startup,
    "    context.rawRows[item.masterKey] = [];\n    context.datasetRefs[item.masterKey] = Object.freeze({",
    "    context.rawRows[item.masterKey] = [];\n"
    "    context.mappingRows[item.masterKey] = Array.isArray(item.metadata.mappingRows) ? item.metadata.mappingRows.slice(0, 150) : [];\n"
    "    context.datasetRefs[item.masterKey] = Object.freeze({",
)
mirror(startup)

import_masters = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-import-masters.js'
replace_once(
    import_masters,
    f"import {{ searchMasterDatasetRows }} from './xml-cii-adapted-master-dataset-runtime.js?v={OLD_RUNTIME}';",
    f"import {{ getMasterDatasetRows, getMasterDatasetRowsByIndexes, searchMasterDatasetRows }} from './xml-cii-adapted-master-dataset-runtime.js?v={NEW}';",
)
text = read(import_masters)
pattern = re.compile(r"function appendPreview\(parent, master, state, config\) \{.*?\n\}\n\nfunction emptySummary", re.S)
match = pattern.search(text)
if not match:
    raise SystemExit('import-masters: appendPreview block not found')
new_append = r'''function appendPreview(parent, master, state, config) {
  const masterKey = master.key;
  const schemaRows = master.previewRows || [];
  const datasetRef = state.masterContext?.datasetRefs?.[masterKey] || null;
  const datasetId = datasetRef?.datasetId || '';
  const datasetRowCount = datasetId
    ? Math.max(0, Number(state.masterContext?.rowCounts?.[masterKey] ?? datasetRef?.rowCount ?? master.rowCount ?? 0) || 0)
    : 0;
  const allRows = datasetId ? [] : buildPreviewSearchRows(master, state);
  const availableRowCount = datasetId ? datasetRowCount : allRows.length;
  const wrap = createElement('div', '', 'xml-cii-master-preview');
  wrap.appendChild(createElement('h4', 'Preview'));
  if (!availableRowCount) {
    wrap.appendChild(createElement('div', 'No rows loaded.', 'xml-cii-phase-help'));
    parent.appendChild(wrap);
    return;
  }

  const searchInput = style(createElement('input'), { width: '100%', padding: '8px 12px', marginBottom: '8px', borderRadius: '4px', border: '1px solid rgba(148, 163, 184, 0.2)', background: 'rgba(15, 23, 42, 0.3)', color: '#fff', fontSize: '0.88rem' });
  searchInput.type = 'text';
  searchInput.placeholder = '🔍 Search preview data...';
  wrap.appendChild(searchInput);

  const countText = createElement('div', '', 'xml-cii-phase-help');
  countText.dataset.previewVirtualCount = masterKey;
  countText.style.marginBottom = '8px';
  wrap.appendChild(countText);

  const columns = previewColumns(schemaRows.length ? schemaRows : allRows.slice(0, 150), masterKey, config, state.masterContext);
  const tableEl = createElement('table', '', 'xml-cii-master-preview-table');
  tableEl.append(tableHead(columns, masterKey, config, state.masterContext));
  const tbodyEl = createElement('tbody');
  tableEl.appendChild(tbodyEl);

  const scrollContainer = style(createElement('div'), { maxHeight: '350px', overflowY: 'auto', border: '1px solid rgba(148, 163, 184, 0.12)', borderRadius: '6px' });
  scrollContainer.appendChild(tableEl);
  wrap.appendChild(scrollContainer);

  let indexes = null;
  let scheduled = false;
  let renderGeneration = 0;

  const renderDatasetWindow = async () => {
    scheduled = false;
    const requestGeneration = ++renderGeneration;
    const total = Array.isArray(indexes) ? indexes.length : datasetRowCount;
    const window = virtualRowWindow(total, scrollContainer.scrollTop);
    try {
      const requestedIndexes = Array.isArray(indexes) ? indexes.slice(window.start, window.end) : null;
      const result = requestedIndexes
        ? await getMasterDatasetRowsByIndexes(masterKey, datasetId, requestedIndexes)
        : await getMasterDatasetRows(masterKey, datasetId, window.start, Math.max(1, window.end - window.start));
      if (requestGeneration !== renderGeneration) return;
      tbodyEl.innerHTML = '';
      if (window.topSpacerPx > 0) tbodyEl.appendChild(virtualSpacerRow(columns, window.topSpacerPx));
      const rows = Array.isArray(result?.rows) ? result.rows : [];
      const sourceIndexes = Array.isArray(result?.indexes) ? result.indexes : null;
      for (let index = 0; index < rows.length; index += 1) {
        const tr = createElement('tr');
        const sourceIndex = sourceIndexes?.[index] ?? requestedIndexes?.[index] ?? (window.start + index);
        tr.dataset.sourceRowIndex = String(sourceIndex);
        for (const col of columns) tr.appendChild(createElement('td', text(rows[index]?.[col])));
        tbodyEl.appendChild(tr);
      }
      if (window.bottomSpacerPx > 0) tbodyEl.appendChild(virtualSpacerRow(columns, window.bottomSpacerPx));
      tbodyEl.dataset.virtualStart = String(window.start);
      tbodyEl.dataset.virtualEnd = String(window.end);
      tbodyEl.dataset.virtualTotal = String(total);
      countText.textContent = total
        ? `Rows ${window.start + 1}-${window.end} of ${total.toLocaleString('en-US')} (worker-backed virtualized)`
        : 'No matching rows.';
    } catch (error) {
      if (requestGeneration !== renderGeneration) return;
      console.error(`[xml-cii] Worker Preview row fetch failed for ${masterKey}:`, error);
      tbodyEl.innerHTML = '';
      countText.textContent = `Preview load failed: ${error?.message || String(error)}`;
    }
  };

  const renderLegacyWindow = () => {
    scheduled = false;
    const window = replaceVirtualPreviewRows(tbodyEl, columns, allRows, indexes, scrollContainer.scrollTop);
    const total = logicalRowCount(allRows, indexes);
    countText.textContent = total
      ? `Rows ${window.start + 1}-${window.end} of ${total.toLocaleString('en-US')} (virtualized)`
      : 'No matching rows.';
  };

  const renderWindow = datasetId ? renderDatasetWindow : renderLegacyWindow;
  const scheduleWindow = () => {
    if (scheduled) return;
    scheduled = true;
    const invoke = () => { void renderWindow(); };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(invoke);
    else invoke();
  };

  bindPreviewSearch({
    searchInput, masterKey, state, allRows, scrollContainer,
    setIndexes: (nextIndexes) => { indexes = nextIndexes; },
    renderWindow, countText,
  });
  scrollContainer.addEventListener('scroll', scheduleWindow);
  void renderWindow();
  parent.appendChild(wrap);
}

function emptySummary'''
text = text[:match.start()] + new_append + text[match.end():]
write(import_masters, text)
replace_once(
    import_masters,
    "  const rawRows = state.masterContext?.rawRows?.[masterKey] || [];\n"
    "  if (!rawRows.length) return createElement('div', 'Import rows/file to configure field mapping.', 'xml-cii-phase-help');",
    "  const datasetId = state.masterContext?.datasetRefs?.[masterKey]?.datasetId || '';\n"
    "  const rawRows = datasetId\n"
    "    ? (state.masterContext?.mappingRows?.[masterKey] || [])\n"
    "    : (state.masterContext?.rawRows?.[masterKey] || []);\n"
    "  if (!rawRows.length) {\n"
    "    const message = datasetId\n"
    "      ? 'Bounded mapping sample unavailable. Re-import this master to refresh mapping samples.'\n"
    "      : 'Import rows/file to configure field mapping.';\n"
    "    return createElement('div', message, 'xml-cii-phase-help');\n"
    "  }",
)
mirror(import_masters)

master_worker_events = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-worker-events.js'
replace_once(
    master_worker_events,
    f"./xml-cii-adapted-master-dataset-runtime.js?v={OLD_RUNTIME}",
    f"./xml-cii-adapted-master-dataset-runtime.js?v={NEW}",
)
mirror(master_worker_events)

for path in [
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-events.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-smart.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a-cii-zip.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a-consolidated-review-v2.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-panels.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-panels-smart.js',
]:
    replace_once(path, OLD_RUNTIME, NEW)
    mirror(path)

workflow_shell = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-workflow-shell.js'
replace_once(workflow_shell, 'xml-cii-adapted-phase-panels-smart.js?v=20260802-smart-ui-v1', f'xml-cii-adapted-phase-panels-smart.js?v={NEW}')
replace_once(workflow_shell, 'xml-cii-adapted-events-smart.js?v=20260802-smart-ui-v1', f'xml-cii-adapted-events-smart.js?v={NEW}')
replace_once(workflow_shell, 'master-dataset-startup-hydration.js?v=20260929-dataworker-1', f'master-dataset-startup-hydration.js?v={NEW}')
mirror(workflow_shell)

phase_mode_a = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-panels-mode-a.js'
replace_once(phase_mode_a, OLD_TOP, NEW)
mirror(phase_mode_a)

shell_mode_a = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-workflow-shell-mode-a-easy-bulk-v6.js'
replace(shell_mode_a, OLD_TOP, NEW, 2)
replace_once(shell_mode_a, '20260929-dataworker-1', NEW)
mirror(shell_mode_a)

for path in [
    'tabs/xml-cii-2019-standalone-tab.js',
    'core/app-standalone-runtime.js',
    'core/app.js',
    'main-rhbg-fitguard.js',
    'index.html',
]:
    replace(path, OLD_TOP, NEW)
    mirror(path)

worker_test = 'tests/xml-cii-master-dataset-worker.test.mjs'
replace_once(
    worker_test,
    "import { MASTER_DATASET_EVENT } from '../tabs/xml-cii-2019-standalone/workers/master-dataset-protocol.js';",
    "import { MASTER_DATASET_COMMAND, MASTER_DATASET_EVENT } from '../tabs/xml-cii-2019-standalone/workers/master-dataset-protocol.js';",
)
replace_once(
    worker_test,
    "  assert.deepEqual(search.indexes, [198]);\n",
    "  assert.deepEqual(search.indexes, [198]);\n"
    "  assert.equal(ready.mappingRows.length, 150);\n"
    "  const selected = await service.handle({\n"
    "    type: MASTER_DATASET_COMMAND.GET_ROWS_BY_INDEXES,\n"
    "    requestId: 'r4',\n"
    "    datasetId: ready.metadata.datasetId,\n"
    "    indexes: [198, 0, 199],\n"
    "  });\n"
    "  assert.equal(selected.type, MASTER_DATASET_EVENT.ROWS_RESULT);\n"
    "  assert.deepEqual(selected.indexes, [198, 0, 199]);\n"
    "  assert.equal(selected.rows[0].Description, 'Row 199');\n"
    "  assert.equal(selected.rows[1].Description, 'Row 1');\n",
)

coord_test = 'tests/xml-cii-master-dataset-coordinator.test.mjs'
replace_once(
    coord_test,
    "    async getRawRows(_id, offset, limit) {",
    "    async getRowsByIndexes(_id, indexes) {\n"
    "      calls.push(['indexes', ...indexes]);\n"
    "      return { indexes: [...indexes], rows: indexes.map((index) => ({ n: index })), rowCount };\n"
    "    },\n"
    "    async getRawRows(_id, offset, limit) {",
)
replace_once(
    coord_test,
    "  assert.equal(Math.max(...calls.map(([, , limit]) => limit)), 2000);\n});",
    "  assert.equal(Math.max(...calls.filter(([kind]) => kind !== 'indexes').map(([, , limit]) => limit)), 2000);\n"
    "  const indexed = await coordinator.getRowsByIndexes('lineList', [4, 1], 'ds-1');\n"
    "  assert.deepEqual(indexed.indexes, [4, 1]);\n"
    "  assert.deepEqual(indexed.rows, [{ n: 4 }, { n: 1 }]);\n"
    "});",
)

preview_test = 'tests/xml-cii-master-preview-worker-search.test.mjs'
replace_once(
    preview_test,
    "  assert.match(source, /await searchMasterDatasetRows\\(masterKey, datasetId, query\\)/);",
    "  assert.match(source, /await searchMasterDatasetRows\\(masterKey, datasetId, query\\)/);\n"
    "  assert.match(source, /await getMasterDatasetRows\\(masterKey, datasetId/);\n"
    "  assert.match(source, /await getMasterDatasetRowsByIndexes\\(masterKey, datasetId/);\n"
    "  assert.match(source, /masterContext\\?\\.mappingRows\\?\\.\\[masterKey\\]/);",
)
replace_once(
    preview_test,
    "  assert.match(runtime, /masterDatasetCoordinator\\.search\\(masterKey, query, datasetId\\)/);",
    "  assert.match(runtime, /masterDatasetCoordinator\\.search\\(masterKey, query, datasetId\\)/);\n"
    "  assert.match(runtime, /masterDatasetCoordinator\\.getRows\\(masterKey, offset, limit, datasetId\\)/);\n"
    "  assert.match(runtime, /masterDatasetCoordinator\\.getRowsByIndexes\\(masterKey, indexes, datasetId\\)/);",
)
replace_once(
    preview_test,
    "  assert.match(coordinator, /datasetIdOverride \\|\\| activeDatasets\\.get\\(masterKey\\)/);",
    "  assert.match(coordinator, /datasetIdOverride \\|\\| activeDatasets\\.get\\(masterKey\\)/);\n"
    "  assert.match(coordinator, /function getRowsByIndexes\\(masterKey, indexes = \\[\\], datasetIdOverride = ''\\)/);",
)

startup_test = 'tests/xml-cii-master-dataset-startup-hydration.test.mjs'
replace_once(
    startup_test,
    "async getMetadata(id) { return id === 'line-ds' ? { datasetId: id, rowCount: rows.length, fileName: 'large-lines.xlsx' } : null; },",
    "async getMetadata(id) { return id === 'line-ds' ? { datasetId: id, rowCount: rows.length, fileName: 'large-lines.xlsx', mappingRows: [{ Line: 'L-1' }] } : null; },",
)
replace_once(
    startup_test,
    "    assert.equal(stateRef.current.masterContext.previewRows.lineList.length, 150);",
    "    assert.equal(stateRef.current.masterContext.previewRows.lineList.length, 150);\n"
    "    assert.deepEqual(stateRef.current.masterContext.mappingRows.lineList, [{ Line: 'L-1' }]);",
)

deployment = 'tests/xml-cii-issue-776-deployment-parity.test.mjs'
replace_once(deployment, f"const release = '{OLD_TOP}';", f"const release = '{NEW}';")
pair_insert = """const boundedUiPairs = [
  ['tabs/xml-cii-2019-standalone/workers/master-dataset-protocol.js', 'docs/tabs/xml-cii-2019-standalone/workers/master-dataset-protocol.js'],
  ['tabs/xml-cii-2019-standalone/workers/master-dataset-client.js', 'docs/tabs/xml-cii-2019-standalone/workers/master-dataset-client.js'],
  ['tabs/xml-cii-2019-standalone/workers/master-dataset-service.js', 'docs/tabs/xml-cii-2019-standalone/workers/master-dataset-service.js'],
  ['tabs/xml-cii-2019-standalone/workers/master-dataset-import-coordinator.js', 'docs/tabs/xml-cii-2019-standalone/workers/master-dataset-import-coordinator.js'],
  ['tabs/xml-cii-2019-standalone/workers/master-dataset-worker.js', 'docs/tabs/xml-cii-2019-standalone/workers/master-dataset-worker.js'],
  ['tabs/xml-cii-2019-standalone/workers/master-dataset-startup-hydration.js', 'docs/tabs/xml-cii-2019-standalone/workers/master-dataset-startup-hydration.js'],
  ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-dataset-runtime.js', 'docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-dataset-runtime.js'],
  ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-import-masters.js', 'docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-import-masters.js'],
  ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-runtime.js', 'docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-runtime.js'],
  ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-worker-events.js', 'docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-worker-events.js'],
  ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-events.js', 'docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-events.js'],
  ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js', 'docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js'],
  ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-smart.js', 'docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-smart.js'],
  ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a.js', 'docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a.js'],
  ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a-cii-zip.js', 'docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a-cii-zip.js'],
  ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-panels.js', 'docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-panels.js'],
  ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-panels-smart.js', 'docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-panels-smart.js'],
  ['tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-workflow-shell.js', 'docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-workflow-shell.js'],
];

"""
loop_anchor = "for (const [sourcePath, docsPath] of pairs) {"
if loop_anchor not in read(deployment):
    raise SystemExit('deployment: pair loop missing')
write(deployment, read(deployment).replace(loop_anchor, pair_insert + "for (const [sourcePath, docsPath] of [...pairs, ...boundedUiPairs]) {", 1))

mirror_sources = [
    protocol,
    client,
    service,
    coordinator,
    worker,
    startup,
    runtime,
    import_masters,
    master_runtime,
    master_worker_events,
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-events.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-smart.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a-cii-zip.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a-consolidated-review-v2.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-panels.js',
    'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-panels-smart.js',
    phase_mode_a,
    workflow_shell,
    shell_mode_a,
    'tabs/xml-cii-2019-standalone-tab.js',
    'core/app-standalone-runtime.js',
    'core/app.js',
    'main-rhbg-fitguard.js',
    'index.html',
]
for path in mirror_sources:
    docs = Path('docs') / path
    if Path(path).read_text() != docs.read_text():
        raise SystemExit(f'docs mirror drift after patch: {path}')
