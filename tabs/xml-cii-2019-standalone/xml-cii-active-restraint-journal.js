/** Observations of the existing v0.6 pipeline; never writes engineering XML. */
import {inventoryRestraintAudit,restraintAuditConfig} from './xml-cii-restraint-audit.js';
import {inventoryActiveSourceSupports} from './xml-cii-active-restraint-coverage.js';

const copy=value=>JSON.parse(JSON.stringify(value));
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const elements=(node,tag)=>[...(node?.childNodes||[])].filter(n=>n.nodeType===1&&n.nodeName.replace(/^.*:/,'')===tag);
const value=(node,tag)=>elements(node,tag)[0]?.textContent?.trim()||'';
const fields=['Type','Stiffness','Gap','Friction','DirectionCosineX','DirectionCosineY','DirectionCosineZ'];
const sourceCache=new WeakMap();
const parse=text=>{
  const document=new DOMParser().parseFromString(text,'application/xml');
  if(document.getElementsByTagName('parsererror').length)throw Error('ACTIVE_AUDIT_XML_PARSE');
  return document;
};

export function activeAuditNode(node) {
  let branch=node.parentNode;
  while(branch&&branch.nodeName?.replace(/^.*:/,'')!=='Branch')branch=branch.parentNode;
  let root=node;
  while(root.parentNode)root=root.parentNode;
  const branches=[...(root.getElementsByTagName('Branch')||[])];
  return {target:{branch:value(branch,'Branchname'),branchOccurrenceIndex:branches.indexOf(branch),
    sourceNodeOrdinal:elements(branch,'Node').indexOf(node),nodeNumber:value(node,'NodeNumber'),
    nodeName:value(node,'NodeName'),componentRefNo:value(node,'ComponentRefNo'),position:value(node,'Position')},
    restraints:elements(node,'Restraint').map(r=>Object.fromEntries(fields.map(k=>[k,value(r,k)])))};
}

export function createActiveRestraintJournal(job) {
  return {schema:'XMLCII.ActiveRestraintJournal.v1',sourceText:job.sourceText,
    stagedJsonText:job.stagedJsonText||'',configJson:job.supportConfigJson||'{}',
    sourceCensus:inventoryActiveSourceSupports(job.stagedJsonText),
    original:inventoryRestraintAudit(parse(job.sourceText)),stages:[],events:[]};
}

export function recordActiveRestraintStage(journal,name,xmlText,details={}) {
  const context=details.config?{...details,config:{...restraintAuditConfig(details.config),
    ...(details.config.defaultXmlSupportType?{defaultXmlSupportType:details.config.defaultXmlSupportType}:{})}}:details;
  if(journal)journal.stages.push({name,xmlText,nodes:inventoryRestraintAudit(parse(xmlText)),details:copy(context)});
}

export function recordActiveRestraintWrite(journal,before,node,details) {
  if(journal)journal.events.push(copy({...details,before,after:activeAuditNode(node)}));
}

export function activeAuditSource(journal,member,decision) {
  const path=member?.path||member?.sourcePath||'';
  if(!sourceCache.has(journal))sourceCache.set(journal,JSON.parse(journal.stagedJsonText||'null'));
  const tokens=String(path).match(/\$|\.[A-Za-z_][A-Za-z_0-9]*|\[\d+\]/g)||[];
  let original;
  if(tokens.join('')===path&&tokens.shift()==='$')original=tokens.reduce((object,key)=>
    object?.[key[0]==='.'?key.slice(1):Number(key.slice(1,-1))],sourceCache.get(journal));
  return {path,name:original?.attributes?.NAME||original?.name||member?.name||'',
    fields:copy(original?.attributes||{}),decision};
}

function sameIdentity(a,b) {
  return a.branchOccurrenceIndex===b.branchOccurrenceIndex&&a.branch===b.branch&&
    a.position===b.position&&a.nodeName===b.nodeName&&a.componentRefNo===b.componentRefNo;
}

function corresponding(rows,target) {
  const possible=rows.filter(row=>sameIdentity(row.target,target));
  const numbered=possible.filter(row=>row.target.nodeNumber===target.nodeNumber);
  if(numbered.length===1)return numbered[0];
  // Renumbering may preserve an exact original name/reference and position.
  return (target.nodeName||target.componentRefNo)&&possible.length===1?possible[0]:null;
}

function origin(journal,row,restraint,ordinal) {
  for(let i=journal.stages.length-1;i>=0;i--) {
    const stage=journal.stages[i],current=corresponding(stage.nodes,row.target);
    const prior=corresponding(i?journal.stages[i-1].nodes:journal.original,row.target);
    if(!current?.restraints.some(r=>equal(r,restraint)))continue;
    if(prior?.restraints.some(r=>equal(r,restraint)))continue;
    const event=[...journal.events].reverse().find(e=>e.stage===stage.name&&
      sameIdentity(e.after.target,row.target)&&e.after.target.nodeNumber===current.target.nodeNumber&&
      equal(e.after.restraints[ordinal],restraint));
    const contributor=event?.sources?.find(source=>source.outputOrdinals?.includes(ordinal));
    return {stage:stage.name,event,contributor,details:stage.details};
  }
  return null;
}

function record(journal,row,original,after,ordinal,used) {
  let beforeOrdinal=original?.restraints.findIndex((r,i)=>!used.has(i)&&equal(r,after))??-1;
  const preserved=beforeOrdinal>=0;
  if(beforeOrdinal<0)beforeOrdinal=original?.restraints.findIndex((r,i)=>!used.has(i)&&r.Type===after.Type)??-1;
  if(beforeOrdinal>=0)used.add(beforeOrdinal);
  const before=original?.restraints[beforeOrdinal]||null;
  const selected=origin(journal,row,after,ordinal),member=selected?.contributor;
  const policy=selected?.event?.policy;
  const source=preserved?{kind:'original-xml',restraintOrdinal:beforeOrdinal}:
    policy?.authority==='component-default-rest'?{kind:'config-default',corroboratingMembers:selected.event.sources}:
    policy?.authority==='staged-json-rest'&&selected.event.sources.length?
      {kind:'staged-json-group',members:selected.event.sources}:
    member?{kind:'staged-json',member:{path:member.path,name:member.name,fields:member.fields}}:
    {kind:selected?.stage==='atta-default'?'config-default':'pipeline-stage'};
  const decision=preserved?{source:'original-xml',rule:{id:'preserve-original-xml'}}:
    policy?{source:policy.authority,rule:{id:'decideMissingStagedRestRestraint',reason:policy.reason,
      observedSupportTypes:policy.supportTypes},inputs:selected.event.policyInputs}:
    member?.decision||{source:selected?.stage||'unresolved',rule:{id:selected?.stage||'unresolved'}};
  return {id:`${row.target.branchOccurrenceIndex}:${row.target.sourceNodeOrdinal}:${ordinal}`,
    target:row.target,originalTarget:original?.target||null,restraintOrdinal:ordinal,
    disposition:preserved?'PRESERVED':before?'REPLACED':'ADDED',source,decision,before,after,
    identity:original?'EXACT_ORIGINAL_IDENTITY':'NO_UNIQUE_ORIGINAL_IDENTITY',
    trace:selected?{stage:selected.stage,event:selected.event||null,details:selected.details}:null,
    fields:fields.map(name=>({name,before:before?.[name]??null,after:after[name],
      evidence:fieldEvidence(name,before,preserved,selected,decision,member,ordinal)}))};
}

function fieldEvidence(name,before,preserved,selected,decision,member,ordinal) {
  if(preserved)return {authority:'original-xml',raw:before[name]};
  // A JSON member can decide the semantic kind without authoring stiffness,
  // friction or direction. Record the writer's inputs without relabelling
  // generated profile/default numbers as source engineering intent.
  const authority={Type:'kind-to-XML-profile/config',Stiffness:'writer-stiffness-policy',
    Gap:'writer-gap-policy',Friction:'writer-friction-policy'}[name]||'writer-direction-policy';
  const entry=selected?.event?.entries?.[ordinal]||null;
  return {authority,...(name==='Type'?{semanticAuthority:decision.source||null}:{}),
    raw:name==='Type'?decision.rule?.matchEvidence?.value??decision.rule?.value??null:
      name==='Gap'?entry?.cmpSupGap||null:null,
    sourceValues:member?.fields||selected?.event?.sources||null,requestedEntry:entry,
    producerStage:selected?.stage||'unresolved',
    writerBefore:selected?.event?.before||null,configuration:selected?.details?.config||null};
}

export function activeRestraintRecords(journal) {
  const final=journal.stages.at(-1)?.nodes||journal.original,records=[],seen=new Set();
  for(const row of final) {
    const original=corresponding(journal.original,row.target),used=new Set();
    if(original)seen.add(original);
    row.restraints.forEach((after,ordinal)=>records.push(record(journal,row,original,after,ordinal,used)));
    original?.restraints.forEach((before,ordinal)=>{
      if(!used.has(ordinal))records.push(removed(original,before,ordinal,row.target));
    });
  }
  for(const row of journal.original)if(!seen.has(row))
    row.restraints.forEach((before,ordinal)=>records.push(removed(row,before,ordinal)));
  return records;
}

function removed(row,before,ordinal,target=row.target) {
  return {id:`${target.branchOccurrenceIndex}:${target.sourceNodeOrdinal}:removed:${ordinal}`,
    target,originalTarget:row.target,restraintOrdinal:ordinal,disposition:'REMOVED',
    source:{kind:'original-xml',restraintOrdinal:ordinal},decision:{source:'active-pipeline',rule:{id:'restraint-removed'}},
    before,after:null,fields:fields.map(name=>({name,before:before[name],after:null,
      evidence:{authority:'original-xml',raw:before[name]}}))};
}
