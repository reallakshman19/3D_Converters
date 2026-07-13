import fs from 'node:fs';

function replaceOnce(source, before, after, label) {
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`Missing patch anchor: ${label}`);
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`Non-unique patch anchor: ${label}`);
  return source.slice(0, index) + after + source.slice(index + before.length);
}
function replaceCount(source, before, after, expected, label) {
  const count = source.split(before).length - 1;
  if (count !== expected) throw new Error(`Expected ${expected} ${label} anchors, found ${count}`);
  return source.split(before).join(after);
}
function patch(path, transform) {
  const before = fs.readFileSync(path, 'utf8');
  const after = transform(before);
  if (after === before) throw new Error(`No changes produced for ${path}`);
  fs.writeFileSync(path, after);
}

patch('tabs/model-converters/xml-cii-node-to-inputxml-core.js', (input) => {
  let source = replaceOnce(input,
    "import { normalizeBranchesForTopology } from './xml-cii-node-to-inputxml-topology-normalizer.js?v=20260709-cross-branch-1';",
    "import { normalizeBranchesForTopology } from './xml-cii-node-to-inputxml-topology-normalizer.js?v=20260709-cross-branch-1';\nimport { buildNodeToInputXmlDiagnosticRecords } from './xml-cii-node-to-inputxml-audit.js?v=20260713-xml-builder-audit-1';",
    'core audit import');
  source = replaceOnce(source,
    "    branchName: childText(branchEl, 'Branchname'),",
    "    branchName: childText(branchEl, 'Branchname'),\n    lineId: firstValue(childText(branchEl, 'LineNo'), childText(branchEl, 'LINE_ID')),",
    'branch line id');
  source = replaceOnce(source,
`function parseRestraints(nodeEl) {
  return children(nodeEl, 'Restraint').map((restraintEl) => {
    const typeText = childText(restraintEl, 'Type').toUpperCase();
    const typeCode = RESTRAINT_TYPE_MAP[typeText] ?? maybeNum(typeText) ?? SENTINEL;
    return {
      sourceType: typeText,
      typeCode,
      stiffness: maybeNum(childText(restraintEl, 'Stiffness')) ?? SENTINEL,
      gap: maybeNum(childText(restraintEl, 'Gap')) ?? SENTINEL,
      friction: maybeNum(childText(restraintEl, 'Friction')) ?? SENTINEL,
      xcosine: maybeNum(childText(restraintEl, 'DirectionCosineX')) ?? SENTINEL,
      ycosine: maybeNum(childText(restraintEl, 'DirectionCosineY')) ?? SENTINEL,
      zcosine: maybeNum(childText(restraintEl, 'DirectionCosineZ')) ?? SENTINEL,
    };
  });
}`,
`function resolvedRestraintType(typeText, directionText) {
  const typeKey = text(typeText).toUpperCase();
  const directionKey = text(directionText).toUpperCase();
  const direct = RESTRAINT_TYPE_MAP[typeKey] ?? maybeNum(typeKey);
  if (direct !== null && direct !== undefined) return { typeCode: direct, resolution: 'type' };
  const directional = RESTRAINT_TYPE_MAP[directionKey] ?? maybeNum(directionKey);
  if (directional !== null && directional !== undefined) return { typeCode: directional, resolution: 'direction' };
  return { typeCode: SENTINEL, resolution: 'unresolved' };
}
function parseRestraints(nodeEl) {
  const restraintEls = [...children(nodeEl, 'Restraint'), ...children(nodeEl, 'CustomRestraint')];
  return restraintEls.map((restraintEl) => {
    const sourceType = childText(restraintEl, 'Type').toUpperCase();
    const sourceDirection = childText(restraintEl, 'Direction').toUpperCase();
    const resolved = resolvedRestraintType(sourceType, sourceDirection);
    return {
      sourceElementName: localName(restraintEl),
      sourceType,
      sourceDirection,
      typeResolution: resolved.resolution,
      typeCode: resolved.typeCode,
      stiffness: maybeNum(childText(restraintEl, 'Stiffness')) ?? SENTINEL,
      gap: maybeNum(childText(restraintEl, 'Gap')) ?? SENTINEL,
      friction: maybeNum(childText(restraintEl, 'Friction')) ?? SENTINEL,
      xcosine: maybeNum(childText(restraintEl, 'DirectionCosineX')) ?? SENTINEL,
      ycosine: maybeNum(childText(restraintEl, 'DirectionCosineY')) ?? SENTINEL,
      zcosine: maybeNum(childText(restraintEl, 'DirectionCosineZ')) ?? SENTINEL,
    };
  });
}`,
    'restraint compatibility parser');
  source = replaceOnce(source,
    '    INSUL_DENSITY: SENTINEL,',
    '    INSUL_DENSITY: includeFullContext ? (maybeNum(branch.context.insulationDensity) ?? SENTINEL) : SENTINEL,',
    'insulation density propagation');
  source = replaceCount(source,
    '    LINE_ID: branch.branchName,',
    '    LINE_ID: firstValue(branch.context.lineId, branch.branchName),',
    2,
    'line id mapping');
  source = replaceOnce(source,
    "if (hasRigidEvidence(toRow)) diagnostics.rigid.push({ from: element.from, to: element.to, sourceNode: toRow.nodeNumber, componentType: toRow.componentType, weight: toRow.weight, mergedDuplicateNodes: toRow.mergedDuplicateNodes || [] });",
    "if (hasRigidEvidence(toRow)) diagnostics.rigid.push({ from: element.from, to: element.to, sourceNode: toRow.nodeNumber, branchName: branch.branchName, componentType: toRow.componentType, weight: toRow.weight, mergedDuplicateNodes: toRow.mergedDuplicateNodes || [] });",
    'rigid diagnostic branch');
  source = replaceOnce(source,
`  const summary = createSummary(elements, diagnostics);
  const buildProfile = text(options.buildProfile) || 'inputxml';`,
`  const summary = createSummary(elements, diagnostics);
  const buildProfile = text(options.buildProfile) || 'inputxml';
  const diagnosticRecords = buildNodeToInputXmlDiagnosticRecords({
    branches: parsed.branches,
    elements,
    topologyDiagnostics: diagnostics,
    options,
  });`,
    'core diagnostic records');
  source = replaceOnce(source,
    '    diagnostics: { ...diagnostics, summary, buildProfile, enrichment: enrichment?.diagnostics || null, warnings },',
    '    diagnostics: { ...diagnostics, summary, buildProfile, enrichment: enrichment?.diagnostics || null, records: diagnosticRecords, warnings },',
    'core diagnostic return');
  return source;
});

patch('tabs/xml-builder-tab.js', (input) => {
  let source = replaceOnce(input,
    "import { renderXmlCiiTopology5BPanel } from './model-converters/xml-cii-topology-5b-panel.js?v=20260710-xml-builder-1';",
    "import { renderXmlCiiTopology5BPanel } from './model-converters/xml-cii-topology-5b-panel.js?v=20260710-xml-builder-1';\nimport { createXmlBuilderDiagnostic, createXmlBuilderDiagnostics, mergeXmlBuilderDiagnosticRecords, serializeXmlBuilderDiagnostics } from '../converters/xml-cii2019-core/custom-input-diagnostics.js';\nimport { renderXmlBuilderDiagnosticsHtml } from './xml-builder-diagnostics-view.js';",
    'tab diagnostics imports');
  source = replaceOnce(source,
`function buildAll(container, outputs) {
  const state = collectCustomState(container);
  const xmlResult = buildXmlCiiCustomInputXml(state, state.options);
  state.xmlText = xmlResult.xmlText;
  saveXmlCiiCustomInputState(state);
  const inputResult = buildInputXmlFromNodeXml(xmlResult.xmlText, {
    applyEnrichment: false,
    buildProfile: 'xml-builder',
    jobName: 'XML_BUILDER',
    sourceName: 'xml-builder-generated.xml',
  });
  Object.assign(outputs, {
    xmlText: xmlResult.xmlText,
    inputXmlText: inputResult.finalInputXmlText || inputResult.coreInputXmlText || '',
    xmlSummary: JSON.stringify(xmlResult.summary, null, 2),
    inputXmlSummary: JSON.stringify(inputResult.diagnostics?.summary || {}, null, 2),
    error: '',
  });
  saveOutputs(outputs);
}`,
`function buildAll(container, outputs) {
  const state = collectCustomState(container);
  const xmlResult = buildXmlCiiCustomInputXml(state, state.options);
  state.xmlText = xmlResult.xmlText;
  saveXmlCiiCustomInputState(state);
  const inputResult = buildInputXmlFromNodeXml(xmlResult.xmlText, {
    applyEnrichment: false,
    buildProfile: 'xml-builder',
    jobName: 'XML_BUILDER',
    sourceName: 'xml-builder-generated.xml',
  });
  const elementCount = Number(inputResult.diagnostics?.summary?.elementCount || 0);
  const inputXmlReady = elementCount > 0;
  const records = mergeXmlBuilderDiagnosticRecords(xmlResult.diagnostics, inputResult.diagnostics?.records);
  const diagnostics = createXmlBuilderDiagnostics(records, {
    sourceName: 'xml-builder-generated.xml', buildProfile: 'xml-builder', outputReady: inputXmlReady,
  });
  Object.assign(outputs, {
    xmlText: xmlResult.xmlText,
    inputXmlText: inputResult.finalInputXmlText || inputResult.coreInputXmlText || '',
    inputXmlReady,
    diagnostics,
    diagnosticsText: serializeXmlBuilderDiagnostics(diagnostics),
    xmlSummary: JSON.stringify({ ...xmlResult.summary, diagnosticEvents: xmlResult.diagnostics?.records?.length || 0 }, null, 2),
    inputXmlSummary: JSON.stringify({ ...(inputResult.diagnostics?.summary || {}), diagnostics: diagnostics.summary }, null, 2),
    error: inputXmlReady ? '' : 'No PIPINGELEMENT route was generated. Review XML Builder diagnostics.',
  });
  saveOutputs(outputs);
}`,
    'tab build pipeline');
  source = replaceOnce(source,
    '<button type="button" class="model-converters-download-btn" data-xml-builder-download="inputxml" ${outputs.inputXmlText ? \'\' : \'disabled\'}>Download InputXML</button>',
    '<button type="button" class="model-converters-download-btn" data-xml-builder-download="inputxml" ${outputs.inputXmlReady === true ? \'\' : \'disabled\'}>Download InputXML</button>',
    'inputxml readiness button');
  source = replaceOnce(source,
`      <div><div class="model-converters-workflow-section-title">InputXML</div><pre class="xml-cii-native-hint">${esc(outputs.inputXmlSummary || 'No InputXML built yet.')}</pre><textarea class="xml-builder-output" readonly>${esc(outputs.inputXmlText || '')}</textarea></div>
    </div>
  </section>`;`,
`      <div><div class="model-converters-workflow-section-title">InputXML</div><pre class="xml-cii-native-hint">${esc(outputs.inputXmlSummary || 'No InputXML built yet.')}</pre><textarea class="xml-builder-output" readonly>${esc(outputs.inputXmlText || '')}</textarea></div>
    </div>
    ${renderXmlBuilderDiagnosticsHtml(outputs.diagnostics || {})}
  </section>`;`,
    'diagnostics view');
  source = replaceOnce(source,
`function bindOutputActions(container, outputs) {
  container.querySelector('[data-xml-builder-build]')?.addEventListener('click', () => {
    try { buildAll(container, outputs); } catch (error) { outputs.error = error?.message || String(error); saveOutputs(outputs); }
    render(container, outputs);
  });
  container.querySelectorAll('[data-xml-builder-download]').forEach((button) => button.addEventListener('click', () => {
    const kind = button.dataset.xmlBuilderDownload;
    if (kind === 'xml') downloadText('xml-builder-generated.xml', outputs.xmlText || '', 'application/xml');
    if (kind === 'inputxml') downloadText('xml-builder-inputxml.xml', outputs.inputXmlText || '', 'application/xml');
  }));
}`,
`function bindOutputActions(container, outputs) {
  container.querySelector('[data-xml-builder-build]')?.addEventListener('click', () => {
    try { buildAll(container, outputs); } catch (error) {
      const message = error?.message || String(error);
      const diagnostics = createXmlBuilderDiagnostics([createXmlBuilderDiagnostic({ severity: 'ERROR', code: 'XML_BUILDER_BUILD_FAILED', stage: 'build', action: 'clear-stale-output', message })], { sourceName: 'xml-builder-generated.xml', outputReady: false });
      Object.assign(outputs, { xmlText: '', inputXmlText: '', inputXmlReady: false, xmlSummary: '', inputXmlSummary: '', diagnostics, diagnosticsText: serializeXmlBuilderDiagnostics(diagnostics), error: message });
      saveOutputs(outputs);
    }
    render(container, outputs);
  });
  container.querySelectorAll('[data-xml-builder-download]').forEach((button) => button.addEventListener('click', () => {
    const kind = button.dataset.xmlBuilderDownload;
    if (kind === 'xml') downloadText('xml-builder-generated.xml', outputs.xmlText || '', 'application/xml');
    if (kind === 'inputxml' && outputs.inputXmlReady === true) downloadText('xml-builder-inputxml.xml', outputs.inputXmlText || '', 'application/xml');
  }));
  container.querySelector('[data-xml-builder-download-diagnostics]')?.addEventListener('click', () => {
    downloadText('xml_builder_diagnostics.json', outputs.diagnosticsText || serializeXmlBuilderDiagnostics(outputs.diagnostics || {}), 'application/json');
  });
}`,
    'tab output actions');
  return source;
});

patch('tabs/model-converters/custom-input/custom-input-panel.js', (input) => {
  let source = replaceOnce(input,
    `  branchRows: 'BranchName\\tNodeNumber\\tBoreMm\\tWallThickness\\tP1\\tT1\\tT2\\tT3\\tFluidDensity\\n/CUSTOM-4"-P8810212-31441C4-PP/B1\\t100\\t100\\t6.02\\t4140\\t260\\t151\\t5\\t983',`,
    `  branchRows: 'BranchName\\tLineNo\\tNodeNumber\\tBoreMm\\tOutsideDiameter\\tWallThickness\\tP1\\tP9\\tT1\\tT2\\tT3\\tT9\\tFluidDensity\\tInsulationDensity\\n/CUSTOM-4"-P8810212-31441C4-PP/B1\\t4-P8810212-31441C4-PP\\t100\\t100\\t114.3\\t6.02\\t4140\\t900\\t260\\t151\\t5\\t9\\t983\\t0.00012',`,
    'custom panel sample');
  source = replaceOnce(source,
    "  if (summary) summary.textContent = JSON.stringify(result.summary, null, 2);",
    "  if (summary) summary.textContent = JSON.stringify({ ...result.summary, diagnosticEvents: result.diagnostics?.records?.length || 0 }, null, 2);",
    'custom panel summary');
  return source;
});

patch('tests/xml-cii-node-to-inputxml-core.test.js', (input) => {
  let source = replaceOnce(input,
    "const { pathToFileURL } = require('url');",
    "const { pathToFileURL } = require('url');\nconst { spawnSync } = require('child_process');",
    'test spawn import');
  source = replaceOnce(source,
`    'tabs/model-converters/xml-cii-node-to-inputxml-core.js',
    'tabs/model-converters/xml-cii-node-to-inputxml-topology-normalizer.js',`,
`    'tabs/model-converters/xml-cii-node-to-inputxml-core.js',
    'tabs/model-converters/xml-cii-node-to-inputxml-audit.js',
    'tabs/model-converters/xml-cii-node-to-inputxml-topology-normalizer.js',
    'converters/xml-cii2019-core/custom-input-diagnostics.js',
    'converters/xml-cii2019-core/custom-input-model.js',
    'converters/xml-cii2019-core/custom-input-xml-builder.js',`,
    'test fixture files');
  source = replaceOnce(source,
`function assertInputXmlTopoSemantics(api, launcherXml) {`,
`function assertXmlBuilderPipelineSemantics(modelApi, builderApi, coreApi) {
  const branchName = '/CUSTOM-TEST/B1';
  const restraintRows = Array.from({ length: 7 }, (_, index) => ({
    branchName, nodeNumber: '20', nodeName: 'PS-20', restraintType: index === 0 ? 'REST' : 'GUI',
    direction: index === 0 ? '+Y' : '', gap: '0', stiffness: '1.751270E+12', friction: '0.3',
  }));
  const model = modelApi.buildCustomInputModel({
    branchRows: [{ branchName, lineKey: 'L-100', nodeNumber: '10', boreMm: '100', outsideDiameter: '114.3', wallThickness: '6.02', p1: '4140', p9: '900', t1: '260', t9: '9', fluidDensity: '983', insulationDensity: '0.00012', materialCode: '106' }],
    coordinateRows: [{ branchName, nodeNumber: '10', x: '0', y: '0', z: '0' }, { branchName, nodeNumber: '20', x: '1000', y: '0', z: '0' }],
    weightRows: [{ branchName, nodeNumber: '10', componentType: 'PIPE', rigid: '0', endpoint: '1', weight: '0' }, { branchName, nodeNumber: '20', componentType: 'RIGID', rigid: '2', endpoint: '2', weight: '43' }, { branchName, nodeNumber: '30', componentType: 'PIPE', rigid: '0', endpoint: '1', weight: '0' }],
    restraintRows,
  });
  const built = builderApi.buildCustomInputXmlResult(model, { dropShortElementLengthNodes: false });
  assert(built.xmlText.includes('<LineNo>L-100</LineNo>'), 'explicit LineNo should survive node XML generation');
  assert(built.xmlText.includes('<OutsideDiameter>114.3</OutsideDiameter>'), 'explicit OutsideDiameter should survive node XML generation');
  assert(built.xmlText.includes('<InsulationDensity>0.00012</InsulationDensity>'), 'explicit insulation density should survive node XML generation');
  assert(built.xmlText.includes('<Pressure9>900</Pressure9>'), 'Pressure9 should survive node XML generation');
  assert(built.xmlText.includes('<Temperature9>9</Temperature9>'), 'Temperature9 should survive node XML generation');
  assert(built.xmlText.includes('<Restraint><Type>+Y</Type>'), 'recognized direction should resolve generic REST type');
  assert(!built.xmlText.includes('<CustomRestraint>'), 'new node XML should emit schema-shaped Restraint records');
  const node30 = built.xmlText.match(/<Node><NodeNumber>30<\\/NodeNumber>[\\s\\S]*?<\\/Node>/)?.[0] || '';
  assert(node30 && !node30.includes('<Position>'), 'missing position must be omitted rather than fabricated');
  assert(built.diagnostics.records.some((row) => row.code === 'XML_BUILDER_POSITION_OMITTED'), 'missing position should be diagnosed');

  const result = coreApi.buildInputXmlFromNodeXml(built.xmlText, { applyEnrichment: false, buildProfile: 'xml-builder' });
  assert(result.coreInputXmlText.includes('LINE_ID="L-100"'), 'explicit LineNo should become InputXML LINE_ID');
  assert(result.coreInputXmlText.includes('DIAMETER="114.300000"'), 'explicit OutsideDiameter should become InputXML DIAMETER');
  assert(result.coreInputXmlText.includes('INSUL_DENSITY="0.000120"'), 'explicit insulation density should become InputXML INSUL_DENSITY');
  assert(result.coreInputXmlText.includes('PRESSURE9="900.000000"'), 'Pressure9 should become InputXML context');
  assert(result.coreInputXmlText.includes('TEMP_EXP_C9="9.000000"'), 'Temperature9 should become InputXML context');
  assert(result.coreInputXmlText.includes('<RESTRAINT NUM="1" NODE="20.000000" TYPE="17.000000"'), 'generic REST with +Y direction should emit mapped restraint type 17');
  assert.strictEqual((result.coreInputXmlText.match(/<RESTRAINT NUM=/g) || []).length, 6, 'InputXML should retain the fixed six restraint slots');
  assert(result.diagnostics.records.some((row) => row.code === 'XML_BUILDER_RESTRAINT_SLOT_TRUNCATED'), 'restraint overflow should be diagnosed');
  assert(result.diagnostics.records.some((row) => row.code === 'XML_BUILDER_NODE_DROPPED_MISSING_POSITION'), 'missing-position route drop should be diagnosed');
  assert.strictEqual(result.diagnostics.summary.elementCount, 1, 'only the two positioned nodes should form one route element');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'xml-builder-python-smoke-'));
  const inputPath = path.join(tempDir, 'xml-builder.input.xml');
  const outputPath = path.join(tempDir, 'xml-builder.cii');
  fs.writeFileSync(inputPath, result.coreInputXmlText, 'utf8');
  const converted = spawnSync(process.env.PYTHON || 'python3', [path.join(root, 'converters/scripts/inputxml_to_cii2019.py'), '--input', inputPath, '--output', outputPath], { encoding: 'utf8' });
  assert.strictEqual(converted.status, 0, `Python downstream conversion should succeed: ${converted.stderr || converted.stdout}`);
  const ciiText = fs.readFileSync(outputPath, 'utf8');
  assert(ciiText.includes('ELEMENTS') && ciiText.length > 100, 'downstream CII output should contain an ELEMENTS section');
}

function assertInputXmlTopoSemantics(api, launcherXml) {`,
    'xml builder pipeline test');
  source = replaceOnce(source,
`  const api = await import(pathToFileURL(path.join(tempRoot, 'tabs/model-converters/xml-cii-node-to-inputxml-core.js')).href);
  const launcherXml = read('Benchmarks/LAUNCHERTOPO.XML');`,
`  const api = await import(pathToFileURL(path.join(tempRoot, 'tabs/model-converters/xml-cii-node-to-inputxml-core.js')).href);
  const modelApi = await import(pathToFileURL(path.join(tempRoot, 'converters/xml-cii2019-core/custom-input-model.js')).href);
  const builderApi = await import(pathToFileURL(path.join(tempRoot, 'converters/xml-cii2019-core/custom-input-xml-builder.js')).href);
  const launcherXml = read('Benchmarks/LAUNCHERTOPO.XML');`,
    'test imports');
  source = replaceOnce(source,
`  assertLauncherSemantics(result);
  assertInputXmlTopoSemantics(api, launcherXml);`,
`  assertLauncherSemantics(result);
  assertXmlBuilderPipelineSemantics(modelApi, builderApi, api);
  assertInputXmlTopoSemantics(api, launcherXml);`,
    'test invocation');
  return source;
});

console.log('Guarded XML Builder Work Pack patch applied.');
