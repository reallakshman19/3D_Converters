// Ported from 3D_Converters v045/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-dryrun.js (xmlCiiDryRunPreview,
// buildStrictLineAuthorityCorePreview, blockedUnmappedRow): today's standalone dry-run preview, the one today's process parity
// reads after the DTXR step: core rows, then a branch whose line-list row was only a similar (automatic) match is rebuilt
// without the line list, then the bore/wall, material and rating layers on the unmodified XML. No DOM, no browser cache keys,
// no timing marks. Today's default material rows arrive as rows (`defaultMaterialMapRows`).
import { elementsByName, parsePlainXml, serializePlainXml } from '../supports/PlainDom.js';
import { buildStagedDtxrIndex } from '../supports/dtxr/ResolverCore.js';
import { adaptedCorePreview } from './AdaptedPreviewCore.js';
import { applyPreviewBoreWallAuthority, applyPreviewMaterialCodeAuthority, applyPreviewRatingAuthority } from './AdaptedPreviewAuthorities.js';

const AUTOMATIC_LINE_MATCH_METHODS = new Set(['similar-lineseq', 'similar-linekey']);
const text = (value) => (value === undefined || value === null ? '' : String(value).trim());

function blockedUnmappedRow(row) {
  return { ...row, lineKeyMethod: 'none', lineKeyConfidence: 0, lineKeyProposed: '', lineMiss: true, pipingClass: '', pipingClassDerived: '',
    material: '', materialSource: 'none', materialCode: '', rating: '', ratingDerived: '', ratingSource: 'none',
    p1: '', hydroPressure: '0', t1: '', t2: '', t3: '', density: '', p1Source: 'none', hydroPressureSource: 'default-zero', t1Source: 'none', t2Source: 'none',
    t3Source: 'none', densitySource: 'none', insThk: '', insThkSource: 'none', wallThickness: '', wallThicknessSource: 'none', corrosion: '',
    automaticLineMatchRemoved: true, strictLineAuthorityBlocked: true };
}
/** One branch alone, as today's `<Root>branch</Root>` fragment. */
const branchFragment = (branch) => serializePlainXml({ root: { __el: 'Root', attrs: {}, kids: [branch] } });

function strictLineAuthorityPreview(xmlText, sourceRoot, config, stagedJsonText, stagedIndex) {
  const core = adaptedCorePreview(xmlText, config, stagedJsonText, { stagedIndex });
  const branchRows = core.branchRows.map((row) => ({ ...row }));
  let nodeRows = core.nodeRows.map((row) => ({ ...row }));
  const automatic = branchRows.map((row, i) => (AUTOMATIC_LINE_MATCH_METHODS.has(text(row?.lineKeyMethod).toLowerCase()) ? i : -1)).filter((i) => i >= 0);
  if (!automatic.length) return { branchRows, nodeRows };
  const branches = elementsByName(sourceRoot, 'Branch');
  const strictConfig = { ...config, linelist: { ...(config?.linelist || {}), masterRows: [] } };
  for (const index of automatic) {
    const original = branchRows[index];
    const rebuilt = branches[index] ? adaptedCorePreview(branchFragment(branches[index]), strictConfig, stagedJsonText) : { branchRows: [], nodeRows: [] };
    const replacement = rebuilt.branchRows[0] || null;
    branchRows[index] = replacement
      ? { ...replacement, lineKeyMethod: 'none', lineKeyConfidence: 0, lineKeyProposed: '', lineMiss: true, automaticLineMatchRemoved: true, strictLineAuthorityBlocked: false }
      : blockedUnmappedRow(original);
    const branchName = text(original?.branchName);
    if (branchName) nodeRows = nodeRows.filter((row) => text(row?.branchName) !== branchName);
    nodeRows.push(...rebuilt.nodeRows);
  }
  return { branchRows, nodeRows };
}

/**
 * Today's standalone preview of `xmlText` (the XML after the DTXR step) with the raw job config.
 * Returns { branchRows, nodeRows }; unparsable XML gives empty rows.
 */
export function adaptedDryRunPreview(xmlText, config, stagedJsonText = '', { defaultMaterialMapRows = [] } = {}) {
  let root;
  try { root = parsePlainXml(text(xmlText) ? String(xmlText) : '').root; } catch { return { branchRows: [], nodeRows: [] }; }
  const stagedIndex = buildStagedDtxrIndex(stagedJsonText || '', config);
  const core = strictLineAuthorityPreview(xmlText, root, config, stagedJsonText, stagedIndex);
  const wall = applyPreviewBoreWallAuthority({ root, stagedJsonText, config, result: core });
  const material = applyPreviewMaterialCodeAuthority({ config, result: wall, defaultMaterialMapRows });
  return applyPreviewRatingAuthority({ root, config, stagedIndex, result: material });
}
