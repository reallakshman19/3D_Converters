/**
 * NEXT-08A B1 read-only product-seam characterization.
 * No B1 source edit or fabricated engineering-ready attestations.
 * The input-basis hash changing is NOT the same as selecting an original zone.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {createPreviewButtonBasis} from '../../tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-facts-button-session.js';

if (!globalThis.crypto?.subtle)globalThis.crypto=webcrypto;

const fixture=()=>({
  xmlText:'<PipeStressExport><Pipe><Branch><Branchname>/OWNER_A/ZONE_1</Branchname></Branch><Branch><Branchname>/OWNER_B/ZONE_2</Branchname></Branch></Pipe></PipeStressExport>',
  stagedJsonText:'[{"OWNER_ZONE":"OWNER_A/ZONE_1","children":[{"NodeNumber":10}]},{"OWNER_ZONE":"OWNER_B/ZONE_2","children":[{"NodeNumber":20}]}]',
  sourceId:'original-2-zone.xml',
  config:{
    linelist:{datasetId:'line-candidate-unapproved',masterRows:[{reference:'L1'},{reference:'L2'}],revision:'unapproved'},
    pipingClass:{datasetId:'piping',masterRows:[{code:'C1'}],revision:'original'},
    material:{datasetId:'material',mapRows:[{material:'M1'}],revision:'original'},
    weight:{datasetId:'weight',masterRows:[{type:'V1'}],revision:'original'},
    overrides:{},
  },
});
const keys=['linelist','pipingClass','material','weight'].sort();

test('NEXT-08A-02 current actual Preview button basis does not bind caller selected Owner/zone',async()=>{
  const unscoped=fixture();
  const scope1={...fixture(),selection:[{sourceId:'original-2-zone.xml',selectionRef:'OWNER_A/ZONE_1'}]};
  const scope2={...fixture(),selection:[{sourceId:'original-2-zone.xml',selectionRef:'OWNER_B/ZONE_2'}]};
  const a=await createPreviewButtonBasis(unscoped);
  const b=await createPreviewButtonBasis(scope1);
  const c=await createPreviewButtonBasis(scope2);
  assert.equal(a.basisId,b.basisId,
    'Current button adapter ignores extra caller selection; this is a characterization, not acceptance');
  assert.equal(b.basisId,c.basisId,
    'Different selected zone labels are not independently bound to this product InputBasis');
  assert.deepEqual(a.scope,[{sourceId:'original-2-zone.xml',selectionRef:'ALL'}]);
  assert.deepEqual(b.scope,a.scope);
  assert.deepEqual(c.scope,a.scope);
  assert.deepEqual(Object.keys(a.masters).sort(),keys);
  assert.equal(a.masters.linelist.rowCount,2,
    'Two dummy rows do not constitute Owner-approved 385 logical Line List');
  console.log('NEXT08A_SCOPE_CHARACTERIZATION '+JSON.stringify({
    originalSourceId:'original-2-zone.xml',
    requestedScopes:['OWNER_A/ZONE_1','OWNER_B/ZONE_2'],
    actualPreviewScope:a.scope,
    selectedScopesIndistinguishable:true,
    masters:Object.fromEntries(Object.entries(a.masters).map(([k,v])=>[k,v.rowCount])),
    engineeringReady:'NOT_ASSERTED',
    accepted385:'NOT_ATTESTED',
    status:'PRODUCT_SELECTED_SCOPE_NOT_WIRED',
  }));
});
test('NEXT-08A-02 config hash is revision-sensitive but still cannot authorize source subset',async()=>{
  const a=fixture(),b=fixture();
  a.config.ownerZone='OWNER_A/ZONE_1';
  b.config.ownerZone='OWNER_B/ZONE_2';
  const x=await createPreviewButtonBasis(a);
  const y=await createPreviewButtonBasis(b);
  assert.notEqual(x.basisId,y.basisId,'Config hash can vary when owner/zone text changes');
  assert.deepEqual(x.scope,y.scope,
    'Hash change alone does not implement selection; both actually choose ALL');
  assert.deepEqual(x.scope,[{sourceId:'original-2-zone.xml',selectionRef:'ALL'}]);
});
test('NEXT-08A-02 same count changed master rows change original-content basis; mapping approval independent',async()=>{
  const a=fixture(),b=fixture();
  b.config.linelist.masterRows[1].reference='CHANGED';
  const x=await createPreviewButtonBasis(a);
  const y=await createPreviewButtonBasis(b);
  assert.notEqual(x.basisId,y.basisId);
  assert.notEqual(x.masters.linelist.sha256,y.masters.linelist.sha256);
  assert.equal(x.masters.linelist.rowCount,y.masters.linelist.rowCount);
  assert.deepEqual(x.scope,y.scope);
  assert.equal(x.masters.linelist.revision,'unapproved');
  assert.equal(y.masters.linelist.revision,'unapproved');
});
test('NEXT-08A-02 unresolved actual master is not silently completed by an empty row array',async()=>{
  const a=fixture();
  a.config.linelist.masterRows=[];
  const result=await createPreviewButtonBasis(a);
  assert.equal(result.masters.linelist.rowCount,0);
  assert.deepEqual(result.scope,[{sourceId:'original-2-zone.xml',selectionRef:'ALL'}]);
  console.log('NEXT08A_UNAPPROVED_LINE_LIST_ADMISSION '+JSON.stringify({
    linelistRows:result.masters.linelist.rowCount,
    basisCreated:true,
    ownerApproved:false,
    physicalFactRecords:'NOT_COMPUTED',
    warning:'InputBasis is source identity, not 385-master approval or engineering readiness',
  }));
});
