/** XML229 WP1 exact-head evidence runner; does not change engineering state.
 * Requires: checkout, Node 22+, playwright and installed Chromium.
 * EXACT_HEAD=<PR commit SHA> node scripts/verify-xml229-topology-workspace-wp1.mjs */
import {spawnSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const sha=value=>createHash('sha256').update(value).digest('hex');
const invoke=(cmd,args,extra={})=>{
  const result=spawnSync(cmd,args,{cwd:root,encoding:'utf8',timeout:480000,
    maxBuffer:64*1024*1024,...extra});
  return {command:[cmd,...args].join(' '),exitCode:result.status??-1,
    stdout:result.stdout||'',stderr:(result.stderr||'')+
      (result.error?String(result.error):'')};
};
const head=invoke('git',['rev-parse','HEAD']);
if(head.exitCode!==0)throw Error('WP1_REQUIRES_GIT_CHECKOUT');
const exactHead=head.stdout.trim();
const expected=process.env.EXACT_HEAD||'';
if(!expected||exactHead!==expected)
  throw Error('EXACT_HEAD_REQUIRED_OR_MISMATCH expected='+expected+' actual='+exactHead);
const outputDir=path.join(root,'ValidationRecords','xml229-wp1-exact-head',exactHead);
await mkdir(outputDir,{recursive:true});
const pairs=['topology-workspace.html',
  'tabs/topology-workspace/occurrence-scene.mjs',
  'tabs/topology-workspace/projected-canvas.mjs',
  'tabs/topology-workspace/workspace-app.mjs',
  'tabs/topology-workspace/workspace.css'];
const mirrors=[];
for(const file of pairs){
  const [source,served]=await Promise.all([
    readFile(path.join(root,file)),readFile(path.join(root,'docs',file))]);
  mirrors.push({file,sha256:sha(source),sameBytes:source.equals(served)});
}
const commands=[
  ['baseline','node',['--experimental-vm-modules','--test',
    'tests/xml229-topology-only-engine.test.mjs']],
  ['wp1-unit','node',['--test',
    'tests/xml229-topology-workspace-wp1.test.mjs',
    'tests/xml229-topology-workspace-controller.test.mjs']],
  ['wp1-browser','node',['tests/xml229-topology-workspace-wp1-browser.mjs']],
];
const checks=[];
for(const [name,cmd,args] of commands){
  const result=invoke(cmd,args,{env:{...process.env,
    XML229_WP1_EVIDENCE_DIR:path.join(outputDir,'screenshots')}});
  await writeFile(path.join(outputDir,name+'.stdout.log'),result.stdout);
  await writeFile(path.join(outputDir,name+'.stderr.log'),result.stderr);
  checks.push({name,command:result.command,exitCode:result.exitCode,
    stdoutSha256:sha(result.stdout),stderrSha256:sha(result.stderr)});
  console.log(name+': exit='+result.exitCode+' stdout_sha256='+sha(result.stdout));
}
const passed=mirrors.every(m=>m.sameBytes)&&checks.every(c=>c.exitCode===0);
const manifest={
  schema:'XML229.WP1.ExactHeadEvidence.v1',head:exactHead,expectedHead:expected,
  inspectionOnly:true,masterContextSupplied:false,acceptedFinalSupplied:false,
  mirrorChecks:mirrors,checks,status:passed?'PASS':'FAIL',
  qualification:'Only a complete real checkout and Chromium/Pyodide PASS establish WP1',
};
await writeFile(path.join(outputDir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({status:manifest.status,head:exactHead,
  report:path.relative(root,path.join(outputDir,'manifest.json'))},null,2));
if(!passed)process.exitCode=1;
