/**
 * XML229 W3-B2 read-only source-attested GC-PW evidence panel.
 * Both Match-1 and Final consume the SAME frozen snapshot. A small visible
 * window prevents filling the DOM with the owner-size source population.
 * This is advisory UI only, with NO legacy key/NodeNumber lookup or writes.
 */
import {selectVerifiedWeightReconciliation} from '../../../converters/xml-cii2019-core/weight-facts-shared-reconciliation.js';
const esc=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const shown=n=>typeof n==='number'&&Number.isFinite(n)&&n>0?esc(n+' kg'):'—';
/** Render only the first bounded 100 visible rows; underlying model includes ALL. */
export function renderVerifiedWeightReconciliationPanel(snapshot,{
  stage,sourceId=null,expectedBasisId,visibleLimit=100,offset=0,enableFinalIndividualReview=false,
}={}){
  if(typeof expectedBasisId!=='string'||expectedBasisId!==snapshot?.basisId)
    throw new Error('Verified Weight basis mismatch: reopen reviewed source');
  if(!Number.isSafeInteger(visibleLimit)||visibleLimit<1||visibleLimit>100)
    throw new Error('Verified Weight window must contain 1..100 visible rows');
  if(!Number.isSafeInteger(offset)||offset<0||offset>=Math.max(1,snapshot.rows.length))
    throw new Error('Verified Weight offset outside complete source census');
  const view=selectVerifiedWeightReconciliation(snapshot,{stage,sourceId});
  if(offset>=Math.max(1,view.rows.length))
    throw new Error('Verified Weight offset outside selected source');
  const visible=view.rows.slice(offset,offset+visibleLimit);
  const canonicalControls=stage==='Rigidmatch2'&&enableFinalIndividualReview;
  const items=visible.map(row=>{
    const proposals=row.proposals.map(p=>p.kg+' kg'+(p.qualified?' exact':' review')).join(' / ');
    return `<tr data-canonical-occurrence="${esc(row.occurrenceId)}" data-canonical-source="${esc(row.sourceId)}">
      <td>${esc(row.sourceId)}</td>
      <td>${esc(row.branchOccurrenceIndex)}</td>
      <td>${esc(row.nodeOrdinal)}</td>
      <td>${shown(row.sourceKg)}</td>
      <td>${shown(row.match1Kg)}</td>
      <td>${shown(row.finalKg)}</td>
      <td title="${esc(proposals)}">${shown(row.proposedKg)}</td>
      <td>${esc(row.draftStatus)}</td>
      ${canonicalControls?`<td><button type="button" data-canonical-final-review
        data-source-id="${esc(row.sourceId)}" data-occurrence-id="${esc(row.occurrenceId)}"
        title="Explicit source-bound Final Match-2 review, reason required">Review Final</button></td>`:''}
    </tr>`;
  }).join('');
  return `<section class="xml-cii-gc-pw-reconciliation"
    data-canonical-basis="${esc(view.basisId)}"
    data-canonical-stage="${esc(stage)}"
    style="border:1px solid #64748b;border-radius:6px;padding:9px;margin-top:10px;">
      <strong>Verified GC-PW source weight evidence — read-only</strong>
      <p style="font-size:11px;color:#94a3b8;">Original-source identity and one pinned candidate snapshot.
        Proposed weights are NOT accepted engineering values.
        No legacy Final/Match-1 action is authorized by this table.</p>
      <p style="font-size:11px;color:#cbd5e1;">Verified ${esc(view.rows.length)} original physical component(s);
        displaying ${esc(offset+1)}–${esc(offset+visible.length)}. Full accepted review requires canonical stage-specific decisions.</p>
      <div style="max-height:220px;overflow:auto;">
      <table style="font-size:11px;text-align:left;border-collapse:collapse;min-width:760px;">
      <thead><tr><th>Source</th><th>Branch ordinal</th><th>Original node ordinal</th>
      <th>XML kg</th><th>Match-1 kg</th><th>Final kg</th><th>Proposed kg</th><th>Status</th>
      ${canonicalControls?'<th>Explicit Final action</th>':''}</tr></thead><tbody>${items}</tbody></table></div>
      <div style="display:flex;gap:8px;align-items:center;margin-top:5px;">
        <button type="button" data-canonical-previous ${offset===0?'disabled':''}>Previous ${visibleLimit}</button>
        <button type="button" data-canonical-next ${offset+visibleLimit>=view.rows.length?'disabled':''}>Next ${visibleLimit}</button>
        <span>Original occurrences ${esc(view.rows.length)} · window ${esc(offset+1)}–${esc(offset+visible.length)}</span>
      </div>
    </section>`;
}
