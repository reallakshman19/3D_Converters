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
  stage,sourceId=null,expectedBasisId,visibleLimit=100,
}={}){
  if(typeof expectedBasisId!=='string'||expectedBasisId!==snapshot?.basisId)
    throw new Error('Verified Weight basis mismatch: reopen reviewed source');
  if(!Number.isSafeInteger(visibleLimit)||visibleLimit<1||visibleLimit>100)
    throw new Error('Verified Weight window must contain 1..100 visible rows');
  const view=selectVerifiedWeightReconciliation(snapshot,{stage,sourceId});
  const visible=view.rows.slice(0,visibleLimit);
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
        displaying first ${esc(visible.length)}. Full accepted review requires canonical stage-specific decisions.</p>
      <div style="max-height:220px;overflow:auto;">
      <table style="font-size:11px;text-align:left;border-collapse:collapse;min-width:760px;">
      <thead><tr><th>Source</th><th>Branch ordinal</th><th>Original node ordinal</th>
      <th>XML kg</th><th>Match-1 kg</th><th>Final kg</th><th>Proposed kg</th><th>Status</th>
      </tr></thead><tbody>${items}</tbody></table></div>
    </section>`;
}
