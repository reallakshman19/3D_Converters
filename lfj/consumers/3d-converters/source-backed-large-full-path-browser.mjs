/**
 * A3 native source→projection→matching→complete CSV/product grant.
 *
 * Mode 1 uses the AUTHENTIC, protected 10,232,634-byte 1885_NC JSON/XML
 * negative fixture and its fixed, independently authored CSV/ledger goldens.
 * Modes 4/10 repeat EVERY real populated original branch and test derived
 * 40.9MB / 102.3MB valid JSON inputs against the same original XML. It is an
 * adversarial source-scale negative case, NOT an owner-pinned large golden.
 * No mock Worker, fake source padding or fabricated XML.
 */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {ORIGINAL_B0_OUTPUT_GOLDENS_V1} from
  '../../qualification/experiments/consumer-sparse-b0-xml-match/authentic-original-output-goldens.mjs';

const copies=Number(process.env.LFJ_A3_FULL_PATH_COPIES||1);
assert.ok([1,4,10].includes(copies),'supported full-path sources: original, 4x or 10x original');
const base=ORIGINAL_B0_OUTPUT_GOLDENS_V1.largeNegative;
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage();
  page.setDefaultTimeout(copies===10?1200000:(copies===4?540000:240000));
  await page.goto('http://127.0.0.1:4200/lfj/qualification/experiments/consumer-sparse-b0-xml-match/xml-csv-original.html');
  const report=await page.evaluate(async({copies,base})=>{
    const {runProductSourceBackedResolver}=await import(
      '/lfj/consumers/3d-converters/source-backed-resolver-build.mjs');
    const {admitSourceBackedCsvProductGrant,selectSourceBackedCsvForDownload}=await import(
      '/lfj/consumers/3d-converters/source-backed-resolver-export.mjs');
    const originalJson=await fetch('/'+base.jsonPath,{cache:'no-store'});
    const originalXml=await fetch('/'+base.xmlPath,{cache:'no-store'});
    if(!originalJson.ok||!originalXml.ok)
      throw Error('authentic large JSON/XML fixture unavailable');
    const [originalBlob,xmlText]=await Promise.all([
      originalJson.blob(),originalXml.text()]);
    const sha=async bytes=>[...new Uint8Array(
      await crypto.subtle.digest('SHA-256',bytes)
    )].map(x=>x.toString(16).padStart(2,'0')).join('');
    if(originalBlob.size!==base.jsonBytes||
       await sha(await originalBlob.arrayBuffer())!==base.jsonSha256||
       new TextEncoder().encode(xmlText).length!==base.xmlBytes||
       await sha(new TextEncoder().encode(xmlText))!==base.xmlSha256)
      throw Error('original immutable 1885_NC JSON/XML identity changed');
    let blob=originalBlob;
    if(copies>1){
      const original=String(await originalBlob.text()).trim();
      if(!original.startsWith('[')||!original.endsWith(']'))
        throw Error('original source is not an array');
      const data=original.slice(1,-1).trim();
      const pieces=['['];
      for(let i=0;i<copies;i++){
        if(i)pieces.push(',');
        pieces.push(data);
      }
      pieces.push(']');
      blob=new Blob(pieces,{type:'application/json'});
      if(blob.size<(copies===10?90:30)*1024*1024)
        throw Error('derived populated source was too small');
    }
    const begin=performance.now();
    let heartbeatGapMs=0,last=performance.now();
    const timer=setInterval(()=>{
      const now=performance.now();
      heartbeatGapMs=Math.max(heartbeatGapMs,now-last);
      last=now;
    },50);
    let view;
    try{
      view=await runProductSourceBackedResolver({
        blob,xmlText,config:{},revision:7,currentRevision:()=>7
      });
    }finally{clearInterval(timer);}
    const elapsedMs=performance.now()-begin;
    if(view.originalBytes!==blob.size||view.xmlNodes!==base.xmlNodes ||
       view.matchedXmlNodes!==base.matchedXmlNodes)
      throw Error('full source-backed Resolver missed actual large XML census');
    const census=view.nodeWiseRows.reduce((out,row)=>{
      out[row.status]=(out[row.status]||0)+1;return out;
    },{});
    if(census.UNRESOLVED!==base.xmlNodes || view.evidenceTreeRows.length!==0)
      throw Error('large authentic negative XML/source pairing produced spurious evidence');
    const expected=[
      ['nodeWiseCsv','nodeWiseCsvBytes','nodeWiseCsvSha256'],
      ['evidenceTreeCsv','evidenceTreeCsvBytes','evidenceTreeCsvSha256']
    ];
    const results=[];
    for(const [csvKey,byteKey,hashKey] of expected){
      const csv=view[csvKey];
      const bytes=new TextEncoder().encode(csv);
      if(bytes.byteLength!==base[byteKey]||
         await sha(bytes)!==base[hashKey])
        throw Error('whole source-backed '+csvKey+' differs from original pinned output');
      results.push({kind:csvKey,bytes:bytes.byteLength,sha256:base[hashKey]});
    }
    // The real product-owned grant also rechecks both full byte arrays.
    const grant=await admitSourceBackedCsvProductGrant(view,{
      revision:7,currentRevision:()=>7
    });
    const ref={current:{
      resolverResearchView:view,resolverProductCsvGrant:grant,
      resolverResearchBuildToken:null,resolverJsonTraceRunning:false,
      resolverJsonTraceInputRevision:7
    }};
    const outputs=[];
    for(const kind of ['node-wise-trace','evidence-tree']){
      const selected=await selectSourceBackedCsvForDownload(ref,kind);
      if(selected.sha256!==base[kind==='node-wise-trace'?
         'nodeWiseCsvSha256':'evidenceTreeCsvSha256'])
        throw Error('product CSV grant altered pinned source output');
      outputs.push({kind,bytes:selected.bytes,sha256:selected.sha256});
    }
    const retained=(await indexedDB.databases()).filter(x=>
      x.name?.startsWith('lfj-a3-'));
    if(retained.length)
      throw Error('full large Worker flow left persistent A3 databases');
    return {
      schema:'LFJ.A3.FullNativeLargeNegativeParity.v1',
      mode:copies===1?'AUTHENTIC_10MB_NEGATIVE':
        (copies===4?'DERIVED_4X_40MB_NEGATIVE':'DERIVED_10X_102MB_NEGATIVE'),
      provenance:copies===1?'ORIGINAL_1885_NC':'DERIVED_REPEATED_AUTHENTIC_BRANCHES',
      originalJsonSha256:base.jsonSha256,originalXmlSha256:base.xmlSha256,
      sourceBytes:blob.size,xmlNodes:view.xmlNodes,
      matchedXmlNodes:view.matchedXmlNodes,
      nodeRows:view.nodeWiseRows.length,evidenceRows:view.evidenceTreeRows.length,
      outputs,grantSchema:grant.schema,
      workerStages:view.nativeWorkerStages,
      sourceCatalogMaxValues:view.sourceCatalogMaxValues,
      elapsedMs,heartbeatGapMs,leakedA3Databases:retained.length,
      protectedOwner30MBGoldensAccepted:false,
      releasedToProduction:false
    };
  },{copies,base});
  assert.equal(report.leakedA3Databases,0);
  assert.equal(report.matchedXmlNodes,0);
  assert.equal(report.xmlNodes,3429);
  console.log('A3_FULL_NATIVE_LARGE_NEGATIVE_PASS '+JSON.stringify(report));
}finally{await browser.close();}
