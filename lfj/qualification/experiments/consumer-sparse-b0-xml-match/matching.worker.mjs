/** #1147 B0-05 native module Worker, research-only, no UI export right. */
import {compareSourceProjectionToXml} from './xml-csv-parity.mjs';
let active=false;
self.addEventListener('message',async({data})=>{
  if(active){self.postMessage({type:'ERROR',code:'BUSY'});return;}
  active=true;
  try{
    if(data?.type!=='MATCH')throw Object.assign(new Error('MATCH expected'),{code:'PROTOCOL'});
    const result=await compareSourceProjectionToXml(data);
    self.postMessage({type:'DONE',result});
  }catch(e){
    self.postMessage({type:'ERROR',code:e?.code||'XML_CSV_RESEARCH_FAILED',message:String(e?.message||e)});
  }
});
