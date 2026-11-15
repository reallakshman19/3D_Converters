/** Private owner-local reports from recorded evidence. No re-enrichment. */
const str=v=>v==null?'':typeof v==='object'?JSON.stringify(v):String(v);
const member=r=>r.source?.member||r.source?.corroboration||r.source?.attachment;
const members=r=>r.source?.members||(member(r)?[member(r)]:[]);
const actual=(r,name)=>({Type:r.observed?.typeCode,Stiffness:r.observed?.stiffness,
  Gap:r.observed?.gap,Friction:r.observed?.friction,DirectionCosineX:r.observed?.direction?.[0],
  DirectionCosineY:r.observed?.direction?.[1],DirectionCosineZ:r.observed?.direction?.[2]})[name];

export function restraintAuditRows(report) {
  const records=report?.records?.length?report.records:report?.recorded?.records||[];
  return records.flatMap(record=>(record.fields||[]).map(f=>({
    node:record.target.nodeNumber,branch:record.target.branch,nodeName:record.target.nodeName,
    disposition:record.disposition,status:record.status||report.status,
    source:record.source?.kind==='original-xml'?'Original XML':record.source?.kind==='config-default'?
      'Configuration / ATTA default':members(record).map(source=>source.name).filter(Boolean).join(' | ')||record.source?.kind||'',
    sourcePath:record.source?.kind==='config-default'?'config:atta-default-restraint':
      (record.source?.kind!=='original-xml'&&members(record).map(source=>source.path).filter(Boolean).join(' | '))||`Branch[${record.target.branchOccurrenceIndex+1}]/Node[${record.target.sourceNodeOrdinal+1}]/Restraint[${(record.source?.restraintOrdinal??record.restraintOrdinal)+1}]`,
    sourceMembers:members(record),
    corroboratingMember:(record.source?.corroboration||record.source?.attachment)?.name||'',
    corroboratingPath:(record.source?.corroboration||record.source?.attachment)?.path||'',
    field:f.name,sourceAttribute:f.evidence?.attribute||record.decision?.rule?.field||'',
    raw:f.evidence?.raw??null,authority:f.evidence?.authority||'',
    ruleId:record.decision?.rule?.id||'',rule:record.decision?.rule||null,decision:record.decision?.source||'',
    before:f.before,after:f.after,actual:actual(record,f.name)??null,
    retainedNode:record.mapping?.node||'',mapping:record.mapping?.method||'',
    ciiBlock:record.observed?.blockIndex??'',ciiSlot:record.observed?.slotIndex??'',
    ciiLine:record.observed?.line??'',
    coordinateEvidence:member(record)?.coordinateEvidence||null,
    attachmentPath:record.source?.attachment?.path||'',attachmentName:record.source?.attachment?.name||'',
    attachmentDisposition:record.attachmentRole?.disposition||'',attachmentAuthority:record.attachmentRole?.authority||'',
  })));
}

export function restraintAuditCoverageRows(report) {
  return (report.coverage?.sources||[]).flatMap(source=>{
    const trace=source.ciiTrace,traceStatus=trace?.status||'SOURCE_NATIVE_TRACE_NOT_RECORDED';
    const slots=trace?.slots?.length?trace.slots:[null];
    return slots.map(slot=>({
      recordKind:'SOURCE_COVERAGE',field:'Source coverage',status:source.status+' · '+traceStatus,
      sourceCoverageDisposition:source.status,ciiTraceStatus:traceStatus,
      source:source.name,sourcePath:source.path,node:(source.candidates||[]).map(row=>row.target.nodeNumber).join(' | '),branch:source.branch,
      raw:source.fields,authority:report.coverage.policyBasis,ruleId:source.decision?.rule?.id||'',
      after:source.kind||'',actual:slot?slot.typeCode:null,retainedNode:slot?.node||'',
      ciiBlock:slot?.blockIndex??'',ciiSlot:slot?.slotIndex??'',ciiLine:slot?.line??'',
      sourceMembers:[{path:source.path,name:source.name,fields:source.fields}],reason:source.reason||'',
      expected:source.candidates||[],coverageStatus:report.coverage.status,
      ciiTrace:trace||null,observedGap:slot?.gap??null,
    }));
  });
}

const headers=['node','branch','nodeName','disposition','status','source','sourcePath','corroboratingMember','corroboratingPath',
  'field','sourceAttribute','raw','authority','ruleId','rule','decision','before','after','actual',
  'retainedNode','mapping','ciiBlock','ciiSlot','ciiLine','coordinateEvidence',
  'attachmentPath','attachmentName','attachmentDisposition','attachmentAuthority','sourceMembers',
  'recordKind','reason','expected','coverageStatus','sourceCoverageDisposition','ciiTraceStatus','observedGap','ciiTrace'];
const csv=v=>{
  const raw=str(v),numeric=/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[Ee][+-]?\d+)?$/.test(raw);
  const safe=/^[=+\-@\t\r]/.test(raw)&&!numeric?"'"+raw:raw;
  return '"'+safe.replace(/"/g,'""')+'"';
};
export function restraintAuditCsv(report) {
  return '\uFEFF'+[headers.join(','),...[...restraintAuditRows(report),...restraintAuditCoverageRows(report)]
    .map(row=>headers.map(key=>csv(row[key])).join(','))].join('\r\n')+'\r\n';
}

const html=v=>str(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function recordHtml(record,report) {
  const rows=restraintAuditRows({...report,records:[record]}),source=rows[0]||{};
  const columns=['field','sourceAttribute','raw','before','after','actual','status'];
  const address=record.observed?`Node ${record.observed.node}, RESTRANT block ${record.observed.blockIndex}, slot ${record.observed.slotIndex}, line ${record.observed.line}`:'CII output ownership/value not verified';
  return '<article><h2>Node '+html(record.target.nodeNumber)+' — '+html(record.after?.Type||'removed')+' — '+html(record.status||report.status)+'</h2>'+
    '<p><strong>Branch:</strong> '+html(record.target.branch)+'</p><p><strong>Source:</strong> '+html(source.source)+' · '+html(source.sourcePath)+'</p>'+
    '<p><strong>Decision:</strong> '+html(source.decision)+' · '+html(source.ruleId)+'</p><p><strong>Output:</strong> '+html(address)+'</p>'+
    '<table><tr>'+columns.map(k=>'<th>'+html(k)+'</th>').join('')+'</tr>'+
    rows.map(row=>'<tr>'+columns.map(k=>'<td>'+html(row[k])+'</td>').join('')+'</tr>').join('')+'</table>'+
    '<details><summary>Rule, source match and retained-node evidence</summary><pre>'+html(JSON.stringify({
      source:record.source,decision:record.decision,match:record.match,mapping:record.mapping,
      originalTarget:record.originalTarget,trace:record.trace},null,2))+'</pre></details></article>';
}
export function restraintAuditHtml(report) {
  const recorded=report.recorded||report;
  const manifest={status:report.status,scope:report.scope||'restraints',basis:recorded.basis,
    auditSha256:recorded.auditSha256,output:report.output,run:report.run,summary:report.summary,
    mode:report.mode,historicalRunProvenance:report.historicalRunProvenance,attachmentDelegation:recorded.attachmentDelegation,
    sourceCoverage:report.coverage?{status:report.coverage.status,summary:report.coverage.summary}:null};
  const records=report.records?.length?report.records:recorded.records||[];
  return '<!doctype html><html lang="en"><meta charset="utf-8"><title>Restraint enrichment audit</title>'+
    '<style>body{font:14px system-ui;margin:24px auto;max-width:1200px;padding:0 16px;color:#172033}article{margin:24px 0;padding:16px;border:1px solid #b8c3d3}table{border-collapse:collapse;width:100%}'+
    'td,th{border:1px solid #b8c3d3;padding:7px;text-align:left;vertical-align:top}th{background:#eaf0f7}'+
    'pre{white-space:pre-wrap;overflow-wrap:anywhere}td{overflow-wrap:anywhere}h1{font-size:24px}</style>'+
    '<h1>Restraint enrichment audit</h1><p>Private owner-local evidence from the recorded conversion. '+
    'Verification applies to the identified input and output bytes.</p><pre>'+html(JSON.stringify(manifest,null,2))+'</pre>'+
    '<h2>Source support coverage</h2><p>Independent source census; surviving CII field agreement does not prove complete transfer.</p><pre>'+html(JSON.stringify(report.coverage||{status:'NOT_RECORDED'},null,2))+'</pre>'+
    records.map(record=>recordHtml(record,report)).join('')+
    '<h2>Source matching context</h2><pre>'+html(JSON.stringify(recorded.matching||{},null,2))+'</pre>'+
    '<details><summary>Source resolutions and member evaluations</summary><pre>'+html(JSON.stringify({
      resolutions:recorded.resolutions,evaluations:recorded.evaluations},null,2))+'</pre></details>'+
    '<h2>Diagnostics</h2><pre>'+html(JSON.stringify(report.errors||[],null,2))+'</pre></html>';
}
