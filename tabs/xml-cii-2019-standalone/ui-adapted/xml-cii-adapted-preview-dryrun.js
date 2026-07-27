export * from './xml-cii-adapted-preview-dryrun-core.js';

import { xmlCiiDryRunPreview as buildCorePreview } from './xml-cii-adapted-preview-dryrun-core.js';
import { applyPreviewBoreWallAuthority } from './xml-cii-adapted-preview-bore-wall-authority.js';
import { applyPreviewRatingAuthority } from './xml-cii-adapted-preview-rating-authority.js';

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  import('../../xml-cii-effective-class-shard-hydrator.js')
    .then(({ installXmlCiiEffectiveClassShardHydrator }) => installXmlCiiEffectiveClassShardHydrator())
    .catch((error) => console.error('Failed to install XML→CII effective-class shard hydrator:', error));
}

// Preview v6 rows did not contain the effective rating authority fields. Purge
// that cache at module load so an upgraded deployment cannot reuse blank/stale
// Rating rows without invoking the new resolver.
try {
  if (typeof localStorage !== 'undefined') localStorage.removeItem('xml-cii-pv-cache-v6');
} catch {}

export function xmlCiiDryRunPreview(xmlText, config, stagedJsonText) {
  const coreResult = buildCorePreview(xmlText, config, stagedJsonText);
  const wallResult = applyPreviewBoreWallAuthority({
    xmlText,
    config,
    stagedJsonText,
    result: coreResult,
  });
  return applyPreviewRatingAuthority({
    xmlText,
    config,
    stagedJsonText,
    result: wallResult,
  });
}
