/**
 * Browser-safe public surface for canonical topology production and editing.
 * The release bundle is built from this entry so XML_Compare_Utilities can pin
 * one self-contained artifact without importing a sibling checkout at runtime.
 */

export {
  buildComponentTopologyArtifacts,
  buildEditedComponentTopologyArtifacts,
  topologyArtifactOutputs,
} from './topology-artifact-exporter.js';

export {
  TOPOLOGY_EDIT_COMMAND_TYPES,
  appendTopologyEditCommand,
  createTopologyEditDraft,
  materializeTopologyEditDraft,
  redoTopologyEditCommand,
  undoTopologyEditCommand,
  validateEditedTopology,
} from './topology-edit-engine.js';

export {
  TOPOLOGY_GEOMETRY_ISSUE_STYLES,
  validateTopologyGeometry,
} from './topology-geometry-diagnostics.js';

export const TOPOLOGY_BROWSER_CORE_CONTRACT = Object.freeze({
  schema: 'TopologyBrowserCore.v1',
  canonicalSchema: 'CanonicalTopology.v1',
  draftSchema: 'TopologyEditDraft.v1',
  commandSchema: 'TopologyEditCommand.v1',
  editLedgerSchema: 'TopologyEditLedger.v1',
  geometryDiagnosticsSchema: 'TopologyGeometryDiagnostics.v1',
});
