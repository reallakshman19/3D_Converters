import assert from 'node:assert/strict';
import test from 'node:test';

class SimpleElement {
  constructor(name) {
    this.nodeName = name;
    this.localName = name;
    this.nodeType = 1;
    this.namespaceURI = null;
    this.attributes = new Map();
    this.children = [];
    this.childNodes = this.children;
    this.parentNode = null;
    this._textContent = '';
  }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  appendChild(child) {
    if (child.parentNode && child.parentNode !== this) {
      const index = child.parentNode.children.indexOf(child);
      if (index >= 0) child.parentNode.children.splice(index, 1);
    }
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }
  get textContent() { return this.children.length ? this.children.map((child) => child.textContent).join('') : this._textContent; }
  set textContent(value) { this.children.length = 0; this._textContent = String(value ?? ''); }
}

function collectByName(node, name, out = []) {
  if (!node) return out;
  if (node.nodeName === name) out.push(node);
  for (const child of node.children || []) collectByName(child, name, out);
  return out;
}

class SimpleDocument {
  constructor(rootElement) {
    this.documentElement = rootElement;
    this.children = rootElement ? [rootElement] : [];
    this.childNodes = this.children;
  }
  createElement(name) { return new SimpleElement(name); }
  createElementNS(_namespace, name) { return new SimpleElement(name); }
  querySelector(selector) { return selector === 'parsererror' ? null : null; }
  getElementsByTagName(name) { return collectByName(this.documentElement, name, []); }
}

function decodeEntities(value) {
  return String(value).replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
}

function parseAttributes(source, element) {
  const pattern = /([A-Za-z_][\w:.-]*)\s*=\s*"([^"]*)"/g;
  let match;
  while ((match = pattern.exec(source))) element.setAttribute(match[1], decodeEntities(match[2]));
}

function parseXml(xmlText) {
  const source = String(xmlText).replace(/^\s*<\?xml[^>]*>\s*/i, '');
  const tokenPattern = /<[^>]+>|[^<]+/g;
  const stack = [];
  let documentRoot = null;
  let token;
  while ((token = tokenPattern.exec(source))) {
    const part = token[0];
    if (!part.trim() || part.startsWith('<!--') || part.startsWith('<?')) continue;
    if (part.startsWith('</')) { stack.pop(); continue; }
    if (part.startsWith('<')) {
      const selfClosing = /\/>\s*$/.test(part);
      const body = part.slice(1, selfClosing ? -2 : -1).trim();
      const name = body.match(/^([^\s/>]+)/)?.[1];
      if (!name) continue;
      const element = new SimpleElement(name);
      parseAttributes(body.slice(name.length), element);
      if (!documentRoot) documentRoot = element;
      if (stack.length) stack[stack.length - 1].appendChild(element);
      if (!selfClosing) stack.push(element);
      continue;
    }
    if (stack.length) stack[stack.length - 1]._textContent += decodeEntities(part);
  }
  return new SimpleDocument(documentRoot);
}

function escapeText(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(value) {
  return escapeText(value).replace(/"/g, '&quot;');
}

function serializeNode(node) {
  const attrs = Array.from(node.attributes.entries()).map(([name, value]) => ` ${name}="${escapeAttr(value)}"`).join('');
  if (!node.children.length && !node._textContent) return `<${node.nodeName}${attrs}/>`;
  const body = `${node._textContent ? escapeText(node._textContent) : ''}${node.children.map(serializeNode).join('')}`;
  return `<${node.nodeName}${attrs}>${body}</${node.nodeName}>`;
}

globalThis.DOMParser = class { parseFromString(value) { return parseXml(value); } };
globalThis.XMLSerializer = class { serializeToString(value) { return value instanceof SimpleDocument ? serializeNode(value.documentElement) : serializeNode(value); } };

const { closeGovernedMdsPositionRestraintsXml } = await import(
  '../tabs/xml-cii-2019-standalone/xml-cii-mds-restraint-closure.js'
);

const BRANCH_ROOT = '/ASIM-1847-3"-S8810332-91261M7-01';
const POSITION = '661955.84 3934222.04 101100.00';
const XML = `<?xml version="1.0"?><CAESARII><Branch><Branchname>${BRANCH_ROOT}/B1</Branchname><Node><NodeNumber>280</NodeNumber><NodeName>SL-1847009.2.1</NodeName><ComponentType>ANCI</ComponentType><Position>${POSITION}</Position><Restraint><Type>+Y</Type><Stiffness>1751270031350</Stiffness><Gap>0</Gap><Friction>0.3</Friction></Restraint></Node></Branch></CAESARII>`;
const STAGED = JSON.stringify([{
  type: 'BRANCH',
  name: BRANCH_ROOT,
  children: [{
    type: 'DTXR_POS',
    attributes: { POSI: POSITION },
    children: [
      { type: 'REST', name: 'REST', attributes: { DTXR: 'REST', SPRE: '/MDS-Ancillaries/ANCI/PIPE-REST-80mm', MDSSUPPTYPE: 'PIPE-REST', NAME: '/SL-1847009.2.1' } },
      { type: '/MDS-Ancillaries/ANCI/AT503-80mm', attributes: { MDSSUPPTYPE: 'AT503', NAME: '/SL-1847009.1.1' } },
      { type: '/MDS-Ancillaries/ANCI/GT500-80mm', attributes: { MDSSUPPTYPE: 'GT500', NAME: '/SL-1847009.1.2' } },
      { type: '/MDS-Ancillaries/ANCI/ST501-80mm', attributes: { MDSSUPPTYPE: 'ST501', NAME: '/SL-1847009.1.3' } },
    ],
  }],
}]);

const CONFIG = {
  defaultStiffness: '1751270000000',
  defaultGap: '0',
  defaultFriction: '0.3',
  resolverJsonTrace: { coordinateTolerance: 6 },
};

function restraintTypes(xmlText) {
  const document = parseXml(xmlText);
  return document.getElementsByTagName('Restraint')
    .map((restraint) => restraint.children.find((child) => child.nodeName === 'Type')?.textContent || '');
}

test('Node 280 position group materializes +Y, GUI, and LIM without overwriting +Y', () => {
  const result = closeGovernedMdsPositionRestraintsXml(XML, STAGED, CONFIG);
  assert.equal(result.changed, true);
  assert.deepEqual(restraintTypes(result.xmlText), ['+Y', 'GUI', 'LIM']);
  assert.equal(result.stats.mdsGuideRestraintsAdded, 1);
  assert.equal(result.stats.mdsLineStopRestraintsAdded, 1);
  assert.equal(result.stats.mdsRestRestraintsAdded, 0);
  assert.match(result.xmlText, /<Stiffness>1751270031350<\/Stiffness>/);
});

test('MDS position restraint closure is idempotent', () => {
  const first = closeGovernedMdsPositionRestraintsXml(XML, STAGED, CONFIG);
  const second = closeGovernedMdsPositionRestraintsXml(first.xmlText, STAGED, CONFIG);
  assert.equal(second.changed, false);
  assert.deepEqual(restraintTypes(second.xmlText), ['+Y', 'GUI', 'LIM']);
});

test('explicit JSON-restraint disablement remains authoritative', () => {
  const result = closeGovernedMdsPositionRestraintsXml(XML, STAGED, {
    ...CONFIG,
    supportMapping: { version: 2, useJsonForRestraints: false, rules: [], kindProfiles: {} },
  });
  assert.equal(result.changed, false);
  assert.deepEqual(restraintTypes(result.xmlText), ['+Y']);
});


const BM3_LINE = '/ASIM-1840-3"-S8810389-91261M7-01';
const BM3_POS = {x:1032747.41,y:1991704.95,z:1100};
const BM3_XML = '<CAESARII><Branch><Branchname>' + BM3_LINE + '/B1</Branchname>' +
  '<Node><NodeNumber>140</NodeNumber><NodeName>SL-1840203.2.1</NodeName>' +
  '<ComponentType>ANCI</ComponentType><Position>1032747.41 1991704.95 101100</Position>' +
  '<Restraint><Type>+Y</Type><Gap>0</Gap><Stiffness>1000</Stiffness></Restraint>' +
  '</Node></Branch></CAESARII>';
function bm3Item(name, func, code, cmp, gap) {
  return {type:'SUPPORT',name:'SUPPORT SL-1840203 (REF)',attributes:{
    NAME:name,POS:BM3_POS,CMPSUPREFN:'SL-1840203 (REF)',
    MDSSUPPFUNC:func,MDSSUPPTYPE:code,CMPSUPTYPE:cmp,
    CMPSUPGAP:gap,NODETYPE:'14',NODEGAP:'0',SUPPORT_KIND:'REST',
    SUPPORT_MAPPER_KIND:'REST',SUPPORT_TYPE:'REST',
  }};
}
const BM3_MEMBERS=[
  bm3Item('/SL-1840203.2.1','PIPE-REST','PIPE-REST','REST',''),
  bm3Item('/SL-1840203.1.1','AT','AT503','SH-A4-3-CS-950-200 / WP-A1-3',''),
  bm3Item('/SL-1840203.1.2','ST','ST501','LS-S2-3','GAP=35mm'),
  bm3Item('/SL-1840203.1.3','GT','GT500','PG-S-3','GAP=10mm'),
];
const BM3_JSON = JSON.stringify([{type:'BRANCH',name:BM3_LINE+'/B1',children:BM3_MEMBERS}]);
const BM3_CONFIG={defaultStiffness:1000,defaultGap:0,defaultFriction:0.3,
  resolverJsonTrace:{matchMode:'POS',coordinateTolerance:6},
  dtxrPositionOffset:{enabled:true,xOffset:0,yOffset:0,zOffset:100000}};
function reviewFor(member,kind,evidenceRef) {
  return {memberName:member.attributes.NAME,kind,approved:true,
    approvedBy:'synthetic-regression-owner',evidenceRef,
    expected:Object.fromEntries(['NAME','NODETYPE','MDSSUPPFUNC','MDSSUPPTYPE',
      'CMPSUPTYPE','CMPSUPGAP'].map(k=>[k,member.attributes[k]||'']))};
}
test('BM3 review quarantines conflicting ST501/GT500 and preserves original REST',()=>{
  const out=closeGovernedMdsPositionRestraintsXml(BM3_XML,BM3_JSON,BM3_CONFIG,
    {requireUnambiguous:true,conflictPolicy:'quarantine'});
  assert.equal(out.changed,false);
  assert.deepEqual(restraintTypes(out.xmlText),['+Y']);
  assert.equal(out.engineeringRestraintAcceptance,'HOLD');
  assert.deepEqual(out.warnings.map(w=>w.candidateKind).sort(),['GUIDE','LINESTOP']);
  assert.deepEqual(out.warnings.map(w=>w.member.fields.NAME).sort(),
    ['/SL-1840203.1.2','/SL-1840203.1.3']);
  assert.equal(out.restraintAudit.warnings.length,2);
  assert.equal(out.warnings.every(w=>w.code==='PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT'),true);
});
test('BM3 strict Final rejects unapproved ST501 conflict, no silent REST gap overwrite',()=>{
  assert.throws(()=>closeGovernedMdsPositionRestraintsXml(BM3_XML,BM3_JSON,BM3_CONFIG,
    {requireUnambiguous:true}),error=>error.code==='PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT');
});
test('BM3 exact approved member receipts can resolve LIM 35 mm and GUI 10 mm',()=>{
  const config={...BM3_CONFIG,xml229RestraintKindOverrides:[
    reviewFor(BM3_MEMBERS[2],'LINESTOP','synthetic-fixture:ST501-35'),
    reviewFor(BM3_MEMBERS[3],'GUIDE','synthetic-fixture:GT500-10')]};
  const out=closeGovernedMdsPositionRestraintsXml(BM3_XML,BM3_JSON,config,
    {requireUnambiguous:true});
  assert.equal(out.warnings.length,0);
  assert.deepEqual(restraintTypes(out.xmlText),['+Y','GUI','LIM']);
  const restraints=parseXml(out.xmlText).getElementsByTagName('Restraint');
  assert.equal(restraints.find(r=>r.children.find(c=>c.nodeName==='Type').textContent==='LIM')
    .children.find(c=>c.nodeName==='Gap').textContent,'35');
  assert.equal(restraints.find(r=>r.children.find(c=>c.nodeName==='Type').textContent==='GUI')
    .children.find(c=>c.nodeName==='Gap').textContent,'10');
});
test('BM3 receipt cannot authorize drifted staged gap or MDS source identity',()=>{
  const config={...BM3_CONFIG,xml229RestraintKindOverrides:[
    reviewFor(BM3_MEMBERS[2],'LINESTOP','synthetic-fixture:ST501-35'),
    reviewFor(BM3_MEMBERS[3],'GUIDE','synthetic-fixture:GT500-10')]};
  const altered=JSON.parse(BM3_JSON);
  altered[0].children[2].attributes.CMPSUPGAP='GAP=40mm';
  assert.throws(()=>closeGovernedMdsPositionRestraintsXml(BM3_XML,JSON.stringify(altered),config,
    {requireUnambiguous:true}),error=>error.code==='PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT');
});

test('gapless ST501 remains independently conflicted, and cannot be approved as a guessed zero gap',()=>{
  const members=JSON.parse(BM3_JSON);
  members[0].children[2].attributes.CMPSUPGAP='';
  const input=JSON.stringify(members);
  const review=closeGovernedMdsPositionRestraintsXml(BM3_XML,input,BM3_CONFIG,
    {requireUnambiguous:true,conflictPolicy:'quarantine'});
  assert.equal(review.warnings.some(w=>w.member?.fields?.NAME==='/SL-1840203.1.2' &&
    w.candidateKind==='LINESTOP'),true);
  const config={...BM3_CONFIG,xml229RestraintKindOverrides:[
    reviewFor(members[0].children[2],'LINESTOP','synthetic-gapless-proposal'),
    reviewFor(BM3_MEMBERS[3],'GUIDE','synthetic-fixture:GT500-10')]};
  assert.throws(()=>closeGovernedMdsPositionRestraintsXml(BM3_XML,input,config,
    {requireUnambiguous:true}),error=>error.code==='PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT');
});

const {prepareXml229PrefinalRestraints} = await import(
 '../tabs/xml-cii-2019-standalone/integration/xml229-prefinal-restraints.mjs'
);

test('production BM3 pre-Final Preview quarantines ST501/GT500 without changing original REST',async()=>{
 const preview=await prepareXml229PrefinalRestraints({
   xmlText:BM3_XML,stagedJsonText:BM3_JSON,config:BM3_CONFIG,policy:'preview',
 });
 assert.equal(preview.restraintReview.schema,'XML229.PreviewRestraintReview.v1');
 assert.equal(preview.restraintReview.status,'FOR_REVIEW');
 assert.equal(preview.restraintReview.engineeringRestraintAcceptance,'HOLD');
 assert.equal(preview.restraintReview.warnings.length,2);
 assert.equal(preview.restraintReview.quarantinedXmlNodeCount,1);
 assert.deepEqual(preview.restraintReview.warnings.map(w=>w.member.fields.NAME).sort(),
  ['/SL-1840203.1.2','/SL-1840203.1.3']);
 assert.deepEqual(preview.document.getElementsByTagName('Restraint').map(r=>
  r.children.find(c=>c.nodeName==='Type')?.textContent),['+Y']);
 assert.equal(preview.proof.restraintAudit.warnings.length,2);
 await assert.rejects(prepareXml229PrefinalRestraints({
  xmlText:BM3_XML,stagedJsonText:BM3_JSON,config:BM3_CONFIG,
 }),{code:'PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT'});
});

test('quarantined unmatched ATTA cannot get an invented fallback restraint',async()=>{
 const xml=BM3_XML.replace('<ComponentType>ANCI</ComponentType>','<ComponentType>ATTA</ComponentType>')
  .replace(/<Restraint>.*?<\/Restraint>/,'');
 const members=[{type:'BRANCH',name:BM3_LINE+'/B1',children:[BM3_MEMBERS[2]]}];
 const preview=await prepareXml229PrefinalRestraints({
  xmlText:xml,stagedJsonText:JSON.stringify(members),config:BM3_CONFIG,
  policy:'preview',
 });
 assert.equal(preview.restraintReview.status,'FOR_REVIEW');
 assert.equal(preview.document.getElementsByTagName('Restraint').length,0);
 assert.equal(preview.stats.attaDefaultRestRestraintsAdded,0);
});

test('ATT proposed NODETYPE cannot hide original BM3 ST/GT classification conflicts',()=>{
 const synthetic=JSON.parse(BM3_JSON);
 for(const [index,proposed] of [[2,'9'],[3,'8']]){
  const a=synthetic[0].children[index].attributes;
  a.SOURCE_NODETYPE='14';a.NODETYPE=proposed;
  a.NODETYPE_CLASSIFICATION_SOURCE='STEP7_SUPPORT_MAPPING';
 }
 const json=JSON.stringify(synthetic);
 const review=closeGovernedMdsPositionRestraintsXml(BM3_XML,json,BM3_CONFIG,
  {requireUnambiguous:true,conflictPolicy:'quarantine'});
 assert.equal(review.engineeringRestraintAcceptance,'HOLD');
 assert.deepEqual(review.warnings.map(w=>w.candidateKind).sort(),['GUIDE','LINESTOP']);
 assert.deepEqual(review.warnings.map(w=>w.member.fields.NAME).sort(),
  ['/SL-1840203.1.2','/SL-1840203.1.3']);
 assert.throws(()=>closeGovernedMdsPositionRestraintsXml(BM3_XML,json,BM3_CONFIG,
  {requireUnambiguous:true}),{code:'PREFINAL_RESTRAINT_TYPE_KIND_CONFLICT'});
});
