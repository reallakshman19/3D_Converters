import { buildXmlCii5bTopologyReport } from './xml-cii-5b-topology-validator.js';

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function compatibilityRow(row = {}) {
  const status = row.status === 'GAP' ? 'DISCONNECTED' : row.status;
  return {
    path: row.path || 'Path 1 - 5B component graph',
    status,
    branchName: row.branchName || '',
    fromNodeNumber: row.fromNodeNumber || '',
    toNodeNumber: row.toNodeNumber || row.nodeNumber || '',
    nodeNumber: row.nodeNumber || row.toNodeNumber || '',
    nodeName: row.nodeName || '',
    componentType: row.componentType || '',
    componentRefNo: row.componentRefNo || row.refNo || '',
    endpoint: row.endpoint || '',
    lengthMm: row.lengthMm ?? '',
    method: row.method || '',
    reason: row.reason || row.category || '',
    message: row.message || '',
    category: row.category || '',
    fromRefNo: row.fromRefNo || '',
    toRefNo: row.toRefNo || '',
    distanceMm: row.distanceMm ?? row.lengthMm ?? '',
    toleranceMm: row.toleranceMm ?? '',
    degree: row.degree ?? '',
    position: row.position || '',
    nearestRefNo: row.nearestRefNo || '',
  };
}

function isBlockingRow(row = {}) {
  if (row.status === 'ORPHAN') return true;
  if (row.status === 'DISCONNECTED') return true;
  if (row.category === 'SEQUENCE' && row.status === 'DISCONNECTED') return true;
  if (row.category === 'SUPPORT_ORPHAN') return true;
  return false;
}

export function buildXmlCiiTopologyDisconnectAudit(xmlText, options = {}) {
  const report = buildXmlCii5bTopologyReport(xmlText, options);
  const rows = (Array.isArray(report.rows) ? report.rows : []).map(compatibilityRow);
  const disconnectedRows = rows.filter(isBlockingRow);
  const summary = report.summary || {};
  const stats = {
    topologyAuditRows: rows.length,
    topologyAuditPath1Rows: rows.length,
    topologyAuditPath2Rows: 0,
    topologyDisconnectedRows: disconnectedRows.length,
    topologyOrphanRows: rows.filter((row) => row.status === 'ORPHAN').length,
    topology5bGapRows: Number(summary.gapCount || 0),
    topology5bMinorGapRows: Number(summary.minorGapCount || 0),
    topology5bRouteOrphans: Number(summary.routeOrphanCount || 0),
    topology5bSupportOrphans: Number(summary.supportOrphanCount || 0),
    topology5bBranchOffRows: Number(summary.branchOffCount || 0),
    topology5bDeadEndRows: Number(summary.deadEndCount || 0),
    topology5bBlockingIssueCount: Number(summary.blockingIssueCount || disconnectedRows.length),
    topology5bComponentCount: Number(summary.componentCount || 0),
    topology5bGraphNodeCount: Number(summary.graphNodeCount || 0),
    topology5bGraphEdgeCount: Number(summary.graphEdgeCount || 0),
  };
  const diagnostics = [{
    type: 'xml-cii-topology-disconnect-summary',
    source: 'xml-cii-5b-topology-validation/v1',
    rows: rows.length,
    disconnectedRows: stats.topologyDisconnectedRows,
    orphanRows: stats.topologyOrphanRows,
    path1Rows: stats.topologyAuditPath1Rows,
    path2Rows: stats.topologyAuditPath2Rows,
    message: `5B topology audit completed: ${stats.topologyDisconnectedRows} blocking disconnected/orphan row(s), ${stats.topology5bMinorGapRows} minor gap/helper row(s), ${stats.topology5bBranchOffRows} branch-off row(s), ${stats.topology5bDeadEndRows} dead-end row(s).`,
  }, ...(Array.isArray(report.diagnostics) ? report.diagnostics : [])];

  return {
    schema: 'xml-cii-topology-disconnect-audit/v2-5b-graph',
    ok: true,
    generatedAt: new Date().toISOString(),
    rows,
    disconnectedRows,
    stats,
    diagnostics,
    paths: {
      uxmlTopology: report,
      inputXmlContinuity: { replacedBy: '5B component graph topology validator' },
    },
    report5b: report,
  };
}

export function topologyAuditSummaryText(audit = {}) {
  const stats = audit.stats || {};
  return text(`5B topology: ${stats.topologyDisconnectedRows || 0} blocking, ${stats.topology5bMinorGapRows || 0} minor gaps, ${stats.topology5bBranchOffRows || 0} branch-offs, ${stats.topology5bDeadEndRows || 0} dead ends.`);
}
