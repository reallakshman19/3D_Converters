/**
 * One pending Apply click survives a busy Worker-backed page navigation.
 * Never replay it against a superseded InputBasis/session.
 * This helper only re-dispatches a UI click; no review writer is called.
 */
export function createXml229BulkApplyQueue(root,live,say){
 let pending=null;
 return Object.freeze({
   defer(event,session,busy){
     if(!busy)return false;
     if(session&&event.target.closest?.('[data-p4-bulk-plan]')){
       pending=session;
       say('Apply all suggestions queued; waiting for current Weight page.');
     }
     return true;
   },
   drain(session){
     if(!pending)return;
     const current=pending===session&&live()===session&&root.isConnected;
     pending=null;
     if(current)root.querySelector('[data-p4-bulk-plan]')?.click();
   },
 });
}
