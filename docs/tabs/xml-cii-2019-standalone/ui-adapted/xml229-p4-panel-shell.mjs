/** Existing-workflow Weight panel shell; presentation only, no decisions. */
export function renderXml229VerifiedPanelShell(existingWorkflow=false){
 return `<section data-p4-weight-root
  style="border:1px solid #64748b;border-radius:8px;padding:12px;margin:12px 0;">
  <strong>${existingWorkflow?'Weight Match — verified original physical facts':'Original-source Weight review (GC-PW)'}</strong>
  <p style="font-size:12px;color:#94a3b8;">Independent original XML census + full staged JSON Blob verification in separate Workers.
  Applied Weight is an editable source-bound draft saved locally. Suggestion and Skip Weight actions
  never accept Match-1/Final or change native CII Run authorization.</p>
  ${existingWorkflow?'':'<button type="button" data-p4-weight-build>Build verified original-source Weight review</button>'}
  <span role="status" data-p4-weight-status style="margin-left:8px;"></span>
  <button data-p4-confirm-single type="button" hidden style="padding:6px;margin:5px;background:#854d0e;color:white">Confirm reviewed mass</button>
  <pre data-p4-bulk-detail role="status" hidden
   style="white-space:pre-wrap;font-size:12px;color:#cbd5e1;background:#101e32;padding:8px;border-radius:6px;"></pre>
  <div style="margin:10px 0"><button type="button" data-p4-export-flow-trace
   class="model-converters-download-btn">Download Worker/UI causal flow trace (private)</button>
   <small style="display:block;color:#94a3b8">Read-only session/Worker transitions, typed failures, fact/review counts and native gate. No source or master rows.</small></div>
  <div style="margin:10px 0"><button type="button" data-p4-export-candidate-readiness
   class="model-converters-download-btn">Download candidate coverage + readiness (private)</button>
   <small style="display:block;color:#94a3b8">Same verified Worker, read-only aggregate counts; keep file private. Does not authorize native CII.</small></div>
  <div style="margin:10px 0"><button type="button" data-p4-full-source-safety class="model-converters-download-btn">Download full-source Weight safety precheck (private)</button><small style="display:block;color:#94a3b8">Requires empty review ledger; no source rows, approval or native CII release.</small></div>
  <div><button type="button" data-p4-export-effective-basis class="model-converters-download-btn">Download current effective 4-master custody (OWNER PRIVATE)</button><small>Includes private config and normalized master rows. Keep local; no source XML/JSON or approvals.</small></div>
  <div style="margin:10px 0"><button type="button" data-p4-audit-decisions
   class="model-converters-download-btn">Download verified decision provenance JSON</button>
   <small style="display:block;color:#94a3b8">Read-only source-bound Match-1/Final audit. Bulk command IDs alone do not prove an earlier confirmation click. No native CII release.</small></div>
   <div style="margin:8px 0;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
    <button type="button" data-p4-save-review class="model-converters-download-btn">Save GC-PW review file</button>
    <button type="button" data-p4-choose-review class="model-converters-download-btn">Restore GC-PW review file</button>
    <input type="file" data-p4-import-review accept=".json,application/json"
      aria-label="Select an Owner-controlled GC-PW review file" hidden>
    <small style="color:#94a3b8">Accepted review ledger only. It does NOT contain Applied Weight drafts; restoring does not approve Final or native CII Run.</small>
   </div>
   <div style="margin:8px 0;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
    <button type="button" data-p4-save-drafts class="model-converters-download-btn">Save Applied Weight drafts</button>
    <button type="button" data-p4-choose-drafts class="model-converters-download-btn">Restore Applied Weight drafts</button>
    <input type="file" data-p4-import-drafts accept=".json,application/json"
      aria-label="Select source-bound Applied Weight draft backup" hidden>
    <small style="color:#94a3b8">Drafts are locally checkpointed by exact verified InputBasis for reload and navigation. The separate private backup permits recovery if browser storage is cleared. No review or native CII approval.</small>
   </div>
  <div data-p4-weight-table></div></section>`;
}
