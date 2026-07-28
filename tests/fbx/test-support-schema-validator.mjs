import assert from 'node:assert/strict';

function resolve(root, ref) {
  assert.ok(ref.startsWith('#/'), `Unsupported ref ${ref}`);
  return ref.slice(2).split('/').reduce((value, key) => value[key], root);
}

function matchesType(value, type) {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  return typeof value === type;
}

export function validateSchema(schema, value, root = schema, path = '$') {
  if (schema.$ref) return validateSchema(resolve(root, schema.$ref), value, root, path);
  if (schema.const !== undefined) assert.deepEqual(value, schema.const, `${path} const`);
  if (schema.enum) assert.ok(schema.enum.some((item) => Object.is(item, value)), `${path} enum`);
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    assert.ok(types.some((type) => matchesType(value, type)), `${path} type`);
  }
  if (typeof value === 'string') {
    if (schema.minLength !== undefined) assert.ok(value.length >= schema.minLength, `${path} minLength`);
    if (schema.pattern) assert.match(value, new RegExp(schema.pattern), `${path} pattern`);
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined) assert.ok(value >= schema.minimum, `${path} minimum`);
    if (schema.exclusiveMinimum !== undefined) assert.ok(value > schema.exclusiveMinimum, `${path} exclusiveMinimum`);
    if (schema.maximum !== undefined) assert.ok(value <= schema.maximum, `${path} maximum`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined) assert.ok(value.length >= schema.minItems, `${path} minItems`);
    if (schema.maxItems !== undefined) assert.ok(value.length <= schema.maxItems, `${path} maxItems`);
    if (schema.uniqueItems) assert.equal(new Set(value.map((item) => JSON.stringify(item))).size,
      value.length, `${path} uniqueItems`);
    if (schema.items) value.forEach((item, index) => validateSchema(schema.items, item, root, `${path}[${index}]`));
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required || []) assert.ok(Object.hasOwn(value, key), `${path}.${key} required`);
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) assert.ok(Object.hasOwn(schema.properties || {}, key),
        `${path}.${key} additional property`);
    }
    for (const [key, child] of Object.entries(schema.properties || {})) {
      if (Object.hasOwn(value, key)) validateSchema(child, value[key], root, `${path}.${key}`);
    }
  }
  return true;
}
