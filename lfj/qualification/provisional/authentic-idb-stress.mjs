/**
 * Independent benchmark ORACLE uses the original tracked source JSON,
 * NOT LFJ R04/R05 output or its occurrence/paging implementation.
 * JSON.parse on Node here is test-side census, never a browser production
 * source-processing fallback. All sample bytes are proven against the
 * original browser File/Blob and distinct occurrence IDs.
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const arg=process.argv.indexOf('--fixture');
if(arg<0||!process.argv[arg+1])throw Error('ORIGINAL_FIXTURE_REQUIRED');
const filename=process.argv[arg+1];
if(![
  'Benchmarks/1885Sjson/Sjson.json',
  'Benchmarks/1885_NC/1885_NC.json'
].includes(filename))throw Error('NON_CANONICAL_FIXTURE_REFUSED');
const source=await readFile(filename);
const sha256=createHash('sha256').update(source).digest('hex');
const parsed=JSON.parse(source.toString('utf8'));
let occurrenceCount=0;const scalars=[];
const encode=k=>String(k).replaceAll('~','~0').replaceAll('/','~1');
const walk=[{value:parsed,path:''}];
while(walk.length){
  const node=walk.pop();
  occurrenceCount++;
  const val=node.value;
  if(val===null||typeof val!=='object'){
    if(Buffer.byteLength(JSON.stringify(val))<=1024)
      scalars.push({path:node.path,expected:val});
    continue;
  }
  const entries=Array.isArray(val)
    ?val.map((v,i)=>[String(i),v])
    :Object.entries(val);
  for(let i=entries.length-1;i>=0;i--)
    walk.push({value:entries[i][1],path:node.path+'/'+encode(entries[i][0])});
}
assert.ok(occurrenceCount>100,'authentic benchmark must be populated');
assert.ok(scalars.length>=3,'independent primitive sample oracle must be meaningful');
const scalarSamples=[scalars[0],scalars[Math.floor(scalars.length/2)],
  scalars[scalars.length-1]];
const oracle={sha256,bytes:source.byteLength,occurrenceCount,scalarSamples};
console.log('INDEPENDENT_NODE_FIXTURE_ORACLE '+JSON.stringify({
  filename,sha256,bytes:source.length,occurrenceCount,scalarPaths:scalarSamples.map(s=>s.path),
  oracle:'INDEPENDENT_TEST_ONLY_JSON_PARSE_NOT_LFJ_INDEX'
}));
const pageUrl='http://127.0.0.1:4187/lfj/qualification/provisional/authentic-idb-stress.html';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  page.setDefaultTimeout(600000);
  page.on('pageerror',e=>console.error('LFJ_BROWSER_PAGEERROR',e.message));
  page.on('console',m=>{
    const msg=m.text();
    if(msg.startsWith('LFJ_AUTHENTIC_DIAGNOSTIC_FAILURE'))
      console.error(msg);
  });
  await page.goto(pageUrl,{waitUntil:'load'});
  await page.waitForFunction(()=>typeof window.runAuthenticLFJFixture==='function');
  const fileUrl='/fixtures/'+filename.split('/').at(-1);
  const result=await page.evaluate(async input=>{
    return await window.runAuthenticLFJFixture(input);
  },{url:fileUrl,oracle,scanPages:true});
  assert.equal(result.schema,'LFJ.AuthenticFixtureQualification.v1');
  assert.equal(result.sha256,sha256);
  assert.equal(result.bytes,source.byteLength);
  assert.equal(result.occurrences,occurrenceCount);
  assert.equal(result.events,2*occurrenceCount);
  assert.equal(result.selected,occurrenceCount);
  assert.equal(result.samples.length,3);
  assert.ok(result.samples.every(x=>x.exact));
  assert.equal(result.workerConsumedBytes,source.byteLength);
  assert.equal(result.stale,'SOURCE_STALE');
  assert.equal(result.sourceOnly,true);
  assert.equal(result.appWired,false);
  console.log('LFJ_AUTHENTIC_POPULATED_BROWSER_PASS '+JSON.stringify({
    filename,...result
  }));
}finally{await browser.close();}
