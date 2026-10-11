import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { renderStandaloneResolverJsonTracePanel } from '../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-json-trace.js';

// Synthetic DOM/rows exercise the *actual shipping renderer* only; these are
// NOT Owner originals or independent engineering semantic qualification.
class Element {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.attrs = {};
    this.listeners = new Map();
    this.classList = { toggle() {} };
    this._text = '';
    this.parentNode = null;
  }
  set textContent(value) { this._text = String(value); this.children = []; }
  get textContent() {
    return this._text + this.children.map(c => typeof c === 'string' ? c : c.textContent).join('');
  }
  append(...children) {
    for (const c of children) {
      if (typeof c !== 'string') c.parentNode = this;
      this.children.push(c);
    }
  }
  appendChild(c) { this.append(c); return c; }
  replaceWith(node) {
    assert.ok(this.parentNode, 'replacing a detached node');
    const idx = this.parentNode.children.indexOf(this);
    assert.ok(idx >= 0, 'replaced node belongs to parent');
    node.parentNode = this.parentNode;
    this.parentNode.children[idx] = node;
    this.parentNode = null;
  }
  setAttribute(key, value) { this.attrs[key] = String(value); }
  addEventListener(name, cb) {
    this.listeners.set(name, [...(this.listeners.get(name) || []), cb]);
  }
  emit(name) { for (const cb of this.listeners.get(name) || []) cb({target:this}); }
  find(pred) {
    if (pred(this)) return this;
    for (const c of this.children) {
      if (typeof c !== 'string') {
        const result = c.find(pred);
        if (result) return result;
      }
    }
    return null;
  }
  querySelector(selector) {
    assert.equal(selector, 'tbody', 'only expected selector in production pager');
    return this.find(e => e.tagName === 'TBODY');
  }
}
globalThis.document = { createElement: tag => new Element(tag) };
function setup(state) {
  const root = new Element('div');
  renderStandaloneResolverJsonTracePanel(root, state, {current:state}, () => {});
  return root;
}
function ui(root) {
  const filter = root.find(e => e.tagName === 'INPUT' && e.type === 'search');
  const range = root.find(e => e.dataset.field === 'table-visible-range');
  const next = root.find(e => e.dataset.action === 'table-next-page');
  const prev = root.find(e => e.dataset.action === 'table-previous-page');
  const table = root.find(e => e.tagName === 'TABLE');
  assert.ok(filter && range && next && prev && table, 'search and bounded table pager rendered');
  return { filter, range, next, prev, table };
}
function trRows(table) {
  return table.querySelector('tbody').children.filter(x => typeof x !== 'string' && x.tagName === 'TR');
}
function state(tab, result, evidence) {
  return {
    sourceKind:'xml', stagedJsonText:'', jsonTraceActiveSubTabId:tab,
    resolverSourceMode:'lfj-indexed-preview',
    resolverJsonTraceResult:result,
    lfjIndexedPreview:{ evidenceTreeRows:evidence, nodeWiseRows:[] },
    lfjIndexedExportOptIn:false, lfjIndexedExportReceipt:null,
    resolverJsonTraceRunning:false,
  };
}
test('indexed evidence searches tail beyond 1000 DOM rows while preserving source order', () => {
  const input = Object.freeze(Array.from({length:1003}, (_,i) => Object.freeze({
    branch:'B', bore:'100', sourceNodeNo:i%2 ? -1 : i, position:'E=0',
    objectType:'PIPE', dtxrPos:'POS'+i, name:'PS'+i,
    cmpSupGap:'', componentRefNo:'', sourcePath:'/PLANT/EVIDENCE/'+i
  })));
  const {filter,range,next,prev,table} = ui(setup(state('tree',null,input)));
  assert.equal(filter.attrs['aria-label'], 'Filter indexed evidence across all source paths and values');
  assert.equal(range.attrs['aria-live'],'polite');
  assert.equal(trRows(table).length,1000);
  assert.match(range.textContent,/Showing 1–1000 of 1003 original rows/);
  assert.equal(prev.disabled,true);
  next.emit('click');
  assert.equal(trRows(table).length,3);
  assert.match(trRows(table)[2].textContent,/\/PLANT\/EVIDENCE\/1002/);
  assert.match(range.textContent,/Showing 1001–1003 of 1003 original rows/);
  filter.value='evidence/1002'; filter.emit('input');
  assert.equal(trRows(table).length,1);
  assert.match(trRows(table)[0].textContent,/\/PLANT\/EVIDENCE\/1002/);
  assert.match(range.textContent,/Showing 1–1 of 1 \(filtered from 1003 original rows\)/);
  assert.equal(next.disabled,true);
  filter.value='not-present-anywhere'; filter.emit('input');
  assert.equal(trRows(table).length,0);
  assert.match(range.textContent,/0–0 of 0 .*no matching rows/);
  filter.value=''; filter.emit('input');
  assert.equal(trRows(table).length,1000);
  assert.match(range.textContent,/of 1003 original rows/);
  assert.equal(input[1002].sourcePath,'/PLANT/EVIDENCE/1002');
  assert.equal(input[1001].sourceNodeNo,-1);
});
test('matched and rejected facts have independent full-row filters', () => {
  for (const [tab,prop] of [['matched','matchedFacts'],['rejected','rejectedFacts']]) {
    const facts = Object.freeze(Array.from({length:1002},(_,i)=> Object.freeze({
      sourcePaths:['/FACTS/'+tab+'/'+i], nodeKey:i===1001?'-1':String(i),
      psKey:'PS'+i,posKey:'POS'+i,hitCount:1
    })));
    const {filter,range,table}=ui(setup(state(tab,{[prop]:facts},[])));
    assert.equal(trRows(table).length,1000);
    filter.value='/facts/'+tab+'/1001';filter.emit('input');
    assert.equal(trRows(table).length,1);
    assert.ok(trRows(table)[0].textContent.includes('/FACTS/'+tab+'/1001'));
    assert.match(range.textContent,/filtered from 1002 original rows/);
    assert.equal(facts[1001].nodeKey,'-1');
  }
});
test('source reviewer renderer equals authored docs mirror byte-for-byte', async () => {
  const source=await readFile(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-json-trace.js',import.meta.url));
  const docs=await readFile(new URL('../docs/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-json-trace.js',import.meta.url));
  assert.deepEqual(source,docs);
});

test('legacy evidence tree preserves source markup literally without active HTML nodes', () => {
  const unsafe = '<img src=x onerror=window.__a3Injected=1>';
  const branchUnsafe = '/ZONE<svg/onload=window.__a3Injected=1>/B1';
  const result = { matchedFacts: [{
    hitCount:1, branchName:branchUnsafe,
    stagedBore:'25'+unsafe, posKey:'PS-'+unsafe,
    positionMembers:[{ capturedFields:{ DTXR:unsafe }, name:unsafe }],
  }]};
  const stateLegacy={...state('tree',result,[]),resolverSourceMode:'legacy'};
  const root=setup(stateLegacy);
  const tree=root.find(e=>e.className==='xml-cii-tree-container');
  assert.ok(tree,'legacy collapsible evidence tree is present');
  assert.ok(tree.textContent.includes(branchUnsafe.replace(/\/B1$/, '')));
  assert.ok(tree.textContent.includes('25'+unsafe));
  assert.ok(tree.textContent.includes('PS-'+unsafe));
  assert.ok(tree.textContent.includes(unsafe),'source member text is still visible');
  assert.equal(root.find(e=>['IMG','SVG','SCRIPT','IFRAME'].includes(e.tagName)),null,
    'untrusted source strings must never materialize HTML elements');
  let details=0,summaries=0;
  function walk(el) {
    if(el.tagName==='DETAILS')details++;
    if(el.tagName==='SUMMARY')summaries++;
    for(const c of el.children)if(typeof c!=='string')walk(c);
  }
  walk(tree);
  assert.equal(details,3,'branch/bore/position remain collapsible');
  assert.equal(summaries,3,'all three source-group labels remain displayed');
});
