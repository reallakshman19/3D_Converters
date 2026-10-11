// R17 W01 freeze-only evidence of the code paths the actual browser test traverses.
// This test SHOULD cease passing once W02 changes the product: it is a RED-baseline
// characterization, not a security acceptance test and not an approval of ALL.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base=new URL('../../tabs/xml-cii-2019-standalone/ui-adapted/',import.meta.url);
const read=async name=>readFile(new URL(name,base),'utf8');

test('R17 W01 A3 original selected-scope state exists and Resolver consumes it',async()=>{
  const source=await read('xml-cii-adapted-events.js');
  assert.match(source,/jsonTraceScopeId/);
  assert.match(source,/selectedScopeId:input\.jsonTraceScopeId/);
  const selection=await read('xml-cii-adapted-resolver-scope.js');
  assert.match(selection,/selectResolverHierarchyScope\(stateRef, event\.target\.value\)/);
  assert.match(selection,/discoverResolverHierarchyScopes/);
});

test('R17 W01 authored Preview still omits selected scope from B1 caller options and stale input',async()=>{
  const source=await read('xml-cii-adapted-preview-diagnostics-audit-v7.js');
  const capture=source.slice(source.indexOf('function modeASourceInputs'),source.indexOf('function previewInputsCurrent'));
  const options=source.slice(source.indexOf('  const options = {'),source.indexOf('  try {\n    const previewResult',source.indexOf('  const options = {')));
  assert.ok(capture.length>350&&options.length>250,'Live caller locations missing');
  assert.doesNotMatch(capture,/jsonTraceScopeId|requestedOwnerZoneScopeId|selectedScopeId/);
  assert.doesNotMatch(options,/jsonTraceScopeId|requestedOwnerZoneScopeId|selectedScopeId/);
  assert.match(options,/resolveStagedJsonText/);
});

test('R17 W01 V7 pre-session staged read/cache precede legacy Preview refusal',async()=>{
  const source=await read('xml-cii-adapted-preview-renderer-v7.js');
  const start=source.indexOf('export async function xmlCiiBuildAndRenderPreview');
  const text=source.slice(start);
  const readIndex=text.indexOf('await resolveStagedSource(options, config)');
  const restoreIndex=text.indexOf('restorePreviewCacheV7(authority)');
  const delegateIndex=text.indexOf('await buildLegacyPreview(rootEl, xmlText, config, delegatedOptions)');
  assert.ok(start>0&&readIndex>=0&&restoreIndex>readIndex&&delegateIndex>restoreIndex);
  const guard=await read('xml-cii-adapted-preview-facts-button-session.js');
  assert.match(guard,/PREVIEW_SELECTED_SCOPE_NOT_INTEGRATED/);
  assert.match(guard,/const scope=sourceScope\(host,config,options\);/);
  assert.match(guard,/selectionRef:'ALL'/);
});
