/**
 * Functionality: translates Preview resolver/fill-down sources into explicit
 * provenance and visible badge metadata.
 * Parameters: override metadata, field/key, and resolved source.
 * Output: pure provenance strings/display records; no UI or config mutation.
 */

export function previewOverrideProvenance(overrides, bucket, key, resolvedSource) {
  if (resolvedSource !== 'override') return resolvedSource;
  const fillState = overrides?.__previewFillDown?.[bucket]?.[key]?.fillState;
  if (fillState === 'manual') return 'manual-override';
  if (fillState === 'auto') return 'auto-fill';
  return 'saved-override';
}

export function previewProvenanceBadge(field, source, detail = '') {
  const withDetail = (badge, replace = false) => detail ? { ...badge, title: replace ? detail : `${badge.title}\n\n${detail}` } : badge;
  if (source === 'manual-override' || source === 'override') return { label: '✓ override', className: 'exact', title: 'Manually overridden value by user in Preview table.' };
  if (source === 'auto-fill') return { label: 'auto-fill', className: 'exact', title: 'Automatically propagated down by Smart Fill / Fill-down button.' };
  if (source === 'saved-override') return { label: 'saved', className: 'exact', title: 'Saved override value loaded from existing configuration file.' };
  if (source === 'line-list' && field === 'rating') return { label: 'line list', className: 'exact', title: 'Rating resolved explicitly from matched Line List master row.' };
  if (source === 'piping-class-master' && field === 'rating') return { label: 'class', className: 'exact', title: 'Rating resolved directly from Piping Class master data table.' };
  if (source === 'piping-class-prefix' && field === 'rating') return { label: 'prefix', className: 'amber', title: 'Rating matched via configured piping-class prefix rule.' };
  if (source === 'dtxr-rating' && field === 'rating') return { label: 'DTXR', className: 'exact', title: 'Rating extracted from unambiguous 3D model DTXR annotations.' };
  if (source === 'dtxr-rating-conflict' && field === 'rating') return withDetail({ label: 'DTXR conflict', className: 'bad', title: 'DTXR rating evidence conflicts with master rating or has multiple conflicting values in 3D model. Click to override.' }, true);
  if (source === 'piping-class-master' && (field === 'wallThickness' || field === 'corrosion')) return { label: 'derived', className: 'exact', title: `Derived from Piping Class master specification for this bore; click to override.` };
  if (source === 'dtxr-sch-applied') return { label: '✓ DTXR Sch', className: 'exact', title: 'Wall thickness applied from 3D model DTXR schedule annotation.' };
  if (source === 'default' || source === 'config-default' || source === 'default-zero') return { label: 'default', className: 'bad', title: 'Fallback default value applied from conversion settings.' };
  return null;
}
