/** Real Chromium original-Blob hashing with true multi-chunk census. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';

const MiB=1024*1024;
const a=Buffer.alloc(MiB,0x61);
const b=Buffer.alloc(MiB,0x00);
const c=Buffer.alloc(MiB,0xf3);
const tail=Buffer.alloc(73);
for(let i=0;i<tail.length;i++)tail[i]=(i*29+3)&255;
const expected=createHash('sha256').update(a).update(b).update(c).update(tail).digest('hex');

const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  page.setDefaultTimeout(90000);
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4200/lfj/qualification/experiments/consumer-sparse-b0-xml-match/xml-csv-original.html');
  const measured=await page.evaluate(async ()=>{
    const {hashOriginalBlobOffThread}=await import(
      '/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-lfj-source-sha.js');
    const MiB=1024*1024;
    const tail=new Uint8Array(73);
    for(let i=0;i<tail.length;i++)tail[i]=(i*29+3)&255;
    const blob=new Blob([
      new Uint8Array(MiB).fill(0x61),
      new Uint8Array(MiB),
      new Uint8Array(MiB).fill(0xf3),
      tail
    ],{type:'application/json'});
    const originalWorker=window.Worker,originalBlobRead=Blob.prototype.arrayBuffer;
    let forbiddenMainThreadReads=0,hashWorkerStarts=0,terminated=0,held=false;
    const reports=[];
    Blob.prototype.arrayBuffer=function(...args){
      if(this===blob){
        forbiddenMainThreadReads++;
        throw Error('Full original Blob was read on main thread');
      }
      return originalBlobRead.apply(this,args);
    };
    window.Worker=class extends originalWorker {
      constructor(...args){
        super(...args);
        hashWorkerStarts++;
        this.addEventListener('message',event=>{
          if(event.data?.type==='DONE')reports.push(event.data);
        });
      }
      postMessage(data,...args){
        if(data?.type==='HASH' && held){
          held=false;
          return;
        }
        return super.postMessage(data,...args);
      }
      terminate(){terminated++;return super.terminate();}
    };
    try{
      // A cancelled hash cannot publish a result. A fresh hash on the same
      // exact Blob starts clean rather than inheriting a partial digest.
      held=true;
      const abort=new AbortController();
      const cancelled=hashOriginalBlobOffThread(blob,{signal:abort.signal});
      abort.abort();
      let code=null;
      try{await cancelled;}catch(error){code=error?.code;}
      if(code!=='LFJ_SHA_CANCELLED'||terminated<1)
        throw Error('Cancelled incremental hash published stale state');
      const sha=await hashOriginalBlobOffThread(blob);
      if(reports.length!==1)
        throw Error('Expected exactly one successful native SHA after restart');
      const report=reports[0];
      if(report.type!=='DONE'||
         report.sizeBytes!==blob.size||
         report.bytesHashed!==blob.size||
         report.chunkReads!==4||
         report.chunkLimitBytes!==MiB||
         report.maxReadBytes!==MiB)
        throw Error('True multi-slice original source census invalid: '+
          JSON.stringify(report));
      if(hashWorkerStarts!==2||terminated!==2||
         forbiddenMainThreadReads!==0)
        throw Error('Incomplete Worker cancellation/off-thread isolation');
      return {
        schema:'LFJ.A3.BoundedSourceShaBrowser.v1',
        fixture:'SYNTHETIC_MULTICHUNK_HASH_ONLY_NOT_OWNER',
        sha256:sha,sizeBytes:blob.size,chunkReads:report.chunkReads,
        maxReadBytes:report.maxReadBytes,
        abortedFirstWorker:true,restartedSecondWorker:true,
        hashWorkerStarts,terminated,forbiddenMainThreadReads,
        qualification:'NATIVE_CHROMIUM_INCREMENTAL_SHA_CENSUS_PASS'
      };
    }finally{
      window.Worker=originalWorker;
      Blob.prototype.arrayBuffer=originalBlobRead;
    }
  });
  assert.equal(measured.qualification,'NATIVE_CHROMIUM_INCREMENTAL_SHA_CENSUS_PASS');
  assert.equal(measured.sha256,expected);
  assert.equal(measured.sizeBytes,3*MiB+73);
  assert.deepEqual(errors,[]);
  console.log('LFJ_BOUNDED_SHA_CHROMIUM_PASS '+JSON.stringify(measured));
}finally{await browser.close();}
