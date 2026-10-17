/**
 * XML229 source-bound Weight Match PRESENTATION ONLY.
 * The existing original-Blob GC-PW Worker owns every source fact and decision.
 * Candidate chips and table controls cannot write legacy issue.keys, mutate
 * masters, infer a Final decision, or authorize native CII Run.
 */
const txt=x=>String(x??'');
export const escapeXml229WeightHtml=x=>txt(x).replaceAll('&','&amp;')
 .replaceAll('<','&lt;').replaceAll('>','&gt;')
 .replaceAll('"','&quot;').replaceAll("'",'&#39;');
const e=escapeXml229WeightHtml;
const positive=x=>typeof x==='number'&&Number.isFinite(x)&&x>0;
const kg=x=>positive(x)?e(x)+' kg':'—';
export const xml229WeightReviewStatus=row=>{
 if(positive(row?.finalKg))return {label:'Final reviewed',kind:'final',mass:row.finalKg};
 if(positive(row?.match1Kg))return {label:'Match-1 reviewed',kind:'match1',mass:row.match1Kg};
 if(positive(row?.sourceKg))return {label:'Original XML mass',kind:'source',mass:row.sourceKg};
 return {label:'Needs review',kind:'unresolved',mass:null};
};
const safeNumber=x=>Number.isFinite(Number(x))?Number(x):0;
export function xml229WeightReviewPageModel(page,offset=0){
 const rows=Array.isArray(page?.rows)?page.rows:[];
 const total=Math.max(0,Math.trunc(safeNumber(page?.totalCount)));
 const start=Math.max(0,Math.trunc(safeNumber(offset)));
 return {rows,total,start,end:start+rows.length,
   counts:rows.reduce((a,r)=>{
     a[xml229WeightReviewStatus(r).kind]++;
     if(Array.isArray(r.proposals)&&r.proposals.length)a.proposed++;
     return a;
   },{final:0,match1:0,source:0,unresolved:0,proposed:0})};
}
export function renderXml229WeightReviewPage(page,offset=0,{filter='all',query=''}={}){
 const m=xml229WeightReviewPageModel(page,offset);
 const fmt=(x,unit='')=>typeof x==='number'&&Number.isFinite(x)
   ?e(Number(x).toFixed(unit==='mm'?1:0))+(unit?' '+unit:''):'—';
 const label=x=>txt(x)?e(x):'<span title="No verified source value" style="color:#94a3b8">—</span>';
 const rows=m.rows.map((r,i)=>{
  const state=xml229WeightReviewStatus(r),proposals=Array.isArray(r.proposals)?r.proposals:[];
  const chips=proposals.map(p=>{
   const score=typeof p.score==='number'&&Number.isFinite(p.score)&&p.score>=0&&p.score<=100
     ?' · '+fmt(p.score)+'%':'';
   const hint=[p.method,p.matchType,p.qualified?'Qualified source candidate':'Review required',
     ...(p.eligibilityReasons||[]),...(p.evidenceRefs||[])].filter(Boolean).join(' · ');
   return `<button type="button" class="mc-rigid-review-candidate${p.qualified?' best':''}"
     data-p4-pick="${e(p.proposalId)}" title="${e(hint)}"
     style="font-size:11px;white-space:nowrap;margin:1px;padding:4px 6px">
     ${p.qualified?'★':'≈'} ${kg(p.value)}${score} · ${e(p.method||'source proposal')}</button>`;
  }).join('');
  const tooltip=[r.dtxrSource,r.dtxrMatchedKey,
    r.dtxrSourcePath].filter(Boolean).join(' · ')||
    'DTXR metadata not independently available for this original physical occurrence';
  const accepted=positive(r.finalKg)?r.finalKg:positive(r.match1Kg)?r.match1Kg:r.sourceKg;
  const statusColor=state.kind==='final'?'#86efac':state.kind==='match1'?'#fde68a':'#fca5a5';
  return `<tr data-p4-row="${i}" data-p4-occurrence="${e(r.occurrenceId)}"
    data-p4-stage="${state.kind}" style="border-bottom:1px solid #253a55">
    <td style="color:${statusColor}" data-p4-decision-state="${state.kind}">${e(state.label)}
     <small style="display:block;color:#94a3b8">${e(r.sourceId)}</small></td>
    <td title="${e(r.nodeName||r.shortName||'')}">${label(r.shortName||r.nodeName||r.valveHint)}</td>
    <td title="${e(tooltip)}" style="min-width:140px;max-width:260px;overflow-wrap:anywhere">${label(r.dtxr)}</td>
    <td title="${e(r.branchName)}" style="min-width:230px;max-width:290px;overflow-wrap:anywhere">${label(r.branchName)}</td>
    <td style="min-width:95px">${label(r.lineKey)}</td>
    <td>${label(r.componentType)}</td>
    <td title="Verified FactRecord bore.mm">${fmt(r.boreMm,'mm')}</td>
    <td title="Verified rating. Changes must be explicitly committed to engineering config and Preview rebuilt.">
     <input data-p4-rating-readonly class="mc-wm-rating-input" type="text"
       value="${e(r.rating??'')}" readonly aria-label="Verified Preview rating (edit upstream)"
       style="width:72px;background:#0b1320;color:#dceaff;border:1px solid #405a78;border-radius:4px">
     <small style="display:block;color:#94a3b8">Verified Preview</small></td>
    <td title="Original NodeNumber; physical identity uses branch and original node ordinal">${label(r.nodeNumber)}</td>
    <td title="Original component reference and endpoint">${label(r.componentRefNoEndpoint)}</td>
    <td title="Verified FactRecord length.mm from source geometry or explicit source length">${fmt(r.lengthMm,'mm')}</td>
    <td style="min-width:260px">
      <div title="Accepted mass is distinct from an unaccepted proposal" style="margin-bottom:3px">
        <b>${kg(accepted)}</b>
        <small style="display:block;color:#94a3b8">
         Match-1: <span data-p4-match1-mass>${kg(r.match1Kg)}</span> ·
         Final: <span data-p4-final-mass>${kg(r.finalKg)}</span></small>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">
       <input data-p4-proposal class="mc-rigid-review-input" type="number"
         min="0" step="any" placeholder="${e(r.proposedKg??'kg')}"
         aria-label="Proposed draft kilograms, not accepted" style="width:84px;background:#202c40;color:#f1f5f9">
       <select data-p4-candidate aria-label="Verified candidate" style="max-width:115px;background:#0b1320;color:#e5eefc">
        <option value="">Manual</option>
        ${proposals.map(p=>`<option value="${e(p.proposalId)}">#${e(p.ranking)} ${kg(p.value)}</option>`).join('')}
       </select>
       <input data-p4-reason placeholder="Engineering reason" aria-label="Engineering reason" style="width:110px;background:#0b1320;color:#e5eefc">
       <button data-p4-accept-match1 type="button" class="model-converters-run-btn">Accept Match-1</button>
       <button data-p4-accept-final type="button" class="model-converters-download-btn">Review Final</button>
      </div>
      <small data-p4-draft-marker style="color:#94a3b8">Proposed value is not accepted automatically</small>
    </td>
    <td style="max-width:420px;min-width:190px">
      <div class="mc-wm-candidate-chips" style="display:flex;gap:4px;flex-wrap:wrap;max-height:90px;overflow:auto">
       ${chips||'<span style="color:#94a3b8">No verified candidate yet</span>'}
      </div></td>
   </tr>`;
 }).join('');
 const tabs=[['rigid','Weight items'],['blank-rigid','Blank weights'],['needs-review','Needs Review'],['all','All physical']]
  .map(([id,name])=>`<button data-p4-scope="${id}" type="button"
   aria-pressed="${filter===id?'true':'false'}"
   style="background:${filter===id?'#1e40af':'#1e293b'};border:1px solid #466489;border-radius:6px;
    padding:5px 10px;color:#e5eefc">${name}</button>`).join('');
 return `<div class="model-converters-workflow-detail-note" style="margin:8px 0">
   <strong>Verified original physical facts</strong> · ${m.total} components${page?.populationCount!==undefined?' filtered from '+e(page.populationCount):''}
   · showing ${m.rows.length?m.start+1:0}–${m.end}.
   <small style="display:block;color:#94a3b8">Page only: ${m.counts.match1} Match-1, ${m.counts.final} Final, ${m.counts.unresolved} unresolved.
    Source-bound Worker is the sole scorer and reviewer. Candidate chips are draft evidence.</small>
  </div>
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0">
    ${tabs}
    <label>Search full verified population
      <input data-p4-filter value="${e(query)}" placeholder="Branch, line key, Node, DTXR, source..."
       style="padding:6px;background:#0b1320;color:#e5eefc;border:1px solid #405a78;border-radius:5px;min-width:220px"></label>
    <label><input data-p4-filter-unresolved type="checkbox" ${filter==='needs-review'?'checked':''}> Unresolved</label>
    <label style="font-size:12px">Suggested score ≥
      <input data-p4-min-score type="number" min="0" max="100" step="1" value="80"
       aria-label="Minimum suggestion score percentage" style="width:58px;background:#0b1320;color:#fff"> %</label>
    <button data-p4-bulk-plan type="button" class="model-converters-download-btn">Apply all suggestions</button>
    <button data-p4-bulk-confirm type="button" disabled class="model-converters-run-btn">Apply all Match-1</button>
    <small data-p4-filter-count style="color:#94a3b8">Filters apply to all original occurrences.</small>
  </div>
  <div class="mc-rigid-review-table-wrap" style="overflow:auto;max-height:48vh;border:1px solid #253a55;border-radius:8px">
    <table class="mc-rigid-review-table" style="border-collapse:collapse;font-size:12px;table-layout:auto;min-width:1940px">
      <thead style="position:sticky;top:0;background:#14243a;color:#dceaff">
       <tr>${['Status','Short name / Valve Hint','DTXR','Branch','Line Key','ComponentType','Bore','Rating','Node',
        'ComponentRefNo_Endpoint','Length','Weight (kg)',
        'Nearest Suggestions'].map(h=>`<th style="padding:8px;white-space:nowrap">${e(h)}</th>`).join('')}</tr>
      </thead><tbody>${rows}</tbody>
    </table>
  </div>
  <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
    <button data-p4-prev type="button" ${m.start===0?'disabled':''}>Previous</button>
    <button data-p4-next type="button" ${m.end>=m.total?'disabled':''}>Next</button>
    <small>Showing ${m.rows.length?m.start+1:0}–${m.end} of ${m.total} matching original physical owners.</small>
  </div>
  <p style="color:#fbbf24">Native CII Run remains HELD until separate Final/output authority is verified.</p>`;
}
export function choiceForXml229WeightRow(row,{stage,proposalId='',value='',reason=''}={}){
 const explanation=txt(reason).trim();
 if(stage==='final'){
   const kgValue=Number(value);
   if(!positive(kgValue))throw new Error('Final Match-2 requires a positive explicitly entered mass (kg)');
   if(!explanation)throw new Error('Final Match-2 requires an engineering reason');
   return {view:row.finalView,choice:{action:'final-override',value:kgValue,unit:'kg',reason:explanation}};
 }
 if(stage!=='match1')throw new Error('Unknown verified Weight review stage');
 if(proposalId){
   const pinned=Array.isArray(row.proposals)
     ?row.proposals.find(p=>p.proposalId===proposalId):null;
   if(!pinned)
     throw new Error('Selected candidate does not belong to this verified physical occurrence');
   // An edited candidate input is NOT the pinned master proposal's mass.
   // Require Manual selection rather than silently accepting an unrelated kg.
   if(txt(value).trim()!==''&&Number(value)!==pinned.value)
     throw new Error('Draft kg differs from selected proposal. Select Manual and enter an engineering reason.');
   return {view:row.match1View,choice:{action:'accept-proposal',proposalId,reason:explanation}};
 }
 const kgValue=Number(value);
 if(!positive(kgValue))throw new Error('Match-1 manual entry requires a positive mass (kg)');
 if(!explanation)throw new Error('Manual Match-1 requires an engineering reason');
 return {view:row.match1View,choice:{action:'enter-manual',value:kgValue,unit:'kg',reason:explanation}};
}
