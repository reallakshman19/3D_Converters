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
export function renderXml229WeightReviewPage(page,offset=0){
 const m=xml229WeightReviewPageModel(page,offset);
 const rows=m.rows.map((r,i)=>{
   const state=xml229WeightReviewStatus(r);
   const choices=Array.isArray(r.proposals)?r.proposals:[];
   const chips=choices.slice(0,3).map(p=>`<button type="button"
      class="mc-rigid-review-candidate${p.qualified?' best':''}" data-p4-pick="${e(p.proposalId)}"
      title="${e('Rank '+p.ranking+' · '+(p.method||'source proposal')+' · '+(p.qualified?'qualified candidate':'requires independent review'))}">
      ${p.qualified?'★ ':'≈ '}${kg(p.value)} <small>· ${e(p.method||'candidate')}</small>
     </button>`).join('');
   const more=choices.length>3?`<span style="color:#94a3b8;font-size:11px">+ ${choices.length-3} other</span>`:'';
   const rejections=Array.isArray(r.rejectedCandidates)&&r.rejectedCandidates.length
     ?`<span style="display:block;color:#f87171;font-size:11px;margin-top:4px" title="${e(r.rejectedCandidates.map(c=>c.description+': '+(c.rejectionReasons||[]).join(', ')).join('; '))}">× ${r.rejectedCandidates.length} rejected candidate(s)</span>`:'';
   const refTag=r.componentRefEndpoint||r.componentRefNo||'';
   const dimensions=[
     r.boreMm!=null?`DN ${r.boreMm}`:null,
     r.lengthMm!=null?`L ${r.lengthMm}mm`:null,
     r.rating?e(r.rating):null,
   ].filter(Boolean).join(' · ');

   return `<tr data-p4-row="${i}" data-p4-occurrence="${e(r.occurrenceId)}"
      data-p4-stage="${state.kind}" style="border-bottom:1px solid #253a55">
    <td style="vertical-align:top;min-width:140px;max-width:200px;padding:8px">
      <strong style="font-size:12px;display:block;color:#e2e8f0">${e(r.branchName||('Branch '+r.branchOccurrenceIndex))}</strong>
      <div style="font-size:11px;color:#94a3b8;margin-top:2px">Node ${e(r.nodeNumber||r.nodeOrdinal)}${refTag?` · ${e(refTag)}`:''}</div>
      <div style="margin-top:3px"><span style="background:#1e293b;color:#38bdf8;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:600">${e(r.componentType||'COMPONENT')}</span></div>
      <small style="color:#64748b;font-size:10px;display:block;overflow-wrap:anywhere">${e(r.sourceId)}</small>
      <small style="display:block;margin-top:2px;color:${state.kind==='final'?'#86efac':state.kind==='match1'?'#fde68a':'#94a3b8'}" data-p4-decision-state="${state.kind}">${e(state.label)}</small>
    </td>
    <td style="vertical-align:top;min-width:160px;max-width:260px;padding:8px" title="${e(r.dtxr||'')}">
      <div style="font-size:12px;color:#f1f5f9;line-height:1.35;word-break:break-word">${e(r.dtxr||'—')}</div>
      ${r.valveHint?`<small style="display:block;color:#a5b4fc;margin-top:2px">${e(r.valveHint)}</small>`:''}
    </td>
    <td style="vertical-align:top;min-width:110px;white-space:nowrap;padding:8px;font-size:11px;color:#cbd5e1">
      ${dimensions||'—'}
    </td>
    <td style="vertical-align:top;white-space:nowrap;padding:8px;font-variant-numeric:tabular-nums">${kg(r.sourceKg)}</td>
    <td style="vertical-align:top;white-space:nowrap;padding:8px;font-variant-numeric:tabular-nums;color:${state.kind==='match1'?'#fde68a':'inherit'}">${kg(r.match1Kg)}</td>
    <td style="vertical-align:top;white-space:nowrap;padding:8px;font-variant-numeric:tabular-nums;color:${state.kind==='final'?'#86efac':'inherit'}">${kg(r.finalKg)}</td>
    <td style="vertical-align:top;min-width:180px;max-width:280px;padding:8px">
      <div class="mc-wm-candidate-chips" style="display:flex;gap:4px;flex-wrap:wrap">${chips||'<small style="color:#94a3b8">No verified candidate yet</small>'}${more}</div>
      ${rejections}
      <small style="display:block;color:#94a3b8;margin-top:4px">Suggestions are evidence, never automatically accepted.</small>
    </td>
    <td style="vertical-align:top;min-width:230px;max-width:300px;padding:7px 8px">
      <div style="display:grid;grid-template-columns:minmax(75px,1fr) minmax(85px,1fr);gap:4px;align-items:center">
       <input data-p4-proposal type="number" min="0" step="any" inputmode="decimal"
        aria-label="Draft proposed weight in kilograms" placeholder="${e(r.proposedKg??'kg')}"
        style="min-width:0;width:100%;box-sizing:border-box;background:#0b1320;color:#e5eefc;border:1px solid #405a78;border-radius:4px;padding:5px">
       <select data-p4-candidate aria-label="Verified source candidate"
        style="min-width:0;width:100%;box-sizing:border-box;background:#0b1320;color:#e5eefc;border:1px solid #405a78;border-radius:4px;padding:5px">
        <option value="">Manual</option>
        ${choices.map(p=>`<option value="${e(p.proposalId)}">#${e(p.ranking)} · ${kg(p.value)}${p.qualified?' ★':' ≈'}</option>`).join('')}
       </select>
       <input data-p4-reason aria-label="Engineering review reason" placeholder="Reason (required for Final)"
        style="grid-column:1/-1;min-width:0;box-sizing:border-box;width:100%;background:#0b1320;color:#e5eefc;border:1px solid #405a78;border-radius:4px;padding:5px">
       <button data-p4-accept-match1 type="button" class="model-converters-run-btn"
        style="padding:5px 6px;font-size:11px">Accept Match-1</button>
       <button data-p4-accept-final type="button" class="model-converters-download-btn"
        style="padding:5px 6px;font-size:11px">Review Final</button>
      </div>
      <small style="color:#94a3b8;display:block;margin-top:4px">Two separate source-bound decisions</small>
    </td>
   </tr>`;
 }).join('');
 return `<div class="model-converters-workflow-detail-note" style="margin:8px 0;background:#101a29;border:1px solid #253a55;border-radius:8px;padding:10px">
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <div>
        <strong>Verified original physical facts</strong> · ${m.total} components · showing ${m.rows.length?m.start+1:0}–${m.end}
        <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:4px;color:#cbd5e1;font-size:12px">
          <span>${m.counts.final} Final</span><span>${m.counts.match1} Match-1</span>
          <span>${m.counts.source} original XML masses</span><span>${m.counts.unresolved} requiring review</span>
        </div>
      </div>
      <div>
        <button data-p4-bulk-match1 type="button" class="model-converters-run-btn"
         style="background:#047857;border-color:#10b981;color:#fff;padding:6px 12px;font-size:12px;font-weight:600;border-radius:6px;cursor:pointer">
          Accept All Qualified (★) as Match-1
        </button>
      </div>
    </div>
  </div>
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0">
   <label style="font-size:12px;color:#b6c5da">Search:
    <input data-p4-filter placeholder="DTXR, Ref, Node, Branch…" aria-label="Filter displayed original physical components"
     style="background:#0b1320;color:#e5eefc;border:1px solid #405a78;border-radius:4px;padding:5px;width:200px">
   </label>
   <label style="font-size:12px;color:#b6c5da">Stage:
    <select data-p4-filter-stage aria-label="Filter by review stage"
     style="background:#0b1320;color:#e5eefc;border:1px solid #405a78;border-radius:4px;padding:5px">
      <option value="all">All components</option>
      <option value="unresolved">Unresolved only</option>
      <option value="match1">Match-1 reviewed</option>
      <option value="final">Final reviewed</option>
    </select>
   </label>
   <label style="font-size:12px;color:#b6c5da"><input data-p4-filter-unresolved type="checkbox"> Unresolved only</label>
   <small data-p4-filter-count style="color:#94a3b8"></small>
  </div>
  <div class="mc-rigid-review-table-wrap" style="max-height:460px;overflow:auto;border:1px solid #253a55;border-radius:8px">
   <table class="mc-rigid-review-table" style="width:100%;min-width:1100px;border-collapse:collapse;table-layout:auto;font-size:12px">
    <thead style="position:sticky;top:0;z-index:1;background:#14243a;color:#dceaff">
      <tr>
        <th style="padding:8px">Component Ref / Tag</th>
        <th style="padding:8px">Description (DTXR)</th>
        <th style="padding:8px">Dimensions / Rating</th>
        <th style="padding:8px">XML kg</th>
        <th style="padding:8px">Match-1 kg</th>
        <th style="padding:8px">Final kg</th>
        <th style="padding:8px">Ranked Candidates & Evidence</th>
        <th style="padding:8px">Engineering Decisions</th>
      </tr>
    </thead><tbody>${rows}</tbody>
   </table>
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:10px">
   <span style="font-size:12px;color:#94a3b8">Source-bound Worker page ${m.rows.length?Math.floor(m.start/25)+1:0}</span>
   <div style="display:flex;gap:7px"><button data-p4-prev type="button" ${m.start===0?'disabled':''}>Previous</button>
   <button data-p4-next type="button" ${m.end>=m.total?'disabled':''}>Next</button></div>
  </div>
  <p style="color:#fbbf24;font-size:12px;margin-top:10px">Native CII Run remains HELD: a verified Weight review does not authorize downstream Final/output consumption.</p>`;
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
   if(!Array.isArray(row.proposals)||!row.proposals.some(p=>p.proposalId===proposalId))
     throw new Error('Selected candidate does not belong to this verified physical occurrence');
   return {view:row.match1View,choice:{action:'accept-proposal',proposalId,reason:explanation}};
 }
 const kgValue=Number(value);
 if(!positive(kgValue))throw new Error('Match-1 manual entry requires a positive mass (kg)');
 if(!explanation)throw new Error('Manual Match-1 requires an engineering reason');
 return {view:row.match1View,choice:{action:'enter-manual',value:kgValue,unit:'kg',reason:explanation}};
}
