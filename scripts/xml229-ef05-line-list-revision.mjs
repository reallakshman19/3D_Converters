import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// This test-only alternate comes from committed public BC4 data, not Owner masters.
// Change one mapped cell to another class already present in that same fixture.
export async function makeXml229PublicBc4LineListRevision(){
  const json=JSON.parse(await readFile(
    new URL('../tests/fixtures/xml229/BC4.LineList.json',import.meta.url),'utf8'));
  assert.equal(json.rowCount,385);
  assert.equal(json.rows.length,385);
  const rows=json.rows.map(row=>({...row}));
  const row=rows.find((item,index)=>index>2&&
    item['3']==='8010125'&&item['22']==='13421');
  assert(row,'Original public BC4 mapping row changed');
  assert(rows.some((item,index)=>index>2&&item['22']==='31441C4'),
    'Replacement piping class not independently present in public BC4 fixture');
  row['22']='31441C4';
  // Raw rows only: the derived fixture must not impersonate the workbook's
  // original SHA, engineering approval or native release authority.
  return {name:'BC4.LineList.public-session-revision.json',
    mimeType:'application/json',buffer:Buffer.from(JSON.stringify({rows}))};
}
