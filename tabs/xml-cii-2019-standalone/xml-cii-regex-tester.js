import { detectXmlCiiWorkflowSourceKind } from './xml-cii-workflow-source-detect.js';

const SAMPLE_LIMIT = 50;

export function createDefaultRegexTesterConfig() {
  return {
    tokenDelimiter: '-',
    lineKey: { regex: '', group: 1, tokenPosition: 3 },
    pipingClass: { regex: '', group: 1, tokenPosition: 4 },
    rating: { regex: '', group: 1, tokenPosition: 4 },
    bore: { regex: '', group: 1, tokenPosition: 2 },
  };
}

function text(value) {
  return String(value ?? '').trim();
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function decodeXml(value) {
  return String(value ?? '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
}

function childText(xml, tagName) {
  const match = String(xml || '').match(new RegExp(`<\\s*(?:[A-Za-z_][\\w.-]*:)?${tagName}\\b[^>]*>([\\s\\S]*?)<\\s*\\/\\s*(?:[A-Za-z_][\\w.-]*:)?${tagName}\\s*>`, 'i'));
  return decodeXml(match?.[1] || '').trim();
}

function attrText(xml, attrName) {
  const match = String(xml || '').match(new RegExp(`${attrName}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return decodeXml(match?.[1] || '').trim();
}

function uniqueSamples(samples) {
  const seen = new Set();
  const out = [];
  for (const sample of samples) {
    const key = text(sample.branchName || sample.lineReference);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ ...sample, sampleIndex: out.length + 1 });
  }
  return out.slice(0, SAMPLE_LIMIT);
}

function samplesFromBranches(xmlText) {
  const rows = [];
  const pattern = /<\s*(?:[A-Za-z_][\w.-]*:)?Branch\b[^>]*>[\s\S]*?<\s*\/\s*(?:[A-Za-z_][\w.-]*:)?Branch\s*>/gi;
  let match;
  while ((match = pattern.exec(String(xmlText || '')))) {
    const block = match[0];
    const branchName = childText(block, 'Branchname') || attrText(block, 'Branchname') || attrText(block, 'Name');
    rows.push({ source: 'Branch', branchName, lineReference: childText(block, 'LineNo') || branchName });
  }
  return rows;
}

function samplesFromBranchnameTags(xmlText) {
  const rows = [];
  const pattern = /<\s*(?:[A-Za-z_][\w.-]*:)?Branchname\b[^>]*>([\s\S]*?)<\s*\/\s*(?:[A-Za-z_][\w.-]*:)?Branchname\s*>/gi;
  let match;
  while ((match = pattern.exec(String(xmlText || '')))) {
    const branchName = decodeXml(match[1]).trim();
    rows.push({ source: 'Branchname', branchName, lineReference: branchName });
  }
  return rows;
}

function samplesFromLineIds(xmlText) {
  const rows = [];
  const pattern = /<\s*(?:[A-Za-z_][\w.-]*:)?PipingElement\b[^>]*>/gi;
  let match;
  while ((match = pattern.exec(String(xmlText || '')))) {
    const lineId = attrText(match[0], 'LINE_ID') || attrText(match[0], 'LineId');
    rows.push({ source: 'PipingElement', branchName: lineId, lineReference: lineId });
  }
  return rows;
}

function samplesFromPipelineNames(xmlText) {
  const rows = [];
  const pattern = /<\s*(?:[A-Za-z_][\w.-]*:)?Pipeline\b[^>]*>/gi;
  let match;
  while ((match = pattern.exec(String(xmlText || '')))) {
    const name = attrText(match[0], 'Name');
    rows.push({ source: 'Pipeline', branchName: name, lineReference: name });
  }
  return rows;
}

export function parseStandaloneRegexBranchSamples(sourceText) {
  return uniqueSamples([
    ...samplesFromBranches(sourceText),
    ...samplesFromBranchnameTags(sourceText),
    ...samplesFromLineIds(sourceText),
    ...samplesFromPipelineNames(sourceText),
  ]);
}

function mergeConfig(config = {}) {
  const defaults = createDefaultRegexTesterConfig();
  const source = safeObject(config);
  return {
    tokenDelimiter: text(source.tokenDelimiter || defaults.tokenDelimiter),
    lineKey: { ...defaults.lineKey, ...safeObject(source.lineKey) },
    pipingClass: { ...defaults.pipingClass, ...safeObject(source.pipingClass) },
    rating: { ...defaults.rating, ...safeObject(source.rating) },
    bore: { ...defaults.bore, ...safeObject(source.bore) },
  };
}

function regexValue(value, rule) {
  const pattern = text(rule.regex);
  if (!pattern) return '';
  try {
    const match = String(value || '').match(new RegExp(pattern));
    return text(match?.[Number(rule.group || 1)] ?? match?.[0]);
  } catch {
    return '';
  }
}

function tokenValue(value, rule, delimiter) {
  const index = Number(rule.tokenPosition || 0);
  if (!index) return '';
  const tokens = String(value || '').split(delimiter || '-').map((part) => part.trim());
  return text(tokens[index - 1]);
}

function extractValue(value, rule, delimiter) {
  return regexValue(value, rule) || tokenValue(value, rule, delimiter);
}

function extractionRow(sample, cfg) {
  const source = sample.branchName || sample.lineReference || '';
  const row = {
    ...sample,
    lineKey: extractValue(source, cfg.lineKey, cfg.tokenDelimiter),
    pipingClass: extractValue(source, cfg.pipingClass, cfg.tokenDelimiter),
    rating: extractValue(source, cfg.rating, cfg.tokenDelimiter).match(/\d+/)?.[0] || '',
    bore: extractValue(source, cfg.bore, cfg.tokenDelimiter).replace(/[^0-9.]/g, ''),
  };
  row.status = row.lineKey && row.pipingClass ? 'MATCHED' : 'REJECTED';
  return row;
}

function diagnosticsFor(rows, sourceKind) {
  return [
    { type: 'regex-tester-source-kind', sourceKind },
    { type: 'regex-tester-samples', rows: rows.length },
    { type: 'regex-tester-matched', rows: rows.filter((row) => row.status === 'MATCHED').length },
    { type: 'regex-tester-rejected', rows: rows.filter((row) => row.status !== 'MATCHED').length },
  ];
}

function writeRegexConfig(supportConfigJson, extractionConfig) {
  const config = JSON.parse(text(supportConfigJson) || '{}');
  const cfg = mergeConfig(extractionConfig);
  config.regexTester = cfg;
  config.linelist = { ...safeObject(config.linelist), branchNameRegex: cfg.lineKey.regex, lineNoGroup: cfg.lineKey.group, tokenDelimiter: cfg.tokenDelimiter, lineKeyTokenPositions: String(cfg.lineKey.tokenPosition || '') };
  config.rating = { ...safeObject(config.rating), pipingClassRegex: cfg.pipingClass.regex, pipingClassGroup: cfg.pipingClass.group, ratingRegex: cfg.rating.regex, ratingGroup: cfg.rating.group, tokenDelimiter: cfg.tokenDelimiter, pipingClassTokenIndex: cfg.pipingClass.tokenPosition };
  config.weight = { ...safeObject(config.weight), boreRegex: cfg.bore.regex, boreGroup: cfg.bore.group, tokenDelimiter: cfg.tokenDelimiter, boreTokenIndex: cfg.bore.tokenPosition };
  return JSON.stringify(config, null, 2);
}

export function runStandaloneRegexTester(input = {}) {
  const sourceText = String(input.sourceText || '');
  const sourceKind = input.sourceKind === 'auto' ? detectXmlCiiWorkflowSourceKind(sourceText) : (input.sourceKind || 'xml');
  const extractionConfig = mergeConfig(input.extractionConfig || input.regexTesterConfig);
  if (sourceKind === 'inputxml') return inputXmlNotRequired(extractionConfig, input.supportConfigJson);
  const branchSamples = parseStandaloneRegexBranchSamples(sourceText);
  const rows = branchSamples.map((sample) => extractionRow(sample, extractionConfig));
  const matchedRows = rows.filter((row) => row.status === 'MATCHED');
  const rejectedRows = rows.filter((row) => row.status !== 'MATCHED');
  return { branchSamples, matchedRows, rejectedRows, diagnostics: diagnosticsFor(rows, sourceKind), extractionConfig, supportConfigJson: writeRegexConfig(input.supportConfigJson, extractionConfig) };
}

function inputXmlNotRequired(extractionConfig, supportConfigJson) {
  return {
    branchSamples: [],
    matchedRows: [],
    rejectedRows: [],
    diagnostics: [{ type: 'regex-tester-inputxml-not-required', sourceKind: 'inputxml' }],
    extractionConfig,
    supportConfigJson: writeRegexConfig(supportConfigJson, extractionConfig),
  };
}
