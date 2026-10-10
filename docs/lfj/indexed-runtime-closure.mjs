/**
 * A2 preflight for the checked-in A3 indexed Resolver module graph.
 * READ-ONLY: neither source nor docs is modified. It is not a claim about
 * a public Pages URL, a compiled deploy artifact, or unrelated app modules.
 */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const THIS_FILE=fileURLToPath(import.meta.url);
export const A3_RUNTIME_ENTRIES=Object.freeze([
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-lfj-indexed-preview.js',
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-lfj-indexed-export.js',
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-lfj-sha.worker.mjs',
  // Scope discovery is a distinct native Worker graph, not reached through
  // earlier preflight witnesses or the legacy indexed-preview entry.
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-lfj-scope-discovery.js',
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-lfj-scope-discovery.worker.mjs'
]);
export const A3_INTEGRATION_WITNESSES=Object.freeze([
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js',
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-json-trace.js',
  'tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-scope.js'
]);
const sha=b=>createHash('sha256').update(b).digest('hex');
const uniqueSorted=a=>[...new Set(a)].sort();
const isInside=(root,p)=>{
  const rel=path.relative(root,p);
  return rel!==''&&!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel);
};
const isScript=p=>/\.(?:js|mjs|cjs)$/i.test(p);
const stripSuffix=s=>s.split(/[?#]/,1)[0];

/** Scan literal browser ESM import/export and Worker asset URLs. */
export function scanLiteralEdges(text){
  const edges=[];
  const unresolved=[];
  const lines=text.split('\n');
  // ESM declarations may cross multiple lines. Avoid scanning function exports.
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    if(!/^\s*(?:import|export)\s/.test(line)||/^\s*export\s+(?:const|let|var|function|class|default|async)\b/.test(line))continue;
    if(/^\s*import\s*\(/.test(line))continue;
    const snippet=lines.slice(i,i+16).join('\n').split(';')[0].slice(0,1800);
    if(/^\s*export\s*\{/.test(line)&&!/\bfrom\b/.test(snippet))continue;
    const side=/^\s*import\s*['"]([^'"]+)['"]/.exec(snippet);
    const from=/\bfrom\s*['"]([^'"]+)['"]/.exec(snippet);
    if(side||from)edges.push((side||from)[1]);
    else unresolved.push('unparsed ESM declaration at line '+(i+1));
  }
  for(const m of text.matchAll(/\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g))edges.push(m[2]);
  // Variable-based dynamic imports cannot be attested from a source graph.
  for(const m of text.matchAll(/\bimport\s*\(\s*(?!['"])/g))unresolved.push('nonliteral dynamic import at offset '+m.index);
  for(const m of text.matchAll(/\bnew\s+URL\s*\(\s*(['"])([^'"]+)\1\s*,\s*import\.meta\.url\s*\)/g))edges.push(m[2]);
  return {edges:uniqueSorted(edges),unresolved:uniqueSorted(unresolved)};
}

async function readOrNull(p){try{return await readFile(p);}catch(e){if(e.code==='ENOENT'||e.code==='ENOTDIR')return null;throw e;}}
function reference(from,spec){
  // Treat external bare package imports as provider dependencies, not local files.
  if(!spec.startsWith('.')&&!spec.startsWith('/'))return {external:spec};
  const clean=stripSuffix(spec);
  if(!clean)return {error:'empty import after stripping query: '+spec};
  const dir=path.posix.dirname(from);
  const to=spec.startsWith('/')?path.posix.normalize(clean.slice(1)):
    path.posix.normalize(path.posix.join(dir,clean));
  if(!to||to==='.'||to==='..'||to.startsWith('../')||path.posix.isAbsolute(to))
    return {error:'dependency escapes application root: '+from+' -> '+spec};
  return {path:to};
}

/** Deterministic repository-level A3 runtime subset, NOT full app runtime closure. */
export async function evaluateClosure({repoRoot,artifact='docs',entries=A3_RUNTIME_ENTRIES,
  witnesses=A3_INTEGRATION_WITNESSES,maxFiles=400}={}){
  if(!['root','docs'].includes(artifact))throw new TypeError('artifact must be root or docs');
  if(typeof repoRoot!=='string'||!path.isAbsolute(repoRoot))throw new TypeError('absolute repoRoot required');
  const root=path.resolve(repoRoot);
  const target=artifact==='root'?root:path.join(root,'docs');
  const queue=uniqueSorted([...entries,...witnesses]);
  const visited=new Set(),all=[],edges=[],missingSource=[],missingArtifact=[],diverged=[],unresolved=[],external=[];
  const nonRecursive=new Set(witnesses);
  while(queue.length){
    const relative=queue.shift();
    if(visited.has(relative))continue;
    if(visited.size>=maxFiles){unresolved.push('maxFiles exceeded: '+maxFiles);break;}
    visited.add(relative);
    const src=path.resolve(root,relative);
    const dst=path.resolve(target,relative);
    if(!isInside(root,src)||!isInside(target,dst)){
      unresolved.push('path escapes source or target root: '+relative);continue;
    }
    const sourceBytes=await readOrNull(src);
    if(sourceBytes===null){missingSource.push(relative);continue;}
    const candidate=await readOrNull(dst);
    if(candidate===null)missingArtifact.push(relative);
    else if(sha(candidate)!==sha(sourceBytes))diverged.push(relative);
    all.push({path:relative,sha256:sha(sourceBytes),bytes:sourceBytes.length,kind:nonRecursive.has(relative)?'witness':'dependency'});
    if(!isScript(relative)||nonRecursive.has(relative))continue;
    const imports=scanLiteralEdges(sourceBytes.toString('utf8'));
    unresolved.push(...imports.unresolved.map(x=>relative+': '+x));
    for(const spec of imports.edges){
      const dep=reference(relative,spec);
      if(dep.error){unresolved.push(dep.error);continue;}
      if(dep.external){external.push(dep.external);continue;}
      edges.push({from:relative,to:dep.path});
      if(!visited.has(dep.path)&&!queue.includes(dep.path))queue.push(dep.path);
    }
    queue.sort();
  }
  const result={schema:'LFJ.A2.IndexedRuntimeClosurePreflight.v1',
    scope:'A3_INDEXED_MODULES_AND_UI_WITNESSES_ONLY',origin:'CHECKED_IN_TREE_NOT_PUBLIC_SITE',
    artifact,files:all.sort((a,b)=>a.path.localeCompare(b.path)),
    edges:edges.sort((a,b)=>(a.from+' '+a.to).localeCompare(b.from+' '+b.to)),
    externalImports:uniqueSorted(external),missingSource:uniqueSorted(missingSource),
    missingArtifact:uniqueSorted(missingArtifact),divergedArtifact:uniqueSorted(diverged),
    unresolved:uniqueSorted(unresolved)};
  result.checkedFiles=result.files.length;
  result.complete=!result.missingSource.length&&!result.missingArtifact.length&&
    !result.divergedArtifact.length&&!result.unresolved.length;
  return result;
}

export function requireComplete(result){
  if(!result?.complete)throw Object.assign(new Error(
    'CLOSURE_INCOMPLETE: missingSource='+(result.missingSource?.length||0)+
    ' missingArtifact='+(result.missingArtifact?.length||0)+
    ' diverged='+(result.divergedArtifact?.length||0)+
    ' unresolved='+(result.unresolved?.length||0)),
    {code:'CLOSURE_INCOMPLETE'});
  return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===THIS_FILE){
  const artifact=process.argv.includes('--artifact=root')?'root':'docs';
  const repoRoot=path.resolve(path.dirname(THIS_FILE),'../..');
  const result=await evaluateClosure({repoRoot,artifact});
  console.log(JSON.stringify(result,null,2));
  if(process.argv.includes('--require-complete'))requireComplete(result);
}
