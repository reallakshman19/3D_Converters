export function renderWorkbenchMarkup() {
  return `
<section class="uew-shell" aria-labelledby="uew-title">
  <header class="uew-header">
    <div><p class="uew-kicker">Source intake</p><h1 id="uew-title">Universal Enrichment Workbench</h1></div>
    <span class="uew-schema">SourceEnvelope.v1</span>
  </header>
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
  </div>
</section>`;
}
