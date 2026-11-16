import test from 'node:test';
import assert from 'node:assert/strict';
import {assertNativeXml229RestraintReviewClear}
 from '../tabs/xml-cii-2019-standalone/integration/xml229-native-restraint-review-gate.mjs';
import {recordPreviewRestraintReview,lastPreviewRestraintReview,
 recordPreviewFailure,lastPreviewFailure,showPreviewRestraintStatus,showIndependentRestraintStatus}
 from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-failure-notice.js';

const conflicted={
 schema:'XML229.PreviewRestraintReview.v1',status:'FOR_REVIEW',
 engineeringRestraintAcceptance:'HOLD',quarantinedXmlNodeCount:1,
 warnings:[{
  code:'PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT',
  nodeNumber:'140',branchName:'/ASIM-1840-3"/B1',
  member:{name:'/SL-1840203.1.2',path:'$[0].children[2]'},
  message:'NODETYPE=14 REST conflicts with ST501/LS-S2-3 LINESTOP 35mm',
 }],
};
const clear={
 schema:'XML229.PreviewRestraintReview.v1',status:'CLEAR',
 engineeringRestraintAcceptance:'NOT_ASSESSED',quarantinedXmlNodeCount:0,warnings:[],
};
test('native Final rejects quarantined Preview receipt and missing/forged status',()=>{
 for(const specimen of [conflicted,null,{},{
   ...clear,warnings:conflicted.warnings,
 },{...clear,engineeringRestraintAcceptance:'HOLD'}]){
  assert.throws(()=>assertNativeXml229RestraintReviewClear(specimen),
   {code:'NATIVE_RESTRAINT_REVIEW_HOLD'});
 }
 assert.equal(assertNativeXml229RestraintReviewClear(clear),true);
});

class MockPanel{
 constructor(){this.nodes=[];this.dataset={};this.isConnected=true;this.children=this.nodes;}
 querySelector(selector){
  const key=selector==='[data-preview-blocker]'?'previewBlocker':
   selector==='[data-preview-restraint-review]'?'previewRestraintReview':'invalid';
  return this.nodes.find(node=>node.dataset[key])||null;
 }
 append(node){node.owner=this;this.nodes.push(node);}
}
class MockElement{
 constructor(){this.dataset={};this.attributes={};this.style={};this.textContent='';}
 setAttribute(key,value){this.attributes[key]=value;}
 remove(){if(this.owner){this.owner.nodes=this.owner.nodes.filter(x=>x!==this);}}
}
test('O1 displays FOR_REVIEW without a Preview failure or source-rights block',()=>{
 const old=globalThis.document;
 globalThis.document={createElement:()=>new MockElement()};
 try{
  recordPreviewFailure(null);recordPreviewRestraintReview(conflicted);
  const panel=new MockPanel();showPreviewRestraintStatus(panel);
  assert.equal(lastPreviewFailure(),null);
  assert.equal(lastPreviewRestraintReview().status,'FOR_REVIEW');
  assert.equal(panel.querySelector('[data-preview-blocker]'),null);
  const warning=panel.querySelector('[data-preview-restraint-review]');
  assert.ok(warning);
  assert.match(warning.textContent,/For Review/);
  assert.match(warning.textContent,/Node 140/);
  assert.match(warning.textContent,/Final CII blocked/);
  assert.equal(warning.attributes.role,'status');
  recordPreviewRestraintReview(null);
  showPreviewRestraintStatus(panel);
  assert.equal(panel.querySelector('[data-preview-restraint-review]'),null);
 }finally{
  recordPreviewRestraintReview(null);recordPreviewFailure(null);
  globalThis.document=old;
 }
});
test('genuine strict Preview error still paints a blocker, independent of quarantine',()=>{
 const old=globalThis.document;globalThis.document={createElement:()=>new MockElement()};
 try{
  const panel=new MockPanel();
  recordPreviewFailure({code:'PREFINAL_RESTRAINT_SOURCE_DRIFT',message:'Source mismatch'});
  showPreviewRestraintStatus(panel);
  assert.match(panel.querySelector('[data-preview-blocker]')?.textContent||'',/Preview blocked/);
 }finally{recordPreviewFailure(null);globalThis.document=old;}
});

test('O1 local clear receipt never inherits an earlier Preview HOLD',()=>{
 const old=globalThis.document;globalThis.document={createElement:()=>new MockElement()};
 try{
  recordPreviewRestraintReview(conflicted);
  const panel=new MockPanel();
  showIndependentRestraintStatus(panel,clear);
  assert.equal(panel.querySelector('[data-preview-restraint-review]'),null);
  assert.equal(lastPreviewRestraintReview().status,'FOR_REVIEW');
 }finally{recordPreviewRestraintReview(null);globalThis.document=old;}
});
