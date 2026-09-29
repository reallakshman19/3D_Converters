from pathlib import Path

REL = '20260929-pr780-worker-search-1'


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding='utf-8')


def replace(path, old, new, count=1):
    text = read(path)
    actual = text.count(old)
    if actual != count:
        raise SystemExit(f'{path}: expected {count} occurrence(s), found {actual}: {old[:120]!r}')
    write(path, text.replace(old, new, count))


def replace_pair(relpath, old, new, count=1):
    replace(relpath, old, new, count)
    replace('docs/' + relpath, old, new, count)


runtime = f"""import {{ createMasterDatasetImportCoordinator }} from '../workers/master-dataset-import-coordinator.js?v={REL}';

export const masterDatasetCoordinator = createMasterDatasetImportCoordinator();

export function searchMasterDatasetRows(masterKey, datasetId, query) {{
  return masterDatasetCoordinator.search(masterKey, query, datasetId);
}}
"""
runtime_path = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-dataset-runtime.js'
write(runtime_path, runtime)
write('docs/' + runtime_path, runtime)

coordinator = 'tabs/xml-cii-2019-standalone/workers/master-dataset-import-coordinator.js'
replace_pair(
    coordinator,
    "  function search(masterKey, query) {\n    const datasetId = activeDatasets.get(masterKey);\n",
    "  function search(masterKey, query, datasetIdOverride = '') {\n    const datasetId = datasetIdOverride || activeDatasets.get(masterKey);\n",
)

worker_events = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-worker-events.js'
replace_pair(
    worker_events,
    "import { createMasterDatasetImportCoordinator } from '../workers/master-dataset-import-coordinator.js';\n",
    f"import {{ masterDatasetCoordinator as coordinator }} from './xml-cii-adapted-master-dataset-runtime.js?v={REL}';\n",
)
replace_pair(worker_events, "\nconst coordinator = createMasterDatasetImportCoordinator();\n", "\n")

import_masters = 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-import-masters.js'
replace_pair(
    import_masters,
    "import { appliedFieldMap, effectiveDraftFieldMap, masterMappingStatus, readSupportConfigOnce } from './xml-cii-adapted-master-runtime.js';\n",
    "import { appliedFieldMap, effectiveDraftFieldMap, masterMappingStatus, readSupportConfigOnce } from './xml-cii-adapted-master-runtime.js';\n"
    + f"import {{ searchMasterDatasetRows }} from './xml-cii-adapted-master-dataset-runtime.js?v={REL}';\n",
)
anchor = "function appendPreview(parent, master, state, config) {\n"
helper = """function bindPreviewSearch({ searchInput, masterKey, state, allRows, scrollContainer, setIndexes, renderWindow, countText }) {
  const datasetId = state.masterContext?.datasetRefs?.[masterKey]?.datasetId || '';
  let generation = 0;
  searchInput.addEventListener('input', async () => {
    const query = searchInput.value;
    const requestGeneration = ++generation;
    scrollContainer.scrollTop = 0;
    if (!query.trim()) {
      setIndexes(null);
      renderWindow();
      return;
    }
    if (!datasetId) {
      setIndexes(buildMatchingRowIndexes(allRows, query, previewSearchText));
      renderWindow();
      return;
    }
    try {
      const result = await searchMasterDatasetRows(masterKey, datasetId, query);
      if (requestGeneration != generation || searchInput.value !== query) return;
      setIndexes(Array.isArray(result?.indexes) ? result.indexes : []);
      renderWindow();
    } catch (error) {
      if (requestGeneration !== generation) return;
      console.error(`[xml-cii] Worker Preview search failed for ${masterKey}:`, error);
      setIndexes([]);
      renderWindow();
      countText.textContent = `Search failed: ${error?.message || String(error)}`;
    }
  });
}

function appendPreview(parent, master, state, config) {
"""
replace_pair(import_masters, anchor, helper)
old_listener = """  searchInput.addEventListener('input', () => {
    indexes = buildMatchingRowIndexes(allRows, searchInput.value, previewSearchText);
    scrollContainer.scrollTop = 0;
    renderWindow();
  });
"""
new_listener = """  bindPreviewSearch({
    searchInput, masterKey, state, allRows, scrollContainer,
    setIndexes: (nextIndexes) => { indexes = nextIndexes; },
    renderWindow, countText,
  });
"""
replace_pair(import_masters, old_listener, new_listener)

replace_pair('tabs/xml-cii-2019-standalone-tab.js',
             './xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-workflow-shell-mode-a-easy-bulk-v6.js?v=20260928-issue776-authority-2-regex1',
             f'./xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-workflow-shell-mode-a-easy-bulk-v6.js?v={REL}')
replace_pair('tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-workflow-shell-mode-a-easy-bulk-v6.js',
             './xml-cii-adapted-phase-panels-mode-a.js?v=20260928-issue776-authority-2-regex1',
             f'./xml-cii-adapted-phase-panels-mode-a.js?v={REL}')
replace_pair('tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-workflow-shell-mode-a-easy-bulk-v6.js',
             './xml-cii-adapted-events-mode-a-consolidated-review-v2.js?v=20260928-issue776-authority-2',
             f'./xml-cii-adapted-events-mode-a-consolidated-review-v2.js?v={REL}')
replace_pair('tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-panels-mode-a.js',
             './xml-cii-adapted-phase-panels-smart.js?v=20260928-issue776-authority-2',
             f'./xml-cii-adapted-phase-panels-smart.js?v={REL}')
replace_pair('tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-panels-smart.js',
             './xml-cii-adapted-phase-panels.js?v=20260928-issue776-authority-2',
             f'./xml-cii-adapted-phase-panels.js?v={REL}')
replace_pair('tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-panels.js',
             './xml-cii-adapted-import-masters.js?v=20260713-master-autoload-v10',
             f'./xml-cii-adapted-import-masters.js?v={REL}')

replace_pair('tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a-consolidated-review-v2.js',
             './xml-cii-adapted-events-mode-a-cii-zip.js?v=20260814-save-all-cii-zip-1',
             f'./xml-cii-adapted-events-mode-a-cii-zip.js?v={REL}')
replace_pair('tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a-cii-zip.js',
             './xml-cii-adapted-events-mode-a.js?v=20260813-mode-a-rigid-review-1',
             f'./xml-cii-adapted-events-mode-a.js?v={REL}')
replace_pair('tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a.js',
             './xml-cii-adapted-events-smart.js?v=20260813-mode-a-full-propagation-2',
             f'./xml-cii-adapted-events-smart.js?v={REL}')
replace_pair('tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-smart.js',
             './xml-cii-adapted-events.js?v=20260804-mds-position-restraints-1',
             f'./xml-cii-adapted-events.js?v={REL}')
replace_pair('tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js',
             './xml-cii-adapted-master-events.js?v=20260713-v9',
             f'./xml-cii-adapted-master-events.js?v={REL}')
replace_pair('tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-events.js',
             "./xml-cii-adapted-master-worker-events.js'",
             f"./xml-cii-adapted-master-worker-events.js?v={REL}'")

replace_pair('core/app-standalone-runtime.js',
             '../tabs/xml-cii-2019-standalone-tab.js?v=20260928-issue776-authority-2-regex1',
             f'../tabs/xml-cii-2019-standalone-tab.js?v={REL}')
replace_pair('core/app.js',
             './app-standalone-runtime.js?v=20260928-issue776-authority-2-regex1-tabperf1',
             f'./app-standalone-runtime.js?v={REL}')
replace_pair('main-rhbg-fitguard.js',
             './core/app.js?v=20260928-issue776-authority-2-regex1-tabperf1',
             f'./core/app.js?v={REL}')
replace_pair('index.html',
             './main-rhbg-fitguard.js?v=20260928-issue776-authority-2-regex1-tabperf1',
             f'./main-rhbg-fitguard.js?v={REL}')

replace('tests/xml-cii-issue-776-deployment-parity.test.mjs',
        "const release = '20260928-issue776-authority-2-regex1';",
        f"const release = '{REL}';")

static_test = r"""import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const read = (path) => fs.readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const pairs = [
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-import-masters.js',
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-worker-events.js',
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-dataset-runtime.js',
  'tabs/xml-cii-2019-standalone/workers/master-dataset-import-coordinator.js',
];
test('dataset-backed Preview search is worker-owned and fail-closed', async () => {
  const source = await read(pairs[0]);
  assert.match(source, /datasetRefs\?\.\[masterKey\]\?\.datasetId/);
  assert.match(source, /await searchMasterDatasetRows\(masterKey, datasetId, query\)/);
  assert.match(source, /if \(!datasetId\)[\s\S]*buildMatchingRowIndexes\(allRows, query, previewSearchText\)/);
  const failure = source.split('catch (error) {', 2)[1] || '';
  assert.doesNotMatch(failure, /buildMatchingRowIndexes/);
  assert.match(source, /requestGeneration !== generation/);
});
test('Preview and import share one coordinator singleton including persisted dataset ids', async () => {
  const [events, runtime, coordinator] = await Promise.all([read(pairs[1]), read(pairs[2]), read(pairs[3])]);
  assert.match(events, /masterDatasetCoordinator as coordinator/);
  assert.match(runtime, /export const masterDatasetCoordinator = createMasterDatasetImportCoordinator\(\)/);
  assert.match(runtime, /masterDatasetCoordinator\.search\(masterKey, query, datasetId\)/);
  assert.match(coordinator, /function search\(masterKey, query, datasetIdOverride = ''\)/);
  assert.match(coordinator, /datasetIdOverride \|\| activeDatasets\.get\(masterKey\)/);
});
test('worker-search runtime mirrors are byte-identical in docs deployment', async () => {
  for (const path of pairs) assert.equal(await read('docs/' + path), await read(path), `docs mirror drift: ${path}`);
});
"""
write('tests/xml-cii-master-preview-worker-search.test.mjs', static_test)

browser_html = r"""<!doctype html>
<meta charset="utf-8"><title>PR780 master dataset scale qualification</title><pre id="out">RUNNING</pre>
<script type="module">
import { createMasterDatasetImportCoordinator } from '../../tabs/xml-cii-2019-standalone/workers/master-dataset-import-coordinator.js?v=20260929-pr780-worker-search-1';
const SIZES=[10000,50000,100000], MAX_FRAME_GAP_MS=250, coordinator=createMasterDatasetImportCoordinator(), encoder=new TextEncoder();
function rowsFor(count){return Array.from({length:count},(_,index)=>({code:`MAT-${index+1}`,material:`Synthetic material ${index+1}`,group:`G${index%97}`,searchMarker:index===count-1?`needle-${count}`:'ordinary'}));}
async function responsiveMeasure(operation){await new Promise(r=>requestAnimationFrame(r));let running=true,last=performance.now(),maxFrameGapMs=0,frames=0;const tick=now=>{maxFrameGapMs=Math.max(maxFrameGapMs,now-last);last=now;frames++;if(running)requestAnimationFrame(tick)};requestAnimationFrame(tick);const started=performance.now(),value=await operation(),elapsedMs=performance.now()-started;await new Promise(resolve=>requestAnimationFrame(now=>{maxFrameGapMs=Math.max(maxFrameGapMs,now-last);frames++;running=false;resolve()}));return{value,elapsedMs,maxFrameGapMs,frames};}
try{const scales=[];for(const count of SIZES){const fixtureStarted=performance.now(),payload=encoder.encode(JSON.stringify(rowsFor(count))),fixturePrepMs=performance.now()-fixtureStarted,buffer=payload.buffer.slice(payload.byteOffset,payload.byteOffset+payload.byteLength);const imported=await responsiveMeasure(()=>coordinator.openBuffer('materialMap',buffer,`scale-${count}.json`,{fieldMapOverride:{}})),ready=imported.value;if(ready?.metadata?.rowCount!==count)throw new Error(`row count mismatch at ${count}`);const hydrated=await responsiveMeasure(()=>coordinator.materialize(ready));if(hydrated.value.rows.length!==count||hydrated.value.rawRows.length!==count)throw new Error(`compatibility hydration mismatch at ${count}`);const searched=await responsiveMeasure(()=>coordinator.search('materialMap',`needle-${count}`)),indexes=searched.value?.indexes||[];if(searched.value?.matchCount!==1||indexes[0]!==count-1)throw new Error(`worker search mismatch at ${count}: ${JSON.stringify(searched.value)}`);const scale={rows:count,payloadBytes:payload.byteLength,fixturePrepMs,workerImportMs:imported.elapsedMs,workerImportMaxFrameGapMs:imported.maxFrameGapMs,workerImportFrames:imported.frames,compatibilityHydrationMs:hydrated.elapsedMs,compatibilityHydrationMaxFrameGapMs:hydrated.maxFrameGapMs,compatibilityHydrationFrames:hydrated.frames,workerSearchMs:searched.elapsedMs,workerSearchMaxFrameGapMs:searched.maxFrameGapMs,workerSearchFrames:searched.frames,matchCount:searched.value.matchCount,lastMatchIndex:indexes[0]};scale.responsive=[scale.workerImportMaxFrameGapMs,scale.compatibilityHydrationMaxFrameGapMs,scale.workerSearchMaxFrameGapMs].every(v=>v<=MAX_FRAME_GAP_MS);if(!scale.responsive)throw new Error(`frame-gap responsiveness threshold exceeded at ${count}: ${JSON.stringify(scale)}`);scales.push(scale);await coordinator.releaseMaster('materialMap')}const evidence={schema:'XMLCII_MASTER_DATASET_SCALE_E2E_V1',ok:true,responsivenessThresholdMs:MAX_FRAME_GAP_MS,fixturePreparationExcludedFromProductTiming:true,scales};globalThis.__XML_CII_MASTER_DATASET_SCALE_RESULT__=evidence;globalThis.__XML_CII_MASTER_DATASET_SCALE_DONE__=true;document.querySelector('#out').textContent=JSON.stringify(evidence,null,2)}catch(error){const evidence={schema:'XMLCII_MASTER_DATASET_SCALE_E2E_V1',ok:false,error:String(error?.stack||error)};globalThis.__XML_CII_MASTER_DATASET_SCALE_RESULT__=evidence;globalThis.__XML_CII_MASTER_DATASET_SCALE_DONE__=true;document.querySelector('#out').textContent=JSON.stringify(evidence,null,2)}finally{coordinator.dispose()}
</script>
"""
write('tests/browser/xml-cii-master-dataset-scale-e2e.html', browser_html)

runner = r"""import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const baseUrl=process.env.XML_CII_MASTER_DATASET_SCALE_URL||'http://127.0.0.1:4173';
const outputPath=process.env.XML_CII_MASTER_DATASET_SCALE_OUTPUT||'ValidationRecords/xml-cii-master-dataset-scale-e2e.json';
async function waitForServer(url,timeoutMs=30000){const started=Date.now();let lastError=null;while(Date.now()-started<timeoutMs){try{const response=await fetch(url,{cache:'no-store'});if(response.ok)return;lastError=new Error(`HTTP ${response.status}`)}catch(error){lastError=error}await new Promise(r=>setTimeout(r,250))}throw new Error(`server unavailable at ${url}: ${lastError}`)}
const url=`${baseUrl}/tests/browser/xml-cii-master-dataset-scale-e2e.html`;await waitForServer(url);const browser=await chromium.launch({headless:true});try{const page=await browser.newPage();page.on('console',m=>console.log(`[browser:${m.type()}] ${m.text()}`));page.on('pageerror',e=>console.error(`[browser:pageerror] ${e.stack||e}`));await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>globalThis.__XML_CII_MASTER_DATASET_SCALE_DONE__===true,null,{timeout:300000});const result=await page.evaluate(()=>globalThis.__XML_CII_MASTER_DATASET_SCALE_RESULT__);await fs.mkdir('ValidationRecords',{recursive:true});await fs.writeFile(outputPath,`${JSON.stringify(result,null,2)}\n`,'utf8');console.log('XML_CII_MASTER_DATASET_SCALE_E2E_RESULT');console.log(JSON.stringify(result,null,2));if(!result?.ok)throw new Error(result?.error||'Scale E2E returned no result')}finally{await browser.close()}
"""
write('scripts/run-xml-cii-master-dataset-scale-e2e.mjs', runner)

workflow = '.github/workflows/issue-776-validation.yml'
text = read(workflow)
start = text.index('  # PR780_APPLY_JOB_START\n')
end = text.index('  # PR780_APPLY_JOB_END\n') + len('  # PR780_APPLY_JOB_END\n')
text = text[:start] + text[end:]
text = text.replace('permissions:\n  contents: write\n', 'permissions:\n  contents: read\n', 1)
text = text.replace("            tests/xml-cii-master-dataset-worker.test.mjs \\\n            tests/xml-cii-master-worker-integration.test.mjs 2>&1 | tee issue-776-dataset-worker.log", "            tests/xml-cii-master-dataset-worker.test.mjs \\\n            tests/xml-cii-master-preview-worker-search.test.mjs \\\n            tests/xml-cii-master-worker-integration.test.mjs 2>&1 | tee issue-776-dataset-worker.log", 1)
text = text.replace("      - name: Run exact-head WSW browser conversion\n        run: node scripts/run-xml-cii-issue-776-wsw-e2e.mjs\n      - name: Upload WSW exact-head evidence", "      - name: Run exact-head WSW browser conversion\n        run: node scripts/run-xml-cii-issue-776-wsw-e2e.mjs\n      - name: Run 10k / 50k / 100k master dataset browser scale\n        run: node scripts/run-xml-cii-master-dataset-scale-e2e.mjs\n      - name: Upload WSW exact-head evidence", 1)
text = text.replace("            ValidationRecords/xml-cii-issue-776-wsw-e2e.json\n            /tmp/issue-776-http.log", "            ValidationRecords/xml-cii-issue-776-wsw-e2e.json\n            ValidationRecords/xml-cii-master-dataset-scale-e2e.json\n            /tmp/issue-776-http.log", 1)
write(workflow, text)

for path in ['index.html','main-rhbg-fitguard.js','core/app.js','core/app-standalone-runtime.js','tabs/xml-cii-2019-standalone-tab.js','tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-workflow-shell-mode-a-easy-bulk-v6.js','tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-panels-mode-a.js']:
    if REL not in read(path): raise SystemExit(f'cache-chain release missing from {path}')

mirror_paths=['index.html','main-rhbg-fitguard.js','core/app.js','core/app-standalone-runtime.js','tabs/xml-cii-2019-standalone-tab.js','tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-workflow-shell-mode-a-easy-bulk-v6.js','tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-panels-mode-a.js','tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-panels-smart.js','tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-phase-panels.js','tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-import-masters.js','tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a-consolidated-review-v2.js','tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a-cii-zip.js','tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-mode-a.js','tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events-smart.js','tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js','tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-events.js','tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-worker-events.js','tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-master-dataset-runtime.js','tabs/xml-cii-2019-standalone/workers/master-dataset-import-coordinator.js']
for path in mirror_paths:
    if read(path)!=read('docs/'+path): raise SystemExit(f'docs mirror drift after patch: {path}')

for path in Path('.github/workflows').glob('pr780-native-backup*.yml'): path.unlink()
Path('.github/workflows/pr780-apply-worker-search.yml').unlink(missing_ok=True)
Path('scripts/pr780-apply-worker-search.py').unlink()
