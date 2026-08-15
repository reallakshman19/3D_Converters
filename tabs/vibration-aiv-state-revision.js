export function currentAivInputRevision(state) {
  const value = Number(state?.inputRevision);
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export function touchAivInputRevision(state) {
  if (!state || typeof state !== 'object') throw new TypeError('AIV input revision requires mutable workspace state.');
  state.inputRevision = currentAivInputRevision(state) + 1;
  return state.inputRevision;
}

export function isAivInputRevisionCurrent(state, revision) {
  return currentAivInputRevision(state) === revision;
}
