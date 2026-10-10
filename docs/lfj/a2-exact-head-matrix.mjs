/**
 * A2 bounded exact-head evidence, never an A3 semantic or production attestor.
 * The GitHub API current-PR-head check refuses green evidence from stale runs.
 */
import {execFileSync} from 'node:child_process';
import {appendFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const REQUIRED_A2_JOBS=Object.freeze([
  'indexed-runtime-source-closure',
  'public-pages-origin-observation',
  'generated-docs-native-chromium'
]);
const isSha=x=>typeof x==='string'&&/^[0-9a-f]{40}$/.test(x);
const asJob=x=>typeof x==='string'?x:x?.result;

export function evaluateExactHead({expectedSha,checkoutSha,livePrSha,
  livePrError=null,eventName='pull_request',needs={}}={}){
  const problems=[];
  if(!isSha(expectedSha))problems.push('INVALID_TRIGGER_HEAD');
  if(!isSha(checkoutSha))problems.push('INVALID_CHECKOUT_HEAD');
  if(isSha(expectedSha)&&isSha(checkoutSha)&&checkoutSha!==expectedSha)
    problems.push('CHECKOUT_HEAD_MISMATCH');
  if(eventName==='pull_request'){
    if(livePrError)problems.push('LIVE_PR_HEAD_UNVERIFIED: '+String(livePrError));
    else if(!isSha(livePrSha))problems.push('LIVE_PR_HEAD_NOT_AVAILABLE');
    else if(livePrSha!==expectedSha)problems.push('STALE_PR_HEAD');
  }else if(eventName!=='workflow_dispatch'){
    problems.push('UNRECOGNIZED_EVENT');
  }
  const jobs=Object.fromEntries(REQUIRED_A2_JOBS.map(name=>{
    const state=asJob(needs?.[name])||'NOT_RUN';
    if(state!=='success')problems.push('REQUIRED_JOB_NOT_SUCCESS: '+name+'='+state);
    return [name,state];
  }));
  return {
    schema:'LFJ.A2.ExactHeadEvidence.v1',
    scope:'A2_FOCUSED_AUTHOR_CI_ONLY_NOT_WHOLE_REPOSITORY',
    triggeringHead:expectedSha||null,
    checkedOutHead:checkoutSha||null,
    livePrHead:eventName==='pull_request'?(livePrSha||null):'NOT_APPLICABLE',
    eventName,jobs,
    verdict:problems.length?'FAIL_CLOSED':'PASS_FOCUSED_AUTHOR_EXACT_HEAD',
    problems,
    independentA2Acceptance:'NOT_ATTESTED',
    independentA3SemanticAcceptance:'NOT_ATTESTED',
    ownerThirtyMb:'NOT_RUN',
    publicPagesAndOpera:'NOT_ATTESTED',
    downstreamCiiRelease:'NOT_AUTHORIZED',
    wholeRepositoryChecks:'NOT_ASSESSED_BY_THIS_MATRIX'
  };
}

export function asMarkdown(v){
  const rows=[
    '## A2 exact-head author-CI evidence (not release acceptance)',
    '',
    '- Triggered SHA: '+(v.triggeringHead||'UNKNOWN'),
    '- Checked-out SHA: '+(v.checkedOutHead||'UNKNOWN'),
    '- Live PR SHA: '+v.livePrHead,
    '- Result: **'+v.verdict+'**',
    '- Scope: **focused A2 author CI only**; other repository workflows not assessed',
    '',
    '| Prerequisite | Status |','|---|---|',
    ...REQUIRED_A2_JOBS.map(k=>'| '+k+' | '+v.jobs[k]+' |'),
    '',
    'Independent A2/A3 semantic acceptance: **NOT ATTESTED**.',
    'Owner original ~30 MB: **NOT RUN**. Public Pages/Opera: **NOT ATTESTED**.',
    'Downstream CII and production release: **NOT AUTHORIZED**.'
  ];
  if(v.problems.length)rows.push('', 'Fail-closed reasons: '+v.problems.join('; '));
  return rows.join('\n')+'\n';
}

async function readCurrentPrHead(repository,number,token){
  if(!/^[\w.-]+\/[\w.-]+$/.test(repository)||!Number.isInteger(number)||number<=0)
    throw Error('Invalid GitHub PR identity');
  const url='https://api.github.com/repos/'+repository+'/pulls/'+number;
  const headers={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
  if(token)headers.Authorization='Bearer '+token;
  const response=await fetch(url,{headers,signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error('GitHub PR HTTP '+response.status);
  const data=await response.json();
  if(!isSha(data?.head?.sha))throw Error('Live PR head not present');
  return data.head.sha;
}

async function main(){
  const expectedSha=process.env.A2_TRIGGER_SHA||'';
  const checkoutSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const eventName=process.env.GITHUB_EVENT_NAME||'';
  let needs={},livePrSha=null,livePrError=null;
  try{needs=JSON.parse(process.env.A2_NEEDS_JSON||'{}');}
  catch(e){livePrError='Malformed job matrix: '+e.message;}
  if(eventName==='pull_request'){
    try{
      livePrSha=await readCurrentPrHead(process.env.GITHUB_REPOSITORY||'',
        Number(process.env.A2_PR_NUMBER||0),process.env.GITHUB_TOKEN||'');
    }catch(e){livePrError=[livePrError,e.message].filter(Boolean).join('; ');}
  }
  const evidence=evaluateExactHead({
    expectedSha,checkoutSha,livePrSha,livePrError,eventName,needs
  });
  if(!Object.keys(needs).length&&(!evidence.problems.includes('EMPTY_NEEDS')))
    evidence.problems.push('EMPTY_NEEDS');
  if(evidence.problems.length)evidence.verdict='FAIL_CLOSED';
  const json=JSON.stringify(evidence,null,2)+'\n';
  console.log(json);
  if(process.env.RUNNER_TEMP)
    await writeFile(join(process.env.RUNNER_TEMP,'a2-exact-head-evidence.json'),json);
  if(process.env.GITHUB_STEP_SUMMARY)
    await appendFile(process.env.GITHUB_STEP_SUMMARY,asMarkdown(evidence));
  if(evidence.problems.length)process.exitCode=1;
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))
  await main();
