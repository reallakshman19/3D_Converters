/** A3 T06c: native source-only original scope discovery. No CSV/Build rights. */
import { runPagedCompactResearch } from
  '../../qualification/experiments/consumer-sparse-b0/compact-paged-research.mjs';
import { readVerifiedOriginalScopeChoices } from './verified-source-root-reader.mjs';

let running=false;
self.addEventListener('message',async({data})=>{
  if(running){self.postMessage({type:'ERROR',code:'SCOPE_DISCOVERY_BUSY'});return;}
  running=true;
  try{
    if(data?.type!=='DISCOVER'||!(data.blob instanceof Blob)||
       !/^[0-9a-f]{64}$/.test(data.expectedSha256||'')||
       !/^lfj-t06c-source-[0-9a-f-]{36}$/.test(data.sourceDatabaseName||'')||
       !/^[0-9a-f-]{36}$/.test(data.sourceGeneration||''))
      throw Object.assign(new Error('Exact original Blob, SHA and temporary generation required'),
        {code:'SCOPE_DISCOVERY_INPUT'});
    await runPagedCompactResearch({
      blob:data.blob,expectedSha256:data.expectedSha256,
      databaseName:data.sourceDatabaseName,
      generation:data.sourceGeneration,revision:'A3-T06C-DISCOVERY'
    });
    const result=await readVerifiedOriginalScopeChoices({
      sourceDatabaseName:data.sourceDatabaseName,
      sourceGeneration:data.sourceGeneration,
      blob:data.blob,expectedSha256:data.expectedSha256
    });
    self.postMessage({type:'DONE',result});
  }catch(error){
    self.postMessage({type:'ERROR',code:error?.code||'SCOPE_DISCOVERY_FAILED',
      message:String(error?.message||error)});
  }finally{running=false;}
});
