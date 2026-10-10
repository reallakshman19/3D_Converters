/**
 * Resolve asynchronous UI operations against a stable state owner.
 * The returned predicate expires immediately when another operation of
 * the same kind begins, even if both use the same source/config revision.
 * View rendering may rebind DOM listeners; stateRef is the stable owner.
 */
const active = new WeakMap();

export function beginLatestOperation(owner, kind) {
  if (!owner || typeof owner !== 'object' || typeof kind !== 'string' || !kind)
    throw new TypeError('A state owner and operation kind are required');
  let operations = active.get(owner);
  if (!operations) {
    operations = new Map();
    active.set(owner, operations);
  }
  const ticket = {};
  operations.set(kind, ticket);
  return () => operations.get(kind) === ticket;
}
