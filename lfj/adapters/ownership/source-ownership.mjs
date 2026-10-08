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
  function resolve(startRecord) {
    if (resultByRecord.has(startRecord)) return resultByRecord.get(startRecord);

    // Follow ancestry as an explicit chain. Deep, valid, leaf-first source
    // sequences must not depend on the JavaScript call-stack limit.
    const lineage = [];
    const seen = new Set();
    let record = startRecord;
    while (record && !resultByRecord.has(record)) {
      if (seen.has(record)) fail('ANCESTRY_CYCLE', 'source occurrences contain an ancestry cycle');
      seen.add(record);
      lineage.push(record);
      const parentId = record.parentOccurrenceId ?? null;
      if (parentId === null) break;
      stringId(parentId, 'parentOccurrenceId');
      const parent = bySource.get(record.sourceId)?.get(parentId);
      if (!parent) fail('PARENT_NOT_FOUND', 'parent must be present in the same source identity');
      record = parent;
    }

    // Materialize from oldest known ancestor toward original occurrence.
    // Each source record enters resultByRecord once: total work O(records).
    for (let index = lineage.length - 1; index >= 0; index -= 1) {
      const current = lineage[index];
      const attrs = ownAttributes(current);
      const sourceId = current.sourceId;
      const parentId = current.parentOccurrenceId ?? null;
      const parentRecord = parentId === null ? null : bySource.get(sourceId)?.get(parentId);
      const parent = parentRecord ? resultByRecord.get(parentRecord) : null;
      const kind = readOwnName(current, 'type')?.toUpperCase() ?? '';
      const ownSite = ownTypedContainer(current, kind,
        ownValue(attrs, ['OWNER_SITE', 'SITE_ID'], 'ownerSite'), { key: 'site' });
      const ownZone = ownTypedContainer(current, kind,
        ownValue(attrs, ['OWNER_ZONE', 'ZONE_ID'], 'ownerZone'), { key: 'zone' });
      const inheritedSite = parent?.ownerSite ?? null;
      const inheritedZone = parent?.ownerZone ?? null;
      const ownerSite = ownSite ?? inheritedSite;
      let ownerZone = kind === 'SITE' ? null : inheritedZone;
      if (ownSite !== null && inheritedSite !== null && ownSite !== inheritedSite) ownerZone = null;
      if (ownZone !== null) ownerZone = ownZone;
      resultByRecord.set(current, Object.freeze({
        schema: SOURCE_OWNER_SCHEMA,
        sourceId,
        occurrenceId: current.occurrenceId,
        parentOccurrenceId: parentId,
        type: kind,
        name: readOwnName(current, 'name') ?? '',
        ownerSite,
        ownerZone,
        branchOwner: ownValue(attrs, ['OWNER'], 'branchOwner'),
      }));
    }
    return resultByRecord.get(startRecord);
  }

  return Object.freeze(occurrences.map(resolve));
}
