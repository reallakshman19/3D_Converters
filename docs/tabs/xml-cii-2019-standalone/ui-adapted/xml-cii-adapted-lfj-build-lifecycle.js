/**
 * Product UI cancellation ownership for the current indexed Build.
 * StateRef identity survives render/rebind. Only the current controller may
 * release its slot; replacing/cancelling aborts the previous native Worker.
 */
const controllers = new WeakMap();
function assertOwner(owner){
  if(!owner || typeof owner!=='object')
    throw new TypeError('Indexed Build requires a stable UI owner');
}
export function beginIndexedBuild(owner){
  assertOwner(owner);
  cancelIndexedBuild(owner);
  const controller = new AbortController();
  controllers.set(owner,controller);
  return controller;
}
export function cancelIndexedBuild(owner){
  assertOwner(owner);
  const controller = controllers.get(owner);
  if(!controller) return false;
  controllers.delete(owner);
  controller.abort();
  return true;
}
export function releaseIndexedBuild(owner,controller){
  assertOwner(owner);
  if(controllers.get(owner)!==controller)return false;
  controllers.delete(owner);
  return true;
}
export function isIndexedBuildCurrent(owner,controller){
  return controllers.get(owner)===controller && !controller.signal.aborted;
}
