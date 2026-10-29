import test from 'node:test';
import assert from 'node:assert/strict';
import {installWeightBasisXmlDom} from '../tabs/xml-cii-2019-standalone/workers/weight-basis-xml-dom.js';
import {closeGovernedAttaDefaultRestraints} from '../converters/xml-cii2019-core/atta-default-restraint-closure.js';
import {defaultSupportKindProfiles} from '../converters/xml-cii2019-core/support-mapping-config.js';
installWeightBasisXmlDom(globalThis);
const source='<PipeStressExport><Pipe><Branch><Branchname>B</Branchname><Node><NodeNumber>50</NodeNumber><NodeName>PS/DATUM</NodeName><ComponentType>ATTA</ComponentType><Position>459657.72 -1481227.40 101259.55</Position></Node></Branch></Pipe></PipeStressExport>';
const field=(p,k)=>p.getElementsByTagName(k)[0]?.textContent;
test('missing Datum REST gets configured stiffness, zero friction, gap and +Y without moving its node',()=>{
 const d=new DOMParser().parseFromString(source,'application/xml');
 const result=closeGovernedAttaDefaultRestraints(d,{defaultStiffness:123456,defaultFriction:0,defaultGap:7});
 assert.equal(result.stats.attaDefaultRestRestraintsAdded,1);
 const r=d.getElementsByTagName('Restraint')[0];
 assert.equal(field(r,'Type'),'+Y');assert.equal(field(r,'Stiffness'),'123456');
 assert.equal(field(r,'Friction'),'0');assert.equal(field(r,'Gap'),'7');
 assert.equal(field(r,'DirectionCosineY'),'1.000000000');
 assert.equal(field(d,'Position'),'459657.72 -1481227.40 101259.55');
 assert.equal(closeGovernedAttaDefaultRestraints(d,{}).changed,false);
});
test('disabled mapping and explicit source restraint are preserved',()=>{
 const disabled=new DOMParser().parseFromString(source,'application/xml');
 assert.equal(closeGovernedAttaDefaultRestraints(disabled,{useRestraintTypeBasedOnJson:false}).changed,false);
 const explicit=source.replace('</Node>','<Restraint><Type>X</Type><Stiffness>99</Stiffness><Gap>2</Gap></Restraint></Node>');
 const d=new DOMParser().parseFromString(explicit,'application/xml');
 assert.equal(closeGovernedAttaDefaultRestraints(d,{defaultGap:7}).changed,false);
 assert.equal(field(d,'Type'),'X');assert.equal(field(d,'Gap'),'2');
 assert.equal(defaultSupportKindProfiles({defaultGap:7}).REST.gap,'7');
});
