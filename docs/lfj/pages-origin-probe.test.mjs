/** Offline deterministic Pages-origin observations, never live-URL acceptance. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedSite,candidateSites,probePages} from './pages-origin-probe.mjs';

const repo='https://api.github.com/repos/reallakshman19/3D_Converters';
const old='https://reallaksh19.github.io/3D_Converters/';
const current='https://reallakshman19.github.io/3D_Converters/';
const body=(value,status=200,type='application/json')=>
  new Response(value,{status,headers:{'content-type':type}});
const mockFetch=(routes,observed=[])=>async(url,options)=>{
  observed.push({url,auth:options.headers.Authorization??null});
  if(!(url in routes))return body('not found',404,'text/plain');
  const route=routes[url];if(route instanceof Error)throw route;
  return route;
};
test('allowlist accepts fixed HTTPS GitHub Pages repo paths only',()=>{
  assert.equal(allowedSite(current),current);
  for(const url of [
    'http://reallakshman19.github.io/3D_Converters/',
    'https://evil.example/3D_Converters/',
    'https://u:p@reallakshman19.github.io/3D_Converters/',
    'https://reallakshman19.github.io/other/',
    'https://reallakshman19.github.io/3D_Converters/?key=x',
    'https://reallakshman19.github.io/3D_Converters/#fragment'
  ])assert.equal(allowedSite(url),null);
});
test('candidate list keeps historic and migrated owners separate',()=>{
  assert.deepEqual(candidateSites({owner:'reallakshman19',repoName:'3D_Converters',
    pagesUrl:current}),[current,old]);
});
test('valid Pages config and public HTML never imply Owner-opened verification',async()=>{
  const seen=[];
  const routes={
    [repo]:body(JSON.stringify({has_pages:true,homepage:null})),
    [repo+'/pages']:body(JSON.stringify({html_url:current,
      build_type:'workflow',source:{branch:'main',path:'/'},status:'built'})),
    [current+'index.html']:body('<!doctype html><html></html>',200,'text/html'),
    [current+'main-rhbg-fitguard.js']:body('export {};',200,'text/javascript')
  };
  const result=await probePages({fetchImpl:mockFetch(routes,seen),token:'PRIVATE_TOKEN'});
  assert.equal(result.pages.status,200);
  assert.deepEqual(result.pages.source,{branch:'main',path:'/'});
  assert.equal(result.pages.html_url,current);
  assert.equal(result.candidates.length,2);
  assert.equal(result.candidates[0].indexReachable,true);
  assert.equal(result.candidates[1].indexReachable,false);
  assert.equal(result.ownerOpenedUrlVerified,false);
  assert.equal(result.selectedPublishedArtifactVerified,false);
  assert.equal(JSON.stringify(result).includes('PRIVATE_TOKEN'),false);
  assert.ok(seen.every(v=>v.url.startsWith(repo)?v.auth==='Bearer PRIVATE_TOKEN':!v.auth));
});
test('metadata has_pages true plus Pages 404 remains unverified, not disabled',async()=>{
  const fetchImpl=mockFetch({
    [repo]:body(JSON.stringify({has_pages:true})),
    [repo+'/pages']:body(JSON.stringify({message:'Not Found'}),404)
  });
  const result=await probePages({fetchImpl});
  assert.equal(result.metadata.has_pages,true);
  assert.equal(result.pages.status,404);
  assert.equal(result.pages.html_url,null);
  assert.equal(result.ownerOpenedUrlVerified,false);
});
test('offline candidate fetch failures do not make a false deployment PASS',async()=>{
  const fetchImpl=mockFetch({
    [repo]:new Error('offline'),
    [repo+'/pages']:new Error('offline')
  });
  const result=await probePages({fetchImpl});
  assert.match(result.metadata.error,/offline/);
  assert.match(result.pages.error,/offline/);
  assert.ok(result.candidates.every(x=>!x.indexReachable));
});
test('oversized public asset is rejected before hashing it',async()=>{
  const routes={
    [repo]:body(JSON.stringify({has_pages:true})),
    [repo+'/pages']:body('{}')
  };
  routes[current+'index.html']=new Response('big',{headers:{
    'content-type':'text/html','content-length':'3000000'
  }});
  const result=await probePages({fetchImpl:mockFetch(routes)});
  const index=result.candidates[0].assets.find(x=>x.path==='index.html');
  assert.equal(index.error,'HTTP_BODY_OVER_LIMIT');
  assert.equal(result.candidates[0].indexReachable,false);
});
