/** Bounded Run button wiring for the separate unresolved physical Final popup. */
import {openXml229RunUnresolvedMassPopup} from './xml229-run-unresolved-mass-popup.mjs';

export function createXml229RunMassReviewButton({
 stateRef,render,approved,createElement,updateWorkflowState,noteDiv,
}={}){
 const button=createElement('button',
   approved?'Run - Review Weight Matches':'Review unresolved physicals (0 kg defaults)',
   'model-converters-run-btn');
 if(button.style)Object.assign(button.style,{width:'100%',padding:'12px'});
 button.addEventListener('click',()=>{
   void openXml229RunUnresolvedMassPopup({
     stateRef,render,onNavigate:()=>{
       stateRef.current=updateWorkflowState(stateRef.current,{activePhaseId:'weight-match'});
       if(typeof render==='function')render();
     },
   }).catch(error=>{
     noteDiv.textContent='Source-bound unresolved mass popup unavailable ['+
       String(error?.code||'RUN_ZERO_REVIEW_UNAVAILABLE')+
       ']. Rebuild verified Preview or reopen Weight Match.';
   });
 });
 return button;
}
