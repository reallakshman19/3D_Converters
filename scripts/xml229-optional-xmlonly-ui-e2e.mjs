/** Actual standalone browser UI XML→CII with no user-imported enrichment masters. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
const xmlPath='Benchmarks/EF-05-PRO.TEST.xml';
const record={schema:'XML229.OptionalEnrichment.UiE2E.v1',
  sourceXmlSha256:sha(await readFile(xmlPath)),noUserMasterUpload:true,
  explicitXmlOnly:true,nativeReleaseAuthorized:false,passed:false};
let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({acceptDownloads:true});
 page.setDefaultTimeout(60000);
 const pageErrors=[];page.on('pageerror',error=>pageErrors.push(String(error)));
 const site=await page.goto('http://127.0.0.1:4173/index.html',{waitUntil:'domcontentloaded'});
 assert.equal(site.status(),200);
 await page.locator('[data-tab="xml-cii-2019-standalone"]').click();
 await page.locator('[data-phase="source"]').click();
 await page.locator('[data-field="source-file"]').setInputFiles(xmlPath);
 await page.waitForFunction(()=>/Branches:\s*41\/41/.test(
  document.querySelector('.xml-cii-header-status-row')?.textContent||''),
  null,{timeout:90000});
 await page.locator('[data-phase="preview"]').click();
 const inventory=await page.locator('#mc-preview-table-host').evaluate(el=>
   el.parentElement?.textContent||'');
 const count=(label)=>Number(inventory.match(new RegExp(label+':\\s*(\\d+) row\\(s\\)'))?.[1]||0);
 record.masterInventory={lineList:count('Line List'),pipingClass:count('Piping Class'),
  materialMap:count('Material Map'),valveWeights:count('Valve Weights')};
 // No files have been uploaded in the entire browser session.
 await page.locator('[data-phase="run"]').click();
 const chooser=page.locator('[data-action="xml229-output-participation"]');
 await chooser.waitFor({timeout:60000});
 await chooser.selectOption('xml-only');
 await page.waitForFunction(()=>document.querySelector('[data-action="run"]')?.disabled===false,
  null,{timeout:60000});
 record.runEligibility=true;
 await page.locator('[data-action="run"]').click();
 await page.waitForFunction(()=>{
  const download=document.querySelector('.xml-cii-adapted-cii-download');
  const skip=document.querySelector('[data-rigid-review-skip]');
  return !!skip||download?.disabled===false||
    /Conversion failed/.test(document.querySelector('[data-active-phase="run"]')?.textContent||'');
 },null,{timeout:300000});
 const skip=page.locator('[data-rigid-review-skip]');
 if(await skip.count())await skip.click();
 await page.waitForFunction(()=>{
  const d=document.querySelector('.xml-cii-adapted-cii-download');
  const row=[...document.querySelectorAll('[data-active-phase="run"] tbody tr')]
   .find(tr=>tr.children[0]?.textContent==='run-result');
  return d?.disabled===false||row?.children[2]?.textContent?.trim()==='ready';
 },null,{timeout:300000});
 assert.equal(await page.locator('.xml-cii-adapted-cii-download').isEnabled(),true);
 const [download]=await Promise.all([
  page.waitForEvent('download'),
  page.locator('.xml-cii-adapted-cii-download').click(),
 ]);
 const cii=await readFile(await download.path());
 assert(cii.length>100);
 assert.match(download.suggestedFilename(),/\.cii$/i);
 await mkdir('ValidationRecords',{recursive:true});
 const syntaxPath='ValidationRecords/xml229-optional-xmlonly-ui-syntax.json';
 execFileSync('python3',['converters/scripts/cii_syntax_check_2019.py',
  '--input',await download.path(),'--output',syntaxPath],{timeout:120000});
 const syntax=JSON.parse(await readFile(syntaxPath,'utf8'));
 assert.equal(syntax.ok,true,JSON.stringify(syntax.errors));
 assert.deepEqual(syntax.errors,[]);
 assert.deepEqual(pageErrors,[]);
 Object.assign(record,{passed:true,ciiBytes:cii.length,ciiSha256:sha(cii),
  syntaxOk:syntax.ok,elementCount:syntax.metrics?.elements,downloadedFromBrowser:true});
}catch(error){record.error=String(error?.stack||error).slice(0,2500);}
finally{
 await mkdir('ValidationRecords',{recursive:true});
 await writeFile('ValidationRecords/xml229-optional-xmlonly-ui-e2e.json',
   JSON.stringify(record,null,2)+'\n');
 console.log('XML229_OPTIONAL_UI_E2E '+JSON.stringify(record));
 await browser?.close();
}
assert.equal(record.passed,true,record.error||'Real UI conversion did not pass');
