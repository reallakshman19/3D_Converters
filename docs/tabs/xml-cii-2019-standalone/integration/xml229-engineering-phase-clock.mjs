/** Bounded phase durations for original-source engineering Preview; no source bytes. */
export const XML229_ENGINEERING_PHASES=Object.freeze([
 'basis-attestation','source-projection','prefinal-restraints','node-ledger',
 'bore-index','physical-facts','fact-verification','finalized-geometry',
]);
export function createXml229EngineeringPhaseClock(onPhase=()=>{},now=()=>performance.now()){
 if(typeof onPhase!=='function'||typeof now!=='function')
   throw new TypeError('PHASE_CLOCK_CALLBACK_REQUIRED');
 return Object.freeze({
   start(phase){
     if(!XML229_ENGINEERING_PHASES.includes(phase))
       throw new RangeError('UNKNOWN_ENGINEERING_PHASE');
     const began=now();
     // A start marker survives a stalled or failed substage.
     try{onPhase(Object.freeze({phase,state:'started'}));}catch{}
     let finished=false;
     return ()=>{
       if(finished)return;
       finished=true;
       const elapsed=now()-began;
       if(!Number.isFinite(elapsed)||elapsed<0)return;
       const elapsedMs=Math.min(720000,Math.round(elapsed));
       // Diagnostic callbacks can never affect engineering facts or release.
       try{onPhase(Object.freeze({phase,state:'completed',elapsedMs}));}catch{}
     };
   },
 });
}
