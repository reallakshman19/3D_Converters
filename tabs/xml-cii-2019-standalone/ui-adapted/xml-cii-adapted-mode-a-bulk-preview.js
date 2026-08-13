export function modeAPreviewFillRule(field) {
  const line = new Set(['p1', 't1', 't2', 't3', 'density']);
  const byClass = new Set(['hydroPressure', 'material', 'rating', 'corrosion']);
  const byClassSize = new Set(['materialCode', 'wallThickness']);
  if (line.has(field)) return { field, scope: 'line', label: 'Same Line Key' };
  if (byClass.has(field)) return { field, scope: 'class', label: 'Same Piping Class' };
  if (byClassSize.has(field)) return { field, scope: 'class-size', label: 'Same Piping Class + Size' };
  return null;
}
