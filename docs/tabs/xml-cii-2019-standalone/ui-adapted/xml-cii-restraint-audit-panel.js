import {createElement,downloadTextFile} from './xml-cii-adapted-dom.js';
import {restraintAuditRows,restraintAuditCoverageRows,restraintAuditCsv,restraintAuditHtml} from '../xml-cii-restraint-audit-export.js';
import {digestUtf8} from '../../../contracts/gc-pw-v1/contract.mjs';
import {getXml229VerifiedEngineeringEntry} from '../integration/xml229-engineering-basis-authority.mjs';
import {captureXml229NativeRunContext} from './xml229-native-run-context.mjs';
import {readXml229NativeFinalObservation} from '../integration/xml229-native-final-observation.mjs';

export function restraintAuditFromResult(result) {
  if(result?.restraintAudit)return result.restraintAudit;
  if(result?.xml229NativeOutput?.restraintAudit)return result.xml229NativeOutput.restraintAudit;
  const stage=result?.diagnostics?.restraintClosureAudit;
  return stage?{schema:'XML229.RestraintAuditResult.v1',status:'XML_RECORDED',
    scope:'compatibility closure stage only; complete original-source/CII proof not recorded',
    privateOwnerLocalOnly:true,recorded:stage,records:stage.records}:null;
}

const snapshot=state=>({source:state.sourceText,file:state.sourceFile,json:state.stagedJsonText,
  jsonFile:state.stagedJsonFile,config:state.supportConfigJson,options:JSON.stringify(state.options||{}),result:state.result});
const same=(a,b)=>Object.keys(a).every(k=>a[k]===b[k]);

export async function currentRestraintAudit(stateRef,report) {
  const state=stateRef.current,initial=snapshot(state);
  const saved=restraintAuditFromResult(state.result);
  if(saved!==report&&saved?.recorded!==report.recorded)return false;
  if(!report.run)return report.status==='XML_RECORDED'&&same(initial,snapshot(stateRef.current));
  const session=getXml229VerifiedEngineeringEntry(stateRef)?.session;
  const context=captureXml229NativeRunContext({stateRef,session,
    liveWorker:()=>getXml229VerifiedEngineeringEntry(stateRef)?.session});
  if(!context?.isCurrent())return false;
  const observation=await readXml229NativeFinalObservation(session,context.isCurrent);
  if(observation.stale||observation.completion?.basisId!==report.run.basisId||
    observation.finalIntent?.intentSha256!==report.run.finalIntentSha256)return false;
  if(report.output?.ciiSha256&&await digestUtf8(state.result.ciiText||'')!==report.output.ciiSha256)return false;
  return context.isCurrent()&&same(initial,snapshot(stateRef.current));
}

function renderRows(parent,rows) {
  parent.replaceChildren();
  const table=createElement('table','','model-converters-workflow-table'),head=createElement('tr');
  for(const label of ['Node','Source member','Field','Before','Enriched XML','CII value','CII address','Status'])
    head.appendChild(createElement('th',label));
  table.appendChild(head);
  for(const row of rows.slice(0,200)) {
    const tr=createElement('tr');
    for(const cell of [row.node,row.source,row.field,row.before,row.after,row.actual,
      row.ciiBlock?`Block ${row.ciiBlock}, slot ${row.ciiSlot}, line ${row.ciiLine}`:'not verified',row.status])
      tr.appendChild(createElement('td',cell==null?'—':String(cell)));
    const detail=createElement('details'),summary=createElement('summary','Source and rule');
    detail.append(summary,createElement('pre',JSON.stringify(row,null,2)));
    tr.children[1].appendChild(detail);table.appendChild(tr);
  }
  const scroll=createElement('div','','model-converters-workflow-table-wrap');
  scroll.style.overflowX='auto';scroll.appendChild(table);
  parent.append(createElement('p',`Showing ${Math.min(rows.length,200)} of ${rows.length} field records. Downloads include all records.`),scroll);
}

const currencyMessage=check=>`${check.code}${check.changed?.length?': '+check.changed.join(', '):''}${check.reason?' — '+check.reason:''}`;

function downloadButton(panel,label,kind,report,stateRef,status,initial,isCurrentAudit,inspectCurrency) {
  const button=createElement('button',label);button.type='button';
  button.dataset.action='download-restraint-audit-'+kind;
  button.addEventListener('click',async()=>{
    button.disabled=true;
    try {
      if(!same(initial,snapshot(stateRef.current)))throw new Error('STALE_PANEL: inputs changed after rendering');
      const check=inspectCurrency?await inspectCurrency(stateRef,report):{current:await isCurrentAudit(stateRef,report),code:'STALE_CURRENT_REVIEW'};
      if(!check.current)throw new Error(currencyMessage(check));
      const text=kind==='json'?JSON.stringify(report,null,2):kind==='csv'?restraintAuditCsv(report):restraintAuditHtml(report);
      const mime=kind==='json'?'application/json;charset=utf-8':kind==='csv'?'text/csv;charset=utf-8':'text/html;charset=utf-8';
      downloadTextFile('xml-cii-restraint-audit.'+kind,text,mime);
      status.textContent='Audit downloaded for the recorded conversion.';
    }catch(error){status.textContent='Audit is stale or unavailable: '+String(error.message)+'. Current-audit download blocked. Recorded field matches do not verify source completeness.';}
    finally{button.disabled=false;}
  });
  panel.appendChild(button);
}

function diagnosticButton(panel,stateRef,report,status,inspectCurrency) {
  const button=createElement('button','Download recorded diagnostic JSON');button.type='button';
  button.dataset.action='download-recorded-audit-diagnostic';
  button.addEventListener('click',async()=>{
    button.disabled=true;
    try {
      const currency=await inspectCurrency(stateRef,report);
      const payload={schema:'XMLCII.RecordedAuditDiagnostic.v1',diagnosticOnly:true,status:'RECORDED_DIAGNOSTIC',
        warning:'Recorded evidence only. This download does not certify current inputs, complete transfer or engineering acceptance.',
        currency,recordedReport:report};
      downloadTextFile('xml-cii-recorded-audit-diagnostic.json',JSON.stringify(payload,null,2),'application/json;charset=utf-8');
      status.textContent='Recorded diagnostic downloaded. Currency: '+currencyMessage(currency)+'.';
    }catch(error){status.textContent='Diagnostic download failed: '+String(error.message);}
    finally{button.disabled=false;}
  });
  panel.appendChild(button);
}

function coverageSummary(panel,report) {
  if(!report.coverage)return;
  const {summary,status}=report.coverage;
  panel.appendChild(createElement('p',`Source coverage: ${status}. ${summary.supportOccurrences} source support occurrences; ${summary.accounted} accounted; ${summary.missing} missing restraints; ${summary.unresolved} unresolved; ${summary.disabled} disabled. See Source coverage rows and diagnostics.`));
  panel.appendChild(createElement('p','CII field verification checks recorded restraints only. Source coverage checks the original JSON independently against the consumed run policy.'));
}

export function renderRestraintAuditPanel(parent,{stateRef,isCurrentAudit=currentRestraintAudit,inspectCurrency=null}) {
  const panel=createElement('section'),title=createElement('h3','Restraint enrichment audit');
  panel.dataset.restraintAudit='true';panel.appendChild(title);parent.appendChild(panel);
  const report=restraintAuditFromResult(stateRef.current.result);
  if(!report||report.status==='NOT_RECORDED') {
    panel.appendChild(createElement('p','No saved restraint decisions for this run. Rebuild Preview/Final and run again to record the audit.'));
    return;
  }
  const status=createElement('p',`Saved run status: ${report.status}. ${report.scope||'Source XML/JSON restraints'}.`);
  status.setAttribute('role','status');panel.appendChild(status);
  if(report.summary)panel.appendChild(createElement('p',
    `${report.summary.verified} of ${report.summary.recorded} recorded restraints verified; ${report.summary.failed} failed. CII field agreement only.`));
  coverageSummary(panel,report);
  for(const error of report.errors||[])panel.appendChild(createElement('p',error.code||'Audit verification failed.'));
  const initial=snapshot(stateRef.current);
  const inspect=inspectCurrency|| (async(ref,saved)=>({current:await isCurrentAudit(ref,saved),code:'STALE_CURRENT_REVIEW'}));
  inspect(stateRef,report).then(check=>{
    if(same(initial,snapshot(stateRef.current))&&!check.current)
      status.textContent='STALE — '+currencyMessage(check)+'. Recorded field matches are historical; use the diagnostic download to investigate.';
  }).catch(()=>{status.textContent='Audit currency could not be verified.';});
  panel.appendChild(createElement('p','Saved source → rule → XML → CII evidence. Audit downloads contain private selected source values.'));
  for(const [kind,label] of [['json','Download audit JSON'],['csv','Download audit CSV'],['html','Download readable audit']])
    downloadButton(panel,label,kind,report,stateRef,status,initial,isCurrentAudit,inspectCurrency);
  if(inspectCurrency)diagnosticButton(panel,stateRef,report,status,inspectCurrency);
  const search=createElement('input');search.type='search';search.placeholder='Search node, source member, field or rule';
  search.setAttribute('aria-label','Search restraint audit');panel.appendChild(search);
  const body=createElement('div'),rows=[...restraintAuditCoverageRows(report),...restraintAuditRows(report)];panel.appendChild(body);
  const update=()=>{const query=search.value?.trim().toLowerCase()||'';
    renderRows(body,query?rows.filter(row=>JSON.stringify(row).toLowerCase().includes(query)):rows);};
  search.addEventListener('input',update);update();
}
