import assert from 'node:assert/strict';
import { run } from '../../tabs/model-converters/converters/rvmattr-to-xml.js';
import { _buildXmlFromStagedJsonText } from '../../tabs/model-converters/converters/stagedjson-to-xml.js';
import { normalizeAttRvmMdsMember } from '../../converters/rmss-attribute-parser.js';
import { applySupportMappingRowPatch, migrateSupportMappingConfig } from '../../converters/xml-cii2019-core/support-mapping-config.js';

function block(type, name, owner, attrs = {}) {
  return ['NEW '+name,'NAME:= '+name,'TYPE:= '+type,'OWNER:= '+owner,
    ...Object.entries(attrs).map(([k,v])=>k+':= '+v),'END'].join('\n');
}
const site = block('SITE','/SITE','/*');
const z1 = block('ZONE','/SITE/Z1','/SITE');
const z2 = block('ZONE','/SITE/Z2','/SITE');
const p1 = block('PIPE','/SITE/Z1/P1','/SITE/Z1');
const p2 = block('PIPE','/SITE/Z2/P2','/SITE/Z2');
const b1 = block('BRAN','/SITE/Z1/P1/B1','/SITE/Z1/P1',
  {HBOR:'100mm',TBOR:'100mm',HPOS:'0 0 0',TPOS:'100 0 0'});
const b2 = block('BRAN','/SITE/Z2/P2/B2','/SITE/Z2/P2',
  {HBOR:'100mm',TBOR:'100mm',HPOS:'500 0 0',TPOS:'600 0 0'});
const v1 = block('VALV','/SITE/Z1/P1/B1/V1','/SITE/Z1/P1/B1',
  {APOS:'0 0 0',LPOS:'100 0 0',ABORE:'100mm'});
const v2 = block('VALV','/SITE/Z2/P2/B2/V2','/SITE/Z2/P2/B2',
  {APOS:'500 0 0',LPOS:'600 0 0',ABORE:'100mm'});
const m1 = block('SUBE','/SITE/Z1/MEMBER_A','/SITE/Z1',
  {APOS:'0 0 0',LPOS:'70 0 0'});
const m2 = block('SUBE','/SITE/Z2/MEMBER_B','/SITE/Z2',
  {APOS:'500 0 0',LPOS:'570 0 0'});
const att=[site,z1,z2,p1,p2,b1,b2,v1,v2,m1,m2].join('\n');
const selected=await run({
  converterId:'rvmattr_to_xml',
  inputFiles:[{role:'secondary',name:'selected.att',text:att}],
  options:{
    rvmScope:{
      wildcard:'',selectedIds:['branch:/SITE/Z1/P1/B1'],
      nativeScope:{mode:'SELECTED',rules:[['/SITE/Z1',true]],
        selectedNativeCount:5,selectedPipingBranches:1},
    },
  },
});
assert.ok(selected.ok, 'converter must accept ATT-only selected scope');
const xml=selected.outputs.find(x=>x.name.endsWith('.xml'))?.text||'';
const json=selected.outputs.find(x=>x.name.endsWith('.json'))?.text||'';
const step=selected.outputs.find(x=>x.name.endsWith('.stp'))?.text||'';
assert.ok(xml.includes('/SITE/Z1/P1/B1'),'Selected branch must be present in XML');
assert.ok(!xml.includes('/SITE/Z2/P2/B2'),'Unselected branch leaked into XML');
const hierarchy=JSON.parse(json);
assert.deepEqual(hierarchy.map(x=>x.name),['/SITE/Z1/P1/B1']);
assert.ok(step.includes('MEMBER_A'),'Selected structural member absent');
assert.ok(!step.includes('MEMBER_B'),'Unselected zone member leaked into STEP');
const full=await run({
  converterId:'rvmattr_to_xml',
  inputFiles:[{role:'secondary',name:'full.att',text:att}],
  options:{rvmScope:{wildcard:'',selectedIds:[],nativeScope:{mode:'FULL'}}},
});
const all=JSON.parse(full.outputs.find(x=>x.name.endsWith('.json')).text);
assert.equal(all.length,2,'Full-file control must include both branches');
console.log('test-att-native-converter-outputs: PASS selected XML/JSON/STP no sibling zone leakage');

 // Co-located synthetic members exercise the actual export and saved Step 7 table.
const supportOwner='/SITE/Z1/P1/B1';
const supportAttrs={POS:'50 0 0',CMPSUPREFN:'SYNTH-SL (REF)',NODETYPE:'14',NODEGAP:'0',
  SPRE:'/MDS-Ancillaries/ANCI/SYNTH',SUPPORT_KIND:'REST',SUPPORT_MAPPER_KIND:'REST'};
const guide={...supportAttrs,MDSSUPPFUNC:'GT',MDSSUPPTYPE:'GT500',CMPSUPTYPE:'PG-S-3',CMPSUPGAP:'GAP=10mm'};
const stop={...supportAttrs,MDSSUPPFUNC:'ST',MDSSUPPTYPE:'ST501',CMPSUPTYPE:'LS-S2-3',CMPSUPGAP:'GAP=35mm'};
const rest={...supportAttrs,MDSSUPPFUNC:'PIPE-REST',MDSSUPPTYPE:'PIPE-REST',CMPSUPTYPE:'REST',CMPSUPGAP:'GAP=0mm'};
const gapless={...guide,CMPSUPGAP:''};
const custom={...supportAttrs,MDSSUPPFUNC:'CUSTOM',MDSSUPPTYPE:'SPECIAL',CMPSUPTYPE:'Q-1',CMPSUPGAP:''};
const rows=[['/SYNTH-SL.1.3',guide],['/SYNTH-SL.1.2',stop],['/SYNTH-SL.2.1',rest],
  ['/SYNTH-SL.3.1',gapless],['/SYNTH-SL.3.2',custom]];
const sourceAtt=[site,z1,p1,b1,v1,...rows.map(([name,attrs])=>block('ANCI',name,supportOwner,attrs))].join('\n');
const config={supportMapping:{version:2,useJsonForRestraints:true,rules:[
  {id:'guide-custom',enabled:true,priority:1,source:'ATT',field:'MDSSUPPFUNC',match:'equals',pattern:'GT',kind:'GUIDE'},
  {id:'stop-custom',enabled:true,priority:2,source:'all',field:'CMPSUPTYPE',match:'startsWith',pattern:'LS-',kind:'LINESTOP'},
  {id:'special-custom',enabled:true,priority:3,source:'all',field:'MDSSUPPTYPE',match:'regex',pattern:'^SPECIAL$',kind:'LINESTOP'},
  {id:'disabled',enabled:false,priority:0,source:'all',field:'MDSSUPPTYPE',match:'equals',pattern:'SPECIAL',kind:'REST'},
  {id:'wrong-scope',enabled:true,priority:0,source:'XML',field:'MDSSUPPTYPE',match:'equals',pattern:'SPECIAL',kind:'REST'}
],kindProfiles:{GUIDE:{xmlTypes:['GUI'],gap:'12',directionMode:'fixed',direction:{x:1,y:0,z:0},stiffness:'1234',frictionMode:'fixed',fixedFriction:'0.2',supportTagMode:'custom',supportTagValue:'G',notes:'test profile'},
LINESTOP:{xmlTypes:['LIM'],gap:'25'},REST:{xmlTypes:['+Y'],gap:'3'}}}};
const converted=await run({converterId:'rvmattr_to_xml',
  inputFiles:[{role:'secondary',name:'synthetic.att',text:sourceAtt}],options:{attRvmSupportConfig:config}});
const convertedStage=JSON.parse(converted.outputs.find(x=>x.name.endsWith('_managed_stage.json')).text);
const members=new Map(convertedStage.flatMap(b=>b.children).map(n=>[n.attributes?.NAME,n.attributes]));
for(const [name,type,kind,gap,source] of [['/SYNTH-SL.1.3','8','GUIDE','10','CMPSUPGAP'],
  ['/SYNTH-SL.1.2','9','LINESTOP','35','CMPSUPGAP'],['/SYNTH-SL.2.1','14','REST','0','CMPSUPGAP'],
  ['/SYNTH-SL.3.1','8','GUIDE','12','STEP7_KIND_PROFILE'],['/SYNTH-SL.3.2','9','LINESTOP','25','STEP7_KIND_PROFILE']]){
  const a=members.get(name);assert.ok(a,'Full member identity was not preserved');
  assert.equal(a.NODETYPE,type);assert.equal(a.SOURCE_NODETYPE,'14');
  assert.equal(a.SUPPORT_EFFECTIVE_NODETYPE,type);
  assert.equal(a.SUPPORT_MAPPING_STATUS,
    type==='14'?'MAPPED':'FOR_REVIEW_SOURCE_NODETYPE_CORRECTED');
  assert.equal(a.SUPPORT_MAPPING_REQUIRES_ENGINEERING_APPROVAL,type!=='14');
  assert.equal(a.SOURCE_NODEGAP,'0');assert.equal(a.SUPPORT_EFFECTIVE_GAP,gap);
  assert.equal(a.SUPPORT_GAP_SOURCE,source);
  for(const k of ['SUPPORT_KIND','SUPPORT_TYPE','SUPPORT_MAPPER_KIND'])assert.equal(a[k],kind);
}
assert.equal(members.get('/SYNTH-SL.1.3').CMPSUPGAP,'GAP=10mm');
assert.equal(members.get('/SYNTH-SL.3.1').NODEGAP,'12');
assert.equal(members.get('/SYNTH-SL.3.2').SUPPORT_MAPPING_RULE_ID,'special-custom');
assert.equal(members.get('/SYNTH-SL.1.3').SUPPORT_MAPPING_PROFILE.fixedFriction,'0.2');
const convertedXml=converted.outputs.find(x=>x.name.endsWith('.xml')).text;
for(const [name,kind] of [['/SYNTH-SL.1.3','GUIDE'],['/SYNTH-SL.1.2','LINESTOP']]){
  const node=convertedXml.split('<Node>').find(s=>s.includes('<NodeName>'+name+'</NodeName>'));
  assert.ok(node?.includes('<ConnectionType>'+kind+'</ConnectionType>'));
}
const convertedStp=converted.outputs.find(x=>x.name.endsWith('.stp')).text;
assert.ok(convertedStp.includes('GUIDE:/SYNTH-SL.1.3'));
assert.ok(convertedStp.includes('LINESTOP:/SYNTH-SL.1.2'));
const staged=JSON.stringify([{type:'BRANCH',name:'/SYNTH/B1',children:rows.map(([NAME,attrs])=>
  ({type:'SUPPORT',attributes:{...attrs,NAME,POS:{x:50,y:0,z:0}}}))}]);
const native=_buildXmlFromStagedJsonText(staged,'synthetic.json',{normalizeAttRvmMdsMembers:true,attRvmSupportConfig:config,attRvmSource:'RVM'});
const generic=_buildXmlFromStagedJsonText(staged,'synthetic.json',{});
assert.equal(JSON.parse(native.stageJsonText)[0].children[0].attributes.NODETYPE,'8');
assert.equal(JSON.parse(generic.stageJsonText)[0].children[0].attributes.NODETYPE,'14');
const repeat={...guide};assert.equal(normalizeAttRvmMdsMember(repeat,config),'GUIDE');
assert.equal(normalizeAttRvmMdsMember(repeat,config),'GUIDE');assert.equal(repeat.SOURCE_NODETYPE,'14');
const malformed={...guide,CMPSUPGAP:'GAP=10mm or 20mm'};
assert.equal(normalizeAttRvmMdsMember(malformed,config),'');assert.equal(malformed.NODETYPE,'14');
assert.equal(malformed.SUPPORT_MAPPING_STATUS,'FOR_REVIEW_GAP_CONFLICT');
const changed=structuredClone(config);changed.supportMapping.rules[2].kind='GUIDE';
const arbitrary={...custom};assert.equal(normalizeAttRvmMdsMember(arbitrary,changed),'GUIDE');
assert.equal(arbitrary.NODETYPE,'8');assert.equal(arbitrary.NODEGAP,'12');
const composite=structuredClone(config);composite.supportMapping.kindProfiles.GUIDE.xmlTypes=['GUI','LIM'];
const comp={...guide};assert.equal(normalizeAttRvmMdsMember(comp,composite),'GUIDE');
assert.equal(comp.NODETYPE,undefined);assert.deepEqual(comp.NODETYPE_CODES,['8','9']);
const edited=structuredClone(config);
applySupportMappingRowPatch(edited,'guide-custom',{gap:'42'});
assert.equal(migrateSupportMappingConfig(edited).kindProfiles.GUIDE.gap,'42');
const changedGap={...gapless};normalizeAttRvmMdsMember(changedGap,edited);
assert.equal(changedGap.NODEGAP,'42');
const ownZero={...guide,CMPSUPGAP:'GAP=0mm'};normalizeAttRvmMdsMember(ownZero,edited);
assert.equal(ownZero.SUPPORT_EFFECTIVE_GAP,'0');
const reverseGap={...guide,CMPSUPGAP:'25MM GAP'};normalizeAttRvmMdsMember(reverseGap,edited);
assert.equal(reverseGap.SUPPORT_EFFECTIVE_GAP,'25');
const noRule={NODETYPE:'14',NAME:'/UNMATCHED',MDSSUPPTYPE:'UNMATCHED'};
assert.equal(normalizeAttRvmMdsMember(noRule,config),'');
assert.equal(noRule.SUPPORT_MAPPING_STATUS,'FOR_REVIEW_NO_RULE');
const tie=structuredClone(config);
tie.supportMapping.rules.push({...tie.supportMapping.rules[0],id:'guide-tie',kind:'LINESTOP'});
const tieMember={...guide};assert.equal(normalizeAttRvmMdsMember(tieMember,tie),'');
assert.equal(tieMember.SUPPORT_MAPPING_STATUS,'FOR_REVIEW_RULE_TIE');
const disabled=structuredClone(config);disabled.supportMapping.useJsonForRestraints=false;
const off={...guide};assert.equal(normalizeAttRvmMdsMember(off,disabled),'');assert.equal(off.NODETYPE,'14');
// Actual browser storage contract: latest saved table picked up per export.
globalThis.localStorage={getItem:key=>key==='xml-cii-import-masters-v1'?JSON.stringify({config}):null};
try{
  const saved=await run({converterId:'rvmattr_to_xml',inputFiles:[{role:'secondary',name:'saved.att',text:sourceAtt}],options:{}});
  const savedRows=JSON.parse(saved.outputs.find(x=>x.name.endsWith('_managed_stage.json')).text).flatMap(b=>b.children);
  assert.equal(savedRows.find(n=>n.attributes.NAME==='/SYNTH-SL.3.1').attributes.NODEGAP,'12');
}finally{delete globalThis.localStorage;}
console.log('ATT/RVM dynamic Step 7 classification: PASS saved rules, source scopes, profiles, default and explicit gaps, XML/JSON/STP');
