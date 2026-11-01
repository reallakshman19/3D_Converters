/** Test-only real Python converter matrix: source XML→emitted CII→2019 syntax. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdtemp,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {buildStandaloneOutputRunReadiness} from '../tabs/xml-cii-2019-standalone/xml-cii-output-run-readiness.js';
import {captureXml229XmlOnlyApproval,isXml229XmlOnlyApproved}
 from '../tabs/xml-cii-2019-standalone/integration/xml229-output-participation.mjs';
const scenario=process.env.XML229_OPTIONAL_VARIANT||'no-masters';
const scenarios=['no-masters','missing-line-list','missing-piping-class','missing-mat-map','unassigned-regex','conflicting-regex','missing-rating','all-present'];
assert(scenarios.includes(scenario),'Unexpected optional-enrichment scenario');
const xmlPath='Benchmarks/EF-05-PRO.TEST.xml';
const xml=await readFile(xmlPath,'utf8');
const sha=x=>createHash('sha256').update(x).digest('hex');
const masterConfig={
 linelist:{masterRows:[{lineKey:'P8810021',p1:'100'}]},
 pipingClass:{masterRows:[{pipingClass:'31441C4',boreMm:200}]},
 material:{mapRows:[{material:'A106',materialCode:'1'}]},
};
const format1={tokenDelimiter:'-',lineKey:{extractMode:'TOKEN',tokenPosition:4},
 pipingClass:{extractMode:'TOKEN',tokenPosition:5},bore:{extractMode:'TOKEN',tokenPosition:3}};
const format2={tokenDelimiter:'-',lineKeyJoiner:'',
 lineKey:{extractMode:'TOKEN',tokenPosition:'4,5'},
 pipingClass:{extractMode:'TOKEN',tokenPosition:6},bore:{extractMode:'TOKEN',tokenPosition:3}};
const config=scenario==='no-masters'?{}:structuredClone(masterConfig);
if(scenario==='missing-line-list')delete config.linelist;
if(scenario==='missing-piping-class')delete config.pipingClass;
if(scenario==='missing-mat-map')delete config.material;
if(scenario==='unassigned-regex')config.regexTester={formats:[]};
if(scenario==='conflicting-regex')config.regexTester={formats:[format1,format2]};
if(scenario==='missing-rating')config.regexTester={formats:[format1]};
const state={
 sourceKind:'xml',sourceText:xml,supportConfigJson:JSON.stringify(config),
 options:{outputMode:'both'},masterContext:{rowCounts:{
  lineList:config.linelist?.masterRows?.length||0,
  pipingClass:config.pipingClass?.masterRows?.length||0,
  materialMap:config.material?.mapRows?.length||0,weight:0}},
};
state.xml229XmlOnlyApproval=captureXml229XmlOnlyApproval(state);
assert.equal(isXml229XmlOnlyApproved(state),true,
 'XML-only route must be a source-bound explicit decision');
const report=buildStandaloneOutputRunReadiness(state);
assert.equal(report.summary.blockingCount,0,'Optional enrichment cannot block base conversion: '+scenario+' | '+JSON.stringify(report.checklistRows.filter(row=>row.blocking).map(row=>({id:row.id,status:row.status,message:row.message}))));
const format=report.checklistRows.find(row=>row.id==='branch-format-authority');
if(scenario==='conflicting-regex'){
 assert.equal(format?.blocking,false);
 assert.equal(format?.status,'unresolved-enrichment');
 assert.match(format.message,/AMBIGUOUS/);
}
if(scenario==='unassigned-regex'){
 assert.equal(format?.blocking,false);
 assert.equal(format?.status,'unresolved-enrichment');
 assert.match(format.message,/UNMATCHED/);
}
const tmp=await mkdtemp(join(tmpdir(),'xml229-optional-e2e-'));
let record={schema:'XML229.OptionalEnrichment.E2E.v1',scenario,sourceXmlSha256:sha(xml),
 actualEngine:false,nativeReleaseAuthorized:false,explicitXmlOnly:true,passed:false};
try{
 const ciiPath=join(tmp,'converted.cii'),syntaxPath=join(tmp,'syntax.json');
 const args=['converters/scripts/xml_to_cii2019_patched.py','--input',xmlPath,
  '--output',ciiPath,'--support-config-json',JSON.stringify(config)];
 const started=process.hrtime.bigint();
 execFileSync('python3',args,{timeout:240000,stdio:'pipe'});
 const cii=await readFile(ciiPath);
 const elapsedMs=Number((process.hrtime.bigint()-started)/1000000n);
 assert(cii.length>100,'Converter must emit a nonempty real CII');
 execFileSync('python3',['converters/scripts/cii_syntax_check_2019.py',
  '--input',ciiPath,'--output',syntaxPath],{timeout:90000,stdio:'pipe'});
 const syntax=JSON.parse(await readFile(syntaxPath,'utf8'));
 assert.equal(syntax.ok,true,JSON.stringify(syntax.errors).slice(0,600));
 assert.deepEqual(syntax.errors,[]);
 record={...record,actualEngine:true,elapsedMs,ciiBytes:cii.length,
  ciiSha256:sha(cii),syntaxOk:true,elementCount:syntax.metrics?.elements,
  formatReviewStatus:format?.status||'NOT_CONFIGURED',passed:true};
}finally{
 await mkdir('ValidationRecords',{recursive:true});
 await writeFile('ValidationRecords/xml229-optional-enrichment-'+scenario+'.json',
  JSON.stringify(record,null,2)+'\n');
 await rm(tmp,{recursive:true,force:true});
}
console.log('XML229_OPTIONAL_E2E '+JSON.stringify(record));
assert.equal(record.passed,true);
