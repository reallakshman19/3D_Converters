/**
 * UI-only per-stable-stateRef flow custody. Never stored in localStorage;
 * diagnostics capture source-bound transitions, not source data.
 */
import {createXml229CrossWorkerFlowTrace}
 from '../../../contracts/xml229-flow-trace-v1/trace.mjs';
const live=new WeakMap();
const key=ref=>ref?.modeABaseRef||ref;
export function beginXml229FlowTrace(ref){
 const k=key(ref);
 if(!k||typeof k!=='object')throw Error('FLOW_STATE_REF_REQUIRED');
 const old=live.get(k);old?.record({kind:'SESSION_REPLACED',actor:'ui-controller'});
 old?.close();
 const trace=createXml229CrossWorkerFlowTrace();
 live.set(k,trace);
 return trace;
}
export function getXml229FlowTrace(ref){
 const k=key(ref);
 return k&&typeof k==='object'?live.get(k)||null:null;
}
export function recordXml229FlowTrace(ref,event){
 const trace=getXml229FlowTrace(ref);
 try{return trace?.record(event)??null}catch{return null;}
}
