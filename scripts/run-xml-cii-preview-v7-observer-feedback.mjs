import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(String(e?.stack||e)));
 await page.goto('http://127.0.0.1:4173/tests/browser/xml-cii-preview-v7-observer-feedback.html',{timeout:45000});
 await page.waitForFunction(()=>Boolean(globalThis.__PREVIEW_V7_OBSERVER_RESULT__),null,{timeout:15000});
 const result=await page.evaluate(()=>globalThis.__PREVIEW_V7_OBSERVER_RESULT__);
 console.log('PREVIEW_V7_OBSERVER_FEEDBACK',JSON.stringify({...result,pageErrors:errors}));
 if(!result.ok||errors.length)process.exitCode=1;
}finally{await browser.close();}
