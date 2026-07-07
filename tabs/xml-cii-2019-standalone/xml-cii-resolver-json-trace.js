import { detectXmlCiiWorkflowSourceKind } from './xml-cii-workflow-source-detect.js';

const PREVIEW_LIMIT = 25;

export function createDefaultResolverJsonTraceConfig() {
  return {
    nodeAliases: ['node', 'nodeKey', 'NODE', 'Node', 'FROM_NODE', 'TO_NODE'],
    psAliases: ['ps', 'PS', 'DTXR_PS', 'supportPs', 'psNo'],
    posAliases: ['pos', 'POS', 'DTXR_POS', 'position', 'Position'],
  };
}

function text(value) {
  return String(value ?? '').trim();
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function norm(value) {
  return text(value).toUpperCase().replace(/\s+/g, '').replace(/[()]/g, '');
}

function decodeXml(value) {
  return String(value ?? '').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
}

function attrsFromTag(tag) {
  const attrs = {};
  String(tag || '').replace(/([A-Za-z_][\w:.-]*)\s*=\s*["']([^"']*)["']/g, (_, key, value) => {
    attrs[key] = decodeXml(value);
    return '';
  });
  return attrs;
}

function tagName(tag) {
  const match = String(tag || '').match(/^<\s*\/?\s*(?:[A-Za-z_][\w.-]*:)?([A-Za-z_][\w.-]*)/);
  return match?.[1] || '';
}

function xmlTags(sourceText) {
  return [...String(sourceText || '').matchAll(/<\s*(?!\/|\?|!)(?:[A-Za-z_][\w.-]*:)?[A-Za-z_][\w.-]*\b[^>]*>/g)];
}

function nodeKeys(attrs) {
  return ['NODE', 'Node', 'node', 'FROM_NODE', 'TO_NODE', 'FromNode', 'ToNode']
    .map((key) => text(attrs[key]))
    .filter(Boolean);
}

function firstAttr(attrs, keys) {
  for (const key of keys) if (text(attrs[key])) return text(attrs[key]);
  return '';
}

function posFromAttrs(attrs) {
  const direct = firstAttr(attrs, ['DTXR_POS', 'POS', 'Pos', 'position', 'Position']);
  if (direct) return direct;
  const coords = ['X', 'Y', 'Z'].map((key) => text(attrs[key] ?? attrs[key.toLowerCase()]));
  return coords.every(Boolean) ? coords.join(',') : '';
}

function addIndex(index, key, row) {
  const id = norm(key);
  if (!id) return;
  if (!index[id]) index[id] = [];
  index[id].push(row);
}

function findXmlBranchPositions(sourceText) {
  const matches = [];
  const re = /<(Branchname|LineNo|LineKey|BranchName)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = re.exec(sourceText))) {
    matches.push({ name: match[2].trim(), index: match.index });
  }
  return matches;
}

function findActiveBranch(nodeCharIndex, branchPositions) {
  let activeBranch = 'Unassigned branch';
  let maxIdx = -1;
  for (const b of branchPositions) {
    if (b.index < nodeCharIndex && b.index > maxIdx) {
      activeBranch = b.name;
      maxIdx = b.index;
    }
  }
  if (activeBranch === 'Unassigned branch' && branchPositions.length) {
    activeBranch = branchPositions[0].name;
  }
  return activeBranch;
}

export function buildStandaloneXmlResolverIndex(sourceText) {
  const nodeIndex = {};
  const psIndex = {};
  const posIndex = {};
  const branchPositions = findXmlBranchPositions(sourceText);
  
  // 1. Try matching <Node>...</Node> blocks first (PSI116 XML)
  const nodeBlockRe = /<Node\b[^>]*>([\s\S]*?)<\/Node>/gi;
  const nodes = [];
  let blockMatch;
  let xmlIndex = 1;
  
  while ((blockMatch = nodeBlockRe.exec(sourceText))) {
    const body = blockMatch[1];
    const charIndex = blockMatch.index;
    
    const getTag = (tag) => {
      const match = body.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
      return match ? match[1].trim() : '';
    };
    
    const nodeKeysList = [getTag('NodeNumber')].filter(Boolean);
    const psKey = getTag('DTXR_PS') || getTag('DtxrPs') || getTag('NodeName') || getTag('ComponentRefNo') || '';
    const posKey = getTag('DTXR_POS') || getTag('DtxrPos') || getTag('Position') || '';
    
    nodes.push({
      xmlIndex: xmlIndex++,
      tagName: 'Node',
      nodeKeys: nodeKeysList,
      psKey,
      posKey,
      branchName: findActiveBranch(charIndex, branchPositions)
    });
  }
  
  // 2. Fallback to attributes (e.g. InputXML) if no Node blocks found
  if (nodes.length === 0) {
    xmlTags(sourceText).forEach((match, idx) => {
      const row = xmlNodeRow(match[0], idx);
      row.branchName = findActiveBranch(match.index, branchPositions);
      if (row.nodeKeys.length || row.psKey || row.posKey) {
        nodes.push(row);
      }
    });
  }
  
  for (const row of nodes) indexXmlNode(row, nodeIndex, psIndex, posIndex);
  return { nodes, nodeIndex, psIndex, posIndex, indexStats: indexStats(nodes, nodeIndex, psIndex, posIndex) };
}

function xmlNodeRow(tag, index) {
  const attrs = attrsFromTag(tag);
  return {
    xmlIndex: index + 1,
    tagName: tagName(tag),
    attrs,
    nodeKeys: nodeKeys(attrs),
    psKey: firstAttr(attrs, ['DTXR_PS', 'PS', 'Ps', 'supportPs', 'psNo']),
    posKey: posFromAttrs(attrs),
  };
}

function indexXmlNode(row, nodeIndex, psIndex, posIndex) {
  for (const key of row.nodeKeys) addIndex(nodeIndex, key, row);
  addIndex(psIndex, row.psKey, row);
  addIndex(posIndex, row.posKey, row);
}

function indexStats(nodes, nodeIndex, psIndex, posIndex) {
  return {
    xmlNodeCount: nodes.length,
    nodeKeyCount: Object.keys(nodeIndex).length,
    psKeyCount: Object.keys(psIndex).length,
    posKeyCount: Object.keys(posIndex).length,
  };
}

function configFrom(input = {}) {
  const parsed = parseSupportConfig(input.supportConfigJson);
  const source = safeObject(input.jsonConfig || parsed.jsonTrace || parsed.resolverJsonTrace);
  const defaults = createDefaultResolverJsonTraceConfig();
  return {
    nodeAliases: arrayOr(source.nodeAliases, defaults.nodeAliases),
    psAliases: arrayOr(source.psAliases, defaults.psAliases),
    posAliases: arrayOr(source.posAliases, defaults.posAliases),
  };
}

function arrayOr(value, fallback) {
  return Array.isArray(value) && value.length ? value.map(text).filter(Boolean) : [...fallback];
}

function parseSupportConfig(rawJson) {
  try { return safeObject(JSON.parse(text(rawJson) || '{}')); } catch { return {}; }
}

function parseJsonFacts(stagedJsonText) {
  if (!text(stagedJsonText)) return [];
  try { return collectFacts(JSON.parse(stagedJsonText)); } catch { return []; }
}

function collectFacts(value, path = '$', out = [], currentBranch = '', currentBore = '') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectFacts(item, `${path}[${index}]`, out, currentBranch, currentBore));
  } else if (safeObject(value) === value) {
    const name = String(value.name || value.attributes?.NAME || '').trim();
    let nextBranch = currentBranch;
    let nextBore = currentBore;
    
    if (value.type === 'BRANCH' || name.startsWith('/')) {
      nextBranch = name;
      const bVal = value.bore || value.attributes?.ABORE || value.attributes?.HBOR || value.attributes?.LBORE || '';
      if (bVal) nextBore = String(bVal).trim();
    }
    
    out.push({
      path,
      raw: value,
      stagedBranchKey: nextBranch || String(value.attributes?.OWNER || '').trim(),
      stagedBore: nextBore
    });
    
    for (const [key, child] of Object.entries(value)) {
      if (typeof child === 'object' && child) {
        collectFacts(child, `${path}.${key}`, out, nextBranch, nextBore);
      }
    }
  }
  return out;
}

function readAlias(row, aliases) {
  for (const key of aliases) {
    const val = row?.[key];
    if (val && typeof val === 'object') {
      const e = val.E ?? val.east ?? val.easting ?? val.X ?? val.x ?? '';
      const n = val.N ?? val.north ?? val.northing ?? val.Y ?? val.y ?? '';
      const el = val.EL ?? val.elev ?? val.elevation ?? val.Z ?? val.z ?? '';
      if (e || n || el) return `E=${e} N=${n} EL=${el}`;
      return JSON.stringify(val);
    }
    if (text(val)) return text(val);
  }
  return '';
}

function factKeys(fact, cfg) {
  const row = fact.raw || {};
  return {
    nodeKey: readAlias(row, cfg.nodeAliases),
    psKey: readAlias(row, cfg.psAliases),
    posKey: readAlias(row, cfg.posAliases),
  };
}

function resolveFact(fact, cfg, indexes) {
  const keys = factKeys(fact, cfg);
  const nodeHits = indexes.nodeIndex[norm(keys.nodeKey)] || [];
  const psHits = indexes.psIndex[norm(keys.psKey)] || [];
  const posHits = indexes.posIndex[norm(keys.posKey)] || [];
  
  const allHits = [...nodeHits, ...psHits, ...posHits];
  const branchName = allHits[0]?.branchName || fact.stagedBranchKey || 'Unassigned branch';
  
  const matchedBy = [nodeHits.length && 'node', psHits.length && 'ps', posHits.length && 'pos'].filter(Boolean);
  return {
    path: fact.path,
    ...keys,
    matchedBy,
    hitCount: nodeHits.length + psHits.length + posHits.length,
    raw: fact.raw,
    branchName,
    stagedBranchKey: fact.stagedBranchKey,
    stagedBore: fact.stagedBore
  };
}

function writeSupportConfig(supportConfigJson, jsonConfig) {
  const config = parseSupportConfig(supportConfigJson);
  config.jsonTrace = { ...config.jsonTrace, ...jsonConfig };
  return JSON.stringify(config, null, 2);
}

function diagnosticsFor(indexes, facts, matchedFacts, rejectedFacts, sourceKind) {
  return [
    { type: 'resolver-json-trace-source-kind', sourceKind },
    { type: 'resolver-json-trace-index-stats', ...indexes.indexStats },
    { type: 'resolver-json-trace-json-facts', rows: facts.length },
    { type: 'resolver-json-trace-matched-facts', rows: matchedFacts.length },
    { type: 'resolver-json-trace-rejected-facts', rows: rejectedFacts.length },
  ];
}

export function runStandaloneResolverJsonTrace(input = {}) {
  const sourceText = String(input.sourceText || '');
  const sourceKind = input.sourceKind === 'auto' ? detectXmlCiiWorkflowSourceKind(sourceText) : (input.sourceKind || 'xml');
  const jsonConfig = configFrom(input);
  if (sourceKind === 'inputxml') return inputXmlNotRequired(jsonConfig, input.supportConfigJson);
  const indexes = buildStandaloneXmlResolverIndex(sourceText);
  const facts = parseJsonFacts(input.stagedJsonText);
  const resolvedFacts = facts.map((fact) => resolveFact(fact, jsonConfig, indexes));
  const matchedFacts = resolvedFacts.filter((fact) => fact.hitCount > 0);
  const rejectedFacts = resolvedFacts.filter((fact) => fact.hitCount <= 0);
  const diagnostics = diagnosticsFor(indexes, facts, matchedFacts, rejectedFacts, sourceKind);
  return { ...indexes, jsonConfig, resolvedFacts, matchedFacts, rejectedFacts, diagnostics, supportConfigJson: writeSupportConfig(input.supportConfigJson, jsonConfig) };
}

function inputXmlNotRequired(jsonConfig, supportConfigJson) {
  return {
    indexStats: { xmlNodeCount: 0, nodeKeyCount: 0, psKeyCount: 0, posKeyCount: 0 },
    nodeIndex: {}, psIndex: {}, posIndex: {}, jsonConfig,
    resolvedFacts: [], matchedFacts: [], rejectedFacts: [],
    diagnostics: [{ type: 'resolver-json-trace-inputxml-not-required', sourceKind: 'inputxml' }],
    supportConfigJson: writeSupportConfig(supportConfigJson, jsonConfig),
  };
}
