import { toFiniteNumber } from './ResolverPrimitives.js';

export function xmlCiiDtxrPositionOffset(config) {
  const option = config?.dtxrPositionOffset || {};
  return { enabled: option.enabled === true, xOffset: toFiniteNumber(option.xOffset, 0), yOffset: toFiniteNumber(option.yOffset, 0), zOffset: toFiniteNumber(option.zOffset, 0), tolerance: Math.max(toFiniteNumber(option.tolerance, 0.5), 0) };
}

export function xmlCiiApplyDtxrPositionOffset(point, config) {
  if (!point) return null;
  const option = xmlCiiDtxrPositionOffset(config);
  if (!option.enabled) return point;
  return { x: point.x + option.xOffset, y: point.y + option.yOffset, z: point.z + option.zOffset };
}

export function pointWithOffset(point, offset) {
  if (!point || !offset) return null;
  return { x: point.x + offset.x, y: point.y + offset.y, z: point.z + offset.z };
}

export function xmlCiiPositionsMatch(left, right, tolerance) {
  if (!left || !right) return false;
  return Math.abs(left.x - right.x) <= tolerance && Math.abs(left.y - right.y) <= tolerance && Math.abs(left.z - right.z) <= tolerance;
}

