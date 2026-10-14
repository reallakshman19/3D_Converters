import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const server=createServer(async(req,res)=>{
 try{
  const p=new URL(req.url,'http://localhost').pathname;
  if(p==='/test.html'){
   res.writeHead(200,{'content-type':'text/html'});
   res.end('<!doctype html><meta charset="utf-8"><button id="mc-wm-refresh">Build Weight Data</button><button id="mc-wm-fill-best">Apply suggestion to blank cells</button><button id="mc-wm-length-toggle">Length</button><button id="mc-wm-use-dtxr-rating">Rating</button><div id="mc-wm-hint-panel"></div><span id="mc-wm-status"></span><div id="mc-wm-content"></div>');
   return;
  }
  const file=path.resolve(root,'.'+decodeURIComponent(p));
  if(!file.startsWith(root+path.sep))throw Error('path traversal');
  const content=await readFile(file);
  const mime={'.js':'text/javascript','.json':'application/json'}[path.extname(file)]||'application/octet-stream';
  res.writeHead(200,{'content-type':mime});res.end(content);
 }catch(e){res.writeHead(404);res.end(String(e));}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
let browser;
try{
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 const errors=[];
 page.on('pageerror',error=>errors.push(String(error)));
 await page.goto('http://127.0.0.1:'+server.address().port+'/test.html');
 await page.evaluate(async()=>{
  const mod=await import('/docs/tabs/model-converters/converters/xmltocii2019_helper/weight-match-renderer.js');
  const candidate=(kg,preferred=true)=>({selectedWeight:kg,preferred,
    lengthQualified:true,ratingExact:true,weightMethod:'exact',typeDesc:'Verified physical candidate'});
  const row=(key,node,component,candidates,props={})=>({
    key,nodeNumber:String(node),branchName:'/OWNER/B4',lineKey:'P8810021',
    rating:'300',boreMm:200,lengthMm:112,componentType:component,
    componentRefNo:'1006649732/119364',endpoint:'2',weight:null,mapped:false,
    candidates,...props,
  });
  const issues=[
   row('RIGID300',300,'RIGID',[candidate(35)]),
   row('VALV309',309,'VALV',[candidate(166),candidate(218,false)],{lengthMm:419}),
   row('RIGID320',320,'RIGID',[candidate(35)],{weight:40,mapped:true}),
   row('RIGID350',350,'RIGID',[candidate(35)]),
  ];
  const witness={config:{overrides:{rigidWeightFinal:{RIGID350:35}}}};
  window.__w2=witness;
  mod.bindXmlCiiWeightMatchPhase(document.body,{
   xmlFile:new File(['<Plant/>'],'owner.xml',{type:'application/xml'}),
   stagedJsonText:'',config:witness.config,
   resolveConfig:()=>witness.config,
   onSaveConfig:config=>{witness.config=config;},
   ensureOverrides:config=>(config.overrides ||= {}),
   resolveStagedJsonText:async()=>({text:''}),
   weightDatasetRef:{datasetId:'w2-witness',masterFingerprint:'known',datasetRevision:1},
   prepareWeightBasis:async()=>({issues,match1Validation:{stale:{},staleCount:0},
     effectiveRigidWeight:{}}),
   rankWeightIssues:async rows=>({datasetId:'w2-witness',issues:rows}),
  });
  document.querySelector('#mc-wm-refresh').click();
 });
 await page.waitForFunction(()=>document.querySelectorAll('.mc-wm-draft-input').length===4,
  {timeout:12000});
 const before=await page.evaluate(()=>({
  drafts:[...document.querySelectorAll('.mc-wm-draft-input')].map(e=>e.value),
  draftStates:[...document.querySelectorAll('[data-wm-draft-status]')].filter(e=>e.matches('td')).map(e=>e.dataset.wmDraftStatus),
  accepted:[...document.querySelectorAll('.mc-rigid-review-input')].map(e=>e.value),
  saved:window.__w2.config.overrides.rigidWeight||{},
  headers:[...document.querySelectorAll('th')].map(e=>e.textContent),
 }));
 assert.deepEqual(before.drafts,['35','','','']);
 assert.deepEqual(before.accepted,['','','40','']);
 assert(before.headers.includes('Proposed draft (kg)'));
 assert(before.headers.includes('Weight (kg)'));
 assert.equal(before.draftStates[0],'ELIGIBLE_DRAFT');
 assert.equal(before.draftStates[1],'NEEDS_ENGINEERING_REVIEW');
 assert.equal(before.draftStates[2],'EXISTING_OR_STALE_AUTHORITY');
 assert.equal(before.draftStates[3],'EXISTING_OR_STALE_AUTHORITY');
 assert.deepEqual(before.saved,{});
 await page.locator('.mc-wm-draft-input').first().fill('42');
 await page.locator('.mc-wm-draft-input').first().dispatchEvent('change',{bubbles:true});
 const edited=await page.evaluate(()=>({
  proposed:document.querySelector('.mc-wm-draft-input').value,
  accepted:document.querySelector('.mc-rigid-review-input').value,
  saved:window.__w2.config.overrides.rigidWeight||{},
  notice:document.querySelector('#mc-wm-status').textContent,
 }));
 assert.equal(edited.proposed,'42');
 assert.equal(edited.accepted,'');
 assert.deepEqual(edited.saved,{});
 assert.match(edited.notice,/no Match-1 or Final weight saved/);
 const firstButton=page.locator('[data-wm-candidate]').first();
 await firstButton.click();
 const after=await page.evaluate(()=>({
  accepted:[...document.querySelectorAll('.mc-rigid-review-input')].map(e=>e.value),
  saved:window.__w2.config.overrides.rigidWeight||{},
  final:window.__w2.config.overrides.rigidWeightFinal,
  meta:window.__w2.config.overrides.rigidWeightProposalMeta,
 }));
 assert.equal(after.accepted[0],'35');
 assert.equal(after.saved.RIGID300,35);
 assert.equal(after.meta.RIGID300.acceptanceMethod,'candidate');
 assert.deepEqual(after.final,{RIGID350:35});
 assert.equal(after.accepted[1],'');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({schema:'XML229_W2_PROPOSED_DRAFT_CHROMIUM_V1',ok:true,
  before,edited,after,errors},null,2));
}finally{
 await browser?.close();
 await new Promise(ok=>server.close(ok));
}
