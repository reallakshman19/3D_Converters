/**
 * XML229 production-route scale regression: actual repository XLSX Line List, 10699 Class JSON, material TXT and bundled Valve master → existing Preview/Weight.
 * This is not Owner's private 622,915-occurrence case.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const xmlPath='Benchmarks/1885Sjson/FirstpassXML';
const jsonPath='Benchmarks/1885Sjson/Sjson.json';
const x=await readFile(xmlPath),j=await readFile(jsonPath);
const sha=b=>createHash('sha256').update(b).digest('hex');
const record={
  schema:'XML229.OriginalFourMasterRealAssetBrowser.v1',
  head:process.env.EXACT_HEAD||null,
  jsonSha:sha(j),xmlSha:sha(x),
  originalJsonBytes:j.byteLength,notPrivateOwnerCase:true,
  stages:{},failures:[],errors:[],workerUrls:[],pass:false,
};
assert.equal(record.jsonSha,'6b2c8b01ab0ba6ec8e9e7c42eb4a719668ffd2dc4dbe4790d27cf426a1f60288');
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({acceptDownloads:true});
  page.setDefaultTimeout(45000);
  page.on('pageerror',e=>record.errors.push(String(e)));
  page.on('worker',w=>record.workerUrls.push(w.url()));
  const response=await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
  assert.equal(response?.status(),200);
  await page.locator('[data-tab="xml-cii-2019-standalone"]').click();
  await page.locator('[data-phase="source"]').click();
  await page.locator('[data-field="source-file"]').setInputFiles(xmlPath);
  // Four genuine application import controls, NOT synthetic P4 resolveInputs.
  const imports=[
    ['lineList','docs/Masters/ImportedRawLineListLL.xlsx'],
    ['pipingClass','docs/Masters/Piping_class_master.json'],
    ['materialMap','docs/Masters/PCF_MAT_MAP.TXT'],
  ];
  for(const [kind,filePath] of imports){
    await page.locator('[data-sub-tab="'+(kind==='lineList'?'linelist':kind)+'"]').click();
    await page.locator('input[data-master-file="'+kind+'"]').setInputFiles(filePath);
    await page.locator('[data-master-mapping-status="'+kind+'"]')
      .filter({hasText:'Mapping status: APPLIED'}).waitFor({timeout:45000});
  }
  record.stages.actualSourceImports=imports.map(([kind,filePath])=>({kind,filePath}));
  const masterBadges=await page.evaluate(()=>({
    text:document.body?.innerText?.slice(0,30000)||'',
  }));
  await page.locator('[data-sub-tab="weight"]').click();
  const weightReadback=await page.evaluate(async()=>{
    const {createXmlCiiAdaptedWorkflowState}=await import(
      '/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-state.js');
    const context=createXmlCiiAdaptedWorkflowState().masterContext;
    return {sourceType:context.sourceMetadata.weight.sourceType,
      source:context.sourceMetadata.weight.source,
      count:context.weightMasterRows.length};
  });
  record.stages.defaultWeight=weightReadback;
  assert.deepEqual(weightReadback,{
    sourceType:'default',source:'Embedded default',count:1595,
  },'test must use genuine bundled master, not a manually imported file');
  record.stages.masterImportSummary=masterBadges.text
    .split('\n').filter(x=>/Line List|Piping Class|Material Map|385|10699|383|1595|Master/.test(x)).slice(0,28);
  await page.locator('[data-phase="json-trace"]').click();
  await page.locator('[data-field="staged-json-file"]').setInputFiles(jsonPath);
  await page.waitForFunction(()=>{
    const s=document.querySelector('[data-lfj-o1-status]')?.textContent||'';
    return s.startsWith('LFJ source index COMMITTED')||s.startsWith('LFJ Worker FAILED');
  },null,{timeout:240000});
  record.stages.indexStatus=await page.locator('[data-lfj-o1-status]').textContent();
  assert.match(record.stages.indexStatus,/LFJ source index COMMITTED/);
  assert.match(record.stages.indexStatus,/23,?754/);
  await page.locator('[data-phase="preview"]').click();
  const inventory=await page.locator('#mc-preview-table-host').evaluate(
    el=>el.parentElement?.textContent||'');
  record.stages.previewInventoryText=inventory.slice(0,1200);
  record.stages.previewMasterInventory=Object.fromEntries([
    ['lineList',/Line List:\s*(\d+) row\(s\)/],
    ['pipingClass',/Piping Class:\s*(\d+) row\(s\)/],
    ['materialMap',/Material Map:\s*(\d+) row\(s\)/],
    ['weight',/Valve Weights:\s*(\d+) row\(s\)/],
  ].map(([key,re])=>[key,Number(inventory?.match(re)?.[1]??0)]));
  assert.deepEqual(record.stages.previewMasterInventory,{
    lineList:801,pipingClass:10699,materialMap:383,weight:1595,
  },'real loaded master counts do not match the repo test XLSX/JSON/TXT + bundled Weight assets');
  const evidence=page.locator('[data-mc-preview-cache-evidence]');
  await evidence.waitFor({timeout:30000});
  record.stages.beforeStatus=await evidence.evaluate(el=>el.parentElement?.dataset.mcPreviewCacheStatus||'');
  record.stages.beforeText=await evidence.textContent();
  record.stages.beforeTables=await page.locator('#mc-preview-table-host table').count();
  assert.equal(record.stages.beforeStatus,'JSON_WORKER_READY');
  assert.equal(record.stages.beforeTables,0);
  assert.ok(record.stages.beforeText.includes(record.jsonSha));
  const button=page.locator('#mc-preview-table-host [data-mc-preview-build]').first();
  await button.waitFor({timeout:30000});
  await button.click();
  await page.waitForFunction(()=>{
    const host=document.querySelector('#mc-preview-table-host');
    return host?.dataset.mcPreviewJsonSource==='P4_ENGINEERING_VERIFIED'||
       /Preview failed/.test(host?.textContent||'');
  },null,{timeout:240000});
  const actual=await page.evaluate(()=>{
    const h=document.querySelector('#mc-preview-table-host'),r=h?.__xmlCiiPreviewResult;
    return {
      proof:h?.dataset.mcPreviewJsonSource,
      sourceSha:h?.dataset.mcPreviewOriginalJsonSha256,
      basisId:h?.dataset.mcPreviewBasisId,
      cacheStatus:h?.dataset.mcPreviewCacheStatus,
      tableCount:h?.querySelectorAll('table').length||0,
      branchCount:r?.branchRows?.length||0,
      nodeCount:r?.nodeRows?.length||0,
      branches:r?.branchRows?.map(v=>v.branchName)||[],
      firstBranchFields:r?.branchRows?.[0]
        ? Object.fromEntries(Object.entries(r.branchRows[0])
          .filter(([k,v])=>/dtxr|bore|wall|rating|material|source|branch|density/i.test(k)&&
            (typeof v==='string'||typeof v==='number'||typeof v==='boolean'))
          .slice(0,35)) : {},
      firstBranchKeys:Object.keys(r?.branchRows?.[0]||{}).slice(0,80),
      originalSourceBranches:h?.__xmlCiiPreviewOriginalOccurrences?.branches?.length||0,
      errorText:(h?.textContent||'').slice(0,1000),
    };
  });
  record.stages.after=actual;
  assert.equal(actual.proof,'P4_ENGINEERING_VERIFIED','actual Preview did not reach source-attested P4 engineering Worker');
  assert.equal(actual.sourceSha,record.jsonSha);
  assert.match(actual.basisId,/^[a-f0-9]{64}$/);
  assert.equal(actual.branchCount,5);
  assert.equal(actual.originalSourceBranches,5);
  assert.ok(actual.tableCount>0);
  // Independent fixed Firstpass engineering/source oracle: this original
  // 6-inch Schedule 80 flange is 150 mm nominal bore and 10.97 mm B36.10 wall.
  // An empty JSON or stale Preview could render 5 rows, but cannot satisfy
  // the source-ref, DTXR schedule, bore and wall evidence together.
  assert.equal(actual.firstBranchFields.dtxrWallComponentRefNo,'=1006649732/51234');
  assert.equal(actual.firstBranchFields.dtxrWallEvidenceSource,'staged-json');
  assert.equal(actual.firstBranchFields.dtxrWallSchedule,'80');
  assert.equal(actual.firstBranchFields.dtxrWallEvidenceBoreMm,150);
  assert.equal(Number(actual.firstBranchFields.dtxrWallThickness),10.97);
  assert.equal(Number(actual.firstBranchFields.wallThickness),10.97);
  assert.equal(actual.firstBranchFields.dtxrWallDtxr,'WELDING NECK FLANGE Sch 80 900#');
  assert.equal(actual.cacheStatus,'UNCACHED','do not publish unsafe JSON cache HIT');
  assert.ok(record.workerUrls.some(url=>url.includes('xml229-original-blob-gcpw-worker.mjs')));
  assert.equal(await page.locator('[data-p4-preview-build]').count(),0);
  assert.equal(await page.locator('[data-p4-weight-build]').count(),0);
  record.stages.workerScriptSeen=true;
  // Cross the ACTUAL Weight Match stage, not the isolated /test.html UI.
  await page.locator('[data-phase="weight-match"]').click();
  await page.locator('[data-p4-weight-root]').waitFor({timeout:30000});
  assert.equal(await page.locator('[data-p4-weight-build]').count(),0);
  await page.locator('tr[data-p4-row]').first().waitFor({timeout:120000});
  record.stages.weightRows=await page.locator('tr[data-p4-row]').count();
  assert.ok(record.stages.weightRows>0);
  record.stages.weightText=await page.locator('[data-p4-weight-status]').textContent();
  assert.match(record.stages.weightText,/Existing verified Preview facts/);
  // New source-bound presentation retains the existing 7-column review
  // contract and styling, while every review still RPCs into the GC-PW Worker.
  assert.equal(await page.locator('.mc-rigid-review-table-wrap').count(),1);
  assert.equal(await page.locator('tr[data-p4-row]').first().locator('td').count(),13);
  record.stages.historicalColumns=await page.locator('.mc-rigid-review-table th').allTextContents();
  assert.deepEqual(record.stages.historicalColumns.map(x=>x.trim()),[
    'Status','Branch','Line Key','ComponentType','Bore','Rating','Node',
    'ComponentRefNo_Endpoint','DTXR','Valve Hint','Length','Weight (kg)','Nearest Suggestions']);
  assert.equal(await page.locator('[data-p4-weight-build]').count(),0);


  // The Owner's exact false-stale trigger: merely OPENING the Regex stage
  // may auto-analyze masters and propose new extraction rules. Those
  // proposals must remain draft when a GC-PW InputBasis is already verified.
  await page.locator('[data-phase="regex"]').click();
  await page.waitForTimeout(1500);
  await page.locator('[data-phase="weight-match"]').click();
  await page.locator('tr[data-p4-row]').first().waitFor({timeout:30000});
  record.stages.afterRegexNavigation=
    await page.locator('[data-p4-weight-status]').textContent();
  assert.match(record.stages.afterRegexNavigation,/Existing verified Preview facts/);
  assert.doesNotMatch(record.stages.afterRegexNavigation,/stale/i);
  record.stages.afterRegexSameSession=true;
  // Navigate through an unrelated stage after the Worker has verified its
  // input. It must preserve the SAME review unless actual input bytes,
  // original JSON generation, scope or master authority changed.
  await page.locator('[data-phase="json-trace"]').click();
  await page.locator('[data-phase="weight-match"]').click();
  await page.locator('tr[data-p4-row]').first().waitFor({timeout:30000});
  const afterNavigation=await page.locator('[data-p4-weight-status]').textContent();
  record.stages.afterUnrelatedNavigation=afterNavigation;
  assert.match(afterNavigation,/Existing verified Preview facts/);
  assert.doesNotMatch(afterNavigation,/stale/i);

  // Explicit engineer Match-1 and distinct Final decisions through the
  // EXISTING Weight Match stage; never promote a default or blank draft.
  const reviewIndex=await page.evaluate(()=>{
    const rows=[...document.querySelectorAll('tr[data-p4-row]')];
    return rows.findIndex(tr=>tr.querySelectorAll('td')[2]?.textContent.trim()==='—');
  });
  let reviewedOccurrence=null;
  if(reviewIndex>=0){
  let selected=page.locator('tr[data-p4-row]').nth(reviewIndex);
  reviewedOccurrence=await selected.getAttribute('data-p4-occurrence');
  await selected.locator('[data-p4-proposal]').fill('35');
  await selected.locator('[data-p4-reason]').fill('Explicit original physical engineering Match-1 review');
  await selected.locator('[data-p4-accept-match1]').click();
  await page.waitForFunction(()=>(
    document.querySelector('[data-p4-weight-status]')?.textContent||''
  ).includes('Match-1 explicitly accepted'),null,{timeout:30000});
  selected=page.locator('tr[data-p4-row]').nth(reviewIndex);
  await selected.locator('[data-p4-proposal]').fill('40');
  await selected.locator('[data-p4-reason]').fill('Independent original physical Final Match-2 review');
  await selected.locator('[data-p4-accept-final]').click();
  await page.waitForFunction(()=>(
    document.querySelector('[data-p4-weight-status]')?.textContent||''
  ).includes('Final Match-2 explicitly accepted'),null,{timeout:30000});
  record.stages.reviewedOccurrence=reviewedOccurrence;

  }else{
    record.stages.reviewDecisionsSkipped='Firstpass has no unresolved physical Weight row on this page; P4 isolated Chromium qualifies CAS decisions.';
  }
  // The existing Preview Build must reuse the same canonical GC-PW basis,
  // not silently open a different weight/final decision population.
  const firstBasis=actual.basisId;
  await page.locator('[data-phase="preview"]').click();
  await page.locator('#mc-preview-table-host [data-mc-preview-build]').first().click();
  await page.waitForFunction(()=>{
    const host=document.querySelector('#mc-preview-table-host');
    return host?.dataset.mcPreviewJsonSource==='P4_ENGINEERING_VERIFIED'||
      /Preview failed/.test(host?.textContent||'');
  },null,{timeout:240000});
  record.stages.repeatBasis=await page.locator('#mc-preview-table-host').evaluate(el=>el.dataset.mcPreviewBasisId);
  assert.equal(record.stages.repeatBasis,firstBasis,'same source/master Build replaced the reviewed InputBasis');
  await page.locator('[data-phase="weight-match"]').click();
  await page.locator('tr[data-p4-row]').first().waitFor({timeout:120000});
  if(reviewedOccurrence){
    const retained=await page.evaluate(occurrence=>{
      const row=[...document.querySelectorAll('tr[data-p4-row]')]
        .find(tr=>tr.dataset.p4Occurrence===occurrence);
      return row?{
        match1:row.querySelector('[data-p4-match1-mass]')?.textContent.trim(),
        final:row.querySelector('[data-p4-final-mass]')?.textContent.trim(),
      }:null;
    },reviewedOccurrence);
    record.stages.retainedDecisions=retained;
    assert.deepEqual(retained,{match1:'35 kg',final:'40 kg'},
      'Repeated existing Preview Build discarded accepted Match-1/Final decisions');
  }
  // Exact original Match-1 bulk planner: proposal is not acceptance. If the
  // public fixture has qualified blanks, require an explicit second confirm.
  await page.locator('[data-p4-bulk-plan]').click();
  await page.waitForFunction(()=>/qualified|No qualified/i.test(
    document.querySelector('[data-p4-weight-status]')?.textContent||''),null,{timeout:120000});
  record.stages.bulkPlanMessage=await page.locator('[data-p4-weight-status]').textContent();
  assert.match(record.stages.bulkPlanMessage,/qualified|No qualified/i);
  const confirm=page.locator('[data-p4-bulk-confirm]');
  if(await confirm.isVisible()){
    await confirm.click();
    await page.waitForFunction(()=>/Match-1 decision\(s\) accepted/i.test(
      document.querySelector('[data-p4-weight-status]')?.textContent||''),null,{timeout:120000});
    record.stages.bulkAccepted=await page.locator('[data-p4-weight-status]').textContent();
    assert.match(record.stages.bulkAccepted,/Match-1 decision\(s\) accepted/i);
    // Final Match-2 was never bulk-applied or overwritten.
    if(reviewedOccurrence){
      const finalStill=await page.locator('tr[data-p4-row]').evaluateAll(
        (rows,id)=>rows.find(row=>row.dataset.p4Occurrence===id)
          ?.querySelector('[data-p4-final-mass]')?.textContent.trim()||'',reviewedOccurrence);
      assert.equal(finalStill,'40 kg','bulk Match-1 overwrote independently reviewed Final');
    }
  }
  await page.locator('[data-phase="run"]').click();
  await page.waitForFunction(()=>{
    const section=document.querySelector('[data-active-phase="run"]');
    return [...(section?.querySelectorAll('tbody tr')||[])]
      .some(tr=>tr.children[0]?.textContent==='preview-audit'&&
        tr.children[1]?.textContent==='Original Preview engineering facts'&&
        tr.children[2]?.textContent==='ready');
  },null,{timeout:30000});
  record.stages.runText=await page.locator('[data-active-phase="run"]').textContent();
  assert.match(record.stages.runText,/HELD|blocking|Native CII|Run remains/i);
  assert.match(record.stages.runText,/Original Preview engineering facts/);
  assert.doesNotMatch(record.stages.runText,/Preview has not been built yet\./);
  // The independent workflows genuinely have no result, but "missing" must
  // not falsely imply damaged masters or unverified GC-PW source provenance.
  record.stages.runIndependentStages=await page.locator('[data-active-phase="run"]').evaluate(root=>
    [...root.querySelectorAll('tbody tr')].filter(tr=>
      ['support-mapper','resolver-json','manual-restraints'].includes(tr.children[0]?.textContent))
      .map(tr=>({id:tr.children[0].textContent,status:tr.children[2].textContent,
        blocking:tr.children[4].textContent})));
  for(const item of record.stages.runIndependentStages){
    assert.notEqual(item.status,'missing','Original GC-PW UI should describe unbuilt independent stage as not-run');
    assert.equal(item.blocking,'false');
  }

  // #274: download the same canonical report that produced the visible
  // checklist, log and Run controls. This must work even with native Run HELD.
  const capture=page.locator('[data-action="export-output-readiness"]');
  await capture.waitFor();
  const [download]=await Promise.all([page.waitForEvent('download'),capture.click()]);
  assert.equal(download.suggestedFilename(),'xml-cii-output-run-readiness.json');
  const exported=JSON.parse(await readFile(await download.path(),'utf8'));
  record.stages.runReadinessEvidence={
    schema:exported.schema,summary:exported.summary,raw:exported.raw,
    preview:exported.checklistRows.find(x=>x.id==='preview-audit'),
    weight:exported.checklistRows.find(x=>x.id==='weight-match'),
    release:exported.checklistRows.find(x=>x.id==='xml229-original-json-engineering-authority'),
  };
  assert.equal(exported.schema,'XML229.OutputRunReadinessEvidence.v1');
  assert.equal(exported.raw.xml229VerifiedEngineering,true);
  assert.equal(record.stages.runReadinessEvidence.preview?.status,'ready');
  assert.equal(record.stages.runReadinessEvidence.release?.status,'held');
  assert.equal(record.stages.runReadinessEvidence.release?.blocking,true);
  assert.equal(exported.summary.blockingCount,
    exported.checklistRows.filter(x=>x.blocking).length);
  assert.equal(exported.summary.warningCount,
    exported.checklistRows.filter(x=>!x.blocking&&x.status!=='ready').length);
  // Header badges must come from the SAME canonical report exported above,
  // even though the shell rendered its header before asynchronous GC-PW proof.
  const badges=await page.locator('.xml-cii-header-status-row').evaluate(bar=>
    [...bar.querySelectorAll('.xml-cii-standalone-badge')].map(x=>x.textContent.trim()));
  const headerErrors=exported.diagnostics.filter(x=>x.level==='error').length;
  const headerWarnings=exported.diagnostics.filter(x=>x.level==='warning').length;
  assert(badges.includes(headerErrors+' Errors'),
    'header error badge drifted from verified Output/Run report: '+badges);
  assert(badges.includes(headerWarnings+' Warnings'),
    'header warning badge drifted from verified Output/Run report: '+badges);
  record.stages.runHeaderBadges={badges,headerErrors,headerWarnings};
  assert.equal(await page.locator('[data-action="run"]').isDisabled(),true);
  for(const item of record.stages.runIndependentStages){
    assert.equal(exported.checklistRows.find(x=>x.id===item.id)?.status,item.status,
      'rendered independent stage must equal exported canonical status');
  }
  assert.equal(await page.locator('[data-xml229-p4-run-advisory]').count(),0);
  // Real replacement must revoke old Worker File custody / CSV rights.
  await page.locator('[data-phase="json-trace"]').click();
  await page.locator('[data-field="staged-json-file"]').setInputFiles({
    name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('[{"broken":}')
  });
  await page.waitForFunction(()=>(
    document.querySelector('[data-lfj-o1-status]')?.textContent||''
  ).startsWith('LFJ Worker FAILED'),null,{timeout:60000});
  await page.locator('[data-phase="preview"]').click();
  await evidence.waitFor({timeout:30000});
  record.stages.invalidReplacement=await evidence.evaluate(el=>
    el.parentElement?.dataset.mcPreviewCacheStatus||'');
  record.stages.invalidTables=await page.locator('#mc-preview-table-host table').count();
  assert.equal(record.stages.invalidReplacement,'JSON_SOURCE_PENDING');
  assert.equal(record.stages.invalidTables,0);
  assert.equal(record.errors.length,0);
  record.pass=true;
}catch(e){record.failures.push(String(e?.stack||e).slice(0,2800));}
finally{
  await mkdir('ValidationRecords',{recursive:true});
  await writeFile('ValidationRecords/xml229-four-original-masters-existing-workflow.json',JSON.stringify(record,null,2)+'\n');
  console.log('XML229_FOUR_ORIGINAL_MASTERS_EXISTING_WORKFLOW '+JSON.stringify(record));
  await browser.close();
}
assert.ok(record.pass,record.failures.join('\n'));
