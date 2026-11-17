// Today's process parity step between the DTXR step and the ATTA closure (3D_Converters v045
// tabs/xml-cii-2019-standalone/xml-cii-standalone-run-parity.js enrichStandaloneXmlForRun, lines 260-310), in today's order:
//   snapshots of the source XML (transfer protection, source walls) -> standalone preview process parity ->
//   bore from the node OD -> source walls back -> transferred values back.
// Today journals the result as 'process-parity'; the ATTA closure then reads it.
import { applyStandaloneProcessParity } from './StandaloneProcessParity.js';
import {
  restoreSourceWalls, restoreTransferProtection, snapshotSourceWalls, snapshotTransferProtection, synchronizeXmlCiiNodeBoreWithOutsideDiameter,
} from './ProcessParityFinish.js';

/**
 * @param {{xmlText: string, sourceXmlText: string, supportConfig: object, stagedJsonText?: string,
 *          defaultMaterialMapRows?: object[], diagnostics?: object[], stats?: object}} input
 *   xmlText: the XML after the DTXR step; sourceXmlText: the XML the stage received (today's job source);
 *   supportConfig: the raw job config (today parses the job's JSON afresh; a copy is used, since the weight ranker fills defaults in it);
 *   defaultMaterialMapRows: today's default material map rows (used when the job config has none).
 * @returns {{xmlText: string, branchRows: object[], nodeRows: object[], nodeWallBySize: object[], snapshots: Record<string,string>}}
 *   snapshots: the XML after the preview process parity (process), bore from OD (boreFromOd) and source walls (sourceWall).
 */
export function runProcessParityStep({ xmlText, sourceXmlText, supportConfig = {}, stagedJsonText = '', defaultMaterialMapRows = [], diagnostics = [], stats = {} }) {
  const config = JSON.parse(JSON.stringify(supportConfig || {}));
  const protection = snapshotTransferProtection(sourceXmlText);
  const sourceWalls = snapshotSourceWalls(sourceXmlText);
  const processed = applyStandaloneProcessParity(xmlText, config, stagedJsonText, diagnostics, { defaultMaterialMapRows });
  const bore = synchronizeXmlCiiNodeBoreWithOutsideDiameter(processed.xmlText);
  const walls = restoreSourceWalls(bore.xmlText, sourceWalls);
  const kept = restoreTransferProtection(walls.xmlText, protection);
  Object.assign(stats, bore.stats, { transferProtected: kept.restored, sourceWallsKept: walls.kept.length, processParityFields: processed.appliedFields });
  diagnostics.push(...bore.diagnostics, ...walls.diagnostics, ...kept.diagnostics);
  return { xmlText: kept.xmlText, branchRows: processed.branchRows, nodeRows: processed.nodeRows, nodeWallBySize: processed.nodeWallBySize,
    snapshots: { process: processed.xmlText, boreFromOd: bore.xmlText, sourceWall: walls.xmlText } };
}
