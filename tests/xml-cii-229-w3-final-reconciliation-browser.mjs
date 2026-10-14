import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const server=createServer(async(req,res)=>{
 try {
  const name=new URL(req.url,'http://localhost').pathname;
  if(name==='/test.html'){
   res.writeHead(200,{'content-type':'text/html'});
   res.end('<!doctype html><html><head><meta charset="utf-8"></head><body><main>W3</main></body></html>');
   return;
  }
  const file=path.resolve(root,'.'+decodeURIComponent(name));
  if(!file.startsWith(root+path.sep))throw Error('path outside fixture');
  const data=await readFile(file);
  res.writeHead(200,{'content-type':({'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json'})[path.extname(file)]||'application/octet-stream'});
  res.end(data);
 } catch(error){res.writeHead(404);res.end(String(error))}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 await page.goto('http://127.0.0.1:'+server.address().port+'/test.html');
 await page.evaluate(async()=>{
  const mod=await import('/docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-rigid-review-mode-a.js');
  window.openFinal=mod.openModeAConsolidatedRigidWeightReviewPopup;
  const candidate=(kg,preferred=true)=>({
   selectedWeight:kg,preferred,lengthQualified:true,ratingExact:true,
   weightMethod:'master-exact',typeDesc:'Gate Valve',
  });
  const row=(key,node,candidates,extras={})=>({
   key,reviewId:'source-A::'+key,
   branchName:'/OWNER/B4',componentType:'RIGID',nodeNumber:String(node),
   boreMm:200,rating:'300',lengthMm:112,dtxr:'Not found',
   componentRefNo:'1006649732/119364',endpoint:'2',
   acceptedWeight:null,candidates,originalWeight:null,...extras,
  });
  const a={sourceId:'source-A',fileName:'OWNER-GLRD.xml',
   config:{overrides:{rigidWeightMatch1:{RIGID320:40},rigidWeightFinal:{RIGID350:55}}},
   issues:[
    row('RIGID300',300,[candidate(35)]),
    row('VALV309',309,[candidate(166),candidate(218,false)],
      {componentType:'VALV',lengthMm:419}),
    row('RIGID320',320,[candidate(35)],{originalWeight:25,acceptedWeight:40}),
    row('RIGID350',350,[candidate(35)],{acceptedWeight:55}),
   ]};
  const b={sourceId:'source-B',fileName:'SECOND.xml',config:{overrides:{}},
   issues:[row('RIGID300',300,[candidate(35)])]};
  window.w3Entries=[a,b];
  window.w3Result=window.openFinal(window.w3Entries).then(x=>window.lastW3Result=x);
 });
 await page.waitForFunction(()=>document.querySelectorAll('[data-mode-a-rigid-review-row]').length===5);
 const initial=await page.evaluate(()=>{
  const rows=[...document.querySelectorAll('[data-mode-a-rigid-review-row]')];
  return {
   headers:[...document.querySelectorAll('th')].map(x=>x.textContent),
   cells:rows.map(tr=>({
    source:tr.dataset.sourceId,
    id:tr.querySelector('.mc-rigid-review-input')?.dataset.reviewId,
    draft:tr.querySelector('.mc-mode-a-review-draft')?.value,
    draftStatus:tr.querySelector('[data-final-review-proposal-status]')?.dataset.finalReviewProposalStatus,
    final:tr.querySelector('.mc-rigid-review-input')?.value,
    label:tr.textContent,
   })),
  };
 });
 assert.deepEqual(initial.headers.slice(-5),[
  'Source XML kg','Accepted Match-1 kg','Proposed draft kg',
  'Final reviewed kg','Nearest Suggestions']);
 assert.equal(initial.cells[0].draft,'35');
 assert.equal(initial.cells[0].final,'');
 assert.equal(initial.cells[1].draft,'');
 assert.equal(initial.cells[1].draftStatus,'CONFLICTING_CANDIDATES');
 assert.match(initial.cells[2].label,/25 kg/);
 assert.match(initial.cells[2].label,/40 kg/);
 assert.equal(initial.cells[2].draft,'');
 assert.match(initial.cells[3].label,/55 kg/);
 assert.equal(initial.cells[4].source,'source-B');
 assert.equal(initial.cells[4].draft,'35');
 assert.notEqual(initial.cells[0].id,initial.cells[4].id,'same NodeNumber/key in another source must remain distinct');

 await page.locator('.mc-mode-a-review-draft').first().fill('42');
 await page.locator('.mc-mode-a-review-draft').first().dispatchEvent('change',{bubbles:true});
 assert.equal(await page.locator('.mc-rigid-review-input').first().inputValue(),'');
 assert.match(await page.locator('[data-mode-a-rigid-status]').text(),/edited locally only/);
 await page.locator('[data-mode-a-rigid-apply]').click();
 assert.match(await page.locator('[data-mode-a-rigid-status]').text(),/Enter a positive weight/);
 assert.equal(await page.locator('[data-mode-a-rigid-review-row]').count(),5);
 await page.locator('[data-mode-a-rigid-cancel]').click();
 const cancel=await page.evaluate(async()=>await window.w3Result);
 assert.equal(cancel.cancelled,true);
 assert.deepEqual(cancel.updates,{});

 // A separately explicit candidate choice affects Final only at Apply.
 await page.evaluate(()=>{window.w3Result=window.openFinal([{
  sourceId:'source-A',fileName:'OWNER-GLRD.xml',config:{overrides:{}},
  issues:[window.w3Entries[0].issues[0]],
 }]).then(x=>window.lastW3Result=x)});
 await page.waitForFunction(()=>document.querySelectorAll('[data-mode-a-rigid-review-row]').length===1);
 assert.equal(await page.locator('.mc-rigid-review-input').first().inputValue(),'');
 await page.locator('[data-mode-a-rigid-candidate]').first().click();
 assert.equal(await page.locator('.mc-rigid-review-input').first().inputValue(),'35');
 await page.locator('[data-mode-a-rigid-apply]').click();
 const accepted=await page.evaluate(async()=>await window.w3Result);
 assert.equal(accepted.cancelled,false);
 assert.equal(accepted.updates['source-A'].weightsByKey.RIGID300,35);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({schema:'XML229_W3_FINAL_POPUP_CHROMIUM_V1',ok:true,
  initial,cancel,accepted,errors},null,2));
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
