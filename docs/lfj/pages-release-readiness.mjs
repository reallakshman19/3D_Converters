/** Fail-closed registered public Pages/source/docs byte parity. Never Owner acceptance. */
import {appendFile,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {allowedSite,probePages} from './pages-origin-probe.mjs';
const required=['index.html','main-rhbg-fitguard.js',
 'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js',
 'lfj/qualification/experiments/consumer-sparse-b0-xml-match/matching.worker.mjs'];
const valid=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function checkPublishedAssets(obs,expectedSite){
 const problems=[],rows=[],w=obs?.sourceWitnesses||{};
 const reject=(code,p='')=>problems.push(code+(p?': '+p:''));
 const site=allowedSite(obs?.pages?.html_url||'');
 if(obs?.pages?.status!==200||!site)reject('REGISTERED_PAGES_API_UNVERIFIED');
 if(site!==expectedSite)reject('WRONG_REGISTERED_ORIGIN');
 if(obs?.metadata?.has_pages!==true)reject('PAGES_DISABLED_OR_UNVERIFIED');
 if(!obs?.pages?.source?.branch||!obs?.pages?.source?.path)reject('PAGES_SOURCE_UNKNOWN');
 const registered=(obs?.candidates||[]).filter(x=>x.candidate===site&&x.listedByPagesApi);
 if(registered.length!==1)reject('REGISTERED_CANDIDATE_MISSING');
 const cand=registered.length===1?registered[0]:null;
 if(!cand?.indexReachable)reject('INDEX_NOT_REACHABLE');
 for(const path of required)if(!Object.hasOwn(w,path))reject('WITNESS_MISSING',path);
 for(const path of Object.keys(w).sort()){
  const root=w[path]?.root,docs=w[path]?.docs;
  const found=cand?.assets?.filter(x=>x.path===path)||[];
  const live=found.length===1?found[0]:null;
  if(!valid(root?.sha256)||!valid(docs?.sha256)||
     !Number.isInteger(root?.bytes)||!Number.isInteger(docs?.bytes))
    reject('SOURCE_DOCS_UNATTESTED',path);
  else if(root.sha256!==docs.sha256||root.bytes!==docs.bytes)
    reject('SOURCE_DOCS_DIFFER',path);
  if(!live||live.error||live.status!==200)reject('PUBLIC_ASSET_UNAVAILABLE',path);
  else{
    const expectedMime=path.endsWith('.html')?/html/i:/javascript|ecmascript/i;
    if(!expectedMime.test(live.contentType||''))reject('PUBLIC_MIME_MISMATCH',path);
    if(live.sha256!==docs?.sha256||live.bytes!==docs?.bytes)
      reject('PUBLIC_SHA_OR_SIZE_MISMATCH',path);
  }
  rows.push({path,http:live?.status||null,publicSha:live?.sha256||null,
    docsSha:docs?.sha256||null,sourceSha:root?.sha256||null});
 }
 return {schema:'LFJ.A2.PublicParity.v1',candidate:expectedSite,registeredSite:site,
  source:obs?.pages?.source||null,verdict:problems.length?'FAIL_PUBLIC_PARITY':'PASS_BYTES_ONLY',
  problems,assets:rows,ownerSiteAcceptance:'NOT_ATTESTED',opera:'NOT_RUN',
  independent141:'NOT_ATTESTED',owner30Mb:'NOT_RUN',release:'NOT_AUTHORIZED'};
}
export function summarize(x){
 return ['## Public registered Pages byte-parity gate', '',
   'Result: **'+x.verdict+'**','Registered site: '+(x.registeredSite||'UNAVAILABLE'),
   'Pages source: '+JSON.stringify(x.source),
   ...x.assets.map(a=>'- '+a.path+' HTTP '+a.http),
   ...x.problems.map(a=>'- BLOCKER '+a),
   'No production, Opera, independent semantic or Owner input acceptance is granted.'].join('\n')+'\n';
}
const self=fileURLToPath(import.meta.url);
if(process.argv[1]&&resolve(process.argv[1])===self){
 const root=resolve(dirname(self),'../..');
 const result=checkPublishedAssets(await probePages({root,
   token:process.env.GITHUB_TOKEN||''}),
   'https://reallakshman19.github.io/3D_Converters/');
 const payload={checkedHead:process.env.A2_EXACT_HEAD||null,...result};
 const serialized=JSON.stringify(payload,null,2)+'\n';
 console.log('A2_P11_PUBLIC_PARITY '+serialized);
 if(process.env.RUNNER_TEMP)
   await writeFile(join(process.env.RUNNER_TEMP,'a2-pages-public-parity.json'),serialized);
 if(process.env.GITHUB_STEP_SUMMARY)
   await appendFile(process.env.GITHUB_STEP_SUMMARY,summarize(result));
 if(result.verdict!=='PASS_BYTES_ONLY')process.exitCode=1;
}
