import { applyXmlCiiPostSplitElementLengthCleanup } from './post-split-element-length-cleanup.js';
import { cleanXmlCiiNodeBlocks } from './xml-cii-node-block-cleanup.js';
import { buildPipingClassIndex, findBestPipingClassRow } from './piping-class-resolver.js';
import { resolveXmlCiiWallThicknessWithEvidence } from './dtxr-wall-evidence-ledger.js';

function text(value) { return value === undefined || value === null ? '' : String(value).trim(); }
function truthy(value) { if (value === true) return true; if (value === false || value === null || value === undefined) return false; if (typeof value === 'number') return value !== 0; return /^(1|true|yes|on)$/i.test(text(value)); }
function defaultTrue(value) { return value === undefined || value === null ? true : truthy(value); }
function numberValue(value) { const match = text(value).replace(/,/g, '').match(/-?\d+(?:\.\d+)?(?:[Ee][-+]?\d+)?/); if (!match) return null; const numeric = Number(match[0]); return Number.isFinite(numeric) ? numeric : null; }
function normalizeRef(value) { return text(value).replace(/^=/, '').replace(/\s+/g, '').toUpperCase(); }
function normalizeType(value) { return text(value).toUpperCase(); }
function localName(node) { return text(node?.localName || node?.nodeName).replace(/^.*:/, ''); }
function childrenByName(parent, name) { return [...(parent?.childNodes || [])].filter((node) => node.nodeType === 1 && localName(node) === name); }
function firstChild(parent, name) { return childrenByName(parent, name)[0] || null; }
function childText(parent, name) { return text(firstChild(parent, name)?.textContent); }
function ensureText(document, parent, name, value) { if (!document || !parent || value === null || value === undefined || value === '') return false; let element = firstChild(parent, name); if (!element) { element = parent?.namespaceURI ? document.createElementNS(parent.namespaceURI, name) : document.createElement(name); parent.appendChild(element); } const before = text(element.textContent); const after = text(value); element.textContent = after; return before !== after; }
function parsePoint(point) { if (!point && point !== 0) return null; if (Array.isArray(point) && point.length >= 3) { const x = Number(point[0]), y = Number(point[1]), z = Number(point[2]); return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) ? { x, y, z } : null; } if (typeof point === 'object') { const x = Number(point.x ?? point.X), y = Number(point.y ?? point.Y), z = Number(point.z ?? point.Z); return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) ? { x, y, z } : null; } const raw = text(point); const nums = raw.match(/-?\d+(?:\.\d+)?(?:[Ee][-+]?\d+)?/g)?.map(Number).filter(Number.isFinite) || []; return nums.length >= 3 ? { x: nums[0], y: nums[1], z: nums[2] } : null; }
function pointDistance(a, b) { const pa = parsePoint(a), pb = parsePoint(b); if (!pa || !pb) return null; const length = Math.hypot(pb.x - pa.x, pb.y - pa.y, pb.z - pa.z); return Number.isFinite(length) && length > 0 ? length : null; }
function readAttr(attrs, names) { const entries = Object.entries(attrs || {}); for (const wanted of names) { const direct = attrs?.[wanted]; if (text(direct)) return direct; const upper = wanted.toUpperCase(); for (const [key, value] of entries) if (key.toUpperCase() === upper && text(value)) return value; } return ''; }
function stagedLengthMm(attrs) { for (const [fromKey, toKey] of [['APOS', 'LPOS'], ['HPOS', 'TPOS'], ['BPOS', 'TPOS'], ['SPOS', 'EPOS']]) { const length = pointDistance(readAttr(attrs, [fromKey]), readAttr(attrs, [toKey])); if (length !== null) return length; } return numberValue(readAttr(attrs, ['LENGTH', 'Length', 'LEN', 'lengthMm', 'ElementLengthMm'])); }
function stagedBoreMm(attrs) { const values = ['ABORE', 'LBORE', 'PBORE', 'HBORE', 'TBORE', 'HBOR', 'TBOR', 'BORE', 'DN', 'NB'].map((key) => numberValue(readAttr(attrs, [key]))).filter((value) => Number.isFinite(value) && value > 0); if (!values.length) return null; return values.find((value) => value < 1000) || values[0]; }
function stagedDtxr(attrs, component) { return text(readAttr(attrs, ['DTXR_POS', 'DTXR', 'DESC', 'DESCRIPTION', 'NAME']) || component?.name || ''); }
function walkStaged(value, branchName = '', out = []) { if (Array.isArray(value)) { value.forEach((item) => walkStaged(item, branchName, out)); return out; } if (!value || typeof value !== 'object') return out; const attrs = value.attributes && typeof value.attributes === 'object' ? value.attributes : {}; const type = normalizeType(value.type || attrs.TYPE || attrs.RAW_TYPE); const currentBranch = type === 'BRANCH' || Array.isArray(value.children) ? text(value.name || attrs.NAME || attrs.OWNER || branchName) : branchName; out.push({ component: value, attrs, type, branchName: currentBranch }); if (Array.isArray(value.children)) value.children.forEach((child) => walkStaged(child, currentBranch, out)); return out; }
export function buildXmlCiiStagedGeometryIndex(stagedJsonText) { const index = { byRef: new Map(), count: 0 }; if (!text(stagedJsonText)) return index; let parsed = null; try { parsed = typeof stagedJsonText === 'string' ? JSON.parse(stagedJsonText) : stagedJsonText; } catch { return index; } for (const item of walkStaged(parsed)) { const attrs = item.attrs || {}; const refs = [readAttr(attrs, ['REF', 'ComponentRefNo', 'COMPONENTREFNO']), readAttr(attrs, ['NAME']), item.component?.name].map(normalizeRef).filter(Boolean); if (!refs.length) continue; const geometry = { ref: refs[0], rawRefs: refs, stagedType: item.type, branchName: item.branchName, lengthMm: stagedLengthMm(attrs), boreMm: stagedBoreMm(attrs), dtxr: stagedDtxr(attrs, item.component) }; if (geometry.lengthMm === null && geometry.boreMm === null) continue; for (const ref of refs) if (!index.byRef.has(ref)) index.byRef.set(ref, geometry); index.count += 1; } return index; }
const OD_TO_DN = [[10.3,6],[13.7,8],[17.1,10],[21.3,15],[26.7,20],[33.4,25],[42.2,32],[48.3,40],[60.3,50],[73.0,65],[88.9,80],[114.3,100],[141.3,125],[168.3,150],[219.1,200],[273.0,250],[323.8,300],[355.6,350],[406.4,400],[457.2,450],[508.0,500],[609.6,600],[711.0,700],[762.0,750]];
const FALLBACK_HIGH_TYPES = new Set(['FLAN', 'VALV', 'RIGID', 'INST']);
export function xmlCiiNominalDnFromOd(odMm) { const numeric = Number(odMm); if (!Number.isFinite(numeric) || numeric <= 0) return null; let best = null; for (const [od, dn] of OD_TO_DN) { const err = Math.abs(numeric - od); if (!best || err < best.err) best = { od, dn, err }; } return best && best.err <= Math.max(1.5, Math.abs(best.od) * 0.006) ? best.dn : null; }
export function resolveXmlCiiStagedGeometryForNode(node, stagedIndex) { if (!node || !stagedIndex?.byRef) return null; const ref = normalizeRef(childText(node, 'ComponentRefNo')); return ref ? stagedIndex.byRef.get(ref) || null : null; }
function formatMm(value) { const numeric = Number(value); return Number.isFinite(numeric) ? numeric.toFixed(3) : ''; }
function formatWallMm(value) { const numeric = Number(value); return Number.isFinite(numeric) ? Number(numeric.toPrecision(12)).toString() : ''; }
function setOrInsertInNodeBlock(block, tag, value, formatter = formatMm) { const formatted = formatter(value); if (!formatted) return block; const re = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, 'i'); if (re.test(block)) return block.replace(re, `<${tag}>${formatted}</${tag}>`); return block.replace(/<\/Node>\s*$/i, `<${tag}>${formatted}</${tag}></Node>`); }
function shouldDropGasketNodes(options = {}) { const config = options?.config && typeof options.config === 'object' ? options.config : {}; return truthy(options.disableGasketNodes) || truthy(options.disableGasketInOutput) || truthy(config.disableGasketNodes) || truthy(config.disableGasketInOutput) || (defaultTrue(options.dropGasketNodes) && defaultTrue(options.dropGasketsInEnrichment) && defaultTrue(config.dropGasketNodes) && defaultTrue(config.dropGasketsInEnrichment)); }
function shouldSuppressFallbackHighNodeNumbers(options = {}) { const config = options?.config && typeof options.config === 'object' ? options.config : {}; const splitEnabled = truthy(options.splitCondensedValveFlange) || truthy(options.split_condensed_valve_flange) || truthy(config.splitCondensedValveFlange) || truthy(config.split_condensed_valve_flange); return splitEnabled; }
function isFallbackHighNode(componentType, nodeNumber) { const number = Number(nodeNumber); return Number.isFinite(number) && number >= 10000 && FALLBACK_HIGH_TYPES.has(normalizeType(componentType)); }
function dropGasketNodesInDom(document) { let count = 0; for (const node of [...document.getElementsByTagName('Node')]) { if (normalizeType(childText(node, 'ComponentType')) !== 'GASK') continue; node.parentNode?.removeChild(node); count += 1; } return count; }
function suppressFallbackHighNodeNumbersInDom(document) { let count = 0; for (const node of [...document.getElementsByTagName('Node')]) { if (!isFallbackHighNode(childText(node, 'ComponentType'), childText(node, 'NodeNumber'))) continue; if (ensureText(document, node, 'NodeNumber', '-1')) count += 1; } return count; }
function dropNodeBlocksInText(xmlText, predicate) { let count = 0; const xmlOut = text(xmlText).replace(/<Node\b[\s\S]*?<\/Node>/gi, (block) => { const componentType = normalizeType(block.match(/<ComponentType>([\s\S]*?)<\/ComponentType>/i)?.[1] || ''); if (!predicate(componentType)) return block; count += 1; return ''; }); return { xmlText: xmlOut, count }; }
function suppressNodeNumbersInText(xmlText, predicate) { let count = 0; const xmlOut = text(xmlText).replace(/<Node\b[\s\S]*?<\/Node>/gi, (block) => { const componentType = normalizeType(block.match(/<ComponentType>([\s\S]*?)<\/ComponentType>/i)?.[1] || ''); const nodeNumber = text(block.match(/<NodeNumber>([\s\S]*?)<\/NodeNumber>/i)?.[1] || ''); if (!predicate(componentType, nodeNumber)) return block; count += 1; if (/<NodeNumber>[\s\S]*?<\/NodeNumber>/i.test(block)) return block.replace(/<NodeNumber>[\s\S]*?<\/NodeNumber>/i, '<NodeNumber>-1</NodeNumber>'); return block.replace(/(<Node\b[^>]*>)/i, '$1<NodeNumber>-1</NodeNumber>'); }); return { xmlText: xmlOut, count }; }
function enforcedCleanupOptions(options, stage) { const config = options?.config && typeof options.config === 'object' ? options.config : {}; return { ...(options || {}), stage, config: { ...config, dropGasketNodes: true, dropGasketsInEnrichment: true, dropShortElementLengthNodes: true, shortElementLengthDropThresholdMm: Number(config.shortElementLengthDropThresholdMm ?? options.shortElementLengthDropThresholdMm ?? 6) } }; }
function addStats(base = {}, extra = {}) { const out = { ...base }; for (const key of ['gasketNodesDropped', 'shortElementLengthNodesDropped']) out[key] = Number(out[key] || 0) + Number(extra[key] || 0); out.shortElementLengthNodesDroppedByType = { ...(out.shortElementLengthNodesDroppedByType || {}) }; for (const [type, count] of Object.entries(extra.shortElementLengthNodesDroppedByType || {})) out.shortElementLengthNodesDroppedByType[type] = Number(out.shortElementLengthNodesDroppedByType[type] || 0) + Number(count || 0); return out; }
function mergeCleanup(result, options, stage = 'post-staged-geometry-authority') { const cleanup = applyXmlCiiPostSplitElementLengthCleanup(result.xmlText, enforcedCleanupOptions(options, stage)); return { xmlText: cleanup.xmlText, stats: addStats({ ...(result.stats || {}), postSplitElementLengthsRecalculated: cleanup.stats.postSplitElementLengthsRecalculated || 0 }, cleanup.stats || {}), diagnostics: [...(result.diagnostics || []), ...(cleanup.diagnostics || [])] }; }
function preCleanXml(xmlText, options, stage) { return cleanXmlCiiNodeBlocks(xmlText, enforcedCleanupOptions(options, stage)); }
function blockText(block, tag) { return text(block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'))?.[1] || ''); }
function positiveNumber(value) { const numeric = numberValue(value); return numeric !== null && numeric > 0 ? numeric : null; }
function sourceNodeBore({ outsideDiameter, outerDiameter, od, bore, boreMm, stagedBoreMm: stagedBore }) {
  for (const rawOd of [outsideDiameter, outerDiameter, od]) {
    const dn = xmlCiiNominalDnFromOd(positiveNumber(rawOd));
    if (dn !== null && dn > 0) return { boreMm: dn, source: 'xml-outside-diameter' };
  }
  for (const rawBore of [bore, boreMm]) {
    const value = positiveNumber(rawBore);
    if (value !== null) return { boreMm: value, source: 'xml-bore' };
  }
  const staged = positiveNumber(stagedBore);
  return staged !== null
    ? { boreMm: staged, source: 'staged-component-refno' }
    : { boreMm: null, source: '' };
}
function rowNumber(row, names) {
  for (const name of names) {
    const value = positiveNumber(row?.[name] ?? row?._raw?.[name]);
    if (value !== null) return value;
  }
  return null;
}
function structuredDtxr(dtxr, componentType, componentRefNo, boreMm, source) {
  return text(dtxr) ? { dtxr: text(dtxr), componentType, componentRefNo, boreMm, source } : null;
}
function resolveNodeWallAuthority({
  boreMm, pipingClass, componentType, rating, componentRefNo,
  dtxrValues = [], geometry = null, config = {}, pipingClassIndex,
}) {
  if (!Number.isFinite(Number(boreMm)) || Number(boreMm) <= 0) return null;
  const evidence = dtxrValues.map((item) => structuredDtxr(
    item?.dtxr ?? item?.text ?? item,
    item?.componentType || componentType,
    item?.componentRefNo || componentRefNo,
    item?.boreMm ?? boreMm,
    item?.source || 'xml-dtxr',
  )).filter(Boolean);
  if (geometry?.dtxr) evidence.push(structuredDtxr(
    geometry.dtxr,
    geometry.stagedType || componentType,
    geometry.ref || componentRefNo,
    positiveNumber(geometry.boreMm) ?? boreMm,
    'staged-json',
  ));
  const dtxr = resolveXmlCiiWallThicknessWithEvidence({ boreMm, dtxrValues: evidence, config });
  const classMatch = pipingClass && pipingClassIndex
    ? findBestPipingClassRow({
      pipingClass,
      boreMm,
      componentType: 'PIPE',
      rating: rating || '',
      schedule: '',
      pipingClassIndex,
      overrides: config?.overrides || {},
      config,
    })
    : null;
  const classWall = rowNumber(classMatch?.row, [
    'wallThickness', 'WallThickness', 'Wall Thickness', 'Wall thickness',
    'WALL_THICKNESS', 'WALL_THICK', 'WT', 'THK', 'Thickness',
  ]);
  const dtxrWall = positiveNumber(dtxr?.wallThicknessMm);
  const wallThicknessMm = dtxr?.evidenceKind === 'DIRECT_WALL' && dtxrWall !== null
    ? dtxrWall
    : (classWall ?? dtxrWall);
  if (wallThicknessMm === null) return { wallThicknessMm: null, source: '', dtxr };
  return {
    wallThicknessMm,
    source: dtxr?.evidenceKind === 'DIRECT_WALL' && dtxrWall !== null
      ? dtxr.source
      : (classWall !== null ? 'piping-class-master' : (dtxr?.source || '')),
    dtxr,
  };
}
function appendBoreMismatchDiagnostics(diagnostics, stats, context, wall) {
  for (const record of wall?.dtxr?.evidenceRecords || []) {
    if (record.disposition !== 'REJECTED_BORE_MISMATCH') continue;
    stats.dtxrBoreMismatchFlags = Number(stats.dtxrBoreMismatchFlags || 0) + 1;
    diagnostics.push({
      type: 'dtxr-bore-mismatch',
      ...context,
      componentType: record.componentType,
      componentRefNo: record.componentRefNo,
      evidenceBoreMm: record.boreMm,
      targetBoreMm: record.targetBoreMm,
      dtxr: record.dtxr,
      evidenceSource: record.source,
      status: 'flagged',
      message: 'DTXR/json component bore does not match the resolved XML/source bore; mismatched wall evidence was rejected.',
    });
  }
}

function applyRegexFallback(xmlText, index, options = {}) {
  const first = preCleanXml(xmlText, options, 'pre-staged-geometry-authority');
  const config = options?.config && typeof options.config === 'object' ? options.config : {};
  const pipingClassIndex = buildPipingClassIndex(config?.pipingClass?.masterRows || []);
  const stats = addStats({
    stagedGeometryMatches: 0, stagedLengthAnnotations: 0, stagedBoreAnnotations: 0,
    sourceBoreAnnotations: 0, nodeWallAnnotations: 0, dtxrBoreMismatchFlags: 0,
    gasketNodesDropped: 0, fallbackHighNodeNumbersSuppressed: 0,
  }, first.stats || {});
  const diagnostics = [...(first.diagnostics || [])];
  let xmlOut = first.xmlText;
  if (shouldDropGasketNodes(options)) {
    const dropped = dropNodeBlocksInText(xmlOut, (type) => type === 'GASK');
    xmlOut = dropped.xmlText;
    stats.gasketNodesDropped += dropped.count;
  }
  xmlOut = xmlOut.replace(/<Node\b[\s\S]*?<\/Node>/gi, (block) => {
    const ref = normalizeRef(blockText(block, 'ComponentRefNo'));
    const geometry = ref ? index?.byRef?.get(ref) || null : null;
    let out = block;
    let stagedChanged = false;
    if (geometry?.lengthMm !== null && geometry?.lengthMm !== undefined && geometry.lengthMm > 0) {
      out = setOrInsertInNodeBlock(out, 'ElementLengthMm', geometry.lengthMm);
      stats.stagedLengthAnnotations += 1;
      stagedChanged = true;
    }
    const boreAuthority = sourceNodeBore({
      outsideDiameter: blockText(block, 'OutsideDiameter'),
      outerDiameter: blockText(block, 'OuterDiameter'),
      od: blockText(block, 'OD'),
      bore: blockText(block, 'Bore'),
      boreMm: blockText(block, 'BoreMm'),
      stagedBoreMm: geometry?.boreMm,
    });
    if (boreAuthority.boreMm !== null) {
      out = setOrInsertInNodeBlock(out, 'BoreMm', boreAuthority.boreMm);
      if (boreAuthority.source === 'staged-component-refno') stats.stagedBoreAnnotations += 1;
      else stats.sourceBoreAnnotations += 1;
    }
    const componentType = normalizeType(blockText(block, 'ComponentType'));
    const componentRefNo = blockText(block, 'ComponentRefNo');
    const dtxrValues = ['DTXR', 'DTXR_POS', 'TEEDESC_POS', 'DTXR_PS']
      .map((tag) => ({ dtxr: blockText(block, tag), componentType, componentRefNo, boreMm: boreAuthority.boreMm, source: `xml-${tag.toLowerCase()}` }))
      .filter((item) => item.dtxr);
    const wall = resolveNodeWallAuthority({
      boreMm: boreAuthority.boreMm,
      pipingClass: blockText(block, 'PipingClass'),
      componentType,
      rating: blockText(block, 'Rating'),
      componentRefNo,
      dtxrValues,
      geometry,
      config,
      pipingClassIndex,
    });
    if (wall?.wallThicknessMm !== null && wall?.wallThicknessMm !== undefined) {
      out = setOrInsertInNodeBlock(out, 'WallThickness', wall.wallThicknessMm, formatWallMm);
      stats.nodeWallAnnotations += 1;
    }
    appendBoreMismatchDiagnostics(diagnostics, stats, {
      nodeNumber: blockText(block, 'NodeNumber'),
      componentRefNo,
      boreSource: boreAuthority.source,
    }, wall);
    if (stagedChanged) stats.stagedGeometryMatches += 1;
    return out;
  });
  if (shouldSuppressFallbackHighNodeNumbers(options)) {
    const suppressedHigh = suppressNodeNumbersInText(xmlOut, isFallbackHighNode);
    xmlOut = suppressedHigh.xmlText;
    stats.fallbackHighNodeNumbersSuppressed = suppressedHigh.count;
  }
  if (stats.fallbackHighNodeNumbersSuppressed > 0) diagnostics.push({
    type: 'fallback-high-node-number-suppressed',
    count: stats.fallbackHighNodeNumbersSuppressed,
    message: 'Generated fallback 10000+ inline node numbers were set back to -1; keeping them is intentionally not user-configurable.',
  });
  return mergeCleanup({ xmlText: xmlOut, stats, diagnostics }, options);
}
export function applyXmlCiiStagedGeometryAuthority(xmlText, stagedJsonText, options = {}) {
  const config = options?.config && typeof options.config === 'object' ? options.config : {};
  const index = options.stagedIndex || buildXmlCiiStagedGeometryIndex(stagedJsonText);
  const first = preCleanXml(xmlText, options, 'pre-staged-geometry-authority');
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') return applyRegexFallback(first.xmlText, index, options);
  let document = null;
  try {
    document = new DOMParser().parseFromString(text(first.xmlText), 'application/xml');
    if (document.getElementsByTagName('parsererror').length) return applyRegexFallback(first.xmlText, index, options);
  } catch {
    return applyRegexFallback(first.xmlText, index, options);
  }
  const pipingClassIndex = buildPipingClassIndex(config?.pipingClass?.masterRows || []);
  const stats = addStats({
    stagedGeometryMatches: 0, stagedLengthAnnotations: 0, stagedBoreAnnotations: 0,
    sourceBoreAnnotations: 0, nodeWallAnnotations: 0, dtxrBoreMismatchFlags: 0,
    gasketNodesDropped: 0, fallbackHighNodeNumbersSuppressed: 0,
  }, first.stats || {});
  const diagnostics = [...(first.diagnostics || [])];
  if (shouldDropGasketNodes(options)) {
    const dropped = dropGasketNodesInDom(document);
    stats.gasketNodesDropped += dropped;
    if (dropped > 0) diagnostics.push({
      type: 'gasket-node-dropped', count: dropped,
      message: 'GASK nodes were removed from enriched XML before staged geometry/weight matching.',
    });
  }
  for (const branch of [...document.getElementsByTagName('Branch')]) {
    const branchName = childText(branch, 'Branchname');
    for (const node of childrenByName(branch, 'Node')) {
      const geometry = resolveXmlCiiStagedGeometryForNode(node, index);
      let stagedChanged = false;
      if (geometry?.lengthMm !== null && geometry?.lengthMm !== undefined && geometry.lengthMm > 0) {
        if (ensureText(document, node, 'ElementLengthMm', formatMm(geometry.lengthMm))) stagedChanged = true;
        stats.stagedLengthAnnotations += 1;
      }
      const boreAuthority = sourceNodeBore({
        outsideDiameter: childText(node, 'OutsideDiameter'),
        outerDiameter: childText(node, 'OuterDiameter'),
        od: childText(node, 'OD'),
        bore: childText(node, 'Bore'),
        boreMm: childText(node, 'BoreMm'),
        stagedBoreMm: geometry?.boreMm,
      });
      if (boreAuthority.boreMm !== null) {
        ensureText(document, node, 'BoreMm', formatMm(boreAuthority.boreMm));
        if (boreAuthority.source === 'staged-component-refno') stats.stagedBoreAnnotations += 1;
        else stats.sourceBoreAnnotations += 1;
      }
      const componentType = normalizeType(childText(node, 'ComponentType'));
      const componentRefNo = childText(node, 'ComponentRefNo');
      const dtxrValues = ['DTXR', 'DTXR_POS', 'TEEDESC_POS', 'DTXR_PS']
        .map((tag) => ({ dtxr: childText(node, tag), componentType, componentRefNo, boreMm: boreAuthority.boreMm, source: `xml-${tag.toLowerCase()}` }))
        .filter((item) => item.dtxr);
      const wall = resolveNodeWallAuthority({
        boreMm: boreAuthority.boreMm,
        pipingClass: childText(node, 'PipingClass'),
        componentType,
        rating: childText(node, 'Rating'),
        componentRefNo,
        dtxrValues,
        geometry,
        config,
        pipingClassIndex,
      });
      if (wall?.wallThicknessMm !== null && wall?.wallThicknessMm !== undefined) {
        ensureText(document, node, 'WallThickness', formatWallMm(wall.wallThicknessMm));
        stats.nodeWallAnnotations += 1;
      }
      appendBoreMismatchDiagnostics(diagnostics, stats, {
        branchName,
        nodeNumber: childText(node, 'NodeNumber'),
        componentRefNo,
        boreSource: boreAuthority.source,
      }, wall);
      if (stagedChanged) {
        stats.stagedGeometryMatches += 1;
        diagnostics.push({
          type: 'staged-geometry-authority',
          branchName,
          nodeNumber: childText(node, 'NodeNumber'),
          componentRefNo,
          stagedType: geometry?.stagedType || '',
          dtxr: geometry?.dtxr || '',
          lengthMm: geometry?.lengthMm ?? null,
          boreMm: boreAuthority.boreMm,
          lengthSource: geometry?.lengthMm !== null && geometry?.lengthMm !== undefined ? 'staged-component-refno' : '',
          boreSource: boreAuthority.source,
        });
      }
    }
  }
  if (shouldSuppressFallbackHighNodeNumbers(options)) {
    stats.fallbackHighNodeNumbersSuppressed = suppressFallbackHighNodeNumbersInDom(document);
    if (stats.fallbackHighNodeNumbersSuppressed > 0) diagnostics.push({
      type: 'fallback-high-node-number-suppressed',
      count: stats.fallbackHighNodeNumbersSuppressed,
      message: 'Generated fallback 10000+ inline node numbers were set back to -1; keeping them is intentionally not user-configurable.',
    });
  }
  return mergeCleanup({ xmlText: new XMLSerializer().serializeToString(document), stats, diagnostics }, options);
}
