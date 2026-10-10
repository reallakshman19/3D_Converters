/**
 * A2 non-publishing integration REHEARSAL. Only writes outside repository.
 * Temp copy of authored docs + source-pinned A3 LFJ closure and UI runtime.
 * Never use this tool to overwrite checked-in docs/lfj or to deploy Pages.
 */
import {cp,mkdir,readFile,rm,stat,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {evaluateClosure,requireComplete} from './indexed-runtime-closure.mjs';

const SELF=fileURLToPath(import.meta.url);
const sha=b=>createHash('sha256').update(b).digest('hex');
const isDescendant=(parent,child)=>{
  const rel=path.relative(parent,child);
  return rel&&rel!=='..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel);
};
const fileOrNull=async p=>{
  try{return await readFile(p);}catch(e){
    if(e.code==='ENOENT'||e.code==='ENOTDIR')return null;
    throw e;
  }
};
const QA_FIXTURES=Object.freeze([
  'Benchmarks/1885Sjson/Sjson.json',
  'Benchmarks/1885Sjson/FirstpassXML',
  'lfj/qualification/experiments/consumer-sparse-b0-xml-match/xml-csv-original.html'
]);

/** Produce disposable, exact-source tested docs-shaped candidate; never ship. */
export async function stageIndexedRuntime({
  repoRoot,stageRoot,entries,witnesses,includeTestFixtures=false,mirrorTabs=true
}={}){
  if(!path.isAbsolute(repoRoot||'')||!path.isAbsolute(stageRoot||''))
    throw TypeError('absolute repoRoot and stageRoot required');
  const root=path.resolve(repoRoot),stage=path.resolve(stageRoot);
  if(root===stage||isDescendant(root,stage)||isDescendant(stage,root))
    throw Error('STAGE_PATH_MUST_BE_OUTSIDE_REPOSITORY');
  try{await stat(stage);throw Error('STAGE_DESTINATION_ALREADY_EXISTS');}
  catch(e){if(e.code!=='ENOENT')throw e;}
  const opts={repoRoot:root,artifact:'root'};
  if(entries!==undefined)opts.entries=entries;
  if(witnesses!==undefined)opts.witnesses=witnesses;
  const graph=requireComplete(await evaluateClosure(opts));
  const sourceManifest=await fileOrNull(path.join(root,'docs/lfj/deployment-manifest.json'));
  let protectedNames=[];
  if(sourceManifest){
    try{protectedNames=JSON.parse(sourceManifest.toString('utf8')).sources||[];}
    catch{throw Error('INVALID_AUTHORED_V41_MANIFEST');}
  }
  await cp(path.join(root,'docs'),stage,{recursive:true,force:false});
  // Existing generator already mirrors source tabs wholesale. Do so in TEMP only.
  if(mirrorTabs){
    await rm(path.join(stage,'tabs'),{recursive:true,force:true});
    await cp(path.join(root,'tabs'),path.join(stage,'tabs'),{recursive:true});
  }
  const overlay=[],collisions=[];
  for(const entry of graph.files){
    const relative=entry.path;
    const before=await fileOrNull(path.join(stage,relative));
    const src=await readFile(path.join(root,relative));
    const prior=before?sha(before):null;
    const now=sha(src);
    if(before&&prior!==now)collisions.push({path:relative,
      priorSha256:prior,sourceSha256:now,
      previouslyOwnedByV41:protectedNames.includes(relative)});
    await mkdir(path.dirname(path.join(stage,relative)),{recursive:true});
    await writeFile(path.join(stage,relative),src);
    overlay.push({path:relative,sha256:now,bytes:src.length,
      prior:before===null?'MISSING':prior===now?'IDENTICAL':'DIVERGENT'});
  }
  if(includeTestFixtures){
    for(const relative of QA_FIXTURES){
      await mkdir(path.dirname(path.join(stage,relative)),{recursive:true});
      await cp(path.join(root,relative),path.join(stage,relative));
    }
  }
  for(const entry of graph.files){
    const deployed=await readFile(path.join(stage,entry.path));
    if(sha(deployed)!==entry.sha256)throw Error('STAGED_BYTES_NOT_SOURCE: '+entry.path);
  }
  const result={schema:'LFJ.A2.DisposableIndexedDocsStage.v1',
    origin:'TEMPORARY_LOCAL_NOT_DEPLOYED',source:'CHECKED_IN_BRANCH_SOURCE',
    root,stage,sourceGraphCount:graph.checkedFiles,
    overlay:overlay.sort((a,b)=>a.path.localeCompare(b.path)),
    collisions:collisions.sort((a,b)=>a.path.localeCompare(b.path)),
    testFixturesIncluded:includeTestFixtures,
    sourceDocsUnchanged:true,publicPagesModified:false};
  await writeFile(path.join(stage,'.lfj-a2-stage-manifest.json'),
    JSON.stringify(result,null,2)+'\n');
  return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===SELF){
  const flag=process.argv.find(a=>a.startsWith('--stage-dir='));
  if(!flag)throw Error('--stage-dir=<absolute disposable path> required');
  const root=path.resolve(path.dirname(SELF),'../..');
  const result=await stageIndexedRuntime({
    repoRoot:root,stageRoot:flag.slice('--stage-dir='.length),
    includeTestFixtures:process.argv.includes('--test-fixtures')
  });
  console.log('A2_DISPOSABLE_DOCS_STAGE '+JSON.stringify({
    ...result,overlay:result.overlay.map(x=>({path:x.path,prior:x.prior}))
  }));
}
