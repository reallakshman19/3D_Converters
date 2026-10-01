import { bindMasterWorkerImportEvents } from './xml-cii-adapted-master-worker-events.js?v=20261001-weight-output-1';
import { bindMasterMappingEvents } from './xml-cii-adapted-master-mapping-events.js?v=20261001-weight-output-1';

export {
  autoMapStandaloneMasterFields,
  clearMasterContextFromUi,
  importMasterRows,
  loadImportMastersFromUi,
  mapRowsWithFieldMap,
  updateMasterFieldMap,
} from './xml-cii-adapted-master-mapping-events.js?v=20261001-weight-output-1';

export function bindImportMastersEvents(container, stateRef, render) {
  bindMasterWorkerImportEvents(container, stateRef, render);
  bindMasterMappingEvents(container, stateRef, render);
}
