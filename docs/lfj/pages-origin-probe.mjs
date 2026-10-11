/**
 * A2 read-only hosted Pages observation. No deployment, Pages settings change,
 * user URL inference, release authority or token disclosure.
 */
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const SELF=fileURLToPath(import.meta.url);
const digest=b=>createHash('sha256').update(b).digest('hex');
const FIELDS=Object.freeze([
  'index.html',
  'main-rhbg-fitguard.js',
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js',
  'lfj/qualification/experiments/consumer-sparse-b0-xml-match/matching.worker.mjs',
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-json-trace.js'
]);
export function allowedSite(value,repoName='3D_Converters'){
  try{
    const u=new URL(value);
    if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash||
      !/^[a-z0-9-]+\.github\.io$/i.test(u.hostname)||
      u.pathname.toLowerCase()!=='/'+repoName.toLowerCase()+'/')return null;
    return u.origin+u.pathname;
  }catch{return null;}
}
export function candidateSites({owner,repoName,legacy='reallaksh19',pagesUrl}){
  return [...new Set([
    'https://'+owner+'.github.io/'+repoName+'/',
    'https://'+legacy+'.github.io/'+repoName+'/',pagesUrl
  ].map(v=>allowedSite(v,repoName)).filter(Boolean))];
}
async function boundedBytes(response,limit=2097152){
  const size=Number(response.headers.get('content-length'));
  if(Number.isFinite(size)&&size>limit)throw Error('HTTP_BODY_OVER_LIMIT');
  let n=0;const parts=[];
  if(response.body){
    const reader=response.body.getReader();
    try{
      for(;;){
        const {done,value}=await reader.read();if(done)break;
        n+=value.length;if(n>limit)throw Error('HTTP_BODY_OVER_LIMIT');
        parts.push(Buffer.from(value));
      }
    }finally{reader.releaseLock();}
  }
  return Buffer.concat(parts);
}
async function get(url,{fetchImpl=fetch,token='',api=false}={}){
  const headers=api?{
    Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
    'User-Agent':'lfj-a2-read-only',...(token?{Authorization:'Bearer '+token}:{})
  }:{'User-Agent':'lfj-a2-read-only'};
  try{
    const r=await fetchImpl(url,{headers,redirect:'follow',signal:AbortSignal.timeout(12000)});
    const final=r.url||url;
    if(!api&&new URL(final).origin!==new URL(url).origin)
      return {url,status:r.status,final,error:'CROSS_ORIGIN_REDIRECT_UNTRUSTED'};
    const b=await boundedBytes(r);
    const data={url,status:r.status,final,contentType:r.headers.get('content-type'),
      bytes:b.length,sha256:digest(b)};
    if(api)data.text=b.toString('utf8');
    return data;
  }catch(e){return {url,error:e?.name==='TimeoutError'?'HTTP_TIMEOUT':
    String(e?.message||e).slice(0,110)};}
}
export async function probePages({owner='reallakshman19',repoName='3D_Converters',
  root=process.cwd(),token='',fetchImpl=fetch,legacy='reallaksh19'}={}){
  if(!/^[a-z0-9-]+$/i.test(owner)||!/^[a-z0-9_.-]+$/i.test(repoName))
    throw TypeError('invalid repository identity');
  const api='https://api.github.com/repos/'+owner+'/'+repoName;
  const [meta,pages]=await Promise.all([
    get(api,{fetchImpl,token,api:true}),
    get(api+'/pages',{fetchImpl,token,api:true})
  ]);
  let mj={},pj={};try{mj=JSON.parse(meta.text||'{}');}catch{}
  try{pj=JSON.parse(pages.text||'{}');}catch{}
  const registered=allowedSite(pj.html_url,repoName);
  const witnesses={};
  for(const f of FIELDS){
    witnesses[f]={};
    for(const [kind,relative] of [['root',f],['docs','docs/'+f]]){
      try{const b=await readFile(path.join(root,relative));
        witnesses[f][kind]={bytes:b.length,sha256:digest(b)};}
      catch(e){witnesses[f][kind]={error:e?.code==='ENOENT'?'NOT_CHECKED_IN':'READ_ERROR'};}
    }
  }
  const candidates=await Promise.all(candidateSites({owner,repoName,legacy,pagesUrl:registered})
    .map(async base=>{
      const assets=await Promise.all(FIELDS.map(async f=>{
        const observation=await get(new URL(f,base).href,{fetchImpl});
        return {path:f,...observation};
      }));
      const html=assets.find(a=>a.path==='index.html');
      return {candidate:base,listedByPagesApi:base===registered,
        indexReachable:html?.status===200&&/html/i.test(html.contentType||''),assets};
    }));
  return {schema:'LFJ.A2.PagesIdentityObservation.v1',
    scope:'PUBLIC_READ_ONLY_CANDIDATES_NOT_CONFIRMED_OWNER_SITE',
    repository:owner+'/'+repoName,
    metadata:{status:meta.status??null,has_pages:mj.has_pages??null,
      homepage:mj.homepage??null,error:meta.error??null},
    pages:{status:pages.status??null,html_url:registered,
      source:pj.source??null,build_type:pj.build_type??null,
      statusText:pj.status??null,error:pages.error??null},
    sourceWitnesses:witnesses,candidates,
    ownerOpenedUrlVerified:false,selectedPublishedArtifactVerified:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===SELF){
  const result=await probePages({root:path.resolve(path.dirname(SELF),'../..'),
    token:process.env.GITHUB_TOKEN||''});
  console.log('A2_PAGES_ORIGIN_OBSERVATION '+JSON.stringify(result));
}
