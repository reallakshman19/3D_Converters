import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {installWeightBasisXmlDom} from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import * as root from '../converters/xml-cii2019-core/support-mapping.js';
import * as active from '../v045/converters/xml-cii2019-core/support-mapping.js';
import * as served from '../docs/converters/xml-cii2019-core/support-mapping.js';
import {migrateSupportMappingConfig as migrate} from '../converters/xml-cii2019-core/support-mapping-config.js';
import {nativeTestPython} from './helpers/native-python.mjs';
installWeightBasisXmlDom(globalThis);
const kinds=['REST','GUIDE','LINESTOP','LIMIT','ANCHOR','SPRING'];
const config={defaultGap:17,supportMapping:{version:2,kindProfiles:Object.fromEntries(kinds.map(k=>[k,{gap:23}]))}};
const samples=[[{},0], [{CMPSUPGAP:'25MM GAP'},25],[{CMPSUPGAP:0,CMPSUPGAP_POS:'0mm'},0],
  [{CMPSUPGAP_POS:'5mm'},5],[{CMPSUPGAP_PS:'10MM GAP'},10],[{NODEGAP:'6.5'},6.5],
  [{CMPSUPGAP:'10mm',NODEGAP:0},10],[{NODEGAP:0},0]];
test('all mapper profiles consume own JSON gap or zero, even with stale nonzero defaults',()=>{
 for(const kind of kinds){
  assert.equal(migrate(config).kindProfiles[kind].gap,'0');
  for(const [attrs,want] of samples)for(const engine of [root,active,served]){
   const doc=new DOMParser().parseFromString('<Node><CMPSUPGAP>99</CMPSUPGAP></Node>','application/xml');
   const node=doc.documentElement;
   const entries=engine.restraintEntriesFromSupportKind(kind,attrs,node,config);
   assert.ok(entries.length,kind);
   assert.ok(entries.every(e=>Number(e.gap)===want),JSON.stringify({kind,attrs,entries}));
   engine.applyXmlRestraints(doc,node,entries,config);
   const restraints=[...node.getElementsByTagName('Restraint')];
   assert.ok(restraints.every(r=>Number(r.getElementsByTagName('Gap')[0].textContent)===want));
   assert.ok(restraints.every(r=>r.getElementsByTagName('CMPSUPGAP').length===Number(Object.keys(attrs).length>0)));
  }
 }
});
test('invalid or conflicting source aliases fail closed, explicit zero is not a missing value',()=>{
 for(const engine of [root,active,served]){
  assert.throws(()=>engine.restraintEntriesFromSupportKind('REST',{CMPSUPGAP:'10mm',NODEGAP:'5'}),/GAP_AMBIGUOUS/);
  assert.throws(()=>engine.restraintEntriesFromSupportKind('GUIDE',{CMPSUPGAP:'invalid'}),/GAP_INVALID/);
 }
});
test('qualified native profile replay consumes same gaps including REST and explicit zero',()=>{
 const script=['import sys,json,xml.etree.ElementTree as ET','sys.path.insert(0,"converters/scripts")',
 'from xml229_prefinal_restraints import append_profile','d=json.load(sys.stdin)','out=[]',
 'for k,a in d["cases"]:', ' n=ET.fromstring("<Node><CMPSUPGAP>99</CMPSUPGAP></Node>")',
 ' append_profile(n,k,a,d["config"])',' out.append([[float(r.findtext("Gap")),r.findtext("CMPSUPGAP")] for r in n.findall("Restraint")])','print(json.dumps(out))'].join('\n');
 const cases=kinds.slice(0,3).flatMap(k=>samples.map(([a])=>[k,a]));
 const out=JSON.parse(execFileSync(nativeTestPython,['-c',script],{input:JSON.stringify({cases,config}),encoding:'utf8'}));
 assert.deepEqual(out.map(rows=>rows.map(r=>r[0])),kinds.slice(0,3).flatMap(()=>samples.map(([,g])=>[g])));
 assert.equal(out[0][0][1],null);
 assert.equal(out[2][0][1],'0');
});
