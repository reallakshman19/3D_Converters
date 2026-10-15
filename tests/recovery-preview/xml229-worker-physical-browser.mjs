import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.XML_CII_PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const server=createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost');
  const target=path.resolve(root,'.'+decodeURIComponent(u.pathname));
  if(!target.startsWith(root+path.sep))throw Error('path outside test repo');
  const data=await readFile(target);
  const mime={'.mjs':'text/javascript','.js':'text/javascript',
   '.html':'text/html','.xml':'application/xml','.json':'application/json'};
  res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream',
   'cache-control':'no-store'});res.end(data);
 }catch(e){res.writeHead(404);res.end(String(e));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({headless:true,
  ...(process.env.XML_CII_CHROMIUM_EXECUTABLE
   ?{executablePath:process.env.XML_CII_CHROMIUM_EXECUTABLE}:{})});
 const page=await browser.newPage();
 const errors=[],badResponses=[];
 page.on('pageerror',error=>errors.push(String(error)));
 page.on('response',response=>{
  if(response.status()>=400)badResponses.push({url:response.url(),status:response.status()});
 });
 await page.goto('http://127.0.0.1:'+server.address().port+
  '/tests/browser/xml229-worker-physical-browser.html',
  {waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>globalThis.__XML229_BROWSER_DONE__===true,
  null,{timeout:120000});
 const outcome=await page.evaluate(()=>globalThis.__XML229_BROWSER_RESULT__);
 console.log(JSON.stringify({outcome,runtimeErrors:errors,badResponses},null,2));
 assert.equal(outcome?.ok,true,outcome?.stack||outcome?.error||'Browser worker failed');
 assert.equal(outcome?.originalBranches,41);
 assert.equal(outcome?.originalNodes,1166);
 assert.equal(outcome?.sourcePhysicalFacts,4664);
 assert.equal(outcome?.authority,'NOT_ASSESSED');
 assert.equal(outcome?.engineeringReady,false);
 assert.equal(outcome?.selectedZoneGate,'SCOPED_ENGINEERING_PENDING');
 assert.deepEqual(errors,[],'unhandled browser errors');
 assert.deepEqual(badResponses,[],'missing served module/data resources');
}finally{
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
