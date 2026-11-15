import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {digestUtf8} from '../contracts/gc-pw-v1/contract.mjs';
import * as exportsApi from '../tabs/xml-cii-2019-standalone/xml-cii-restraint-audit-export.js';

// Explicit UI-only test doubles for DOM, Worker currency and local download.
// Real audit producers/parsers are exercised in xml-cii-restraint-audit.test.mjs.
class Element {
  constructor(tag,text=''){this.tagName=tag;this._text=text;this.children=[];this.dataset={};this.style={};this.listeners=new Map();}
  get textContent(){return this._text+this.children.map(n=>n.textContent).join('');}
  set textContent(v){this._text=String(v);this.children=[];}
  appendChild(n){this.children.push(n);return n;}
  append(...nodes){nodes.forEach(n=>this.appendChild(n));}
  replaceChildren(...nodes){this.children=[];this.append(...nodes);}
  setAttribute(k,v){this[k]=v;}
  addEventListener(k,fn){this.listeners.set(k,fn);}
  async fire(k){await this.listeners.get(k)?.({target:this});}
}
const find=(node,predicate)=>predicate(node)?node:node.children.map(n=>find(n,predicate)).find(Boolean);

async function fixture(panelOptions={}) {
  const downloads=[],control={current:true,onRead:null};
  const synthetic=exports=>new vm.SyntheticModule(Object.keys(exports),function(){
    for(const [key,value] of Object.entries(exports))this.setExport(key,value);
  });
  const stubs={
    './xml-cii-adapted-dom.js':synthetic({createElement:(tag,text)=>new Element(tag,text),
      downloadTextFile:(...args)=>downloads.push(args)}),
    '../xml-cii-restraint-audit-export.js':synthetic(exportsApi),
    '../../../contracts/gc-pw-v1/contract.mjs':synthetic({digestUtf8}),
    '../integration/xml229-engineering-basis-authority.mjs':synthetic({getXml229VerifiedEngineeringEntry:ref=>({session:ref.session})}),
    './xml229-native-run-context.mjs':synthetic({captureXml229NativeRunContext:()=>({isCurrent:()=>control.current})}),
    '../integration/xml229-native-final-observation.mjs':synthetic({readXml229NativeFinalObservation:async()=>{
      control.onRead?.();return {stale:false,completion:{basisId:'basis'},finalIntent:{intentSha256:'intent'}};
    }}),
  };
  const module=new vm.SourceTextModule(fs.readFileSync(new URL(
    '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-restraint-audit-panel.js',import.meta.url),'utf8'));
  await module.link(name=>{if(!stubs[name])throw Error('Unexpected UI dependency '+name);return stubs[name];});
  await module.evaluate();
  const report={schema:'XML229.RestraintAuditResult.v1',status:'VERIFIED',scope:'source restraints',
    privateOwnerLocalOnly:true,run:{basisId:'basis',finalIntentSha256:'intent'},
    output:{ciiSha256:await digestUtf8('actual cii')},summary:{recorded:1,verified:1,failed:0},
    records:[{target:{nodeNumber:'3610',branch:'/P/B1',branchOccurrenceIndex:0,sourceNodeOrdinal:1},
      restraintOrdinal:1,disposition:'ADDED',status:'VERIFIED',source:{kind:'staged-json',member:{name:'/PS-1.1.1',path:'$[0]'}},
      decision:{source:'source-description',rule:{id:'LINESTOP'}},fields:[{name:'Gap',before:null,after:'25',evidence:{raw:'25MM GAP'}}],
      observed:{gap:25,blockIndex:46,slotIndex:2,line:8166}}]};
  const stateRef={session:{},current:{sourceText:'XML',stagedJsonText:'[]',supportConfigJson:'{}',options:{},
    result:{ok:true,ciiText:'actual cii',restraintAudit:report}}};
  const root=new Element('section');module.namespace.renderRestraintAuditPanel(root,{stateRef,...panelOptions});
  return {api:module.namespace,root,report,stateRef,control,downloads};
}

test('saved field evidence is searchable and all three private downloads work',async()=>{
  const f=await fixture();
  assert.ok(f.root.textContent.includes('Block 46, slot 2, line 8166'));
  const search=find(f.root,n=>n.tagName==='input');search.value='not-present';await search.fire('input');
  assert.ok(f.root.textContent.includes('Showing 0 of 0'));
  search.value='3610';await search.fire('input');assert.ok(f.root.textContent.includes('25MM GAP'));
  for(const kind of ['json','csv','html'])await find(f.root,n=>n.dataset.action==='download-restraint-audit-'+kind).fire('click');
  assert.equal(f.downloads.length,3);assert.ok(f.downloads[0][1].includes('"privateOwnerLocalOnly": true'));
  assert.equal(f.downloads[1][2],'text/csv;charset=utf-8');assert.ok(f.downloads[2][1].startsWith('<!doctype html>'));
});

test('changed source/config, output bytes and stale Worker never download a current audit',async()=>{
  for(const change of [f=>{f.stateRef.current.sourceText='changed';},
    f=>{f.stateRef.current.supportConfigJson='{"changed":true}';},
    f=>{f.stateRef.current.result.ciiText='tampered';},f=>{f.control.current=false;}]) {
    const f=await fixture();change(f);
    await find(f.root,n=>n.dataset.action==='download-restraint-audit-json').fire('click');
    assert.equal(f.downloads.length,0);assert.ok(f.root.textContent.includes('stale or unavailable'));
  }
});

test('input change while the live Final challenge is pending blocks download',async()=>{
  const f=await fixture();f.control.onRead=()=>{f.stateRef.current.stagedJsonText='changed';};
  await find(f.root,n=>n.dataset.action==='download-restraint-audit-json').fire('click');
  assert.equal(f.downloads.length,0);
});

test('old runs explicitly show missing recorded evidence',async()=>{
  const f=await fixture(),root=new Element('section');
  f.stateRef.current.result={ok:true,ciiText:'old'};f.api.renderRestraintAuditPanel(root,{stateRef:f.stateRef});
  assert.ok(root.textContent.includes('No saved restraint decisions'));
  assert.equal(find(root,n=>!!n.dataset.action),undefined);
});

test('stale current-audit downloads stay blocked while explicitly labelled diagnostic JSON is available',async()=>{
  const f=await fixture({inspectCurrency:async()=>({current:false,code:'RUN_INPUTS_CHANGED',changed:['stagedJsonText']})});
  await find(f.root,n=>n.dataset.action==='download-restraint-audit-json').fire('click');
  assert.equal(f.downloads.length,0);assert.match(f.root.textContent,/RUN_INPUTS_CHANGED: stagedJsonText/);
  await find(f.root,n=>n.dataset.action==='download-recorded-audit-diagnostic').fire('click');
  assert.equal(f.downloads.length,1);
  const payload=JSON.parse(f.downloads[0][1]);assert.equal(payload.diagnosticOnly,true);
  assert.equal(payload.status,'RECORDED_DIAGNOSTIC');assert.equal(payload.currency.current,false);
  assert.equal(payload.currency.code,'RUN_INPUTS_CHANGED');
  assert.equal(payload.recordedReport.records[0].target.nodeNumber,'3610');
});
