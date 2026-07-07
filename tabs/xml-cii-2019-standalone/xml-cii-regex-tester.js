import { detectXmlCiiWorkflowSourceKind } from './xml-cii-workflow-source-detect.js';

const SAMPLE_LIMIT = 2000;

export function createDefaultRegexTesterConfig() {
  return {
    tokenDelimiter: '-',
    lineKeyJoiner: '',
    lineKey: { regex: '', group: 1, tokenPosition: 3 },
    pipingClass: { regex: '', group: 1, tokenPosition: 4 },
    rating: { regex: '', group: 1, tokenPosition: 4 },
    bore: { regex: '', group: 1, tokenPosition: 2 },
    ratingSequence: [['200', '20000'], ['150', '15000'], ['100', '10000'], ['25', '2500'], ['15', '1500'], ['5', '5000'], ['1', '150'], ['3', '300'], ['6', '600'], ['9', '900']],
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

export function parseStandaloneRegexBranchSamples(sourceText) {
  try {
    const doc = new DOMParser().parseFromString(sourceText || '', 'application/xml');
    if (!doc.querySelector('parsererror')) {
      const rows = [];
      const seen = new Set();
      
      const addRow = (src, name, ref) => {
         const key = text(name || ref);
         if (key && !seen.has(key)) {
           seen.add(key);
           rows.push({ source: src, branchName: name, lineReference: ref });
         }
      };

      const allElements = doc.querySelectorAll('*');
      for (const el of allElements) {
        const tag = (el.localName || '').toLowerCase();
        
        if (tag === 'branch') {
          const name = el.getAttribute('NAME') || el.getAttribute('name') || Array.from(el.children).find(c => (c.localName || '').toLowerCase() === 'branchname')?.textContent || '';
          addRow('Branch', name, name);
        } else if (tag === 'branchname') {
          addRow('Branchname', el.textContent, el.textContent);
        } else if (tag === 'pipingelement') {
          const lineId = el.getAttribute('LINE_ID') || el.getAttribute('LineId') || '';
          addRow('PipingElement', lineId, lineId);
        } else if (tag === 'pipeline') {
          const name = el.getAttribute('Name') || el.getAttribute('NAME') || '';
          addRow('Pipeline', name, name);
        }
      }

      return rows.map((r, i) => ({ ...r, sampleIndex: i + 1 })).slice(0, SAMPLE_LIMIT);
    }
  } catch (err) {
    console.warn('DOMParser failed in regex extraction', err);
  }
  return [];
}

function mergeConfig(config = {}) {
  const defaults = createDefaultRegexTesterConfig();
  const source = safeObject(config);
  return {
    tokenDelimiter: text(source.tokenDelimiter || defaults.tokenDelimiter),
    lineKeyJoiner: text(source.lineKeyJoiner ?? defaults.lineKeyJoiner),
    lineKey: { ...defaults.lineKey, ...safeObject(source.lineKey) },
    pipingClass: { ...defaults.pipingClass, ...safeObject(source.pipingClass) },
    rating: { ...defaults.rating, ...safeObject(source.rating) },
    bore: { ...defaults.bore, ...safeObject(source.bore) },
    ratingSequence: Array.isArray(source.ratingSequence) ? source.ratingSequence : defaults.ratingSequence,
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

function tokenValue(value, rule, delimiter, joiner) {
  const posText = String(rule.tokenPosition || '').trim();
  if (!posText) return '';
  const positions = posText.split(/[,+]/).map((p) => Number(p.trim())).filter((p) => Number.isFinite(p) && p > 0);
  if (!positions.length) return '';
  const tokens = String(value || '').split(delimiter || '-').map((part) => part.trim());
  const parts = positions.map((pos) => tokens[pos - 1] || '').filter(Boolean);
  return parts.join(joiner || '');
}

function extractValue(value, rule, delimiter, joiner) {
  return regexValue(value, rule) || tokenValue(value, rule, delimiter, joiner);
}

function deriveRatingFromPc(pipingClass, sequence) {
  const pcText = String(pipingClass ?? '').trim().toUpperCase();
  if (!pcText) return '';
  for (const pair of (sequence || [])) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    const prefix = String(pair[0]).trim().toUpperCase();
    if (prefix && pcText.startsWith(prefix)) {
      return String(pair[1]);
    }
  }
  return '';
}

function extractionRow(sample, cfg) {
  const source = sample.branchName || sample.lineReference || '';
  const pcVal = extractValue(source, cfg.pipingClass, cfg.tokenDelimiter);
  const ratingVal = deriveRatingFromPc(pcVal, cfg.ratingSequence) || extractValue(source, cfg.rating, cfg.tokenDelimiter).match(/\d+/)?.[0] || '';
  
  const row = {
    ...sample,
    lineKey: extractValue(source, cfg.lineKey, cfg.tokenDelimiter, cfg.lineKeyJoiner),
    pipingClass: pcVal,
    rating: ratingVal,
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
  config.linelist = { ...safeObject(config.linelist), branchNameRegex: cfg.lineKey.regex, lineNoGroup: cfg.lineKey.group, tokenDelimiter: cfg.tokenDelimiter, lineKeyTokenPositions: String(cfg.lineKey.tokenPosition || ''), lineKeyJoiner: cfg.lineKeyJoiner };
  config.rating = { ...safeObject(config.rating), pipingClassRegex: cfg.pipingClass.regex, pipingClassGroup: cfg.pipingClass.group, ratingRegex: cfg.rating.regex, ratingGroup: cfg.rating.group, tokenDelimiter: cfg.tokenDelimiter, pipingClassTokenIndex: cfg.pipingClass.tokenPosition, ratingSequence: cfg.ratingSequence };
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
