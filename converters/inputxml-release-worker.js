/**
 * Functionality: execute structural InputXML preflight and gated CII release in Pyodide.
 * Parameters: exact source path, explicit compatibility options, job directory, and a script runner.
 * Outputs: diagnostic evidence for BLOCKED runs or a complete manifest-selected PASS release.
 * Fallback: none; CII is never returned without PASS assurance and a selected-output manifest.
 */
const MODES = Object.freeze(new Set(['CANONICAL_STRICT', 'ADAPTED_CANONICAL', 'DIAGNOSTIC_ONLY']));
const PREFLIGHT_FILES = Object.freeze([
  ['preflight-result.json', 'preflightResult'],
  ['canonicalization-ledger.json', 'canonicalizationLedger'],
  ['canonical-validation.json', 'canonicalValidation'],
  ['compatibility-policy.json', 'compatibilityPolicy'],
  ['normalization-plan.json', 'normalizationPlan'],
  ['canonical.input.xml', 'canonicalInputXml'],
  ['canonical-topology-v2.json', 'canonicalTopology'],
  ['topo-node-plan.json', 'topoNodePlan'],
  ['numbered-topology-projection.json', 'numberedTopologyProjection'],
  ['parsed-inputxml-topology.json', 'parsedInputXmlTopology'],
  ['topology-parity-report-v2.json', 'topologyParityReport'],
  ['canonical-source-model.json', 'canonicalSourceModel'],
  ['resolved-relationships.json', 'resolvedRelationships'],
  ['assurance-ledger-v1.json', 'assuranceLedgerV1'],
  ['assurance-ledger-v2.json', 'assuranceLedger'],
  ['approved-semantic-split.json', 'approvedSemanticSplitEvidence'],
]);

function readText(pyodide, path) {
  return pyodide.FS.readFile(path, { encoding: 'utf8' });
}

function tryReadOutput(pyodide, directory, fileName, role) {
  try {
    const text = readText(pyodide, `${directory}/${fileName}`);
    const mime = fileName.endsWith('.xml') ? 'application/xml;charset=utf-8' : 'application/json;charset=utf-8';
    return { name: fileName, text, mime, role };
  } catch {
    return null;
  }
}

function preflightArgv(sourcePath, outputDir, mode, approvalId) {
  const argv = [
    '/repo/converters/scripts/inputxml_release_preflight.py', '--input', sourcePath,
    '--output-dir', outputDir,
    '--contracts-dir', '/repo/contracts/inputxml/v1',
    '--approval-dir', '/repo/contracts/inputxml/v2/approvals',
    '--mode', mode,
  ];
  if (approvalId) argv.push('--approved-split-id', approvalId);
  return argv;
}

function releaseArgv(releaseDir, hasApproval) {
  const argv = [
    '/repo/converters/scripts/inputxml_to_cii2019_release.py',
    '--input', `${releaseDir}/canonical.input.xml`,
    '--assurance-ledger', `${releaseDir}/assurance-ledger-v2.json`,
    '--projection-contract', '/repo/contracts/inputxml/v1/catalogs/inputxml-cii-projection-contract.json',
    '--compatibility-policy', `${releaseDir}/compatibility-policy.json`,
    '--canonicalization-ledger', `${releaseDir}/canonicalization-ledger.json`,
    '--canonical-validation', `${releaseDir}/canonical-validation.json`,
    '--normalization-plan', `${releaseDir}/normalization-plan.json`,
    '--canonical-source-model', `${releaseDir}/canonical-source-model.json`,
    '--resolved-relationships', `${releaseDir}/resolved-relationships.json`,
    '--canonical-topology', `${releaseDir}/canonical-topology-v2.json`,
    '--topo-node-plan', `${releaseDir}/topo-node-plan.json`,
    '--numbered-projection', `${releaseDir}/numbered-topology-projection.json`,
    '--parsed-topology', `${releaseDir}/parsed-inputxml-topology.json`,
    '--topology-parity', `${releaseDir}/topology-parity-report-v2.json`,
    '--output', `${releaseDir}/released.cii`,
    '--projection-ledger', `${releaseDir}/cii-projection-ledger.json`,
    '--selected-output-manifest', `${releaseDir}/selected-output-manifest.json`,
  ];
  if (hasApproval) argv.push('--approved-semantic-split', `${releaseDir}/approved-semantic-split.json`);
  return argv;
}

function copyReleaseInputs(pyodide, preflightDir, releaseDir) {
  const fileNames = [
    'canonical.input.xml', 'assurance-ledger-v2.json', 'compatibility-policy.json',
    'canonicalization-ledger.json', 'canonical-validation.json', 'normalization-plan.json',
    'canonical-source-model.json', 'resolved-relationships.json',
    'canonical-topology-v2.json', 'topo-node-plan.json',
    'numbered-topology-projection.json', 'parsed-inputxml-topology.json',
    'topology-parity-report-v2.json',
  ];
  for (const fileName of fileNames) {
    pyodide.FS.writeFile(`${releaseDir}/${fileName}`, pyodide.FS.readFile(`${preflightDir}/${fileName}`));
  }
  try {
    pyodide.FS.writeFile(`${releaseDir}/approved-semantic-split.json`, pyodide.FS.readFile(`${preflightDir}/approved-semantic-split.json`));
    return true;
  } catch {
    return false;
  }
}

function requireMode(options) {
  const mode = String(options?.inputXmlCompatibilityMode || 'CANONICAL_STRICT').trim();
  if (!MODES.has(mode)) throw new Error(`Unsupported InputXML compatibility mode ${mode}.`);
  const approvalId = String(options?.approvedSemanticSplitId || '').trim();
  if (approvalId && mode !== 'ADAPTED_CANONICAL') throw new Error('Approved semantic split requires ADAPTED_CANONICAL mode.');
  if (mode === 'ADAPTED_CANONICAL' && !approvalId) throw new Error('ADAPTED_CANONICAL mode requires an exact approved semantic split ID.');
  return { mode, approvalId };
}

function collectPreflightOutputs(pyodide, directory) {
  return PREFLIGHT_FILES.map(([name, role]) => tryReadOutput(pyodide, directory, name, role)).filter(Boolean);
}

function parsePreflight(outputs) {
  const artifact = outputs.find((item) => item.role === 'preflightResult');
  if (!artifact) throw new Error('Structural InputXML preflight returned no result artifact.');
  return JSON.parse(artifact.text);
}

export async function runInputXmlReleaseJob(input) {
  const { pyodide, sourcePath, options, jobDir, runScript } = input;
  const selection = requireMode(options);
  const preflightDir = `${jobDir}/inputxml-preflight`;
  const releaseDir = `${jobDir}/inputxml-release`;
  pyodide.FS.mkdirTree(preflightDir);
  pyodide.FS.mkdirTree(releaseDir);
  const preflightExit = await runScript('/repo/converters/scripts/inputxml_release_preflight.py', preflightArgv(sourcePath, preflightDir, selection.mode, selection.approvalId));
  if (![0, 2].includes(preflightExit)) throw new Error(`Structural InputXML preflight exited with code ${preflightExit}.`);
  const outputs = collectPreflightOutputs(pyodide, preflightDir);
  const preflight = parsePreflight(outputs);
  if (!preflight.releaseEligible) {
    return { outputs, preflight, released: false, argv: preflightArgv(sourcePath, preflightDir, selection.mode, selection.approvalId) };
  }
  const hasApproval = copyReleaseInputs(pyodide, preflightDir, releaseDir);
  const argv = releaseArgv(releaseDir, hasApproval);
  const releaseExit = await runScript('/repo/converters/scripts/inputxml_to_cii2019_release.py', argv);
  if (releaseExit !== 0) throw new Error(`Assured InputXML CII release exited with code ${releaseExit}.`);
  const cii = tryReadOutput(pyodide, releaseDir, 'released.cii', 'cii');
  const projection = tryReadOutput(pyodide, releaseDir, 'cii-projection-ledger.json', 'ciiProjectionLedger');
  const manifest = tryReadOutput(pyodide, releaseDir, 'selected-output-manifest.json', 'selectedOutputManifest');
  if (!cii || !projection || !manifest) throw new Error('PASS InputXML release is missing CII, projection, or selected manifest evidence.');
  const selected = JSON.parse(manifest.text);
  if (selected.status !== 'PASS') throw new Error('Selected InputXML output manifest is not PASS.');
  return { outputs: [cii, manifest, projection, ...outputs], preflight, released: true, argv };
}
