import { analyzeSourceText } from './source-structure.js';
import { createSourceEnvelope, serializeSourceEnvelope, summarizeSourceEnvelope } from './source-envelope.js';
import { acceptAuthoritativeText, clearWorkbenchState, createWorkbenchState, readSourceFile, selectSourceKind } from './source-authority.js';
import { collectSourceGraphElements, createSourceGraphController } from './graph-controller.js';
import { collectMasterRegistryElements, createMasterRegistryController } from './master-controller.js';
import { collectExtractionTesterElements, createExtractionTesterController } from './extraction-controller.js';
import { collectEvidenceLedgerElements, createEvidenceLedgerController } from './evidence-controller.js';
import { renderWorkbenchMarkup } from './workbench-template.js';
import { renderEvidenceLedgerMarkup } from './evidence-template.js';

const IDS = ['file', 'kind', 'source-text', 'generate', 'download', 'clear', 'effective-kind', 'detected-kind', 'source-name', 'origin', 'revision', 'byte-length', 'root-shape', 'status', 'content-hash', 'source-file-id', 'errors', 'warnings'];

function collectElements(container) {
  return Object.fromEntries(IDS.map((id) => [id, container.querySelector(`#uew-${id}`)]));
}

function setText(element, value) {
  if (element) element.textContent = value === '' || value == null ? '—' : String(value);
}

function renderFindings(list, findings) {
  if (!list) return;
  const values = findings.length ? findings : ['None'];
  const items = values.map((text) => {
    const item = list.ownerDocument.createElement('li');
    item.textContent = text;
    return item;
  });
  list.replaceChildren(...items);
}

function sourceSnapshot(state, ParserCtor) {
  const analysis = analyzeSourceText(state.sourceText, state.selectedKind, ParserCtor);
  return {
    effectiveKind: analysis.effectiveKind, detectedKind: analysis.detectedKind,
    sourceName: state.sourceName, origin: state.origin, revision: state.revision,
    byteLength: new TextEncoder().encode(state.normalizedText).byteLength,
    rootShape: analysis.rootName || analysis.rootShape || '', validation: analysis,
  };
}

function renderSummary(context) {
  const { elements, ParserCtor, state } = context;
  const summary = state.envelope ? summarizeSourceEnvelope(state.envelope, ParserCtor) : sourceSnapshot(state, ParserCtor);
  const validation = summary.validation || { ok: false, errors: [], warnings: [] };
  const fields = [['effectiveKind','effective-kind'], ['detectedKind','detected-kind'], ['sourceName','source-name'], ['origin','origin'], ['revision','revision'], ['byteLength','byte-length'], ['rootShape','root-shape'], ['contentHash','content-hash'], ['sourceFileId','source-file-id']];
  fields.forEach(([key, id]) => setText(elements[id], summary[key]));
  setText(elements.status, state.envelope ? (validation.ok ? 'Valid' : 'Invalid') : 'Not generated');
  renderFindings(elements.errors, validation.errors || []);
  renderFindings(elements.warnings, validation.warnings || []);
  elements.download.disabled = !state.envelope?.validation?.ok;
  context.graph?.syncAvailability();
}

function addListener(context, element, type, handler) {
  element.addEventListener(type, handler);
  context.listeners.push([element, type, handler]);
}

function removeListeners(context) {
  context.listeners.splice(0).forEach(([element, type, handler]) => element.removeEventListener(type, handler));
}

function downloadName(sourceName) {
  const stem = String(sourceName || 'source').replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '-');
  return `${stem || 'source'}.source-envelope.json`;
}

function revokeUrls(context) {
  context.objectUrls.forEach((url) => context.dependencies.urlApi.revokeObjectURL(url));
  context.objectUrls.clear();
}

async function handleFileChange(context) {
  const file = context.elements.file.files?.[0];
  if (!file) return;
  context.graph.invalidate();
  const requestId = ++context.fileRequestId;
  const loaded = await readSourceFile(file, context.dependencies.readFile);
  if (context.disposed || requestId !== context.fileRequestId) return;
  context.state = acceptAuthoritativeText(context.state, { ...loaded, origin: 'file' });
  context.elements['source-text'].value = context.state.sourceText;
  renderSummary(context);
}

function handleSourceInput(context) {
  context.graph.invalidate();
  const origin = context.state.pendingPaste ? 'paste' : 'editor';
  context.state = acceptAuthoritativeText(context.state, {
    sourceText: context.elements['source-text'].value, origin,
  });
  renderSummary(context);
}

function handleKindChange(context) {
  context.graph.invalidate();
  context.state = selectSourceKind(context.state, context.elements.kind.value);
  renderSummary(context);
}

async function handleGenerate(context) {
  const snapshot = context.state;
  const requestId = ++context.generationRequestId;
  const analysis = analyzeSourceText(snapshot.sourceText, snapshot.selectedKind, context.ParserCtor);
  const envelope = await createSourceEnvelope({
    ...snapshot, sourceKind: analysis.effectiveKind, analysis,
  }, context.dependencies);
  const stale = requestId !== context.generationRequestId || snapshot.normalizedText !== context.state.normalizedText || snapshot.selectedKind !== context.state.selectedKind;
  if (context.disposed || stale) return;
  context.state = { ...context.state, envelope };
  renderSummary(context);
}

function handleDownload(context) {
  const { envelope } = context.state;
  if (!envelope?.validation?.ok) return;
  const blob = new context.dependencies.BlobCtor([serializeSourceEnvelope(envelope)], { type: 'application/json' });
  const url = context.dependencies.urlApi.createObjectURL(blob);
  context.objectUrls.add(url);
  context.dependencies.triggerDownload(url, downloadName(context.state.sourceName));
}

function handleClear(context) {
  revokeUrls(context);
  context.graph.invalidate();
  context.state = clearWorkbenchState();
  context.elements.file.value = '';
  context.elements.kind.value = 'auto';
  context.elements['source-text'].value = '';
  renderSummary(context);
}

function createMasterBridge(context, dependencies) {
  if (dependencies.masterElements?.['master-import']) {
    return createMasterRegistryController(dependencies.masterElements, dependencies, () => context.graph?.getState().graph || null);
  }
  const empty = { registry: { datasets: [] }, attachmentSet: null };
  return { getState: () => empty, syncGraph() {}, cleanup() {} };
}

function currentEvidenceUpstream(context) {
  const extraction = context.extraction?.getState() || {};
  return { graph: context.graph?.getState().graph || null, config: extraction.config || null, run: extraction.run || null };
}

function createEvidenceBridge(context, dependencies) {
  if (dependencies.evidenceElements?.['evidence-build']) {
    return createEvidenceLedgerController(dependencies.evidenceElements, dependencies, () => currentEvidenceUpstream(context));
  }
  const empty = { ledger: null, trace: null, status: 'Not built' };
  return { getState: () => empty, syncUpstream() {}, cleanup() {} };
}

function createExtractionBridge(context, dependencies) {
  if (dependencies.extractionElements?.['extract-config-build']) {
    const extractionDependencies = {
      ...dependencies,
      onExtractionChange: (state) => {
        dependencies.onExtractionChange?.(state);
        context.evidence?.syncUpstream();
      },
    };
    return createExtractionTesterController(
      dependencies.extractionElements,
      extractionDependencies,
      () => context.graph?.getState() || null,
    );
  }
  const empty = { config: null, run: null, ruleDrafts: [] };
  return { getState: () => empty, syncGraph() {}, cleanup() {} };
}

function createGraphBridge(context, dependencies) {
  if (dependencies.graphElements?.['graph-build']) {
    const graphDependencies = {
      ...dependencies,
      onGraphChange: (graph) => {
        context.master?.syncGraph(graph);
        context.extraction?.syncGraph(graph);
        context.evidence?.syncUpstream();
      },
    };
    return createSourceGraphController(dependencies.graphElements, graphDependencies, () => context.state.envelope);
  }
  const empty = { graph: null, status: 'Not built', expandedIds: new Set(), selectedEntityId: '', filter: '' };
  return {
    getState: () => empty,
    syncAvailability() {},
    invalidate() {
      context.master?.syncGraph(null);
      context.extraction?.syncGraph(null);
      context.evidence?.syncUpstream();
    },
    cleanup() {},
  };
}

function bindListeners(context) {
  const { elements } = context;
  addListener(context, elements.file, 'change', () => handleFileChange(context));
  addListener(context, elements['source-text'], 'paste', () => { context.state = { ...context.state, pendingPaste: true }; });
  addListener(context, elements['source-text'], 'input', () => handleSourceInput(context));
  addListener(context, elements.kind, 'change', () => handleKindChange(context));
  addListener(context, elements.generate, 'click', () => handleGenerate(context));
  addListener(context, elements.download, 'click', () => handleDownload(context));
  addListener(context, elements.clear, 'click', () => handleClear(context));
}

export function createWorkbenchController(elements, dependencies = {}) {
  const context = {
    elements, dependencies, ParserCtor: dependencies.ParserCtor || globalThis.DOMParser,
    state: createWorkbenchState(), listeners: [], objectUrls: new Set(),
    disposed: false, fileRequestId: 0, generationRequestId: 0,
    graph: null, master: null, extraction: null, evidence: null,
  };
  context.master = createMasterBridge(context, dependencies);
  context.evidence = createEvidenceBridge(context, dependencies);
  context.extraction = createExtractionBridge(context, dependencies);
  context.graph = createGraphBridge(context, dependencies);
  const initialGraph = context.graph.getState().graph;
  context.master.syncGraph(initialGraph);
  context.extraction.syncGraph(initialGraph);
  context.evidence.syncUpstream();
  bindListeners(context);
  renderSummary(context);
  return {
    getState: () => context.state,
    getGraphState: () => context.graph.getState(),
    getMasterState: () => context.master.getState(),
    getExtractionState: () => context.extraction.getState(),
    getEvidenceState: () => context.evidence.getState(),
    clear: () => handleClear(context),
    cleanup() {
      if (context.disposed) return;
      context.disposed = true;
      context.fileRequestId += 1;
      context.generationRequestId += 1;
      removeListeners(context);
      revokeUrls(context);
      context.graph.cleanup();
      context.master.cleanup();
      context.extraction.cleanup();
      context.evidence.cleanup();
    },
  };
}

function browserDependencies(options = {}) {
  const documentRef = options.document || globalThis.document;
  return {
    ...options, document: documentRef,
    BlobCtor: options.BlobCtor || globalThis.Blob,
    urlApi: options.urlApi || globalThis.URL,
    triggerDownload: options.triggerDownload || ((url, name) => {
      const anchor = documentRef.createElement('a');
      anchor.href = url; anchor.download = name; anchor.click();
    }),
  };
}

export function renderUniversalEnrichmentWorkbench(container, options = {}) {
  const dependencies = browserDependencies(options);
  container.innerHTML = `${renderWorkbenchMarkup()}${renderEvidenceLedgerMarkup()}`;
  dependencies.graphElements = collectSourceGraphElements(container);
  dependencies.masterElements = collectMasterRegistryElements(container);
  dependencies.extractionElements = collectExtractionTesterElements(container);
  dependencies.evidenceElements = collectEvidenceLedgerElements(container);
  const controller = createWorkbenchController(collectElements(container), dependencies);
  const cleanup = () => {
    controller.cleanup();
    container.replaceChildren();
  };
  cleanup.controller = controller;
  return cleanup;
}
