import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { installSimpleXmlDom } from '../tests/helpers/simple-xml-dom.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = dirname(SCRIPT_DIR);
const PIN_PATH = join(REPOSITORY_ROOT, 'contracts', 'xml-builder-producer-conformance', 'v1', 'pin.json');

function argument(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || fallback) : fallback;
}

function sha256(value) {
  return createHash('sha256').update(String(value ?? ''), 'utf8').digest('hex');
}

function gitHead(root) {
  return execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

function pipingElementCount(value) {
  return (String(value ?? '').match(/<PIPINGELEMENT\b/gi) || []).length;
}

function firstDifference(left, right) {
  const a = String(left ?? '');
  const b = String(right ?? '');
  const length = Math.min(a.length, b.length);
  let index = 0;
  while (index < length && a[index] === b[index]) index += 1;
  if (index === a.length && index === b.length) return null;
  return Object.freeze({
    index,
    left: a.slice(Math.max(0, index - 80), index + 160),
    right: b.slice(Math.max(0, index - 80), index + 160),
    leftLength: a.length,
    rightLength: b.length,
  });
}

async function prepareLocalEsmFixture() {
  const root = await mkdtemp(join(tmpdir(), 'xml-builder-shadow-conformance-'));
  await writeFile(join(root, 'package.json'), '{"type":"module"}\n', 'utf8');
  const paths = [
    'converters/xml-cii2019-core',
    'tabs/model-converters/xml-cii-node-to-inputxml-core.js',
    'tabs/model-converters/xml-cii-node-to-inputxml-audit.js',
    'tabs/model-converters/xml-cii-node-to-inputxml-topology-normalizer.js',
    'tabs/xml-cii-2019-standalone',
    'xml-compare/CategorizedInputXmlConverter.js',
  ];
  for (const relativePath of paths) {
    const source = join(REPOSITORY_ROOT, relativePath);
    const target = join(root, relativePath);
    await mkdir(dirname(target), { recursive: true });
    await cp(source, target, { recursive: true });
  }
  return root;
}

function sampleTables() {
  return Object.freeze({
    branchRows: 'BranchName\tLineNo\tNodeNumber\tBoreMm\tOutsideDiameter\tWallThickness\tP1\tP9\tT1\tT2\tT3\tT9\tFluidDensity\tInsulationDensity\n/CUSTOM-4"-P8810212-31441C4-PP/B1\t4-P8810212-31441C4-PP\t100\t100\t114.3\t6.02\t4140\t900\t260\t151\t5\t9\t983\t0.00012',
    coordinateRows: 'BranchName\tNodeNumber\tX\tY\tZ\n/CUSTOM-4"-P8810212-31441C4-PP/B1\t100\t200000\t-1098000\t101000\n/CUSTOM-4"-P8810212-31441C4-PP/B1\t110\t200500\t-1098000\t101000',
    weightRows: 'BranchName\tNodeNumber\tComponentType\tRigid\tEndpoint\tWeight\tComponentRefNo\n/CUSTOM-4"-P8810212-31441C4-PP/B1\t100\tPIPE\t0\t1\t0\tP-100\n/CUSTOM-4"-P8810212-31441C4-PP/B1\t110\tRIGID\t2\t2\t43\tV-110',
    restraintRows: 'BranchName\tNodeNumber\tNodeName\tRestraintType\tGap\tStiffness\tFriction\tDirection\n/CUSTOM-4"-P8810212-31441C4-PP/B1\t110\tPS-1001\tREST\t0\t1.751270E+12\t0.3\t+Y',
    dtxrRows: 'BranchName\tNodeNumber\tDTXR\n/CUSTOM-4"-P8810212-31441C4-PP/B1\t110\tGATE VALVE FLGD 300#',
  });
}

async function loadAuthorities(localFixtureRoot, xmlUtilitiesRoot, pin) {
  const localApi = await import(pathToFileURL(join(localFixtureRoot, 'converters/xml-cii2019-core/custom-input-api.js')).href);
  const localCore = await import(pathToFileURL(join(localFixtureRoot, 'tabs/model-converters/xml-cii-node-to-inputxml-core.js')).href);
  const localCategorizer = await import(pathToFileURL(join(localFixtureRoot, 'xml-compare/CategorizedInputXmlConverter.js')).href);
  const upstreamService = await import(pathToFileURL(join(xmlUtilitiesRoot, pin.serviceEntrypoint)).href);
  return Object.freeze({ localApi, localCore, localCategorizer, upstreamService });
}

function buildInputXml(authorities) {
  const options = Object.freeze({ dropShortElementLengthNodes: false });
  const nodeXml = authorities.localApi.buildXmlCiiCustomInputXml(sampleTables(), options);
  const inputXml = authorities.localCore.buildInputXmlFromNodeXml(nodeXml.xmlText, {
    applyEnrichment: false,
    buildProfile: 'xml-builder-shadow-conformance',
    jobName: 'XML_BUILDER_SHADOW_CONFORMANCE',
    sourceName: 'xml-builder-shadow-generated.xml',
  });
  const text = inputXml.finalInputXmlText || inputXml.coreInputXmlText || '';
  return Object.freeze({ nodeXml, inputXml, text });
}

function createRequest(pin, inputXmlText) {
  return Object.freeze({
    schema: pin.requestSchema,
    requestId: `xml-builder-shadow-${sha256(inputXmlText).slice(0, 16)}`,
    producer: Object.freeze({ ...pin.producer }),
    source: Object.freeze({
      filename: 'xml-builder-shadow-conformance.input.xml',
      content: inputXmlText,
    }),
  });
}

async function runConformance(xmlUtilitiesRoot, evidencePath) {
  installSimpleXmlDom();
  const pin = JSON.parse(await readFile(PIN_PATH, 'utf8'));
  const upstreamCommit = gitHead(xmlUtilitiesRoot);
  const localCommit = gitHead(REPOSITORY_ROOT);
  const localFixtureRoot = await prepareLocalEsmFixture();
  let evidence;
  try {
    if (upstreamCommit !== pin.sourceCommit) {
      throw Object.assign(new Error(`Pinned XML Utilities commit mismatch: expected ${pin.sourceCommit}, observed ${upstreamCommit}.`), { code: 'UPSTREAM_COMMIT_MISMATCH' });
    }
    const authorities = await loadAuthorities(localFixtureRoot, xmlUtilitiesRoot, pin);
    const generated = buildInputXml(authorities);
    const elementCount = pipingElementCount(generated.text);
    if (!generated.inputXml.ok || elementCount < 1) {
      throw Object.assign(new Error('The real XML Builder chain produced no PIPINGELEMENT records.'), { code: 'XML_BUILDER_ZERO_ROUTE' });
    }
    if (!/<CAESARII\b[^>]*XML_TYPE="Input"/i.test(generated.text)) {
      throw Object.assign(new Error('The XML Builder output is not CAESARII InputXML.'), { code: 'XML_BUILDER_INPUTXML_INVALID' });
    }

    const request = createRequest(pin, generated.text);
    const service = authorities.upstreamService.createInputXmlProducerService();
    const result = service.categorizeInputXml(request);
    const localCategorizedText = authorities.localCategorizer.inputXmlToCategorizedInputXml(generated.text, {
      sourceName: request.source.filename,
    });
    const upstreamCategorizedText = String(result?.artifact?.text || '');
    const difference = firstDifference(localCategorizedText, upstreamCategorizedText);
    const checks = Object.freeze({
      upstreamSuccess: result?.success === true,
      resultSchema: result?.schema === pin.resultSchema,
      artifactRole: result?.artifact?.role === pin.artifactRole,
      validationPass: result?.categorizedValidation?.success === true,
      sourceFingerprintBound: result?.artifact?.sourceFingerprint === result?.source?.fingerprint,
      inputElementCount: Number(result?.summary?.inputElements || 0) === elementCount,
      categorizedElementCount: Number(result?.summary?.categorizedElements || 0) === elementCount,
      localUpstreamByteParity: difference === null,
    });
    const failedChecks = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
    evidence = {
      schema: 'xml-builder-producer-shadow-conformance-evidence/v1',
      status: failedChecks.length ? 'BLOCKED' : 'PASS',
      mode: pin.mode,
      localRepository: 'reallaksh19/3D_Converters',
      localCommit,
      upstreamRepository: pin.sourceRepository,
      upstreamCommit,
      serviceEntrypoint: pin.serviceEntrypoint,
      producer: request.producer,
      source: {
        filename: request.source.filename,
        bytes: Buffer.byteLength(generated.text, 'utf8'),
        sha256: sha256(generated.text),
        pipingElements: elementCount,
        diagnostics: generated.inputXml.diagnostics?.summary || null,
      },
      localCategorized: {
        bytes: Buffer.byteLength(localCategorizedText, 'utf8'),
        sha256: sha256(localCategorizedText),
      },
      upstreamResult: {
        schema: result?.schema || null,
        requestId: result?.requestId || null,
        success: result?.success === true,
        summary: result?.summary || null,
        diagnosticCounts: result?.diagnosticCounts || null,
        diagnostics: result?.diagnostics || [],
        categorizedValidation: result?.categorizedValidation || null,
        artifact: result?.artifact ? {
          role: result.artifact.role,
          filename: result.artifact.filename,
          bytes: Buffer.byteLength(upstreamCategorizedText, 'utf8'),
          sha256: sha256(upstreamCategorizedText),
          sourceFingerprint: result.artifact.sourceFingerprint,
        } : null,
      },
      checks,
      failedChecks,
      firstDifference: difference,
      productionSwitchAuthorized: pin.switchAuthorized,
      protectedAuthorities: pin.protectedAuthorities,
    };
    if (failedChecks.length) {
      throw Object.assign(new Error(`XML Builder producer conformance blocked: ${failedChecks.join(', ')}.`), { code: 'SHADOW_CONFORMANCE_BLOCKED', evidenceReady: true });
    }
  } catch (error) {
    if (!evidence) {
      evidence = {
        schema: 'xml-builder-producer-shadow-conformance-evidence/v1',
        status: 'BLOCKED',
        mode: 'shadow-only',
        localRepository: 'reallaksh19/3D_Converters',
        localCommit,
        upstreamRepository: pin.sourceRepository,
        upstreamCommit,
        error: { code: error?.code || 'SHADOW_CONFORMANCE_FAILED', message: error?.message || String(error) },
        productionSwitchAuthorized: false,
      };
    } else {
      evidence.error = { code: error?.code || 'SHADOW_CONFORMANCE_BLOCKED', message: error?.message || String(error) };
    }
    await mkdir(dirname(evidencePath), { recursive: true });
    await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
    throw error;
  } finally {
    await rm(localFixtureRoot, { recursive: true, force: true });
  }
  await mkdir(dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  return evidence;
}

const xmlUtilitiesRoot = resolve(argument('--xml-utils-root', join(REPOSITORY_ROOT, '..', 'XML_Compare_Utilities')));
const evidencePath = resolve(argument('--evidence', join(REPOSITORY_ROOT, 'artifacts', 'xml-builder-producer-shadow-conformance.json')));

try {
  const evidence = await runConformance(xmlUtilitiesRoot, evidencePath);
  console.log(`XML Builder producer shadow conformance ${evidence.status}.`);
  console.log(`Evidence: ${evidencePath}`);
} catch (error) {
  console.error(error?.stack || error?.message || String(error));
  console.error(`Evidence: ${evidencePath}`);
  process.exitCode = 1;
}

export const _test = Object.freeze({ argument, sha256, pipingElementCount, firstDifference, sampleTables, createRequest, runConformance });
