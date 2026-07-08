function toFiniteNumber(value, fallback) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  return fallback;
}

function toStringValue(value) {
  if (value === undefined || value === null) return '';
  return String(value);
}

function sanitizeFileName(name) {
  const normalized = toStringValue(name).trim();
  if (!normalized) return 'input.dat';
  return normalized.replace(/[\\/:*?"<>|]/g, '_');
}

function baseNameWithoutExtension(name) {
  const cleaned = sanitizeFileName(name);
  const idx = cleaned.lastIndexOf('.');
  if (idx <= 0) return cleaned;
  return cleaned.slice(0, idx);
}

function outputName(primaryName, converterId, extension) {
  const stem = baseNameWithoutExtension(primaryName);
  return `${stem}_${converterId}${extension}`;
}

function pushOptionalStringArg(argv, flag, value) {
  const text = toStringValue(value).trim();
  if (!text) return;
  argv.push(`${flag}=${text}`);
}

function pushOptionalNumberArg(argv, flag, value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return;
  argv.push(flag, String(numeric));
}

function parseJsonObject(text) {
  try {
    const parsed = JSON.parse(toStringValue(text) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function boolOrNull(value) {
  if (value === true || value === false) return value;
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number') return value !== 0;
  const clean = toStringValue(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(clean)) return true;
  if (['0', 'false', 'no', 'off'].includes(clean)) return false;
  return null;
}

function pushSupportArgs(argv, options) {
  pushOptionalStringArg(argv, '--support-stiffness', options?.supportStiffness);
  pushOptionalStringArg(argv, '--support-gap', options?.supportGap);
  pushOptionalStringArg(argv, '--support-friction', options?.supportFriction);
  pushOptionalStringArg(argv, '--guide-gap', options?.guideGap);
  pushOptionalStringArg(argv, '--line-stop-gap', options?.lineStopGap);
  pushOptionalStringArg(argv, '--limit-gap', options?.limitGap);
  pushOptionalStringArg(argv, '--rest-gap', options?.restGap);
  pushOptionalStringArg(argv, '--anchor-gap', options?.anchorGap);
  pushOptionalStringArg(argv, '--support-pipe-axis', options?.supportPipeAxis);
  pushOptionalStringArg(argv, '--vertical-axis', options?.verticalAxis);
  pushOptionalStringArg(argv, '--line-stop-direction', options?.lineStopDirection);
  pushOptionalStringArg(argv, '--limit-direction', options?.limitDirection);
  pushOptionalStringArg(argv, '--rest-direction', options?.restDirection);
}

function converterSpec(converterId) {
  if (converterId === 'rvm_to_rev') return { script: 'rvm_to_rev.py', extension: '.rev' };
  if (converterId === 'rvmattr_to_xml') return { script: 'rvm_attribute_to_xml.py', extension: '.xml' };
  if (converterId === 'rev_to_pcf') return { script: 'rev_to_pcf.py', extension: '.pcf' };
  if (converterId === 'rev_to_xml') return { script: 'rev_to_xml.py', extension: '.xml' };
  if (converterId === 'json_to_xml') return { script: 'json_to_xml.py', extension: '.xml' };
  if (converterId === 'stagedjson_to_xml') return { script: 'stagedjson_to_xml.py', extension: '.xml' };
  if (converterId === 'stagedjson_to_inputxml') return { script: 'stagedjson_to_inputxml.py', extension: '.xml' };
  if (converterId === 'rev_to_stp') return { script: 'rev_to_stp.py', extension: '.stp' };
  if (converterId === 'xml_to_cii') return { script: 'xml_to_cii2019_contracted_direction.py', extension: '.cii' };
  if (converterId === 'cii_syntax_check_2019') return { script: 'cii_syntax_check_2019.py', extension: '.json' };
  if (converterId === 'inputxml_to_cii') return { script: 'inputxml_to_cii2014.py', extension: '.cii' };
  if (converterId === 'inputxml14_to_cii') return { script: 'inputxml_to_cii2014.py', extension: '.cii' };
  if (converterId === 'inputxml_to_cii2019') return { script: 'inputxml_to_cii2019.py', extension: '.cii' };
  if (converterId === 'pdf_to_inputxml') return { script: 'pdf_to_inputxml.py', extension: '.xml' };
  if (converterId === 'pdf_to_inputxml_cii14') return { script: 'pdf_to_inputxml_cii14.py', extension: '.xml' };
  throw new Error(`Unsupported converter "${converterId}".`);
}

export function buildInvocation(converterId, primaryPath, primaryName, secondaryPath, options, jobDir) {
  const spec = converterSpec(converterId);
  const scriptPath = `/scripts/${spec.script}`;
  const effectivePrimaryPath = converterId === 'rvmattr_to_xml' && secondaryPath ? secondaryPath : primaryPath;
  const effectivePrimaryName = converterId === 'rvmattr_to_xml' && secondaryPath ? 'ATTRIBUTE' : primaryName;
  const outputFileName = outputName(effectivePrimaryName, converterId, spec.extension);
  const outputPath = `${jobDir}/${outputFileName}`;
  const argv = (converterId === 'pdf_to_inputxml' || converterId === 'pdf_to_inputxml_cii14')
    ? [scriptPath, '--input-pdf', effectivePrimaryPath, '--output', outputPath]
    : [scriptPath, '--input', effectivePrimaryPath, '--output', outputPath];

  if (converterId === 'rvm_to_rev') {
    if (secondaryPath) argv.push('--attributes', secondaryPath);
  } else if (converterId === 'rvmattr_to_xml') {
    pushOptionalNumberArg(argv, '--node-start', options?.nodeStart);
    pushOptionalNumberArg(argv, '--node-step', options?.nodeStep);
    pushOptionalStringArg(argv, '--source', options?.source);
    pushOptionalStringArg(argv, '--purpose', options?.purpose);
    pushOptionalStringArg(argv, '--title-line', options?.titleLine);
    pushOptionalNumberArg(argv, '--default-diameter', options?.defaultDiameter);
    pushOptionalNumberArg(argv, '--default-wall-thickness', options?.defaultWallThickness);
    pushOptionalNumberArg(argv, '--default-corrosion-allowance', options?.defaultCorrosionAllowance);
    pushOptionalNumberArg(argv, '--default-insulation-thickness', options?.defaultInsulationThickness);
    pushSupportArgs(argv, options);
  } else if (converterId === 'rev_to_pcf') {
    argv.push('--coord-factor', String(toFiniteNumber(options?.coordFactor, 1000)));
    pushOptionalStringArg(argv, '--pipeline-reference', options?.pipelineReference);
    pushOptionalStringArg(argv, '--project-identifier', options?.projectIdentifier);
    pushOptionalStringArg(argv, '--exclude-group-tokens', options?.excludeGroupTokens);
    pushOptionalNumberArg(argv, '--topology-merge-tolerance', options?.topologyMergeTolerance);
  } else if (converterId === 'rev_to_xml') {
    argv.push('--coord-factor', String(toFiniteNumber(options?.coordFactor, 1000)));
    pushOptionalNumberArg(argv, '--node-start', options?.nodeStart);
    pushOptionalNumberArg(argv, '--node-step', options?.nodeStep);
    pushOptionalNumberArg(argv, '--node-merge-tolerance', options?.nodeMergeTolerance);
    pushOptionalStringArg(argv, '--source', options?.source);
    pushOptionalStringArg(argv, '--purpose', options?.purpose);
    pushOptionalStringArg(argv, '--title-line', options?.titleLine);
    if (options?.enablePsiRigidLogic) argv.push('--enable-psi-rigid-logic');
  } else if (converterId === 'json_to_xml') {
    argv.push('--coord-factor', String(toFiniteNumber(options?.coordFactor, 1000)));
    pushOptionalNumberArg(argv, '--node-start', options?.nodeStart);
    pushOptionalNumberArg(argv, '--node-step', options?.nodeStep);
    pushOptionalNumberArg(argv, '--default-diameter', options?.defaultDiameter);
    pushOptionalNumberArg(argv, '--default-wall-thickness', options?.defaultWallThickness);
  } else if (converterId === 'xml_to_cii') {
    argv.push('--coords-mode', 'all');
    if (secondaryPath) argv.push('--staged-json', secondaryPath);
    if (options?.useRestraintTypeBasedOnJson === false) {
      argv.push('--no-use-restraint-type-based-on-json');
    } else {
      argv.push('--use-restraint-type-based-on-json');
    }
    const splitCondensed = boolOrNull(options?.splitCondensedValveFlange);
    if (splitCondensed !== null) argv.push('--split-condensed-valve-flange', splitCondensed ? 'true' : 'false');
    const supportConfig = parseJsonObject(options?.supportConfigJson);
    if (options?.kgToNewton !== false) supportConfig.weightScale = 10;
    const supportJson = JSON.stringify(supportConfig);
    if (supportJson !== '{}') argv.push('--support-config-json', supportJson);
    if (options?.kgToNewton !== false) argv.push('--weight-scale', '10');
  } else if (converterId === 'inputxml_to_cii2019') {
    if (secondaryPath) argv.push('--staged-json', secondaryPath);
    if (options?.useRestraintTypeBasedOnJson !== false) argv.push('--use-restraint-type-based-on-json');
    if (options?.kgToNewton !== false) argv.push('--weight-scale', '10');
    const supportConfig = toStringValue(options?.supportConfigJson).trim();
    if (supportConfig) argv.push('--support-config-json', supportConfig);
  }

  return { scriptPath, argv, outputPath, outputName: outputFileName };
}
