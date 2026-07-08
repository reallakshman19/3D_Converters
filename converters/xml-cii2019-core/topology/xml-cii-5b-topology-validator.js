const REPORT_SCHEMA = 'xml-cii-5b-topology-validation/v1';
const DEFAULT_CONTINUITY_TOLERANCE_MM = 6;
const DEFAULT_SUPPORT_TOLERANCE_MM = 25;
const HELPER_TYPES = new Set(['GASK', 'GASKET']);
const SUPPORT_TYPES = new Set(['SUPPORT', 'ATTA']);

function text(value) { return value === undefined || value === null ? '' : String(value).trim(); }
function upper(value) { return text(value).toUpperCase(); }
function finite(value, fallback = null) {
  const raw = text(value).replace(/,/g, '');
  if (!raw) return fallback;
  const valueNumber = Number(raw);
  return Number.isFinite(valueNumber) ? valueNumber : fallback;
}
function round(value, digits = 3) { return Number.isFinite(Number(value)) ? Number(Number(value).toFixed(digits)) : null; }
function safeId(value, fallback = 'id') { return (text(value) || fallback).replace(/[\/\s]+/g, '-').replace(/[^A-Za-z0-9_.:-]+/g, '-').replace(/^-+|-+$/g, '') || fallback; }
function clonePoint(point) { return isPoint(point) ? { x: Number(point.x), y: Number(point.y), z: Number(point.z) } : null; }
function isPoint(point) { return point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y)) && Number.isFinite(Number(point.z)); }
function dist(a, b) { return isPoint(a) && isPoint(b) ? Math.hypot(Number(b.x) - Number(a.x), Number(b.y) - Number(a.y), Number(b.z) - Number(a.z)) : null; }
function pointText(point) { return isPoint(point) ? `${round(point.x, 6)} ${round(point.y, 6)} ${round(point.z, 6)}` : ''; }
function parsePoint(value) {
  const values = text(value).match(/-?\d+(?:\.\d+)?(?:[Ee][-+]?\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
  return values.length >= 3 ? { x: values[0], y: values[1], z: values[2] } : null;
}
function decodeXmlText(value) {
  return text(value).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}
function tagValue(block, name) {
  const match = text(block).match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return decodeXmlText(match?.[1]?.replace(/<[^>]+>/g, ''));
}
function blocks(xmlText, tagName) {
  return text(xmlText).match(new RegExp(`<${tagName}\\b[\\s\\S]*?<\\/${tagName}>`, 'gi')) || [];
}
function normalizeType(value) {
  const type = upper(value);
  if (type === 'VALV') return 'VALVE';
  if (type === 'FLAN') return 'FLANGE';
  if (type === 'FBLI') return 'BLIND-FLANGE';
  if (type === 'GASK') return 'GASKET';
  if (type === 'REDU' || type === 'REDUCER' || type === 'REDUCER_CONCENTRIC') return 'REDUCER-CONCENTRIC';
  if (type === 'REDUCER_ECCENTRIC') return 'REDUCER-ECCENTRIC';
  if (type === 'ELBO' || type === 'ELBOW') return 'ELBOW';
  if (type === 'RIGID' || type === 'INST' || type === 'OTHER') return 'PIPE';
  if (SUPPORT_TYPES.has(type)) return 'SUPPORT';
  if (type === 'BEND') return 'BEND';
  if (type === 'TEE' || type === 'TEES') return 'TEE';
  if (type === 'OLET' || type === 'WELDOLET' || type === 'SOCKOLET') return 'OLET';
  if (type === 'BRAN') return 'PIPE';
  if (type === 'PIPE') return 'PIPE';
  return type || 'UNKNOWN';
}
function sequenceOf(value, fallback) {
  const valueNumber = finite(value, null);
  return valueNumber === null ? fallback : valueNumber;
}
function pointDistanceToSegment(point, start, end) {
  if (!isPoint(point) || !isPoint(start) || !isPoint(end)) return null;
  const vx = end.x - start.x;
  const vy = end.y - start.y;
  const vz = end.z - start.z;
  const wx = point.x - start.x;
  const wy = point.y - start.y;
  const wz = point.z - start.z;
  const len2 = vx * vx + vy * vy + vz * vz;
  if (len2 <= 1e-9) return dist(point, start);
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy + wz * vz) / len2));
  return dist(point, { x: start.x + t * vx, y: start.y + t * vy, z: start.z + t * vz });
}

function parseXmlToModel(xmlText, options = {}) {
  const model = { schema: 'xml-cii-5b-source-model/v1', sourceName: text(options.sourceName || 'enriched.xml'), branches: [] };
  for (const [branchIndex, branchBlock] of blocks(xmlText, 'Branch').entries()) {
    const branchName = tagValue(branchBlock, 'Branchname') || `/XML-CII/B${branchIndex + 1}`;
    const branch = { branchName, lineKey: tagValue(branchBlock, 'LineNo') || branchName, nodes: [] };
    const componentSequenceByRef = new Map();
    for (const [nodeIndex, nodeBlock] of blocks(branchBlock, 'Node').entries()) {
      const ref = tagValue(nodeBlock, 'ComponentRefNo') || tagValue(nodeBlock, 'NodeNumber') || `NODE-${nodeIndex + 1}`;
      if (!componentSequenceByRef.has(ref)) componentSequenceByRef.set(ref, componentSequenceByRef.size + 1);
      branch.nodes.push({
        nodeNumber: tagValue(nodeBlock, 'NodeNumber'),
        nodeName: tagValue(nodeBlock, 'NodeName'),
        endpoint: tagValue(nodeBlock, 'Endpoint') || '1',
        rigid: tagValue(nodeBlock, 'Rigid') || '0',
        componentType: tagValue(nodeBlock, 'ComponentType') || 'PIPE',
        componentRefNo: ref,
        position: tagValue(nodeBlock, 'Position'),
        boreMm: tagValue(nodeBlock, 'BoreMm'),
        elementLengthMm: tagValue(nodeBlock, 'ElementLengthMm'),
        dtxr: tagValue(nodeBlock, 'DTXR_POS'),
        sourceSequence: String(nodeIndex + 1),
        componentSequence: String(componentSequenceByRef.get(ref)),
        pointSequence: tagValue(nodeBlock, 'Endpoint') || String(nodeIndex + 1),
        hasRestraint: /<Restraint\b|<CustomRestraint\b/i.test(nodeBlock),
      });
    }
    model.branches.push(branch);
  }
  return model;
}

function groupedNodes(nodes) {
  const groups = new Map();
  for (const [index, node] of (nodes || []).entries()) {
    const ref = text(node?.componentRefNo) || text(node?.nodeNumber) || `node-${index + 1}`;
    if (!groups.has(ref)) groups.set(ref, []);
    groups.get(ref).push({ ...node, _nodeOrder: index + 1 });
  }
  return [...groups.entries()].map(([ref, rows], index) => ({
    ref,
    rows: rows.sort((a, b) => sequenceOf(a.pointSequence || a.endpoint, a._nodeOrder) - sequenceOf(b.pointSequence || b.endpoint, b._nodeOrder)),
    sourceOrder: Math.min(...rows.map((row) => sequenceOf(row.componentSequence || row.sourceSequence || row.nodeNumber, index + 1))),
  })).sort((a, b) => a.sourceOrder - b.sourceOrder || text(a.ref).localeCompare(text(b.ref)));
}

function buildComponents(model = {}) {
  const components = [];
  for (const [branchIndex, branch] of (model.branches || []).entries()) {
    const branchName = text(branch?.branchName) || `/XML-CII/B${branchIndex + 1}`;
    for (const group of groupedNodes(branch?.nodes || [])) {
      const first = group.rows[0] || {};
      const rawType = text(first.componentType || 'PIPE');
      const normalizedType = normalizeType(rawType);
      const points = group.rows.map((row) => ({ ...parsePoint(row.position), nodeNumber: row.nodeNumber, nodeName: row.nodeName, endpoint: row.endpoint, sourceMethod: 'xml-cii-node-order' })).filter(isPoint);
      const support = normalizedType === 'SUPPORT';
      const helper = HELPER_TYPES.has(normalizedType) || HELPER_TYPES.has(upper(rawType));
      const start = points[0] || null;
      const end = points.length > 1 ? points[points.length - 1] : null;
      components.push({
        id: `cmp:${safeId(branchName)}:${String(components.length + 1).padStart(5, '0')}`,
        refNo: group.ref,
        name: text(first.nodeName || group.ref),
        type: rawType,
        normalizedType,
        branchName,
        pipelineRef: branchName,
        sequence: sequenceOf(first.componentSequence || first.sourceSequence || group.sourceOrder, components.length + 1),
        nodeNumbers: group.rows.map((row) => text(row.nodeNumber)).filter(Boolean),
        start: clonePoint(start),
        end: clonePoint(end),
        supportPoint: support ? clonePoint(start) : null,
        spanLengthMm: start && end ? round(dist(start, end), 6) : null,
        helper,
        support,
        raw: { sourceRows: group.rows },
      });
    }
  }
  return components;
}

function endpointsFor(component) {
  if (component.support) return [];
  const ports = [];
  if (component.start) ports.push({ componentId: component.id, component, role: 'EP1', point: component.start, refNo: component.refNo });
  if (component.end) ports.push({ componentId: component.id, component, role: 'EP2', point: component.end, refNo: component.refNo });
  return ports;
}
function closestEndpointPair(left, right) {
  const pairs = [];
  for (const from of endpointsFor(left)) for (const to of endpointsFor(right)) pairs.push([`${from.role}->${to.role}`, from, to]);
  let best = null;
  for (const [role, from, to] of pairs) {
    const distanceMm = dist(from.point, to.point);
    if (distanceMm === null) continue;
    if (!best || distanceMm < best.distanceMm) best = { role, from, to, distanceMm };
  }
  return best;
}

function find(parent, index) {
  let current = parent[index];
  while (current !== parent[current]) {
    parent[current] = parent[parent[current]];
    current = parent[current];
  }
  return current;
}
function union(parent, a, b) {
  const rootA = find(parent, a);
  const rootB = find(parent, b);
  if (rootA !== rootB) parent[rootB] = rootA;
}
function buildGraph(routeComponents, toleranceMm) {
  const ports = routeComponents.flatMap(endpointsFor);
  const parent = ports.map((_, index) => index);
  for (let i = 0; i < ports.length; i += 1) {
    for (let j = i + 1; j < ports.length; j += 1) {
      if (ports[i].componentId === ports[j].componentId) continue;
      const distanceMm = dist(ports[i].point, ports[j].point);
      if (distanceMm !== null && distanceMm <= toleranceMm) union(parent, i, j);
    }
  }
  const grouped = new Map();
  ports.forEach((port, index) => {
    const root = find(parent, index);
    if (!grouped.has(root)) grouped.set(root, []);
    grouped.get(root).push(port);
  });
  const adjacency = new Map(routeComponents.map((component) => [component.id, new Set()]));
  const edges = [];
  const nodes = [];
  for (const [index, groupPorts] of [...grouped.values()].entries()) {
    const componentIds = [...new Set(groupPorts.map((port) => port.componentId))];
    const point = groupPorts[0]?.point || null;
    const node = { id: `node:${String(index + 1).padStart(5, '0')}`, point: clonePoint(point), ports: groupPorts, componentIds };
    nodes.push(node);
    for (let i = 0; i < componentIds.length; i += 1) {
      for (let j = i + 1; j < componentIds.length; j += 1) {
        const a = componentIds[i];
        const b = componentIds[j];
        adjacency.get(a)?.add(b);
        adjacency.get(b)?.add(a);
        edges.push({ sourceComponentId: a, targetComponentId: b, nodeId: node.id, point: clonePoint(point) });
      }
    }
  }
  return { ports, nodes, edges, adjacency };
}

function buildSequenceRows(routeComponents, toleranceMm) {
  const rows = [];
  const byBranch = new Map();
  for (const component of routeComponents) {
    if (!byBranch.has(component.branchName)) byBranch.set(component.branchName, []);
    byBranch.get(component.branchName).push(component);
  }
  for (const [branchName, components] of byBranch.entries()) {
    components.sort((a, b) => a.sequence - b.sequence || a.refNo.localeCompare(b.refNo));
    for (let index = 0; index < components.length - 1; index += 1) {
      const left = components[index];
      const right = components[index + 1];
      const pair = closestEndpointPair(left, right);
      const missing = !pair;
      const distanceMm = pair?.distanceMm ?? null;
      const status = missing ? 'DISCONNECTED' : distanceMm <= 0.001 ? 'OK' : distanceMm <= toleranceMm ? 'MINOR_GAP' : 'DISCONNECTED';
      rows.push({
        path: 'Path 1 - 5B component graph',
        category: 'SEQUENCE',
        status,
        branchName,
        fromNodeNumber: left.nodeNumbers.slice(-1)[0] || '',
        toNodeNumber: right.nodeNumbers[0] || '',
        nodeNumber: right.nodeNumbers[0] || '',
        componentType: right.normalizedType,
        componentRefNo: right.refNo,
        endpoint: pair?.to?.role || '',
        lengthMm: distanceMm === null ? '' : round(distanceMm, 3),
        method: '5b-source-sequence-nearest-endpoint',
        reason: missing ? 'missing-endpoint-position' : status === 'DISCONNECTED' ? 'sequence-gap' : status === 'MINOR_GAP' ? 'minor-gap-continuous' : '',
        message: missing ? 'Adjacent source-sequence components are missing usable endpoint positions.' : status === 'DISCONNECTED' ? `Adjacent source-sequence components are separated by ${round(distanceMm, 3)} mm.` : `Adjacent source-sequence components are continuous within ${toleranceMm} mm.`,
        fromRefNo: left.refNo,
        toRefNo: right.refNo,
      });
    }
  }
  return rows;
}

function buildHelperRows(routeComponents, toleranceMm) {
  return routeComponents.filter((component) => component.helper && component.spanLengthMm !== null && component.spanLengthMm <= toleranceMm).map((component) => ({
    path: 'Path 1 - 5B component graph',
    category: 'HELPER',
    status: 'MINOR_GAP',
    branchName: component.branchName,
    fromNodeNumber: component.nodeNumbers[0] || '',
    toNodeNumber: component.nodeNumbers.slice(-1)[0] || '',
    nodeNumber: component.nodeNumbers[0] || '',
    componentType: component.normalizedType,
    componentRefNo: component.refNo,
    endpoint: '',
    lengthMm: round(component.spanLengthMm, 3),
    method: '5b-helper-span',
    reason: 'helper-minor-gap-continuous',
    message: `${component.normalizedType} span is <= ${toleranceMm} mm and is treated as continuity helper.`,
  }));
}

function connectedGroups(components, adjacency) {
  const componentById = new Map(components.map((component) => [component.id, component]));
  const seen = new Set();
  const groups = [];
  for (const component of components) {
    if (seen.has(component.id)) continue;
    const stack = [component.id];
    const group = [];
    seen.add(component.id);
    while (stack.length) {
      const id = stack.pop();
      const item = componentById.get(id);
      if (item) group.push(item);
      for (const next of adjacency.get(id) || []) {
        if (seen.has(next)) continue;
        seen.add(next);
        stack.push(next);
      }
    }
    groups.push(group.sort((a, b) => a.sequence - b.sequence));
  }
  return groups.sort((a, b) => b.length - a.length || (a[0]?.sequence || 0) - (b[0]?.sequence || 0));
}

function buildRouteOrphans(routeComponents, graph) {
  const rows = [];
  const byBranch = new Map();
  for (const component of routeComponents) {
    if (!byBranch.has(component.branchName)) byBranch.set(component.branchName, []);
    byBranch.get(component.branchName).push(component);
  }
  for (const [branchName, components] of byBranch.entries()) {
    if (components.length <= 1) continue;
    const branchIds = new Set(components.map((component) => component.id));
    const adjacency = new Map(components.map((component) => [component.id, new Set([...(graph.adjacency.get(component.id) || [])].filter((id) => branchIds.has(id)))]));
    const groups = connectedGroups(components, adjacency);
    const main = new Set((groups[0] || []).map((component) => component.id));
    for (const group of groups.slice(1)) {
      for (const component of group) {
        rows.push({
          path: 'Path 1 - 5B component graph',
          category: 'ORPHAN',
          status: 'ORPHAN',
          branchName,
          fromNodeNumber: '',
          toNodeNumber: component.nodeNumbers[0] || '',
          nodeNumber: component.nodeNumbers[0] || '',
          componentType: component.normalizedType,
          componentRefNo: component.refNo,
          endpoint: '',
          lengthMm: '',
          method: '5b-connected-component-orphan',
          reason: 'outside-largest-connected-group',
          message: `Route component ${component.refNo} is outside the largest connected topology group for ${branchName}.`,
          connectedGroupSize: group.length,
          mainGroupSize: main.size,
        });
      }
    }
  }
  return rows;
}

function nearestRouteDistance(point, routeComponents) {
  let best = null;
  for (const component of routeComponents) {
    let distanceMm = null;
    if (component.start && component.end) distanceMm = pointDistanceToSegment(point, component.start, component.end);
    else distanceMm = Math.min(dist(point, component.start) ?? Infinity, dist(point, component.end) ?? Infinity);
    if (distanceMm === null || !Number.isFinite(distanceMm)) continue;
    if (!best || distanceMm < best.distanceMm) best = { component, distanceMm };
  }
  return best;
}

function buildSupportOrphans(supportComponents, routeComponents, supportToleranceMm) {
  return supportComponents.map((support) => {
    const nearest = nearestRouteDistance(support.supportPoint, routeComponents);
    if (nearest && nearest.distanceMm <= supportToleranceMm) return null;
    return {
      path: 'Path 1 - 5B component graph',
      category: 'SUPPORT_ORPHAN',
      status: 'ORPHAN',
      branchName: support.branchName,
      fromNodeNumber: '',
      toNodeNumber: support.nodeNumbers[0] || '',
      nodeNumber: support.nodeNumbers[0] || '',
      componentType: support.normalizedType,
      componentRefNo: support.refNo,
      endpoint: '',
      lengthMm: nearest ? round(nearest.distanceMm, 3) : '',
      method: '5b-support-nearest-route-segment',
      reason: 'support-outside-route-tolerance',
      message: nearest ? `Support ${support.refNo} is ${round(nearest.distanceMm, 3)} mm from the nearest route segment.` : `Support ${support.refNo} has no route segment to attach to.`,
      nearestRefNo: nearest?.component?.refNo || '',
    };
  }).filter(Boolean);
}

function buildBranchOffRows(routeComponents, graph) {
  const componentById = new Map(routeComponents.map((component) => [component.id, component]));
  return graph.nodes.map((node) => {
    const components = node.componentIds.map((id) => componentById.get(id)).filter(Boolean).sort((a, b) => a.sequence - b.sequence || a.refNo.localeCompare(b.refNo));
    if (components.length <= 2) return null;
    return {
      path: 'Path 1 - 5B component graph',
      category: 'BRANCH_OFF',
      status: 'BRANCH_OFF',
      branchName: text(components[0]?.branchName),
      fromNodeNumber: '',
      toNodeNumber: '',
      nodeNumber: '',
      componentType: 'JUNCTION',
      componentRefNo: components.map((component) => component.refNo).join(' -> '),
      endpoint: '',
      lengthMm: '',
      method: '5b-graph-node-degree',
      reason: 'branch-off-junction',
      message: `Branch-off junction ${node.id} has ${components.length} incident route components in source sequence order.`,
      degree: components.length,
      position: pointText(node.point),
    };
  }).filter(Boolean);
}

function buildDeadEndRows(routeComponents, graph) {
  const componentById = new Map(routeComponents.map((component) => [component.id, component]));
  return graph.nodes.map((node) => {
    const components = node.componentIds.map((id) => componentById.get(id)).filter(Boolean);
    if (components.length !== 1) return null;
    const component = components[0];
    return {
      path: 'Path 1 - 5B component graph',
      category: 'DEAD_END',
      status: 'DEAD_END',
      branchName: component.branchName,
      fromNodeNumber: '',
      toNodeNumber: component.nodeNumbers[0] || '',
      nodeNumber: component.nodeNumbers[0] || '',
      componentType: component.normalizedType,
      componentRefNo: component.refNo,
      endpoint: '',
      lengthMm: '',
      method: '5b-graph-node-degree',
      reason: 'dead-end',
      message: `Endpoint ${node.id} has one incident route component and is a dead end.`,
      position: pointText(node.point),
    };
  }).filter(Boolean);
}

function normalizeOptions(options = {}) {
  const config = options.config && typeof options.config === 'object' ? options.config : {};
  const topo = config.topology && typeof config.topology === 'object' ? config.topology : {};
  return {
    continuityToleranceMm: finite(options.continuityToleranceMm ?? options.topologyContinuityToleranceMm ?? topo.continuityToleranceMm, DEFAULT_CONTINUITY_TOLERANCE_MM),
    supportToleranceMm: finite(options.supportToleranceMm ?? options.topologySupportToleranceMm ?? topo.supportToleranceMm, DEFAULT_SUPPORT_TOLERANCE_MM),
    sourceName: text(options.sourceName || options.inputName || 'enriched.xml'),
  };
}

export function buildXmlCii5bTopologyReport(xmlText, options = {}) {
  const cfg = normalizeOptions(options);
  const model = parseXmlToModel(xmlText, { sourceName: cfg.sourceName });
  const components = buildComponents(model);
  const routeComponents = components.filter((component) => !component.support);
  const supportComponents = components.filter((component) => component.support);
  const graph = buildGraph(routeComponents, cfg.continuityToleranceMm);
  const sequenceRows = buildSequenceRows(routeComponents, cfg.continuityToleranceMm);
  const minorHelperRows = buildHelperRows(routeComponents, cfg.continuityToleranceMm);
  const gapRows = sequenceRows.filter((row) => row.status === 'DISCONNECTED');
  const minorGapRows = [...sequenceRows.filter((row) => row.status === 'MINOR_GAP'), ...minorHelperRows];
  const routeOrphans = buildRouteOrphans(routeComponents, graph);
  const supportOrphans = buildSupportOrphans(supportComponents, routeComponents, cfg.supportToleranceMm);
  const branchOffOrder = buildBranchOffRows(routeComponents, graph);
  const deadEnds = buildDeadEndRows(routeComponents, graph);
  const rows = [...sequenceRows, ...minorHelperRows, ...routeOrphans, ...supportOrphans, ...branchOffOrder, ...deadEnds];
  const blockingRows = [...gapRows, ...routeOrphans, ...supportOrphans];

  const uxml = {
    schemaVersion: 'uxml-topology-v1',
    profile: 'UXML-TOPOLOGY-FULL',
    source: cfg.sourceName,
    components: components.map((component) => ({
      id: component.id,
      refNo: component.refNo,
      type: component.type,
      normalizedType: component.normalizedType,
      branchName: component.branchName,
      sequence: component.sequence,
      nodeNumbers: component.nodeNumbers,
      start: component.start,
      end: component.end,
      supportPoint: component.supportPoint,
    })),
    ports: graph.ports.map((port, index) => ({ id: `prt:${String(index + 1).padStart(5, '0')}`, componentId: port.componentId, role: port.role, point: clonePoint(port.point), refNo: port.refNo })),
  };

  const summary = {
    sourceKind: 'xml-cii-enriched-inputxml',
    sourceName: cfg.sourceName,
    continuityToleranceMm: cfg.continuityToleranceMm,
    supportToleranceMm: cfg.supportToleranceMm,
    pipelineCount: model.branches.length,
    componentCount: components.length,
    routeComponentCount: routeComponents.length,
    supportComponentCount: supportComponents.length,
    graphNodeCount: graph.nodes.length,
    graphEdgeCount: graph.edges.length,
    sequenceLinkCount: sequenceRows.length,
    gapCount: gapRows.length,
    minorGapCount: minorGapRows.length,
    routeOrphanCount: routeOrphans.length,
    supportOrphanCount: supportOrphans.length,
    branchOffCount: branchOffOrder.length,
    deadEndCount: deadEnds.length,
    blockingIssueCount: blockingRows.length,
  };

  return {
    schema: REPORT_SCHEMA,
    ok: blockingRows.length === 0,
    summary,
    uxml,
    graph: { nodes: graph.nodes, edges: graph.edges },
    rows,
    sequenceRows,
    gapRows,
    minorGapRows,
    orphans: [...routeOrphans, ...supportOrphans],
    routeOrphans,
    supportOrphans,
    branchOffOrder,
    deadEnds,
    diagnostics: [{
      type: 'xml-cii-5b-topology-summary',
      source: REPORT_SCHEMA,
      ...summary,
      message: `5B topology completed: ${summary.blockingIssueCount} blocking issue(s), ${summary.minorGapCount} minor gap/helper row(s), ${summary.branchOffCount} branch-off row(s), ${summary.deadEndCount} dead-end row(s).`,
    }],
  };
}

export function topologyReportToCsv(report = {}) {
  const columns = ['category', 'status', 'branchName', 'componentRefNo', 'fromRefNo', 'toRefNo', 'fromNodeNumber', 'toNodeNumber', 'lengthMm', 'reason', 'message'];
  const rows = Array.isArray(report.rows) ? report.rows : [];
  const escape = (value) => {
    const raw = text(value);
    return /[",\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
  };
  return `${columns.join(',')}\n${rows.map((row) => columns.map((column) => escape(row?.[column])).join(',')).join('\n')}\n`;
}
