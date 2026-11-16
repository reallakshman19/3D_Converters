// Shared Step 3 restraint authority. Legacy callers without this explicit
// schema retain their existing behavior; the Standalone UI migrates to it.
import {migrateSupportMappingConfig} from './support-mapping-config.js';
const text=v=>String(v??'').trim();
const missing=v=>v==null||/^(?:|NULL|N\/A|NA|NOT AVAILABLE|UNAVAILABLE)$/i.test(text(v));
const fail=(code,message)=>{throw Object.assign(new Error(message),{code:'PREFINAL_RESTRAINT_'+code});};
export const DEFAULT_RESTRAINT_PRECEDENCE=Object.freeze({
 nodeType:Object.freeze({primary:'supportMapper',fallback:'review'}),
 gap:Object.freeze({primary:'json',fallback:'supportMapper'}),
 stiffness:Object.freeze({primary:'supportMapper',fallback:'review'}),
 friction:Object.freeze({primary:'json',fallback:'supportMapper'}),
});
export function restraintPrecedence(config={}){
 if(!Object.hasOwn(config,'xml229RestraintPrecedence'))return null;
 const raw=config.xml229RestraintPrecedence;
 if(!raw||typeof raw!=='object'||Array.isArray(raw))fail('CONFIG_INVALID','Invalid restraint precedence policy');
 const result={};
 for(const [field,def] of Object.entries(DEFAULT_RESTRAINT_PRECEDENCE)){
  const p=raw[field]??def;
  if(!p||!['supportMapper','json'].includes(p.primary)||!['supportMapper','json','review'].includes(p.fallback)||p.primary===p.fallback)
   fail('CONFIG_INVALID','Invalid restraint precedence for '+field);
  result[field]={primary:p.primary,fallback:p.fallback};
 }
 return result;
}
export function withDefaultRestraintPrecedence(config={}){
 if(config.xml229PhysicalVertexPrefinal===true)return config;
 const policy=restraintPrecedence(config)||DEFAULT_RESTRAINT_PRECEDENCE;
 return {...config,xml229RestraintPrecedence:policy};
}
export function jsonNodeType(attrs){
 const raw=Object.hasOwn(attrs,'SOURCE_NODETYPE')?attrs.SOURCE_NODETYPE:attrs.NODETYPE;
 return missing(raw)?null:raw;
}
export function nodeTypeUsesMapper(attrs,config){
 const p=restraintPrecedence(config)?.nodeType;
 if(!p)return null;
 return p.primary==='supportMapper'||(missing(jsonNodeType(attrs))&&p.fallback==='supportMapper');
}
export function jsonNodeTypeAttrs(attrs,config){
 return restraintPrecedence(config)?{...attrs,NODETYPE:jsonNodeType(attrs)}:attrs;
}
function number(raw,field){
 const str=text(raw);
 const pattern=field==='gap'?/^(?:GAP\s*=\s*)?([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)\s*(?:mm)?(?:\s+gap)?$/i:/^([-+]?(?:\d+\.?\d*|\.\d+)(?:[Ee][-+]?\d+)?)$/;
 const match=str.match(pattern),n=match?Number(match[1]):NaN;
 if(!Number.isFinite(n)||(field==='stiffness'?n<=0:field==='friction'?n<0&&n!==-1.0101:n<0))
  fail(field.toUpperCase()+'_INVALID','Invalid '+field+' value: '+str);
 return n;
}
function jsonValues(attrs,field,keys){
 const values=keys.filter(k=>!missing(attrs[k])).map(k=>({attribute:k,raw:attrs[k],value:number(attrs[k],field)}));
 if(values.some(x=>x.value!==values[0].value))fail(field.toUpperCase()+'_AMBIGUOUS','Conflicting JSON '+field+' aliases');
 return values[0]||null;
}
function jsonGap(attrs){
 const catalogue=jsonValues(attrs,'gap',['CMPSUPGAP','CMPSUPGAP_POS','CMPSUPGAP_PS']);
 const legacyKey=Object.hasOwn(attrs,'SOURCE_NODEGAP')?'SOURCE_NODEGAP':'NODEGAP';
 const legacy=jsonValues(attrs,'gap',[legacyKey]);
 const profileDerived=text(attrs.SUPPORT_GAP_SOURCE).toUpperCase()==='STEP7_KIND_PROFILE';
 if(catalogue&&legacy&&legacy.value!==0&&legacy.value!==catalogue.value)
  fail('GAP_AMBIGUOUS','Conflicting catalogue and original NODEGAP');
 if(profileDerived&&legacy&&legacy.value!==0&&!catalogue)
  fail('GAP_AMBIGUOUS','Profile-derived gap contradicts original nonzero gap');
 const selected=catalogue||(!profileDerived?legacy:null);
 if(selected&&!missing(attrs.SUPPORT_EFFECTIVE_GAP)&&!profileDerived&&number(attrs.SUPPORT_EFFECTIVE_GAP,'gap')!==selected.value)
  fail('GAP_AMBIGUOUS','Staged effective gap contradicts original clearance');
 return selected;
}
function choose(p,field,fromJson,fromMapper){
 for(const src of [p.primary,p.fallback]){
  if(src==='review')break;
  const result=src==='json'?fromJson():fromMapper();
  if(result)return {...result,authority:src==='json'?'original-json':'support-profile/config',policy:'xml229RestraintPrecedence.'+field};
 }
 fail(field.toUpperCase()+'_INVALID','No valid '+field+' under selected restraint precedence');
}
export function selectRestraintGap(attrs,config,kind){
 const p=restraintPrecedence(config)?.gap;
 if(!p||!kind)return null;
 return choose(p,'gap',()=>jsonGap(attrs),()=>{
  const raw=migrateSupportMappingConfig(config).kindProfiles?.[kind]?.gap;
  return missing(raw)?null:{attribute:null,raw,value:number(raw,'gap')};
 });
}
export function selectRestraintScalar(attrs,config,field,kind=''){
 const p=restraintPrecedence(config)?.[field];
 if(!p)return null;
 return choose(p,field,()=>{
  const direct=field==='stiffness'?['STIFFNESS','NODESTIFFNESS','CMPSUPSTIFF']:['FRICTION','CMPSUPFRICTION'];
  const row=jsonValues(attrs,field,direct)||jsonValues(attrs,field,[field==='stiffness'?'NODESTIFF':'NODEFRICTION']);
  return field==='friction'&&row?.value===0?null:row;
 },()=>{
  // A mapper sentinel is intentional; a JSON zero is not.
  const profile=migrateSupportMappingConfig(config).kindProfiles?.[kind];
  if(!profile)return null;
  const raw=field==='stiffness'?(profile.stiffness&&profile.stiffness!=='default'?profile.stiffness:(config.defaultStiffness??'1.751270E+12')):
   profile.frictionMode==='fixed'?profile.fixedFriction:
   profile.frictionMode==='sentinel'&&config.useFrictionSentinelForNonYSupports!==false&&kind!=='REST'?'-1.010100':(config.defaultFriction??'0.3');
  return missing(raw)?null:{attribute:null,raw,value:number(raw,field)};
 });
}
