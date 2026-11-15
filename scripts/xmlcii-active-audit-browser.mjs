/** Invoke through Playwright CLI run-code with its actual page. No test doubles. */
const expectEqual=(actual,expected)=>{if(actual!==expected)throw Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);};
const expectText=(actual,pattern)=>{if(!pattern.test(actual))throw Error(`Missing ${pattern}`);};

async function download(page,label,destination) {
  const pending=page.waitForEvent('download');
  await page.getByRole('button',{name:label,exact:true}).click();
  const artifact=await pending;await artifact.saveAs(destination);
  return artifact.suggestedFilename();
}

export async function loadActiveAuditFixture(page,{origin,fixtureRoot,deferSave=false,fixtureUrl='/tests/fixtures/xmlcii-active-audit'}) {
  await page.goto(origin+'/index.html');
  await page.getByRole('button',{name:'XML→CII 2019 Standalone',exact:true}).click();
  await page.getByRole('button',{name:'XML / InputXML file:',exact:true}).setInputFiles(fixtureRoot+'/active-audit.xml');
  await page.getByRole('button',{name:'3 Resolver / JSON Trace',exact:true}).click();
  await page.getByRole('button',{name:/📦 Staged JSON/}).setInputFiles(fixtureRoot+'/active-audit.json');
  await page.getByRole('button',{name:'8 Config',exact:true}).click();
  const config=await(await page.request.get(origin+fixtureUrl+'/active-audit-config.json')).text();
  await page.locator('.xml-cii-main-workspace textarea').fill(config);
  if(deferSave)return;
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'💾 Save Config',exact:true}).click();
  await page.getByRole('button',{name:'10 Output / Run',exact:true}).click();
}

export async function prepareActiveAuditMulti(page,options) {
  const {origin,fixtureRoot}=options;
  await page.goto(origin+'/index.html');
  await page.getByRole('button',{name:'XML→CII 2019 Standalone',exact:true}).click();
  await page.getByRole('button',{name:'XML / InputXML file:',exact:true}).setInputFiles(fixtureRoot+'/active-audit.xml');
  await page.getByRole('button',{name:'Mode A — Separate Models (Draft)',exact:true}).click();
  await page.locator('input[data-field=source-file]').setInputFiles([fixtureRoot+'/active-audit.xml',
    fixtureRoot+(options.overlap?'/active-audit-overlap-b.xml':'/active-audit-b.xml')]);
  await page.getByRole('button',{name:'3 Resolver / JSON Trace',exact:true}).click();
  await page.locator('input[data-mode-a-staged-json-all]').setInputFiles(fixtureRoot+
    (options.overlap?'/active-audit-overlap-multi.json':'/active-audit-multi.json'));
  await page.getByRole('button',{name:'8 Config',exact:true}).click();
  const config=await(await page.request.get(origin+'/tests/fixtures/xmlcii-active-audit/active-audit-config.json')).text();
  await page.locator('.xml-cii-main-workspace textarea').fill(config);
  // The CLI operator saves and accepts the app's notification, then runs below.
}

export async function runActiveAuditMulti(page,options) {
  await page.getByRole('button',{name:'10 Output / Run',exact:true}).click();
  await page.getByRole('button',{name:'Run Separate Models',exact:true}).click();
  await page.waitForFunction(()=>{
    const buttons=[...document.querySelectorAll('button')];
    return buttons.some(b=>b.textContent==='Download CII'&&!b.disabled)&&
      buttons.some(b=>b.textContent==='Run Separate Models'&&!b.disabled);
  },{},{timeout:120000});
  const panels=page.locator('[data-audit-source-id]'),results=[];
  expectEqual(await panels.count(),2);
  for(let index=0;index<2;index++)results.push(await downloadModelAudit(page,panels.nth(index),index,options));
  if(results[0].request===results[1].request||results[0].xml===results[1].xml)throw Error('Shared model identity');
  await page.locator('[data-active-restraint-audits]').screenshot({path:options.outDir+'/audit.png'});
  return results;
}

async function downloadModelAudit(page,panel,index,options) {
  for(const [label,ext] of [['Download audit JSON','json'],['Download audit CSV','csv'],['Download readable audit','html']]) {
    const pending=page.waitForEvent('download');await panel.getByRole('button',{name:label,exact:true}).click();
    await(await pending).saveAs(options.outDir+`/model-${index}.${ext}`);
  }
  const report=await(await page.request.get(options.origin+options.outUrl+`/model-${index}.json`)).json();
  expectEqual(report.status,options.overlap?'FAILED':'VERIFIED');
  if(options.overlap)expectText(JSON.stringify(report.records),/DUPLICATE_SLOT/);
  else expectEqual(report.records[0].observed.gap,index?40:25);
  return {status:report.status,request:report.run.requestSha256,xml:report.recorded.basis.xmlSha256,
    gaps:report.records.map(row=>row.after?.Gap)};
}

export async function runActiveAuditBrowser(page,options) {
  if(!options.prepared)await loadActiveAuditFixture(page,options);
  await page.getByRole('button',{name:'10 Output / Run',exact:true}).click();
  const panel=page.locator('[data-active-restraint-audits]');
  expectEqual(await panel.count(),options.expectAudit===false?0:1);
  await page.getByRole('button',{name:'Run Separate Models',exact:true}).click();
  await page.waitForFunction(()=>{
    const buttons=[...document.querySelectorAll('button')];
    return buttons.some(button=>button.textContent==='Download CII'&&!button.disabled)&&
      buttons.some(button=>button.textContent==='Run Separate Models'&&!button.disabled);
  },{},{timeout:120000});
  const result={origin:options.origin,downloads:[]};
  for(const [label,file] of [['Download CII','output.cii'],['Download Enriched XML/InputXML','output.xml']])
    result.downloads.push(await download(page,label,options.outDir+'/'+file));
  if(options.expectAudit!==false)await checkAuditDownloads(page,panel,options,result);
  return result;
}

async function checkAuditDownloads(page,panel,options,result) {
  const outDir=options.outDir;
  await page.getByRole('button',{name:'View restraint audit',exact:true}).click();
  expectText(await panel.textContent(),/Saved run status: VERIFIED/);
  const search=panel.getByRole('searchbox');
  await search.fill('no-such-member');expectText(await panel.textContent(),/Showing 0 of 0/);
  await search.fill('20');expectText(await panel.textContent(),/25MM GAP/);
  await search.fill('');
  for(const [label,file] of [['Download audit JSON','audit.json'],['Download audit CSV','audit.csv'],['Download readable audit','audit.html']])
    result.downloads.push(await download(page,label,outDir+'/'+file));
  const report=await(await page.request.get(options.origin+options.outUrl+'/audit.json')).json();
  const stop=report.records.find(row=>row.after?.Type==='LIM');
  expectEqual(stop.source.member.path,'$[0].children[0]');expectEqual(stop.source.member.fields.CMPSUPGAP,'25MM GAP');
  expectEqual(stop.decision.rule.id,'audit-owner-stop');expectEqual(stop.observed.typeCode,9);expectEqual(stop.observed.gap,25);
  expectEqual(stop.observed.blockIndex,1);expectEqual(stop.observed.slotIndex,1);
  result.audit={status:report.status,summary:report.summary,rule:stop.decision.rule.id,line:stop.observed.line};
  await panel.screenshot({path:outDir+'/audit.png'});
}
