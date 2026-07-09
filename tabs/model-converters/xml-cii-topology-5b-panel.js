const XML_SCAN_LIMIT = 200;
const POS_TOL = 0.5;

function text(value) { return value === undefined || value === null ? '' : String(value).trim(); }
function esc(value) { return text(value).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]); }
function num(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function fmt(value, places = 2) { return Number.isFinite(value) ? value.toFixed(places) : ''; }
function posLabel(p) { return p ? `${fmt(p.x)}, ${fmt(p.y)}, ${fmt(p.z)}` : ''; }
function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function mag(v) { return Math.hypot(v.x, v.y, v.z); }
function dist(a, b) { return mag(sub(a, b)); }
function norm(v) { const m = mag(v); return m > 1e-9 ? { x: v.x / m, y: v.y / m, z: v.z / m } : null; }
function localName(node) { return text(node?.localName || node?.nodeName).replace(/^.*:/, ''); }
function children(node, name) { return [...(node?.childNodes || [])].filter((child) => child.nodeType === 1 && localName(child) === name); }
function childText(node, name) { return text(children(node, name)[0]?.textContent); }
function parsePos(value) {
  const parts = text(value).split(/\s+/).map(Number);
  return parts.length >= 3 && parts.every(Number.isFinite) ? { x: parts[0], y: parts[1], z: parts[2] } : null;
}
function uniquePositions(points) {
  const out = [];
  for (const p of points.filter(Boolean)) {
    const prev = out[out.length - 1];
    if (!prev || dist(prev, p) > POS_TOL) out.push(p);
  }
  return out;
}
function lastDirection(points) {
  for (let i = points.length - 1; i > 0; i -= 1) {
    const d = norm(sub(points[i], points[i - 1]));
    if (d) return d;
  }
  return null;
}
function dominantType(run) {
  const types = [...run.types];
  const conns = [...run.connections];
  if (types.includes('OLET')) return 'OLET';
  if (types.includes('TEE')) return 'TEE';
  if (types.includes('BRAN') && conns.includes('OLET')) return 'BRAN/OLET';
  if (types.includes('BRAN') && conns.includes('TEE')) return 'BRAN/TEE';
  for (const item of ['ELBO', 'REDU', 'VALV', 'RIGID', 'FLAN', 'GASK', 'ATTA', 'BRAN']) {
    if (types.includes(item)) return types.includes('FLAN') && types.includes('RIGID') ? 'FLAN/RIGID' : item;
  }
  return types[0] || 'UNKNOWN';
}
function parseBranches(xmlText) {
  const doc = new DOMParser().parseFromString(text(xmlText), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('Workflow XML parse failed.');
  return [...doc.getElementsByTagName('*')]
    .filter((node) => localName(node) === 'Branch')
    .map((branchNode, branchIndex) => {
      const branchName = childText(branchNode, 'Branchname') || `(branch ${branchIndex + 1})`;
      const nodes = children(branchNode, 'Node').map((nodeEl, nodeIndex) => {
        const nodeNumber = childText(nodeEl, 'NodeNumber');
        const pos = parsePos(childText(nodeEl, 'Position'));
        return {
          branchIndex,
          branchName,
          nodeIndex,
          nodeNumber,
          componentType: childText(nodeEl, 'ComponentType').toUpperCase(),
          connectionType: childText(nodeEl, 'ConnectionType').toUpperCase(),
          refNo: childText(nodeEl, 'ComponentRefNo'),
          od: num(childText(nodeEl, 'OutsideDiameter')),
          originalPos: pos,
          transformedPos: null,
        };
      });
      return { branchIndex, branchName, nodes, components: [] };
    });
}
function chooseAnchor(branches, requested) {
  const wanted = text(requested);
  if (wanted) {
    for (const branch of branches) for (const row of branch.nodes) if (row.nodeNumber === wanted && row.originalPos) return row;
  }
  for (const branch of branches) for (const row of branch.nodes) if (num(row.nodeNumber) > 0 && row.originalPos) return row;
  return null;
}
function splitComponentRuns(branch) {
  const runs = [];
  let current = null;
  for (const row of branch.nodes) {
    const ref = row.refNo || `__NO_REF_${row.nodeIndex}`;
    if (!current || current.refNo !== ref) {
      current = {
        id: `${branch.branchIndex + 1}.${runs.length + 1}`,
        branchName: branch.branchName,
        refNo: row.refNo || '',
        rows: [],
        types: new Set(),
        connections: new Set(),
        positiveLabels: [],
        bore: 0,
        points: [],
        entry: null,
        exit: null,
        direction: null,
        type: '',
        branchCapable: false,
      };
      runs.push(current);
    }
    current.rows.push(row);
    if (row.componentType) current.types.add(row.componentType);
    if (row.connectionType) current.connections.add(row.connectionType);
    if (num(row.nodeNumber) > 0) current.positiveLabels.push(row.nodeNumber);
    if (row.od > 0) current.bore = Math.max(current.bore, row.od);
  }
  for (const run of runs) {
    run.type = dominantType(run);
    run.points = uniquePositions(run.rows.map((row) => row.transformedPos));
    run.entry = run.points[0] || null;
    run.exit = run.points[run.points.length - 1] || run.entry;
    run.direction = lastDirection(run.points);
    run.branchCapable = run.type.includes('OLET') || run.type.includes('TEE');
  }
  return runs;
}
function buildModel(xmlText, anchorNode) {
  const branches = parseBranches(xmlText);
  const anchor = chooseAnchor(branches, anchorNode);
  if (!anchor) throw new Error('No anchor node with POS found in workflow XML.');
  for (const branch of branches) {
    for (const row of branch.nodes) row.transformedPos = row.originalPos ? sub(row.originalPos, anchor.originalPos) : null;
    branch.components = splitComponentRuns(branch);
  }
  return { branches, anchor };
}
function candidateWorkflowXml(root) {
  const candidates = [];
  const push = (source, value) => {
    const raw = text(value);
    if (raw.includes('<Branch') && raw.includes('<Node') && raw.length > 200) candidates.push({ source, xmlText: raw });
  };
  const scope = root || document;
  scope.querySelectorAll?.('textarea,input[type="hidden"]').forEach((el, index) => {
    push(`workflow-dom-${index}`, el.value || el.textContent);
  });
  try {
    const payload = JSON.parse(localStorage.getItem('xmlCii2019.matchedPreview.lastDiagnostics.v1') || '{}');
    push('latest-diagnostics.xmlText', payload.xmlText || payload.enrichedXmlText || payload.enrichedXml || payload.inputXml || payload.sourceXml);
  } catch {}
  try {
    for (let i = 0; i < Math.min(localStorage.length, XML_SCAN_LIMIT); i += 1) {
      const key = localStorage.key(i);
      if (!key || !/xml|cii|workflow|preview|diagnostic|source|input/i.test(key)) continue;
      push(`localStorage:${key}`, localStorage.getItem(key));
    }
  } catch {}
  candidates.sort((a, b) => b.xmlText.length - a.xmlText.length);
  return candidates[0] || null;
}
function renderInputBranch(branch) {
  return `<details class="xml-cii-native-card" ${branch.branchIndex < 2 ? 'open' : ''}><summary><strong>${esc(branch.branchName)}</strong> <span style="color:#9aa8ba;">${branch.nodes.length} node rows</span></summary><div class="xml-cii-native-table-wrap"><table class="xml-cii-native-table"><thead><tr><th>Node</th><th>Component type</th><th>Bore / OD mm</th><th>Transformed X</th><th>Transformed Y</th><th>Transformed Z</th><th>Original POS</th></tr></thead><tbody>${branch.nodes.map((row) => `<tr><td>${esc(row.nodeNumber)}</td><td>${esc(row.componentType)}${row.connectionType ? ` / ${esc(row.connectionType)}` : ''}</td><td>${fmt(row.od, 1)}</td><td>${fmt(row.transformedPos?.x)}</td><td>${fmt(row.transformedPos?.y)}</td><td>${fmt(row.transformedPos?.z)}</td><td><code>${esc(posLabel(row.originalPos))}</code></td></tr>`).join('')}</tbody></table></div></details>`;
}
function renderCalcBranch(branch) {
  return `<details class="xml-cii-native-card" ${branch.branchIndex < 2 ? 'open' : ''}><summary><strong>${esc(branch.branchName)}</strong> <span style="color:#9aa8ba;">${branch.components.length} component instances</span></summary><div class="xml-cii-native-table-wrap"><table class="xml-cii-native-table"><thead><tr><th>Component instance</th><th>RefNo</th><th>Type</th><th>Positive node label</th><th>Entry XYZ</th><th>Exit XYZ</th><th>Internal direction</th></tr></thead><tbody>${branch.components.map((run) => `<tr><td>${esc(run.id)}</td><td><code>${esc(run.refNo)}</code></td><td>${esc(run.type)}</td><td>${esc(run.positiveLabels.join(', ') || '-')}</td><td><code>${esc(posLabel(run.entry))}</code></td><td><code>${esc(posLabel(run.exit))}</code></td><td><code>${run.direction ? `${fmt(run.direction.x, 3)}, ${fmt(run.direction.y, 3)}, ${fmt(run.direction.z, 3)}` : '-'}</code></td></tr>`).join('')}</tbody></table></div></details>`;
}
function drawGraph(canvas, model) {
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(400, Math.floor(rect.width * dpr));
  canvas.height = Math.max(300, Math.floor(rect.height * dpr));
  ctx.fillStyle = '#07101f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const pts = model.branches.flatMap((branch) => branch.nodes.map((row) => row.transformedPos).filter(Boolean));
  if (!pts.length) return;
  const min = { x: Math.min(...pts.map((p) => p.x)), y: Math.min(...pts.map((p) => p.y)), z: Math.min(...pts.map((p) => p.z)) };
  const max = { x: Math.max(...pts.map((p) => p.x)), y: Math.max(...pts.map((p) => p.y)), z: Math.max(...pts.map((p) => p.z)) };
  const center = { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 };
  const span = Math.max(max.x - min.x, max.y - min.y, max.z - min.z, 1);
  const scale = Math.min(canvas.width, canvas.height) * 0.78 / span;
  const project = (p) => ({ x: canvas.width / 2 + (p.x - center.x) * scale, y: canvas.height / 2 - ((p.y - center.y) * 0.35 + (p.z - center.z)) * scale });
  const colors = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#fb7185', '#2dd4bf'];
  ctx.lineWidth = 2 * dpr;
  model.branches.forEach((branch) => {
    ctx.strokeStyle = colors[branch.branchIndex % colors.length];
    ctx.fillStyle = ctx.strokeStyle;
    for (const run of branch.components) {
      if (run.points.length < 2) continue;
      ctx.beginPath();
      run.points.forEach((p, i) => { const s = project(p); if (i) ctx.lineTo(s.x, s.y); else ctx.moveTo(s.x, s.y); });
      ctx.stroke();
    }
    const labelPoint = branch.nodes.find((row) => row.transformedPos)?.transformedPos;
    if (labelPoint) {
      const s = project(labelPoint);
      ctx.font = `${11 * dpr}px system-ui`;
      ctx.fillText(branch.branchName, s.x + 6 * dpr, s.y + 12 * dpr);
    }
    for (const row of branch.nodes) {
      if (num(row.nodeNumber) <= 0 || !row.transformedPos) continue;
      const s = project(row.transformedPos);
      ctx.beginPath();
      ctx.arc(s.x, s.y, 3 * dpr, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `${10 * dpr}px system-ui`;
      ctx.fillText(`${row.nodeNumber} | ${row.componentType}`, s.x + 5 * dpr, s.y - 5 * dpr);
    }
  });
}
export function renderXmlCiiTopology5BPanel(target, options = {}) {
  const source = candidateWorkflowXml(options.root || target.closest?.('[data-xml-cii-workflow-root]') || document);
  if (!source) {
    target.innerHTML = `<section class="xml-cii-native-card"><div class="model-converters-workflow-section-title">5B POS Topology Workbench</div><div class="model-converters-workflow-detail-note">No current workflow XML was found. Load/import XML in the workflow first, then return to 5B Topology.</div></section>`;
    return null;
  }
  let model;
  try { model = buildModel(source.xmlText, options.anchorNode || '210'); }
  catch (error) {
    target.innerHTML = `<section class="xml-cii-native-card"><div class="model-converters-workflow-section-title">5B POS Topology Workbench</div><div style="color:#ffb4b4;">${esc(error?.message || error)}</div></section>`;
    return null;
  }
  const branchCount = model.branches.length;
  const compCount = model.branches.reduce((sum, branch) => sum + branch.components.length, 0);
  const nodeCount = model.branches.reduce((sum, branch) => sum + branch.nodes.length, 0);
  target.innerHTML = `
    <section class="xml-cii-native-card">
      <div class="model-converters-workflow-section-title">5B POS Topology Workbench</div>
      <div class="model-converters-workflow-detail-note">Source: ${esc(source.source)} | Anchor node chosen := ${esc(model.anchor.nodeNumber)} | Branches: ${branchCount} | Nodes: ${nodeCount} | Components: ${compCount}</div>
    </section>
    <section class="xml-cii-native-card" style="display:grid;grid-template-columns:minmax(420px,50%) minmax(420px,50%);gap:10px;align-items:start;">
      <div><div class="model-converters-workflow-section-title">Input panel — branch-wise</div>${model.branches.map(renderInputBranch).join('')}</div>
      <div><div class="model-converters-workflow-section-title">Calc panel — component instances</div>${model.branches.map(renderCalcBranch).join('')}</div>
    </section>
    <section class="xml-cii-native-card">
      <div class="model-converters-workflow-section-title">BRANCH GRAPH</div>
      <canvas data-xml-cii-5b-canvas style="width:100%;height:640px;border:1px solid rgba(148,163,184,.28);border-radius:10px;background:#07101f;"></canvas>
    </section>`;
  const canvas = target.querySelector('[data-xml-cii-5b-canvas]');
  if (canvas) drawGraph(canvas, model);
  return model;
}
