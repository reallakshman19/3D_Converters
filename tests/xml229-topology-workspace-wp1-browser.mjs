/** Actual Chromium + vendored Pyodide; no Weight/O1/Final fixtures are created.
 * Run: node tests/xml229-topology-workspace-wp1-browser.mjs
 * Produces screenshots only after the real PSI116 analysis completes. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const screenshots=process.env.XML229_WP1_EVIDENCE_DIR || '/tmp/xml229-wp1-evidence';
const original=await readFile(path.join(root,'Benchmarks/1885Sjson/FirstpassXML'));
const responses=[];
const server=createServer(async(req,res)=>{
  try{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const file=path.resolve(root,'.'+decodeURIComponent(pathname));
    if(!file.startsWith(root+path.sep))throw Error('Outside checkout');
    const extension=path.extname(file);
    const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript',
      '.css':'text/css','.wasm':'application/wasm','.zip':'application/zip',
      '.json':'application/json','.py':'text/plain'};
    res.setHeader('content-type',mime[extension]||'application/octet-stream');
    res.end(await readFile(file));
  }catch(error){res.writeHead(404);res.end(String(error));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
  await mkdir(screenshots,{recursive:true});
  browser=await chromium.launch({headless:true});
  for(const prefix of ['','/docs']){
    const page=await browser.newPage({viewport:{width:1440,height:920}});
    const errors=[];
    const consoleErrors=[];
    page.on('pageerror',error=>errors.push(String(error)));
    page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text());});
    const pathName=prefix+'/topology-workspace.html';
    await page.goto('http://127.0.0.1:'+server.address().port+pathName);
    assert.equal(await page.locator('[data-analyze]').isDisabled(),true);
    assert.equal(await page.locator('[data-field=staged-json-file]').count(),0);
    await page.locator('[data-file]').setInputFiles({
      name:'FirstpassXML.xml',mimeType:'application/xml',buffer:original
    });
    await page.waitForFunction(()=>/Source loaded/.test(
      document.querySelector('[data-status]')?.textContent||''),null,{timeout:30000});
    assert.match(await page.locator('[data-source-meta]').innerText(),/text SHA256/);
    assert.match(await page.locator('[data-occ-summary]').innerText(),/216 source occurrences/);
    await page.locator('[data-analyze]').click();
    await page.waitForFunction(()=>/Authoritative topology analysis complete|Topology analysis failed/.test(
      document.querySelector('[data-status]')?.textContent||''),null,{timeout:240000});
    const result=await page.locator('[data-status]').innerText();
    assert.match(result,/Authoritative topology analysis complete/);
    assert.match(await page.locator('[data-plan-summary]').innerText(),/KEEP \(unchanged\)/);
    await page.locator('[data-search]').fill('1600');
    assert((await page.locator('[data-occurrences] button').count())>0);
    await page.locator('[data-occurrences] button').first().click();
    assert.match(await page.locator('[data-selection]').innerText(),/1 source occurrence/);
    assert.match(await page.locator('[data-inspector]').innerText(),/Source key/);
    await page.locator('[data-focus]').click();
    await page.locator('[data-search]').fill('');
    const drop=page.locator('[data-issues] button').filter({hasText:'SAFE_DROP_PIPE_GEOMETRY'});
    assert((await drop.count())>0);
    await drop.first().click();
    assert.match(await page.locator('[data-hits]').innerText(),/Source-qualified action witnesses/);
    await page.locator('[data-occurrences] button').first().click();
    assert.equal(await page.locator('[data-hits]').innerText(),'','Selecting an occurrence must clear previous action witnesses');
    const canvas=page.locator('[data-canvas]'),bbox=await canvas.boundingBox();
    assert(bbox&&bbox.width>400);
    await page.locator('[data-mode=pan]').click();
    const before=await canvas.evaluate(el=>el.toDataURL());
    await page.mouse.move(bbox.x+bbox.width/2,bbox.y+bbox.height/2);
    await page.mouse.down();
    await page.mouse.move(bbox.x+bbox.width/2+85,bbox.y+bbox.height/2+45,{steps:6});
    await page.mouse.up();
    const after=await canvas.evaluate(el=>el.toDataURL());
    assert.notEqual(after,before,'Pan redraw should move projected source geometry');
    await page.locator('[data-mode=orbit]').click();
    await page.locator('[data-view=top]').click();
    await page.locator('[data-view=iso]').click();
    await page.screenshot({path:path.join(screenshots,prefix?'docs-wp1.png':'root-wp1.png')});
    assert.deepEqual(errors,[]);
    assert.deepEqual(consoleErrors,[]);
    responses.push({path:pathName,result,sourceCount:216,screenshot:path.join(screenshots,
      prefix?'docs-wp1.png':'root-wp1.png'),pageErrorCount:errors.length,
      consoleErrorCount:consoleErrors.length});
    await page.close();
  }
  console.log(JSON.stringify({status:'PASS',scope:'public-fixture-real-engine-no-masters',
    results:responses},null,2));
}finally{
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
