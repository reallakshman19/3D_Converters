/**
 * LFJ V4 R02 / C1_OWNER: exact-occurrence ancestor ownership projection.
 *
 * Input is a bounded set of already decoded, source-bound occurrence facts;
 * R03/R04/R05 supply byte custody, tokenizer and occurrence path attestation.
 * A child's own attributes never flow upward. No name-based identity or
 * attempt to reinterpret GC-PW sourceId, CII weight or geometry is permitted.
 */

export const SOURCE_OWNER_SCHEMA = 'lfj-owner-truth/v1';

export class SourceOwnerError extends TypeError {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.code = code;
    this.name = 'SourceOwnerError';
  }
}

function fail(code, detail) { throw new SourceOwnerError(code, detail); }
const owned = (record, key) => Object.hasOwn(record, key);
function stringId(value, what) {
  if (typeof value !== 'string' || !value.trim()) fail('INVALID_OCCURRENCE', what + ' must be a non-empty string');
  return value;
}

function ownAttributes(record) {
  const a = owned(record, 'attributes') ? record.attributes : {};
  if (!a || typeof a !== 'object' || Array.isArray(a)) fail('INVALID_OWNER', 'own attributes must be an object');
  return a;
}

function readOwnName(record, key) {
  if (!owned(record, key)) return null;
  const value = record[key];
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') fail('INVALID_OWNER', key + ' must contain a string');
  return value.trim() || null;
}

function ownValue(attributes, keys, field) {
  let result = null;
  for (const key of keys) {
    const v = readOwnName(attributes, key);
    if (v === null) continue;
    if (result !== null && result !== v) fail('OWNER_CONFLICT', field + ' has inconsistent own aliases');
    result = v;
  }
  return result;
}

function ownTypedContainer(record, kind, explicit, value) {
  if (kind !== 'SITE' && kind !== 'ZONE') return explicit;
  if (kind === 'SITE' && value.key !== 'site') return explicit;
  if (kind === 'ZONE' && value.key !== 'zone') return explicit;
  const name = readOwnName(record, 'name');
  if (explicit !== null && name !== null && explicit !== name) {
    fail('OWNER_CONFLICT', kind + ' name and own attribute disagree');
  }
  return explicit ?? name;
}

/**
 * Resolve local/inherited Site + Zone once per unique (sourceId, occurrenceId).
 * Records may appear before their parents; returned order mirrors input order.
 * No mutation and no data source reads take place.
 *
 * @param {Array<{sourceId:string, occurrenceId:string, parentOccurrenceId:string|null,
 *   type:string, name:string, attributes:object}>} occurrences
 * @returns {Array<{schema:string, sourceId:string, occurrenceId:string,
 *   parentOccurrenceId:string|null, type:string, name:string,
 *   ownerSite:string|null, ownerZone:string|null, branchOwner:string|null}>}
 */
export function resolveOccurrenceOwnership(occurrences) {
  if (!Array.isArray(occurrences)) fail('INVALID_OCCURRENCE', 'expected bounded source occurrence array');
  const bySource = new Map();
  for (const record of occurrences) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      fail('INVALID_OCCURRENCE', 'each source occurrence must be a record');
    }
    const sourceId = stringId(record.sourceId, 'sourceId');
    const occurrenceId = stringId(record.occurrenceId, 'occurrenceId');
    const source = bySource.get(sourceId) ?? new Map();
    if (source.has(occurrenceId)) fail('DUPLICATE_OCCURRENCE', 'duplicate source occurrence identity');
    source.set(occurrenceId, record);
    bySource.set(sourceId, source);
  }

  const resultByRecord = new Map();
  const visiting = new Set();
  function resolve(record) {
    if (resultByRecord.has(record)) return resultByRecord.get(record);
    if (visiting.has(record)) fail('ANCESTRY_CYCLE', 'source occurrences contain an ancestry cycle');
    visiting.add(record);

    const attrs = ownAttributes(record);
    const sourceId = record.sourceId;
    const parentId = record.parentOccurrenceId ?? null;
    let parent = null;
    if (parentId !== null) {
      stringId(parentId, 'parentOccurrenceId');
      const source = bySource.get(sourceId);
      const found = source?.get(parentId);
      if (!found) fail('PARENT_NOT_FOUND', 'parent must be present in the same source identity');
      parent = resolve(found);
    }

    const kind = readOwnName(record, 'type')?.toUpperCase() ?? '';
    const ownSite = ownTypedContainer(record, kind,
      ownValue(attrs, ['OWNER_SITE', 'SITE_ID'], 'ownerSite'), { key: 'site' });
    const ownZone = ownTypedContainer(record, kind,
      ownValue(attrs, ['OWNER_ZONE', 'ZONE_ID'], 'ownerZone'), { key: 'zone' });
    const inheritedSite = parent?.ownerSite ?? null;
    const inheritedZone = parent?.ownerZone ?? null;
    const ownerSite = ownSite ?? inheritedSite;
    let ownerZone = kind === 'SITE' ? null : inheritedZone;
    if (ownSite !== null && inheritedSite !== null && ownSite !== inheritedSite) ownerZone = null;
    if (ownZone !== null) ownerZone = ownZone;

    const projection = Object.freeze({
      schema: SOURCE_OWNER_SCHEMA,
      sourceId,
      occurrenceId: record.occurrenceId,
      parentOccurrenceId: parentId,
      type: kind,
      name: readOwnName(record, 'name') ?? '',
      ownerSite,
      ownerZone,
      branchOwner: ownValue(attrs, ['OWNER'], 'branchOwner'),
    });
    resultByRecord.set(record, projection);
    visiting.delete(record);
    return projection;
  }

  return Object.freeze(occurrences.map(resolve));
}
