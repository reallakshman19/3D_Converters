import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {installWeightBasisXmlDom} from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {prepareXml229PrefinalRestraints} from '../tabs/xml-cii-2019-standalone/integration/xml229-prefinal-restraints.mjs';
import {createDefaultResolverJsonTraceConfig, runStandaloneResolverJsonTrace}
  from '../tabs/xml-cii-2019-standalone/xml-cii-resolver-json-trace.js';

installWeightBasisXmlDom(globalThis);
const XML = '<PipeStressExport><Pipe><Branch><Branchname>/TEST/B1</Branchname>'
  + '<Node><NodeNumber>140</NodeNumber><NodeName>PS140</NodeName>'
  + '<ComponentType>ANCI</ComponentType><Position>0 0 100000</Position>'
  + '<OutsideDiameter>88.9</OutsideDiameter><WallThickness>3</WallThickness></Node>'
  + '</Branch></Pipe></PipeStressExport>';
const staged = JSON.stringify([{type:'BRANCH',name:'/TEST/B1',children:[
  {type:'SUPPORT',name:'SUPPORT PS140',attributes:{POSI:'0 0 0',DTXR:'REST',NAME:'/PS999',
    MDSSUPPTYPE:'GT571',SUPPORT_KIND:'REST',NODETYPE:'17',NODEGAP:'0'}},
]}]);
const config = (offset=true, tolerance=1, mutate=true) => ({
  dtxrPositionOffset:{enabled:offset,xOffset:0,yOffset:0,zOffset:100000},
  resolverJsonTrace:{coordinateTolerance:tolerance},
  jsonTrace:{coordinateTolerance:tolerance},
  inputXmlRestraintTypeMutation:{enabled:mutate,rows:[{label:'+Y',from:'17',to:'14'}]},
  defaultGap:6,
});
const rows=doc=>{
  const n=[...doc.getElementsByTagName('Node')].find(x=>x.getElementsByTagName('NodeNumber')[0]?.textContent==='140');
  return [...n.getElementsByTagName('Restraint')].map(r=>Object.fromEntries(
    ['Type','Gap'].map(k=>[k,r.getElementsByTagName(k)[0]?.textContent])));
};
test('Datum U offset starts disabled but suggests 100000 mm', ()=>{
  const c=createDefaultResolverJsonTraceConfig();
  assert.equal(c.dtxrPositionOffset.enabled,false);
  assert.equal(c.dtxrPositionOffset.zOffset,100000);
});
test('resolver Save carries Datum through browser and native config', ()=>{
  const c=config().dtxrPositionOffset;
  const result=runStandaloneResolverJsonTrace({
    sourceText:XML,stagedJsonText:staged,supportConfigJson:'{}',
    jsonConfig:{...createDefaultResolverJsonTraceConfig(),coordinateTolerance:1,dtxrPositionOffset:c},
  });
  const saved=JSON.parse(result.supportConfigJson);
  assert.deepEqual(saved.dtxrPositionOffset,c);
  assert.deepEqual(saved.jsonTrace.dtxrPositionOffset,c);
  assert.equal(saved.jsonTrace.coordinateTolerance,1);
});
test('governed source match requires configured Datum and tolerance; NODETYPE mutation applies', async ()=>{
  const enabled=await prepareXml229PrefinalRestraints({xmlText:XML,stagedJsonText:staged,config:config()});
  assert.deepEqual(rows(enabled.document),[{Type:'+Y',Gap:'0'}]);
  const disabled=await prepareXml229PrefinalRestraints({xmlText:XML,stagedJsonText:staged,config:config(false)});
  assert.deepEqual(rows(disabled.document),[]);
  const unchanged=await prepareXml229PrefinalRestraints({xmlText:XML,stagedJsonText:staged,config:config(true,1,false)});
  assert.deepEqual(rows(unchanged.document),[{Type:'17',Gap:'0'}]);
});
test('source without qualified position remains unmatched even with Datum',async()=>{
  const other=staged.replace('"POSI":"0 0 0"', '"POSI":"3 0 0"');
  const result=await prepareXml229PrefinalRestraints({xmlText:XML,stagedJsonText:other,config:config(true,1)});
  assert.deepEqual(rows(result.document),[]);
});
test('UI exposes Datum and existing tolerance as independent controls',()=>{
  const ui=readFileSync(fileURLToPath(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-resolver-json-trace.js',import.meta.url)),'utf8');
  const events=readFileSync(fileURLToPath(new URL('../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-events.js',import.meta.url)),'utf8');
  for(const key of ['resolver-datum-offset-enabled','resolver-datum-offset-u-mm','resolver-coordinate-tolerance'])
    assert.ok(ui.includes(key)&&events.includes(key),key);
});

test('conflicting co-positioned NODETYPE mutations require review',async()=>{
  const source=JSON.parse(staged);
  source[0].children.push({...source[0].children[0],attributes:{
    ...source[0].children[0].attributes,NODETYPE:'8',
  }});
  await assert.rejects(
    prepareXml229PrefinalRestraints({xmlText:XML,stagedJsonText:JSON.stringify(source),config:config()}),
    {code:'PREFINAL_RESTRAINT_TYPE_AMBIGUOUS'});
});
