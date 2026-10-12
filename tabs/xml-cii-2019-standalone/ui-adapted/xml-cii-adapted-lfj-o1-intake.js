/**
 * O1/W01: opt-in original-File LFJ Worker admission in the actual standalone JSON
 * input. Source-facts ONLY: no matching, Preview or CSV rights are inferred.
 * Uses the existing R10 Worker and an independent page-batched, durable IndexedDB adapter.
 */
import {openIndexedPageRecordStore} from '../../../lfj/storage/browser/indexed-page-record-store.mjs';
import {SOURCE_WORKER_SCHEMA,O1_SOURCE_MAX_BYTES} from '../../../lfj/ports/source-worker-port.mjs';
import {startLfjO1Domain,exportLfjO1Csv,mountLfjO1DomainUi,revokeLfjO1Domain} from './xml-cii-adapted-lfj-o1-domain-ui.js';

const sessions=new WeakMap();
const error=(code)=>Object.assign(new Error(code),{code});
const safeCode=e=>{
  const code=String(e?.code||e?.message||'LFJ_SOURCE_FAILED').slice(0,100);
  return code==='O1_SOURCE_BYTE_LIMIT'?
    'O1_SOURCE_BYTE_LIMIT (original JSON must be at most 100 MiB / 104857600 bytes)':code;
};
const getSession=ref=>{
  if(!sessions.has(ref))sessions.set(ref,{optIn:false,job:null,status:'Worker indexing is optional; existing path unchanged.'});
  return sessions.get(ref);
};
function status(session,text){
  session.status=text;
  if(session.label)session.label.textContent=text;
}
function deleteDb(name){
  return new Promise(resolve=>{
    if(!name)return resolve();
    const req=indexedDB.deleteDatabase(name);
    req.onsuccess=req.onerror=req.onblocked=()=>resolve();
  });
}
async function revoke(job){
  if(!job)return;
  job.cancelled=true;
  try{job.worker?.terminate();}catch{}
  try{await job.store?.abort();}catch{}
  try{job.store?.close();}catch{}
  await deleteDb(job.databaseName);
}
function validatePage(m,job){
  if(m.schema!==SOURCE_WORKER_SCHEMA||m.jobId!==job.id||
      m.sourceRefId!==job.ref||!Number.isSafeInteger(m.sequence)||
      m.sequence!==job.next||!Array.isArray(m.rows)||!m.rows.length||
      m.rows.length>1024)throw error('LFJ_PAGE_IDENTITY');
  if(!job.basis){
    const row=m.rows[0];
    if(typeof row.sourceSha256!=='string'||!/^[a-f0-9]{64}$/.test(row.sourceSha256)||
        !row.sourceRevision)throw error('LFJ_PAGE_SOURCE_ID');
    job.basis={sourceRefId:job.ref,sourceSha256:row.sourceSha256,sourceRevision:row.sourceRevision};
  }
  if(m.rows.some(row=>row.sourceRefId!==job.ref||
      row.sourceSha256!==job.basis.sourceSha256||
      row.sourceRevision!==job.basis.sourceRevision))
    throw error('LFJ_PAGE_MIXED_SOURCE');
}
async function recordPage(job,m){
  validatePage(m,job);
  if(!job.store)job.store=await openIndexedPageRecordStore({
    databaseName:job.databaseName,namespace:job.ref,generation:job.id,
    basis:job.basis,kind:'source'
  });
  await job.store.stagePage(m.rows);
  if(job.cancelled)throw error('LFJ_SOURCE_SUPERSEDED');
  job.pages++;job.next++;
  job.worker.postMessage({schema:SOURCE_WORKER_SCHEMA,kind:'PAGE_ACK',
    jobId:job.id,sourceRefId:job.ref,sequence:m.sequence});
}
async function finish(job,m){
  const s=m.summary;
  if(m.schema!==SOURCE_WORKER_SCHEMA||m.jobId!==job.id||
      m.sourceRefId!==job.ref||!job.store||
      s?.complete!==true||s.rightsBasis!=='SOURCE_FACTS_ONLY'||
      s.engineeringReady!==false||s.sourceSha256!==job.basis?.sourceSha256||
      s.sourceRevision!==job.basis.sourceRevision||
      s.eventCount!==s.occurrenceCount*2)throw error('LFJ_UNCOMMITTED_SOURCE');
  await job.store.commit(s);
  job.summary=s;
  return s;
}
async function scan(file,session){
  status(session,'LFJ Worker: replacing original source; previous receipt invalid.');
  revokeLfjO1Domain(session);
  const old=session.job;
  session.job=null;
  if(old)await revoke(old);
  if(!(file instanceof File)||!file.size)throw error('LFJ_SOURCE_MISSING');
  // Visible fail-closed policy rejection; prior source/domain/export rights
  // were revoked above before any new job or Worker is admitted.
  if(file.size>O1_SOURCE_MAX_BYTES)throw error('O1_SOURCE_BYTE_LIMIT');
  const uuid=crypto.randomUUID();
  const job={id:uuid,ref:'lfj226-'+uuid,databaseName:'lfj226-source-'+uuid,
    file,worker:null,store:null,basis:null,summary:null,next:0,pages:0,cancelled:false};
  session.job=job;
  status(session,'LFJ Worker: reading original Blob off the UI thread...');
  return await new Promise((resolve,reject)=>{
    let settled=false;
    const settle=(e,v)=>{
      if(settled)return;
      settled=true;clearTimeout(timer);
      if(e)reject(e);else resolve(v);
    };
    const timer=setTimeout(()=>settle(error('LFJ_SOURCE_TIMEOUT')),180000);
    try{
      const worker=new Worker(new URL('../../../lfj/ports/source-browser-worker.mjs',import.meta.url),{type:'module'});
      job.worker=worker;
      worker.onerror=()=>settle(error('LFJ_WORKER_FAILURE'));
      worker.onmessage=async({data:m})=>{
        if(settled||job.cancelled)return;
        try{
          if(m?.kind==='PROVISIONAL_PAGE'){
            await recordPage(job,m);
            if(job.pages===1||job.pages%8===0)
              status(session,'LFJ Worker: '+job.pages+' bounded pages staged (not committed)');
          }else if(m?.kind==='SCAN_DONE'){
            const summary=await finish(job,m);
            worker.terminate();job.worker=null;
            settle(null,summary);
          }else if(m?.kind==='FAILED')settle(error(String(m.code||'LFJ_SCAN_FAILED')));
        }catch(e){settle(e);}
      };
      worker.postMessage({schema:SOURCE_WORKER_SCHEMA,kind:'SCAN',
        jobId:job.id,sourceRefId:job.ref,revision:job.id,blob:file,pageEvents:1024});
    }catch(e){settle(e);}
  }).then(summary=>{
    if(session.job!==job||job.cancelled)throw error('LFJ_SOURCE_SUPERSEDED');
    status(session,'LFJ source index COMMITTED: '+summary.occurrenceCount+
      ' original occurrences; SHA '+summary.sourceSha256.slice(0,12)+
      '. Trace/CSV NOT authorized by this intake.');
    return summary;
  }).catch(async e=>{
    if(session.job===job){session.job=null;status(session,'LFJ Worker FAILED: '+safeCode(e)+'; no trace/export rights.');}
    await revoke(job);
    throw e;
  });
}
export function installLfjO1SourceIntake(container,stateRef){
  const field=container.querySelector('[data-mode-a-staged-json-all], [data-field="staged-json-file"]');
  if(!field)return;
  const session=getSession(stateRef);
  const group=document.createElement('div');
  group.dataset.lfjO1Intake='true';
  group.style.cssText='padding:8px;border:1px solid #475569;margin:8px 0';
  const label=document.createElement('label');
  label.textContent=' O1: Use existing LFJ native Worker source indexing (experimental; no trace/CSV yet)';
  const toggle=document.createElement('input');
  toggle.type='checkbox';toggle.dataset.lfjO1Enable='true';toggle.checked=session.optIn;
  label.prepend(toggle);
  const progress=document.createElement('div');
  progress.dataset.lfjO1Status='true';
  progress.textContent=session.status;
  session.label=progress;
  group.append(label,progress);
  (field.parentElement?.parentElement || field.parentElement)?.appendChild(group);
  toggle.addEventListener('change',()=>{
    session.optIn=toggle.checked;
    if(!toggle.checked){
      revokeLfjO1Domain(session);
      const old=session.job;session.job=null;
      void revoke(old);
      status(session,'LFJ Worker opt-in disabled. No source output was promoted.');
    }
  });
  // Registered before legacy Single / Mode-A handler. Existing default path is unchanged.
  field.addEventListener('change',event=>{
    if(!session.optIn)return;
    event.stopImmediatePropagation();
    const file=event.target.files?.[0];
    if(!file)return;
    void scan(file,session).catch(e=>status(session,'LFJ Worker FAILED: '+safeCode(e)+'; no trace/export rights.'));
  },true);
  // Opt-in is a distinct O1 owned Worker flow. Capture Build/CSV before
  // legacy listeners; never synchronously parse staged JSON in the UI.
  for(const action of ['build-resolver-index','save-resolver-json-config',
    'download-node-wise-trace-csv','download-evidence-tree-csv']){
    container.querySelector('[data-action="'+action+'"]')?.addEventListener('click',e=>{
      if(!session.optIn)return;
      e.preventDefault();e.stopImmediatePropagation();
      if(action==='build-resolver-index'||action==='save-resolver-json-config'){
        void startLfjO1Domain(session,stateRef).catch(err=>
          status(session,'O1 domain blocked: '+safeCode(err)+'; no output rights.'));
      }else{
        const kind=action==='download-node-wise-trace-csv'?'node':'evidence';
        void exportLfjO1Csv(session,kind).catch(err=>
          status(session,'O1 CSV blocked: '+safeCode(err)+'; no output rights.'));
      }
    },true);
  }
  mountLfjO1DomainUi(group,session);
}
