#!/usr/bin/env node
/** LFJ H06 research-only, exact Git HEAD local qualification. No network installs. */
import {createHash} from 'node:crypto';
import {existsSync,createReadStream,readFileSync,statSync,writeFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {dirname,extname,isAbsolute,join,relative,resolve,sep} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync,spawn} from 'node:child_process';
import {createRequire} from 'node:module';

const LABEL='LFJ_LOCAL_EVIDENCE_V1';
const files=[
 ['Benchmarks/1885Sjson/Sjson.json',733806,'6b2c8b01ab0ba6ec8e9e7c42eb4a719668ffd2dc4dbe4790d27cf426a1f60288'],
 ['Benchmarks/1885Sjson/FirstpassXML',144471,'feee5a5a6399207337e63bc56c8afb001fe37ab30c6a7a9283333ec60f6eea38'],
 ['Benchmarks/1885Sjson/ExpectedXML',156060,'9ec2cd0215a69d016f54839ece9965e744834c761f2993d663d0c895b6c1b8d5'],
 ['Benchmarks/1885_NC/1885_NC.json',10232634,'89f9c2ab7a9f1df15c1b9e1e0e30a8ca6c97ef994dcd56aec86c3a90f7d71646'],
 ['Benchmarks/1885_NC/1885_NC.topology.input.xml',1067628,'516f61dce7074dcf55b3c43325612141c1b7c2fb006b6f6b67d07f112f88f8a2']
];
const base='lfj/qualification/experiments/consumer-sparse-b0-xml-match/';
const source=[
 'xml-metamorphic-source-attestation.test.mjs',
 'xml-csv-serializer-boundary.test.mjs',
 'xml-branch-scope-hardening.test.mjs',
 'xml-coordinate-semantic-hardening.test.mjs',
 'xml-semantic-attestor.test.mjs',
 'xml-input-integrity.test.mjs',
 'xml-ledger-census-guard.test.mjs'
];
const golden=['firstpass-source-parity-oracle.mjs','large-authentic-source-parity-oracle.mjs'];
const browser=['xml-semantic-attestor.browser-negative.mjs',
 'xml-coordinate-semantic-hardening.browser-negative.mjs',
 'xml-branch-scope-hardening.browser-negative.mjs'];
const modes=new Set(['source','golden','browser','all']);
function parseArgs(argv){
 const out={mode:'source',head:'',report:''};
 for(const a of argv){
  if(a==='--self-test'){out.selfTest=true;continue;}
  const m=a.match(/^--(expected-head|mode|report)=(.*)$/);
  if(!m)throw new Error('Unknown argument '+a);
  const key=m[1]==='expected-head'?'head':m[1];
  if(out[key]&&key!=='mode')throw new Error('Duplicate argument '+key);
  out[key]=m[2];
 }
 if(!modes.has(out.mode))throw new Error('Invalid --mode');
 if(!out.selfTest&&!/^[0-9a-f]{40}$/.test(out.head))
  throw new Error('Required --expected-head=<40 lowercase hex SHA>');
 return out;
}
const digest=b=>createHash('sha256').update(b).digest('hex');
function selfTest(){
 const checks=[];
 const ok=(name,value)=>{checks.push({name,pass:Boolean(value)});};
 ok('standard SHA vector',digest('abc')==='ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
 ok('CLI source parser',parseArgs(['--mode=source','--expected-head='+'a'.repeat(40)]).head==='a'.repeat(40));
 let rejected=false;try{parseArgs(['--mode=full','--expected-head='+'a'.repeat(40)]);}catch{rejected=true;}
 ok('unknown mode rejected',rejected);
 rejected=false;try{parseArgs(['--mode=source']);}catch{rejected=true;}
 ok('missing exact HEAD rejected',rejected);
 ok('authentic fixture census pinned',files.length===5&&files.every(x=>/^[a-f0-9]{64}$/.test(x[2])));
 const pass=checks.every(x=>x.pass);
 console.log(JSON.stringify({schema:'LFJ_H06_SELFTEST_V1',node:process.version,pass,checks},null,2));
 return pass?0:1;
}
const now=()=>new Date().toISOString();
function record(name,status,details={}){return {name,status,...details};}
function git(root,...args){return execFileSync('git',args,{cwd:root,encoding:'utf8',timeout:20000}).trim();}
function capturePreflight(root,head){
 const checks=[];
 try{
  const actual=git(root,'rev-parse','HEAD');
  checks.push(record('exact_git_head',actual===head?'PASS':'FAIL',{actual,expected:head}));
  const tracked=git(root,'status','--porcelain','--untracked-files=no');
  checks.push(record('tracked_worktree_clean',tracked?'FAIL':'PASS',{dirty:tracked.slice(0,400)}));
 }catch(e){checks.push(record('git_checkout','BLOCKED',{message:String(e.message).slice(0,500)}));}
 for(const [path,bytes,sha] of files){
  const file=join(root,path);
  if(!existsSync(file)){checks.push(record('fixture:'+path,'BLOCKED',{reason:'missing original fixture'}));continue;}
  const value=readFileSync(file);
  const found=digest(value);
  checks.push(record('fixture:'+path,value.length===bytes&&found===sha?'PASS':'FAIL',
   {bytes:value.length,expectedBytes:bytes,sha256:found,expectedSha256:sha}));
 }
 return checks;
}
async function call(name,cmd,args,root,env=process.env,ms=360000){
 const started=Date.now();
 if(args.some(a=>a.startsWith(base)&&!existsSync(join(root,a))))
  return record(name,'BLOCKED',{reason:'required tracked test missing'});
 return await new Promise(done=>{
  const child=spawn(cmd,args,{cwd:root,env:{...env},stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='',settled=false;
  const finish=(status,details={})=>{if(settled)return;settled=true;clearTimeout(timer);
   done(record(name,status,{durationMs:Date.now()-started,
    stdoutTail:stdout.slice(-5500),stderrTail:stderr.slice(-3500),...details}));};
  const timer=setTimeout(()=>{child.kill('SIGKILL');finish('FAIL',{reason:'timeout'});},ms);
  child.stdout.on('data',b=>{stdout=(stdout+b.toString()).slice(-12000)});
  child.stderr.on('data',b=>{stderr=(stderr+b.toString()).slice(-10000)});
  child.on('error',e=>finish('BLOCKED',{reason:'spawn failed: '+e.message}));
  child.on('close',(code,signal)=>finish(code===0?'PASS':'FAIL',{exitCode:code,signal}));
 });
}
function makeServer(root){
 const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
  '.js':'text/javascript; charset=utf-8','.json':'application/json',
  '.xml':'application/xml','.css':'text/css'};
 return createServer((req,res)=>{
  try{
   const decoded=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
   const file=resolve(root,'.'+decoded),rel=relative(root,file);
   if(rel.startsWith('..'+sep)||rel==='..'||isAbsolute(rel)){
    res.writeHead(403).end();return;
   }
   const st=statSync(file);
   if(!st.isFile()){res.writeHead(404).end();return;}
   res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream',
    'Content-Length':st.size,'Cache-Control':'no-store'});
   createReadStream(file).pipe(res);
  }catch{res.writeHead(404).end();}
 });
}
async function browserPreflight(root){
 try{
  const require=createRequire(join(root,'package.json'));
  const p=require('playwright');
  const executable=p.chromium.executablePath();
  if(!existsSync(executable))return 'Chromium executable missing: '+executable;
  return '';
 }catch(e){return 'Existing local Playwright/Chromium unavailable: '+e.message.slice(0,230);}
}
async function main(){
 let options;
 try{options=parseArgs(process.argv.slice(2));}catch(e){console.error(e.message);return 2;}
 if(options.selfTest)return selfTest();
 const root=resolve(process.cwd());
 const reportPath=options.report?resolve(options.report):join(tmpdir(),'lfj-local-'+options.head+'-'+options.mode+'.json');
 if(relative(root,reportPath)!==''&&!relative(root,reportPath).startsWith('..')){
  console.error('Report path must be outside tracked worktree');return 2;
 }
 const report={schema:LABEL,generatedAt:now(),mode:options.mode,expectedHead:options.head,
  environment:{node:process.version,platform:process.platform,cwd:root},
  claims:{githubCiPassed:false,independentOracleAccepted:false,
   engineeringReady:false,downloadAuthorized:false,appWired:false},
  preflight:[],tests:[],qualification:'NOT_RUN'};
 const write=()=>{writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n');
  console.log('LOCAL_EVIDENCE_REPORT '+reportPath);};
 try{
  report.preflight=capturePreflight(root,options.head);
  if(report.preflight.some(x=>x.status!=='PASS')){
   report.qualification='BLOCKED_OR_INVALID_SOURCE';write();return 1;
  }
  if(Number(process.versions.node.split('.')[0])<22){
   report.tests.push(record('node_version','BLOCKED',{reason:'Node >=22 required'}));
   report.qualification='BLOCKED';write();return 1;
  }
  if(options.mode==='source'||options.mode==='all'){
   for(const file of source){
    const entry=base+file;
    const args=file==='xml-ledger-census-guard.test.mjs'?[entry]:['--test',entry];
    report.tests.push(await call('source:'+file,process.execPath,args,root));
   }
  }
  if(options.mode==='golden'||options.mode==='all'){
   for(const file of golden)
    report.tests.push(await call('golden:'+file,process.execPath,
     ['--max-old-space-size=2048',base+file],root,process.env,900000));
  }
  if(options.mode==='browser'||options.mode==='all'){
   const reason=await browserPreflight(root);
   if(reason){report.tests.push(record('browser_prerequisites','BLOCKED',{reason}));}
   else{
    const server=makeServer(root);
    try{
     await new Promise((ok,bad)=>{server.once('error',bad);server.listen(4200,'127.0.0.1',ok);});
     for(const file of browser)
      report.tests.push(await call('browser_negative:'+file,process.execPath,
       [base+file],root,process.env,1200000));
     for(const [size,mode] of [['SMALL','AUTHENTIC'],['SMALL','SOURCE_DERIVED_CONTROL'],
       ['LARGE','AUTHENTIC'],['LARGE','SOURCE_DERIVED_CONTROL'],['FIRSTPASS','AUTHENTIC']]){
      report.tests.push(await call('browser_golden:'+size+':'+mode,process.execPath,
       [base+'real-xml-csv-oracle.mjs'],root,
       {...process.env,B0_SIZE:size,B0_XML_MODE:mode},1800000));
     }
    }catch(e){report.tests.push(record('browser_server','BLOCKED',{reason:String(e)}));}
    finally{server.close();}
   }
  }
  report.qualification=report.tests.length&&report.tests.every(x=>x.status==='PASS')?
   (options.mode==='all'?'LOCAL_FULL_PASS':'LOCAL_'+options.mode.toUpperCase()+'_PASS'):
   report.tests.some(x=>x.status==='FAIL')?'LOCAL_TEST_FAILURE':'LOCAL_INCOMPLETE';
  write();return report.qualification.endsWith('_PASS')?0:1;
 }catch(e){report.tests.push(record('runner_internal','FAIL',{reason:String(e.stack||e)}));
  report.qualification='RUNNER_FAILURE';write();return 1;}
}
process.exitCode=await main();
