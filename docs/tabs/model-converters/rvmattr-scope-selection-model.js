function cleanId(value) {
  return String(value ?? '').trim();
}

function targetSet(selection) {
  return selection instanceof Set ? selection : new Set();
}

export function applyRvmScopeSelection(selection, ids, checked) {
  const target = targetSet(selection);
  for (const value of Array.isArray(ids) ? ids : [ids]) {
    const id = cleanId(value);
    if (!id) continue;
    if (checked) target.add(id);
    else target.delete(id);
  }
  return target;
}

export function mergeRvmScopeRenderedSelection(selection, renderedStates = []) {
  const target = targetSet(selection);
  for (const state of renderedStates || []) {
    const id = cleanId(state?.id);
    if (!id) continue;
    if (state.checked) target.add(id);
    else target.delete(id);
  }
  return target;
}

export function selectedRvmScopeIds(selection) {
  return Object.freeze([...(selection instanceof Set ? selection : [])]);
}
