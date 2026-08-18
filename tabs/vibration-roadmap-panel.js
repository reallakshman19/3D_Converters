const STATUS_LABELS = Object.freeze({
  AVAILABLE: 'Available', DATA: 'Data', IMPORTED: 'Imported', CURRENT_RESULT: 'Result',
  STALE: 'Stale', ATTENTION: 'Attention', ACTION: 'Action', NOT_APPLICABLE: 'Not applicable',
});

function esc(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function targetAttributes(node) {
  if (node.target?.type === 'CALCULATION' && node.target.calculationId) {
    return ` data-calc-id="${esc(node.target.calculationId)}"`;
  }
  if (node.target?.type === 'WORKSPACE' && node.target.workspaceId) {
    return ` data-vibration-workspace-id="${esc(node.target.workspaceId)}"`;
  }
  return '';
}

function renderNode(node, activeCalculationId) {
  const label = STATUS_LABELS[node.status] ?? node.status;
  const detail = node.detail ? `<small>${esc(node.detail)}</small>` : '';
  const disabled = node.target ? '' : ' aria-disabled="true"';
  const active = node.target?.calculationId === activeCalculationId ? ' is-active' : '';
  return `<button type="button" class="vibration-roadmap-node${active}" data-roadmap-status="${esc(node.status)}"${targetAttributes(node)}${disabled}><span><strong>${esc(node.label)}</strong><small>${esc(node.specialty)}</small></span><span class="vibration-roadmap-status">${esc(label)}${detail}</span></button>`;
}

function scopeGroups(nodes) {
  const order = ['MAINLINE', 'BRANCH_ATTACHMENT', 'CROSS_BOUNDARY', 'CROSS_SCOPE'];
  return order.map((scope) => ({ scope, nodes: nodes.filter((node) => node.scope === scope) }))
    .filter((group) => group.nodes.length);
}

function scopeLabel(scope) {
  return { MAINLINE: 'Mainline', BRANCH_ATTACHMENT: 'Branch / attachment', CROSS_BOUNDARY: 'Cross-boundary', CROSS_SCOPE: 'General' }[scope] ?? scope;
}

function renderPhase(phase, activeCalculationId) {
  const body = scopeGroups(phase.nodes).map((group) => `<div class="vibration-roadmap-scope"><h4>${esc(scopeLabel(group.scope))}</h4>${group.nodes.map((node) => renderNode(node, activeCalculationId)).join('')}</div>`).join('');
  return `<section class="vibration-roadmap-phase" data-roadmap-phase="${esc(phase.id)}"><h3>${esc(phase.label)}</h3>${body}</section>`;
}

export function renderVibrationRoadmapPanel(projection, { collapsed = false } = {}) {
  if (projection?.schema !== 'VibrationRoadmapProjection.v1') {
    throw new TypeError('Vibration roadmap panel requires VibrationRoadmapProjection.v1.');
  }
  const activeCalculationId = projection.context?.calculationId ?? null;
  const collapsedClass = collapsed ? ' is-collapsed' : '';
  return `<aside class="vibration-roadmap-panel${collapsedClass}" data-vibration-roadmap-panel><header><div><strong>Vibration Roadmap</strong><small>Guidance only · not an applicability or completion gate</small></div><button type="button" class="vibration-roadmap-collapse" data-roadmap-collapse aria-label="${collapsed ? 'Expand' : 'Collapse'} vibration roadmap">${collapsed ? '‹' : '›'}</button></header><div class="vibration-roadmap-scroll">${projection.phases.map((phase) => renderPhase(phase, activeCalculationId)).join('')}</div></aside>`;
}

export function mountVibrationRoadmapPanel(host, projection, options = {}) {
  if (!host) throw new TypeError('Vibration roadmap panel host is required.');
  host.innerHTML = renderVibrationRoadmapPanel(projection, options);
  return () => { host.innerHTML = ''; };
}
