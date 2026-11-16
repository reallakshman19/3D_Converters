/** Thickness normalization for Step 4 and XML parity. A malformed value is
 * unresolved, never zero. Only explicit no-insulation terms resolve to zero.
 * Bare numeric values are millimetres; explicit cm/in are converted to mm.
 * A range resolves to the maximum endpoint, not a concatenated number.
 */
const text=v=>String(v??'').trim();
const missing=/^(?:n\/?a|not applicable|not available|unknown|tbd|null|[-–—]+)?$/i;
const bare=/^(?:nil|none|no(?: insulation)?|uninsulated|bare|not insulated)$/i;
export function normalizePreviewInsulationThickness(value){
 const raw=text(value);
 if(missing.test(raw))return {value:'',raw,status:'missing'};
 if(bare.test(raw))return {value:'0',raw,status:'normalized'};
 const s=raw.replace(/[–—−]/g,'-').replace(/^(?:approx\.?|nominal|thk\.?|thickness)\s*[:=~]?\s*/i,'').replace(/^~\s*/,'').trim();
 const number='(\\d+(?:\\.\\d+)?|\\.\\d+)';
 const unit='(mm|cm|inches|inch|in|")?';
 const single=new RegExp('^'+number+'\\s*'+unit+'$','i');
 const range=new RegExp('^'+number+'\\s*'+unit+'\\s*(?:-|/|to|~)\\s*'+number+'\\s*'+unit+'$','i');
 const convert=(n,u)=>Number(n)*(u&&/^(?:in|inch|inches|")$/i.test(u)?25.4:u&&/^cm$/i.test(u)?10:1);
 const format=n=>Number.isFinite(n)&&n>=0?String(Number(n.toPrecision(12))):'';
 // A unit-bearing fraction of an inch is not a thickness range.
 const f=s.match(/^(\d+)\s*\/\s*(\d+)\s*(?:"|in(?:ch(?:es)?)?)$/i);
 if(f&&Number(f[2])>0){const v=format(Number(f[1])/Number(f[2])*25.4);return {value:v,raw,status:v?'normalized':'invalid'};}
 const m=s.match(range);
 if(m){const v=format(Math.max(convert(m[1],m[2]||m[4]),convert(m[3],m[4]||m[2])));return {value:v,raw,status:v?'range-max':'invalid'};}
 const n=s.match(single);
 if(n){const v=format(convert(n[1],n[2]));return {value:v,raw,status:v?(v===raw?'exact':'normalized'):'invalid'};}
 return {value:'',raw,status:'invalid'};
}
export function normalizePreviewInsulationType(value){
 const s=text(value);return missing.test(s)?'':s;
}
export function resolvePreviewInsulation({xmlThicknesses=[],xmlTypes=[],branchThickness='',branchType='',override={},lineThickness='',lineType='',defaultThickness='',defaultType=''}={}){
 const values=[branchThickness,...xmlThicknesses].map(normalizePreviewInsulationThickness);
 const valid=values.filter(x=>x.value!=='').map(x=>Number(x.value));
 const min=valid.length?Math.min(...valid):null,max=valid.length?Math.max(...valid):null;
 const xmlRange=min===null?'':min===max?String(max):min+'–'+max;
 const types=[...new Set([branchType,...xmlTypes].map(normalizePreviewInsulationType).filter(Boolean))];
 const branchValue=normalizePreviewInsulationThickness(branchThickness);
 const choices=[['override',override.insThk],['linelist',lineThickness],['default',defaultThickness]];
 const selected=choices.map(([source,raw])=>({source,...normalizePreviewInsulationThickness(raw)})).find(x=>x.status!=='missing');
 const fallback=branchValue.value!==''?branchValue.value:selected?.value||'';
 // Display the actual original XML maximum, not a uniform fabricated value.
 // Explicit edits are saved as missing-value fallbacks and are shown separately.
 const value=Object.hasOwn(override,'insThk')?(selected?.value||''):max!==null?String(max):selected?.value||'';
 const source=Object.hasOwn(override,'insThk')?'override':max!==null?'xml':selected?.source||'none';
 const typeChoices=[['override',override.insType],['linelist',lineType],['default',defaultType]];
 const typeSelected=typeChoices.map(([source,raw])=>({source,value:normalizePreviewInsulationType(raw)})).find(x=>x.value);
 const typeFallback=normalizePreviewInsulationType(branchType)||typeSelected?.value||'';
 const insType=Object.hasOwn(override,'insType')?normalizePreviewInsulationType(override.insType):types.length===1?types[0]:types.length>1?'':typeSelected?.value||'';
 return {insThk:value,insThkSource:source,insThkFallback:fallback,insThkXmlRange:xmlRange,
   insThkRangeOrig:selected&&['range-max','normalized','invalid'].includes(selected.status)?selected.raw:'',
   insThkNeedsReview:selected?.status==='invalid'||values.some(x=>x.status==='invalid'),
   insType,insTypeSource:Object.hasOwn(override,'insType')?'override':types.length?'xml':typeSelected?.source||'none',
   insTypeFallback:typeFallback,insTypeXmlValues:types,insTypeNeedsReview:types.length>1};
}
