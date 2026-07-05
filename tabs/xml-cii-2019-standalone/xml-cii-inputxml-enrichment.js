import { createWorkflowDiagnostics } from './xml-cii-workflow-types.js';

const ENRICH_FIELDS = Object.freeze(['DTXR_POS', 'DTXR_PS', 'ComponentType', 'PipingClass', 'Rating', 'Position']);
const ATTR_FIELDS = Object.freeze(['FROM_NAME', 'TO_NAME']);
const CONTEXT_FIELDS = Object.freeze([
  'DIAMETER', 'WALL_THICK', 'INSUL_THICK', 'CORR_ALLOW', 'MATERIAL_NUM', 'FLUID_DENSITY', 'INSUL_DENSITY', 'HYDRO_PRESSURE',
  ...Array.from({ length: 9 }, (_, i) => `TEMP_EXP_C${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `PRESSURE_C${i + 1}`),
]);
const NUMERIC_ATTRS = Object.freeze(['FROM_NODE', 'TO_NODE', 'DELTA_X', 'DELTA_Y', 'DELTA_Z', ...CONTEXT_FIELDS]);

function text(value) { return value === undefined || value === null ? '' : String(value); }
function localName(node) { return text(node?.localName || node?.nodeName).replace(/^.*:/, ''); }
function safeStem(name) { const safe = text(name || 'inputxml').replace(/[\\/:*?"|]/g, '_'); const idx = safe.lastIndexOf('.'); return idx > 0 ? safe.slice(0, idx) : safe; }
function isSentinel(value) { const n = Number(text(value).trim()); return Number.isFinite(n) && Math.abs(n + 1.0101) < 0.000001; }
function isMissing(value) { const v = text(value).trim(); return !v || isSentinel(v); }
function normalizeNumberText(value) { const raw = text(value).trim(); if (!raw) return raw; const n = Number(raw); if (!Number.isFinite(n)) return raw; if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n)); return raw.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, ''); }
function normalizeNode(value) { return normalizeNumberText(value); }
function numberFromConfig(config, key, fallback) { const n = Number(config?.[key]); return Number.isFinite(n) ? normalizeNumberText(n) : String(fallback); }
function parseConfig(raw) { try { const parsed = JSON.parse(text(raw) || '{}'); return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; } }
function findChildren(root, name) { const out = []; const wanted = name.toUpperCase(); const visit = (node) => { for (const child of Array.from(node.children || [])) { if (localName(child).toUpperCase() === wanted) out.push(child); visit(child); } }; visit(root); return out; }
function keyForElement(element) { return `${normalizeNode(element.getAttribute('FROM_NODE'))}->${normalizeNode(element.getAttribute('TO_NODE'))}`; }

function normalizeElementKey(raw) {
  const value = text(raw).trim();
  const named = value.match(/FROM_NODE\s*=\s*([^\s]+).*?TO_NODE\s*=\s*([^\s]+)/i);
  if (named) return `${normalizeNode(named[1])}->${normalizeNode(named[2])}`;
  const arrow = value.match(/^([^\s>-]+)\s*(?:->|-)\s*([^\s>]+)$/);
  if (arrow) return `${normalizeNode(arrow[1])}->${normalizeNode(arrow[2])}`;
  return '';
}

function sideLoadSet(map, key, field, value) {
  const normalizedKey = normalizeElementKey(key);
  if (!normalizedKey || !field) return;
  const row = map.get(normalizedKey) || {};
  row[field] = text(value).trim();
  map.set(normalizedKey, row);
}

export function parseInputXmlElementSideLoad(sideLoadText) {
  const map = new Map();
  const lines = text(sideLoadText).split(/\r\n|\r|\n/);
  let currentKey = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const element = trimmed.match(/^ELEMENT\s+(.+)$/i);
    if (element) { currentKey = normalizeElementKey(element[1]); continue; }
    const bareKey = normalizeElementKey(trimmed);
    if (bareKey) { currentKey = bareKey; continue; }
    const pair = trimmed.match(/^([A-Za-z_][\w.-]*)\s*=\s*(.*)$/);
    if (pair && currentKey) { sideLoadSet(map, currentKey, pair[1], pair[2]); continue; }
    const tag = trimmed.match(/^<([A-Za-z_][\w.-]*)>([\s\S]*)<\/\1>$/);
    if (tag && currentKey) sideLoadSet(map, currentKey, tag[1], tag[2]);
  }
  return map;
}

function parseInputXml(sourceText) {
  const parser = new DOMParser();
  let source = text(sourceText).trim();
  const withoutDecl = source.replace(/^\s*<\?xml[^>]*>\s*/i, '');
  if (!/^\s*<\s*CAESARII\b/i.test(withoutDecl)) {
    source = `<CAESARII XML_TYPE="Input" VERSION="2019" SOURCE="XML-&gt;CII enriched InputXML debug export"><PIPINGMODEL JOBNAME="InputXML Fragment" NUMELEMENTS="0" NUMREST="0">${withoutDecl}</PIPINGMODEL></CAESARII>`;
  }
  const doc = parser.parseFromString(source, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) throw new Error(parseError.textContent || 'InputXML parse failed.');
  return doc;
}

function setChildText(doc, element, name, value) {
  const existing = Array.from(element.children || []).find((child) => localName(child) === name);
  const child = existing || doc.createElement(name);
  child.textContent = text(value);
  if (!existing) element.appendChild(child);
}

function setPointPropertiesBasis(doc, element, basis) {
  const value = basis === 'FROM' || basis === 'TO' ? basis : 'TO';
  setChildText(doc, element, 'Point_properties_basis', value);
}

function normalizePressureAliases(element) {
  for (let i = 1; i <= 9; i += 1) {
    const alias = `PRESSURE${i}`;
    const canonical = `PRESSURE_C${i}`;
    if (element.hasAttribute(alias) && !element.hasAttribute(canonical)) element.setAttribute(canonical, element.getAttribute(alias));
    if (element.hasAttribute(alias)) element.removeAttribute(alias);
  }
}

function normalizeNumericAttributes(element) {
  for (const attr of NUMERIC_ATTRS) if (element.hasAttribute(attr)) element.setAttribute(attr, normalizeNumberText(element.getAttribute(attr)));
}

function fillFromContext(element, context) {
  let inherited = 0;
  let sentinel = 0;
  for (const field of CONTEXT_FIELDS) {
    const current = element.getAttribute(field);
    if (isSentinel(current)) sentinel += 1;
    if (isMissing(current) && !isMissing(context[field])) { element.setAttribute(field, context[field]); inherited += 1; }
    const updated = element.getAttribute(field);
    if (!isMissing(updated)) context[field] = updated;
  }
  return { inherited, sentinel };
}

function restraintRules(config) {
  const fromConfig = config.inputXmlDtxrRestraintRules || config.dtxrRestraintRules;
  if (Array.isArray(fromConfig) && fromConfig.length) return fromConfig;
  return [
    { label: 'Y/restraint support', typeCode: 14, patterns: ['PIPE REST', 'SHOE', 'SUPPORT TYPE-103', 'REST'] },
    { label: 'guide restraint', typeCode: 17, patterns: ['GUIDE', 'PDO-TYPE-603'] },
    { label: 'line stop / directional anchor', typeCode: 1, patterns: ['DIRECTIONAL ANCHOR', 'ANCHOR', 'LINE STOP'] },
  ];
}

function deriveRestraint(sideLoad, config) {
  const dtxr = `${text(sideLoad.DTXR_POS)} ${text(sideLoad.DTXR_PS)}`.toUpperCase();
  if (!dtxr.trim()) return null;
  for (const rule of restraintRules(config)) {
    const patterns = Array.isArray(rule.patterns) ? rule.patterns : [];
    if (patterns.some((pattern) => dtxr.includes(text(pattern).toUpperCase()))) return { typeCode: Number(rule.typeCode || 14), label: rule.label || 'DTXR-derived' };
  }
  return null;
}

function removeRestraints(element) {
  for (const child of Array.from(element.children || [])) if (localName(child).toUpperCase() === 'RESTRAINT') child.remove();
}

function normalizeExistingRestraints(element) {
  for (const restraint of Array.from(element.children || []).filter((child) => localName(child).toUpperCase() === 'RESTRAINT')) {
    for (const attr of ['NUM', 'NODE', 'TYPE', 'STIFFNESS', 'GAP', 'FRIC_COEF', 'CNODE', 'XCOSINE', 'YCOSINE', 'ZCOSINE']) if (restraint.hasAttribute(attr)) restraint.setAttribute(attr, normalizeNumberText(restraint.getAttribute(attr)));
  }
}

function appendDerivedRestraint(doc, element, typeCode, config) {
  const restraint = doc.createElement('RESTRAINT');
  const existing = Array.from(element.children || []).filter((child) => localName(child).toUpperCase() === 'RESTRAINT').length;
  restraint.setAttribute('NUM', String(existing + 1));
  restraint.setAttribute('NODE', normalizeNode(element.getAttribute('TO_NODE')));
  restraint.setAttribute('TYPE', normalizeNumberText(typeCode));
  restraint.setAttribute('STIFFNESS', numberFromConfig(config, 'defaultStiffness', 1751270000000));
  restraint.setAttribute('GAP', numberFromConfig(config, 'defaultGap', 0));
  restraint.setAttribute('FRIC_COEF', numberFromConfig(config, 'defaultFriction', 0.3));
  restraint.setAttribute('CNODE', '0');
  restraint.setAttribute('XCOSINE', '-1.0101');
  restraint.setAttribute('YCOSINE', '-1.0101');
  restraint.setAttribute('ZCOSINE', '-1.0101');
  restraint.setAttribute('TAG', 'ANCI/DTXR-derived');
  restraint.setAttribute('GUID', '');
  element.appendChild(restraint);
}

function serializeFragment(elements) {
  const serializer = new XMLSerializer();
  return elements.map((element) => serializer.serializeToString(element)).join('\n');
}

export function enrichInputXmlDocument(job) {
  const options = job.options || {};
  const config = parseConfig(job.supportConfigJson);
  const doc = parseInputXml(job.sourceText);
  const elements = findChildren(doc, 'PIPINGELEMENT');
  const sideLoad = parseInputXmlElementSideLoad(job.elementSideLoadText || '');
  const matchedKeys = new Set();
  const lineContexts = new Map();
  let enrichedElementCount = 0;
  let inheritedFieldCount = 0;
  let sentinelFieldCount = 0;

  for (const element of elements) {
    const key = keyForElement(element);
    const row = sideLoad.get(key);
    if (options.normalizePressureCaseNames !== false) normalizePressureAliases(element);
    normalizeNumericAttributes(element);
    const lineKey = text(element.getAttribute('LINE_ID') || '__global__');
    const context = lineContexts.get(lineKey) || {};
    if (options.fillSentinelFromLineContext !== false) {
      const fill = fillFromContext(element, context);
      inheritedFieldCount += fill.inherited;
      sentinelFieldCount += fill.sentinel;
    }
    lineContexts.set(lineKey, context);
    if (row) {
      matchedKeys.add(key);
      for (const field of ENRICH_FIELDS) if (row[field]) setChildText(doc, element, field, row[field]);
      for (const attr of ATTR_FIELDS) if (row[attr]) element.setAttribute(attr, row[attr]);
      setPointPropertiesBasis(doc, element, options.pointPropertiesBasis);
      enrichedElementCount += 1;
    }
    const policy = options.inputXmlRestraintPolicy || 'preserve-existing-restraints';
    const derived = row ? deriveRestraint(row, config) : null;
    if (policy === 'replace-with-dtxr-derived-restraints') removeRestraints(element);
    if (policy === 'convert-existing-restraints' || policy === 'merge-existing-and-dtxr-derived-restraints' || policy === 'preserve-existing-restraints') normalizeExistingRestraints(element);
    if (derived && (policy === 'replace-with-dtxr-derived-restraints' || policy === 'merge-existing-and-dtxr-derived-restraints')) appendDerivedRestraint(doc, element, derived.typeCode, config);
  }

  const root = doc.documentElement;
  const model = findChildren(doc, 'PIPINGMODEL')[0];
  if (model) {
    model.setAttribute('NUMELEMENTS', String(elements.length));
    model.setAttribute('NUMREST', String(Array.from(doc.getElementsByTagName('RESTRAINT')).length));
  }
  root.setAttribute('XML_TYPE', 'Input');
  root.setAttribute('VERSION', root.getAttribute('VERSION') || '2019');
  root.setAttribute('SOURCE', root.getAttribute('SOURCE') || 'XML->CII enriched InputXML debug export');
  const unmatched = Array.from(sideLoad.keys()).filter((key) => !matchedKeys.has(key));
  const serializer = new XMLSerializer();
  const enrichedText = options.inputXmlOutputMode === 'fragment' ? serializeFragment(elements) : serializer.serializeToString(doc);
  const stem = safeStem(job.sourceName);
  return {
    ok: true,
    sourceKind: 'inputxml',
    outputKind: 'enrichedInputXML',
    enrichedText,
    enrichedName: `${stem}_enriched.input.xml`,
    ciiText: null,
    ciiName: null,
    diagnostics: createWorkflowDiagnostics({
      sourceKind: 'inputxml',
      outputKind: 'enrichedInputXML',
      branch: 'direct-inputxml-enrichment',
      elementCount: elements.length,
      enrichedElementCount,
      restraintCount: Array.from(doc.getElementsByTagName('RESTRAINT')).length,
      sideLoadMatched: matchedKeys.size,
      sideLoadUnmatched: unmatched,
      inheritedFieldCount,
      sentinelFieldCount,
      warnings: unmatched.length ? [`${unmatched.length} side-load element key(s) did not match InputXML elements.`] : [],
    }),
    logs: [`InputXML enrichment completed for ${elements.length} PIPINGELEMENT record(s).`, `Side-load matched ${matchedKeys.size} element(s).`],
    error: null,
  };
}
