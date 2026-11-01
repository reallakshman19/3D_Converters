/**
 * Real Chromium Preview computation using the public EF05 original XML.
 * Verifies two independent, nonauthorizing review passes and optional rating.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {resolve,extname,sep} from 'node:path';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=process.cwd();
const source=await readFile('Benchmarks/EF-05-PRO.TEST.xml','utf8');
const server=createServer(async(request,response)=>{
 try{
  const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
  if(pathname==='/test.html'){
   response.writeHead(200,{'Content-Type':'text/html'});
   response.end('<!doctype html><html><body><div id="review"></div></body></html>');return;
  }
  const path=resolve(root,'.'+pathname);
  if(!path.startsWith(root+sep))throw Error('Disallowed path');
  const bytes=await readFile(path);
  response.setHeader('Content-Type',['.mjs','.js'].includes(extname(path))?'text/javascript':'application/octet-stream');
  response.end(bytes);
 }catch(error){response.writeHead(404);response.end(String(error));}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let browser,record={schema:'XML229.OptionalPreview.Chromium.v1',passed:false,
 nativeReleaseAuthorized:false,sourceBranches:41};
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.goto('http://127.0.0.1:'+server.address().port+'/test.html');
 const data=await page.evaluate(async xml=>{
  const {xmlCiiDryRunPreview}=await import(
   '/docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-dryrun.js');
  const std={tokenDelimiter:'-',lineKey:{extractMode:'TOKEN',tokenPosition:4},
   pipingClass:{extractMode:'TOKEN',tokenPosition:5},
   bore:{extractMode:'TOKEN',tokenPosition:3}};
  const split={tokenDelimiter:'-',lineKeyJoiner:'',
   lineKey:{extractMode:'TOKEN',tokenPosition:'4,5'},
   pipingClass:{extractMode:'TOKEN',tokenPosition:6},
   bore:{extractMode:'TOKEN',tokenPosition:3}};
  const config={regexTester:{formats:[std,split]}};
  const result=xmlCiiDryRunPreview(xml,config,'');
  const statuses=result.branchRows.reduce((counts,row)=>{
    counts[row.extractionStatus]=(counts[row.extractionStatus]||0)+1;return counts;
  },{});
  const passes=result.formatPreviewPasses.map(pass=>({
   index:pass.formatIndex,count:pass.branchRows.length,
   standard:pass.branchRows.find(row=>row.branchName.includes('P8810021')),
   shifted:pass.branchRows.find(row=>row.branchName.includes('P-8810431')),
  }));
  const missing=xmlCiiDryRunPreview(xml,{regexTester:{formats:[]}},'');
  const unassigned=missing.branchRows.filter(row=>row.extractionStatus==='UNMATCHED').length;
  // No rate/pressure master, no rating token rule or sequence was provided.
  return {count:result.branchRows.length,statuses,passes,unassigned,
   unsafeSelection:result.branchRows.some(row=>row.extractionStatus==='AMBIGUOUS'&&
     (row.lineKey||row.pipingClass)),errors:[]};
 },source);
 assert.equal(data.count,41);
 assert.equal(data.passes.length,2);
 assert.deepEqual(data.passes.map(p=>p.count),[41,41]);
 assert.equal(data.statuses.AMBIGUOUS,41);
 assert.equal(data.unsafeSelection,false);
 assert.equal(data.unassigned,41);
 assert.equal(data.passes[0].standard?.lineKey,'P8810021');
 assert.equal(data.passes[1].shifted?.lineKey,'P8810431');
 assert.deepEqual(errors,[]);
 record={...record,passed:true,formatPasses:2,ambiguous:data.statuses.AMBIGUOUS,
  unmatchedWithNoFormats:data.unassigned,standardLineKey:data.passes[0].standard?.lineKey,
  shiftedLineKey:data.passes[1].shifted?.lineKey,
  ratingTokenSupplied:false,passOneAutomaticallyAccepted:false,
  passTwoAutomaticallyAccepted:false};
}catch(error){
 record={...record,error:String(error?.stack||error).slice(0,1500)};
}finally{
 await mkdir('ValidationRecords',{recursive:true});
 await writeFile('ValidationRecords/xml229-optional-preview-chromium.json',
  JSON.stringify(record,null,2)+'\n');
 await browser?.close();await new Promise(ok=>server.close(ok));
}
console.log('XML229_OPTIONAL_PREVIEW '+JSON.stringify(record));
assert.equal(record.passed,true);
