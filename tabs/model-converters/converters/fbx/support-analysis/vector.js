export function add(a, b) { return a.map((value, index) => value + b[index]); }
export function subtract(a, b) { return a.map((value, index) => value - b[index]); }
export function scale(value, factor) { return value.map((item) => item * factor); }
export function dot(a, b) { return a.reduce((sum, value, index) => sum + value * b[index], 0); }
export function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
export function magnitude(value) { return Math.hypot(...value); }
export function distance(a, b) { return magnitude(subtract(a, b)); }
export function normalize(value) {
  const length = magnitude(value);
  return Number.isFinite(length) && length > 0 ? scale(value, 1 / length) : null;
}
export function canonicalDirection(value) {
  const unit = normalize(value);
  if (!unit) return null;
  const sign = unit.find((item) => Math.abs(item) > 1e-12);
  return sign < 0 ? scale(unit, -1) : unit;
}
export function triangleNormal(points) {
  return normalize(cross(subtract(points[1], points[0]), subtract(points[2], points[0])));
}
export function squaredDistance(a, b) {
  return a.reduce((sum, value, index) => sum + (value - b[index]) ** 2, 0);
}
