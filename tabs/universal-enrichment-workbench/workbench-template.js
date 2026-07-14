function sourceIntakeMarkup() {
  return `
  <div class="uew-grid">
    <section class="uew-card" aria-labelledby="uew-source-heading">
      <h2 id="uew-source-heading">Authoritative source</h2>
      <div class="uew-controls">
        <label>Source file<input id="uew-file" type="file" accept=".xml,.inputxml,.json,.txt,application/xml,application/json,text/xml,text/plain"></label>
        <label>Source kind<select id="uew-kind"><option value="auto">Auto detect</option><option value="xml">XML</option><option value="inputxml">InputXML</option><option value="stagedjson">StagedJSON</option></select></label>
      </div>
      <label class="uew-editor-label" for="uew-source-text">Paste or edit source text</label>
      <textarea id="uew-source-text" spellcheck="false" placeholder="Paste XML, InputXML or StagedJSON"></textarea>
      <div class="uew-actions"><button id="uew-generate" type="button">Generate envelope</button><button id="uew-download" type="button" disabled>Download JSON</button><button id="uew-clear" type="button" class="uew-secondary">Clear</button></div>
    </section>
    <section class="uew-card" aria-labelledby="uew-summary-heading">
      <h2 id="uew-summary-heading">Identity and validation</h2>
      <dl class="uew-summary">
        <div><dt>Effective kind</dt><dd id="uew-effective-kind">—</dd></div><div><dt>Detected kind</dt><dd id="uew-detected-kind">—</dd></div>
        <div><dt>Source name</dt><dd id="uew-source-name">—</dd></div><div><dt>Origin</dt><dd id="uew-origin">—</dd></div>
        <div><dt>Revision</dt><dd id="uew-revision">0</dd></div><div><dt>Byte length</dt><dd id="uew-byte-length">0</dd></div>
        <div><dt>Root / shape</dt><dd id="uew-root-shape">—</dd></div><div><dt>Status</dt><dd id="uew-status">Not generated</dd></div>
        <div class="uew-wide"><dt>Content hash</dt><dd id="uew-content-hash">—</dd></div><div class="uew-wide"><dt>Source file ID</dt><dd id="uew-source-file-id">—</dd></div>
      </dl>
      <div class="uew-findings"><h3>Errors</h3><ul id="uew-errors"><li>None</li></ul><h3>Warnings</h3><ul id="uew-warnings"><li>None</li></ul></div>
    </section>
  </div>`;
}

function graphSummaryMarkup() {
  return `
    <div class="uew-graph-heading"><div><p class="uew-kicker">Structural evidence</p><h2 id="uew-graph-heading">Universal source graph</h2></div>
      <div class="uew-actions"><button id="uew-graph-build" type="button" disabled>Build Source Graph</button><button id="uew-graph-download" type="button" disabled>Download Graph JSON</button></div></div>
    <dl class="uew-summary uew-graph-summary">
      <div><dt>Status</dt><dd id="uew-graph-status">Not built</dd></div><div><dt>Entities</dt><dd id="uew-graph-entity-count">0</dd></div>
      <div><dt>Roots</dt><dd id="uew-graph-root-count">0</dd></div><div><dt>Maximum depth</dt><dd id="uew-graph-max-depth">0</dd></div>
      <div class="uew-wide"><dt>Kind counts</dt><dd id="uew-graph-kind-counts">—</dd></div>
    </dl>
    <div class="uew-findings uew-graph-findings"><h3>Graph errors</h3><ul id="uew-graph-errors"><li>None</li></ul><h3>Graph warnings</h3><ul id="uew-graph-warnings"><li>None</li></ul></div>`;
}

function graphExplorerMarkup() {
  return `
    <div class="uew-graph-layout">
      <section class="uew-graph-pane" aria-labelledby="uew-tree-heading"><div class="uew-pane-title"><h3 id="uew-tree-heading">Hierarchy</h3><span id="uew-graph-tree-count">0 rendered</span></div><div id="uew-graph-tree" class="uew-tree" role="tree"></div></section>
      <section class="uew-graph-pane" aria-labelledby="uew-table-heading"><div class="uew-pane-title"><h3 id="uew-table-heading">Flat entities</h3><span id="uew-graph-table-count">0 of 0</span></div><label class="uew-filter-label">Search<input id="uew-graph-filter" type="search" placeholder="ID, kind, name or source path"></label><div id="uew-graph-table-body" class="uew-graph-table" role="rowgroup"></div></section>
      <section class="uew-graph-pane" aria-labelledby="uew-details-heading"><div class="uew-pane-title"><h3 id="uew-details-heading">Selected entity</h3></div><pre id="uew-graph-details" class="uew-graph-details">Select an entity to inspect its source evidence.</pre></section>
    </div>`;
}

function sourceGraphMarkup() {
  return `<section class="uew-card uew-graph-card" aria-labelledby="uew-graph-heading">${graphSummaryMarkup()}${graphExplorerMarkup()}</section>`;
}

export function renderWorkbenchMarkup() {
  return `
<section class="uew-shell" aria-labelledby="uew-title">
  <header class="uew-header">
    <div><p class="uew-kicker">Source intake and projection</p><h1 id="uew-title">Universal Enrichment Workbench</h1></div>
    <span class="uew-schema">SourceEnvelope.v1 → UniversalSourceGraph.v1</span>
  </header>
  ${sourceIntakeMarkup()}
  ${sourceGraphMarkup()}
</section>`;
}
