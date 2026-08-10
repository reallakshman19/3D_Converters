import {
  EMPIRICAL_WEIGHT_MODEL,
  createEmpiricalWeightEstimator,
} from '../converters/empirical-weight/index.js';
import {
  cloneEmpiricalWeightModel,
  createEmpiricalWeightTuningSession,
  validateEmpiricalWeightTuningModel,
} from '../converters/empirical-weight/empirical-weight-tuning.js';

const DRAFT_KEY = 'format-converters.empirical-weight-tuning-draft.v1';

function ensureStylesheet(){if(document.querySelector('link[data-engineering-masters-style="true"]'))return;const link=document.createElement('link');link.rel='stylesheet';link.href='./tabs/engineering-masters.css?v=engineering-1';link.dataset.engineeringMastersStyle='true';document.head.appendChild(link);}
function esc(value){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');}
function saveText(name,text){const blob=new Blob([text],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),0);}
function loadDraft(){try{const raw=localStorage.getItem(DRAFT_KEY);return raw?JSON.parse(raw):null;}catch{return null;}}
function pct(value){return Number.isFinite(Number(value))?`${(Number(value)*100).toFixed(2)}%`:'—';}
function familyOptions(model){const set=new Set((model.approach1?.models||[]).map(row=>row.typeDesc));return [...set].sort((a,b)=>a.localeCompare(b));}
function stackRows(model,target){return Object.entries(model.approach2?.stackWeights?.[target]||{}).map(([typeDesc,weights])=>({typeDesc,weights}));}
function a1Rows(model,target,typeDesc){return(model.approach1?.models||[]).filter(row=>(!target||row.target===target)&&(!typeDesc||row.typeDesc===typeDesc));}

export function renderEmpiricalWeightTuningTab(container,{context=null,emit}={}){
  ensureStylesheet();
  const stored=loadDraft();
  const active=EMPIRICAL_WEIGHT_MODEL;
  let session=createEmpiricalWeightTuningSession(active);
  if(stored?.model)session.replace(stored.model);
  let view='overview';
  let target=context?.target||'RF/RTJ KG';
  let family=context?.typeDesc||'Flanged Gate Valve';
  let previewRating=Number(context?.rating??300);
  let previewNs=Number(context?.ns??4);

  function candidate(){return session.snapshot();}
  function validation(){return session.validation();}
  function activeValidation(){return validateEmpiricalWeightTuningModel(active);}
  function replaceModel(model){session.replace(model);}
  function preview(){
    const input={typeDesc:family,target,rating:previewRating,ns:previewNs};
    try{
      const activeResult=createEmpiricalWeightEstimator({model:active}).approach2(input);
      const candidateResult=createEmpiricalWeightEstimator({model:candidate()}).approach2(input);
      return{input,active:activeResult,candidate:candidateResult,deltaKg:activeResult.ok&&candidateResult.ok?candidateResult.weightKg-activeResult.weightKg:null,deltaPct:activeResult.ok&&candidateResult.ok&&activeResult.weightKg?candidateResult.weightKg/activeResult.weightKg-1:null};
    }catch(error){return{input,error:String(error?.message||error)};}
  }

  function navHtml(){return[['overview','Overview'],['approach1','Approach 1'],['approach2','Approach 2'],['preview','Preview'],['validation','Validation']].map(([id,label])=>`<button class="engineering-master-nav-btn ${view===id?'is-active':''}" data-view="${id}">${esc(label)}</button>`).join('');}
  function metricsHtml(model){const a1=model.approach1?.validation||{},a2=model.approach2?.validation||{};return`<div class="engineering-master-grid"><div class="engineering-master-card"><h3>A1 RF/RTJ MAPE</h3><div class="engineering-master-metric">${pct(a1['RF/RTJ KG']?.mape)}</div></div><div class="engineering-master-card"><h3>A2 RF/RTJ MAPE</h3><div class="engineering-master-metric">${pct(a2['RF/RTJ KG']?.mape)}</div></div><div class="engineering-master-card"><h3>A1 BW MAPE</h3><div class="engineering-master-metric">${pct(a1['BW KG']?.mape)}</div></div><div class="engineering-master-card"><h3>A2 BW MAPE</h3><div class="engineering-master-metric">${pct(a2['BW KG']?.mape)}</div></div></div>`;}

  function overviewHtml(){const v=validation(),m=candidate();return`${metricsHtml(m)}<div class="engineering-master-grid"><div class="engineering-master-card"><h3>Approach 1 rows</h3><div class="engineering-master-metric">${m.approach1?.models?.length||0}</div></div><div class="engineering-master-card"><h3>Stack rows</h3><div class="engineering-master-metric">${v.stats.approach2StackRows||0}</div></div><div class="engineering-master-card"><h3>Tunable constants</h3><div class="engineering-master-metric">${v.stats.approach2Constants||0}</div></div><div class="engineering-master-card"><h3>Candidate validation</h3><div class="engineering-master-metric">${v.ok?'PASS':'BLOCKED'}</div><div class="engineering-master-muted">${v.errors.length} errors · ${v.warnings.length} warnings</div></div></div><div class="engineering-master-banner warn">Published validation metrics above belong to the frozen active model. Candidate edits must be benchmarked before any production publication; previewing one estimate is not a replacement for requalification.</div>`;}

  function approach2Html(){const model=candidate();const rows=stackRows(model,target);return`<div class="engineering-master-banner warn">Edit candidate constants and stack weights. Production exports continue using the frozen active model until a reviewed model file is published.</div><h3>Constants</h3><div class="engineering-master-table-wrap"><table class="engineering-master-table"><thead><tr><th>Constant</th><th>Value</th></tr></thead><tbody>${Object.entries(model.approach2?.constants||{}).map(([name,value])=>`<tr><td>${esc(name)}</td><td><input class="engineering-master-input" type="number" step="any" data-constant="${esc(name)}" value="${esc(value)}"></td></tr>`).join('')}</tbody></table></div><h3>Stack weights · ${esc(target)}</h3><div class="engineering-master-table-wrap"><table class="engineering-master-table"><thead><tr><th>Family</th><th>A1 prior</th><th>Collaborative ratio</th><th>Cross-ratio matrix</th><th>Sum</th></tr></thead><tbody>${rows.map(({typeDesc,weights})=>`<tr><td>${esc(typeDesc)}</td>${weights.map((w,i)=>`<td><input class="engineering-master-input" type="number" min="0" max="1" step="0.01" data-stack-family="${esc(typeDesc)}" data-stack-index="${i}" value="${esc(w)}"></td>`).join('')}<td>${weights.reduce((a,b)=>a+Number(b),0).toFixed(3)}</td></tr>`).join('')}</tbody></table></div>`;}

  function approach1Html(){const rows=a1Rows(candidate(),target,family);return`<div class="engineering-master-banner">Approach 1 coefficients are directly tunable in the candidate. Band/range boundaries remain visible and unchanged in this first editor pass.</div><div class="engineering-master-table-wrap"><table class="engineering-master-table"><thead><tr><th>Target</th><th>Family</th><th>Rating</th><th>Band</th><th>NS range</th><th>Model</th><th>a</th><th>b</th><th>c</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${esc(row.target)}</td><td>${esc(row.typeDesc)}</td><td>${esc(row.rating)}</td><td>${esc(row.band)}</td><td>${esc(row.nsMin)}–${esc(row.nsMax)}</td><td>${esc(row.model)}</td>${['a','b','c'].map(key=>`<td><input class="engineering-master-input" type="number" step="any" data-a1-key="${key}" data-a1-target="${esc(row.target)}" data-a1-family="${esc(row.typeDesc)}" data-a1-rating="${esc(row.rating)}" data-a1-band="${esc(row.band)}" value="${row[key]==null?'':esc(row[key])}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;}

  function previewHtml(){const result=preview();return`<div class="engineering-master-preview"><div class="engineering-master-card"><h3>Estimate context</h3><label>Target <select class="engineering-master-select" data-preview="target"><option ${target==='RF/RTJ KG'?'selected':''}>RF/RTJ KG</option><option ${target==='BW KG'?'selected':''}>BW KG</option></select></label><br><br><label>Family <select class="engineering-master-select" data-preview="family">${familyOptions(candidate()).map(name=>`<option value="${esc(name)}" ${name===family?'selected':''}>${esc(name)}</option>`).join('')}</select></label><br><br><label>Rating <input class="engineering-master-input" type="number" data-preview="rating" value="${esc(previewRating)}"></label><br><br><label>NS <input class="engineering-master-input" type="number" step="0.25" data-preview="ns" value="${esc(previewNs)}"></label></div><div class="engineering-master-card"><h3>Active vs candidate Approach 2</h3>${result.deltaPct==null?'':`<div class="engineering-master-banner">Candidate delta: ${result.deltaKg.toFixed(3)} kg (${(result.deltaPct*100).toFixed(2)}%)</div>`}<pre class="engineering-master-json">${esc(JSON.stringify(result,null,2))}</pre></div></div>`;}

  function validationHtml(){const v=validation();return`<div class="engineering-master-grid"><div class="engineering-master-card"><h3>Errors</h3><div class="engineering-master-metric">${v.errors.length}</div></div><div class="engineering-master-card"><h3>Warnings</h3><div class="engineering-master-metric">${v.warnings.length}</div></div><div class="engineering-master-card"><h3>Active model structure</h3><div class="engineering-master-metric">${activeValidation().ok?'PASS':'FAIL'}</div></div></div><div class="engineering-master-validation">${[...v.errors.map(x=>({...x,bad:true})),...v.warnings].map(x=>`<div class="engineering-master-issue ${x.bad?'bad':''}"><strong>${esc(x.path)}</strong><div>${esc(x.message)}</div></div>`).join('')||'<div class="engineering-master-banner">Candidate structure is valid. Run the full empirical benchmark suite before publication.</div>'}</div>`;}

  function panelHtml(){if(view==='overview')return overviewHtml();if(view==='approach1')return approach1Html();if(view==='approach2')return approach2Html();if(view==='preview')return previewHtml();return validationHtml();}

  function render(){const v=validation();container.innerHTML=`<div class="engineering-master-root"><div class="engineering-master-header"><div><div class="engineering-master-title">Empirical Weight Tuning</div><div class="engineering-master-subtitle">Candidate editor for Approach 1 equations and the finalized matrix-assisted Approach 2 stack. Edits are injected into preview estimators only; active API defaults remain unchanged.</div></div><div class="engineering-master-actions"><button class="engineering-master-btn" data-action="revert" ${session.isDirty()?'':'disabled'}>Revert</button><button class="engineering-master-btn" data-action="save" ${session.isDirty()?'':'disabled'}>Save Draft</button><button class="engineering-master-btn" data-action="export">Export Candidate</button><label class="engineering-master-btn">Import Candidate<input hidden type="file" accept=".json" data-action="import"></label></div></div><div class="engineering-master-layout"><aside class="engineering-master-sidebar">${navHtml()}<div class="engineering-master-banner ${v.ok?'':'bad'}">${session.isDirty()?'Candidate differs from active':'Candidate matches active'}<br>${v.errors.length} errors · ${v.warnings.length} warnings</div></aside><main class="engineering-master-panel"><div class="engineering-master-toolbar"><label>Target <select class="engineering-master-select" data-filter="target"><option ${target==='RF/RTJ KG'?'selected':''}>RF/RTJ KG</option><option ${target==='BW KG'?'selected':''}>BW KG</option></select></label><label>Family <select class="engineering-master-select" data-filter="family">${familyOptions(candidate()).map(name=>`<option value="${esc(name)}" ${name===family?'selected':''}>${esc(name)}</option>`).join('')}</select></label></div>${panelHtml()}</main></div></div>`;bind();}

  function bind(){
    container.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{view=btn.dataset.view;render();}));
    container.querySelector('[data-filter="target"]')?.addEventListener('change',(e)=>{target=e.target.value;render();});
    container.querySelector('[data-filter="family"]')?.addEventListener('change',(e)=>{family=e.target.value;render();});
    container.querySelectorAll('[data-constant]').forEach(input=>input.addEventListener('change',()=>{session.updateConstant(input.dataset.constant,input.value);render();}));
    container.querySelectorAll('[data-stack-family]').forEach(input=>input.addEventListener('change',()=>{const model=candidate(),weights=[...(model.approach2.stackWeights[target][input.dataset.stackFamily]||[])];weights[Number(input.dataset.stackIndex)]=Number(input.value);session.updateStackWeights(target,input.dataset.stackFamily,weights);render();}));
    container.querySelectorAll('[data-a1-key]').forEach(input=>input.addEventListener('change',()=>{session.updateA1Coefficient({target:input.dataset.a1Target,typeDesc:input.dataset.a1Family,rating:Number(input.dataset.a1Rating),band:Number(input.dataset.a1Band)},input.dataset.a1Key,input.value);render();}));
    container.querySelector('[data-preview="target"]')?.addEventListener('change',(e)=>{target=e.target.value;render();});
    container.querySelector('[data-preview="family"]')?.addEventListener('change',(e)=>{family=e.target.value;render();});
    container.querySelector('[data-preview="rating"]')?.addEventListener('change',(e)=>{previewRating=Number(e.target.value);render();});
    container.querySelector('[data-preview="ns"]')?.addEventListener('change',(e)=>{previewNs=Number(e.target.value);render();});
    container.querySelector('[data-action="revert"]')?.addEventListener('click',()=>{session.revert();render();});
    container.querySelector('[data-action="save"]')?.addEventListener('click',()=>{const model=session.snapshot();localStorage.setItem(DRAFT_KEY,JSON.stringify({savedAt:new Date().toISOString(),model}));emit?.('empirical-weight-tuning:draft-saved',{savedAt:new Date().toISOString(),validation:session.validation()});render();});
    container.querySelector('[data-action="export"]')?.addEventListener('click',()=>saveText('empirical-weight-candidate.json',JSON.stringify(session.snapshot(),null,2)));
    container.querySelector('[data-action="import"]')?.addEventListener('change',async(e)=>{const file=e.target.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());const v=validateEmpiricalWeightTuningModel(parsed);if(!v.ok)throw new Error(`Candidate has ${v.errors.length} validation errors.`);replaceModel(cloneEmpiricalWeightModel(parsed));render();}catch(error){alert(`Import failed: ${error.message}`);}finally{e.target.value='';}});
  }
  render();
}
