/**
 * UXML v2 kernel (UXML revamp step 1, Owner 14 Nov 2026).
 *
 * One small shared core every lane plugs into:
 *   - canonical JSON + pure-JS SHA-256 (same result in Node and the browser);
 *   - entity hashes `h` and the revision id (hash of the canonical document);
 *   - stable uids (read: from source sha + recordKey; stage-made: from parent
 *     revision + stage + rule + from-uids + ordinal) and lineage;
 *   - values with provenance {v, text, src, rev, lock?};
 *   - deltas (`uxml-delta/v1`): apply(base, delta) must hash to delta.result,
 *     reverse(delta) undoes it;
 *   - runStage: pure stages return ops; the kernel enforces locks, declared
 *     layers and determinism, then seals the next revision.
 * Schema note: D:/CodeD/topofix-agents/roadmap/UXML-SCHEMA-V2.md (sections 1-8).
 */

export const UXML_V2_SCHEMA_VERSION = 'uxml-topology-v2';
export const UXML_DELTA_SCHEMA = 'uxml-delta/v1';
export const UXML_V2_FRAME = 'PSI116_XYZ_MM';
export const DIRECTION_FRAMES = Object.freeze(['PSI116_XYZ', 'CII_XYZ']);
export const VALUE_SOURCES = Object.freeze([
  'psi116', 'topofix', 'staged', 'lineList', 'pipingClass', 'material',
  'supportMapper', 'weightMaster', 'popup', 'transfer', 'owner', 'stage',
]);
export const LAYERS = Object.freeze(['topology', 'engineering', 'supports', 'names', 'other']);

export const CODES = Object.freeze({
  VERSION_UNKNOWN: 'UXML_VERSION_UNKNOWN',
  HASH_MISMATCH: 'UXML_HASH_MISMATCH',
  DELTA_BASE_MISMATCH: 'UXML_DELTA_BASE_MISMATCH',
  DELTA_BEFORE_MISMATCH: 'UXML_DELTA_BEFORE_MISMATCH',
  DELTA_RESULT_MISMATCH: 'UXML_DELTA_RESULT_MISMATCH',
  DELTA_OP_UNSUPPORTED: 'UXML_DELTA_OP_UNSUPPORTED',
  LOCKED_VALUE: 'UXML_LOCKED_VALUE',
  UID_DUPLICATE: 'UXML_UID_DUPLICATE',
  UID_UNKNOWN: 'UXML_UID_UNKNOWN',
  UID_REUSED: 'UXML_UID_REUSED',
  LINEAGE_MISSING: 'UXML_LINEAGE_MISSING',
  FRAME_MISSING: 'UXML_FRAME_MISSING',
  LAYER_UNDECLARED_WRITE: 'UXML_LAYER_UNDECLARED_WRITE',
  PROVENANCE_MISSING: 'UXML_PROVENANCE_MISSING',
  STAGE_NONDETERMINISTIC: 'STAGE_NONDETERMINISTIC',
});

export class UxmlRefusal extends Error {
  constructor(code, details = {}) {
    super(code + (details.message ? ': ' + details.message : ''));
    this.code = code;
    this.details = details;
  }
}
const refuse = (code, details) => { throw new UxmlRefusal(code, details); };

// ---------------------------------------------------------------- SHA-256
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);
/** SHA-256 of the UTF-8 bytes of `text` (or of a Uint8Array), as lowercase hex. */
export function sha256Hex(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const bitLength = bytes.length * 8;
  const padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(padded.length - 4, bitLength >>> 0);
  const H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const W = new Uint32Array(64);
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i += 1) W[i] = view.getUint32(off + i * 4);
    for (let i = 16; i < 64; i += 1) {
      const a = W[i - 15], b = W[i - 2];
      const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
      const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i += 1) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const t1 = (h + S1 + ((e & f) ^ (~e & g)) + K[i] + W[i]) >>> 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const t2 = (S0 + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
  }
  return Array.from(H, x => x.toString(16).padStart(8, '0')).join('');
}

// ---------------------------------------------------------- canonical JSON
/** Keys sorted, arrays in meaning order, JS shortest numbers; refuses NaN/undefined. */
export function canonicalJson(value) {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'number':
      if (!Number.isFinite(value)) refuse('UXML_CANONICAL_NUMBER_INVALID', {message: String(value)});
      return JSON.stringify(Object.is(value, -0) ? 0 : value);
    case 'string': return JSON.stringify(value);
    case 'boolean': return value ? 'true' : 'false';
    case 'object': {
      if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
      const keys = Object.keys(value).filter(k => value[k] !== undefined).sort();
      return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalJson(value[k])).join(',') + '}';
    }
    default: return refuse('UXML_CANONICAL_TYPE_INVALID', {message: typeof value});
  }
}
export const clone = value => JSON.parse(JSON.stringify(value));

// ------------------------------------------------------------------- uids
const B32 = 'abcdefghijklmnopqrstuvwxyz234567';
function base32Of(hex, length = 16) {
  let bits = '';
  for (const ch of hex) bits += Number.parseInt(ch, 16).toString(2).padStart(4, '0');
  let out = '';
  for (let i = 0; out.length < length; i += 5) out += B32[Number.parseInt(bits.slice(i, i + 5), 2)];
  return out;
}
/** uid of an entity read from a source: same file + same recordKey -> same uid. */
export const readUid = (sourceSha256, recordKey) =>
  'u:' + base32Of(sha256Hex(String(sourceSha256).toLowerCase() + '|' + recordKey));
/** uid of an entity a stage makes (never reused; recorded in lineage). */
export const stageUid = (parentRevisionId, stage, rule, fromUids, ordinal) =>
  'u:' + base32Of(sha256Hex([parentRevisionId, stage, rule, [...fromUids].join(','), ordinal].join('|')));

// ------------------------------------------------------------ entity walk
const CHILDREN = Object.freeze({pipeline: 'components', component: 'restraints'});
const CHILD_KIND = Object.freeze({pipeline: 'component', component: 'restraint'});
/** Every entity in document order: [{entity, kind, parent, list, index}]. */
export function walkEntities(doc) {
  const out = [];
  (doc.pipelines || []).forEach((p, pi) => {
    out.push({entity: p, kind: 'pipeline', parent: null, list: doc.pipelines, index: pi});
    (p.components || []).forEach((c, ci) => {
      out.push({entity: c, kind: 'component', parent: p, list: p.components, index: ci});
      (c.restraints || []).forEach((r, ri) =>
        out.push({entity: r, kind: 'restraint', parent: c, list: c.restraints, index: ri}));
    });
  });
  return out;
}
export function indexEntities(doc) {
  const map = new Map();
  for (const item of walkEntities(doc)) {
    if (map.has(item.entity.uid)) refuse(CODES.UID_DUPLICATE, {uid: item.entity.uid});
    map.set(item.entity.uid, item);
  }
  return map;
}
/** Own fields of an entity (child arrays and `h` excluded). */
function ownFields(entity, kind) {
  const own = {...entity};
  delete own.h;
  if (CHILDREN[kind]) delete own[CHILDREN[kind]];
  return own;
}
export const entityHash = (entity, kind) => sha256Hex(canonicalJson(ownFields(entity, kind))).slice(0, 32);

function documentForId(doc) {
  const body = {...doc, revision: {...doc.revision}};
  delete body.revision.id;
  return body;
}
/** Stamp every entity `h`, then revision.id = 'r:' + sha256(canonical doc without the id). */
export function sealDocument(doc) {
  for (const {entity, kind} of walkEntities(doc)) entity.h = entityHash(entity, kind);
  doc.revision.id = 'r:' + sha256Hex(canonicalJson(documentForId(doc)));
  return doc;
}

// ------------------------------------------------------------ layers
const NAME_KEYS = new Set(['Branchname', 'NodeName', 'NodeNumber']);
const TOPOLOGY_KEYS = new Set(['Endpoint', 'ComponentType', 'ComponentRefNo', 'ConnectionType',
  'Position', 'BendRadius', 'AlphaAngle', 'BendType', 'ElementLengthMm']);
const ENGINEERING_KEYS = new Set(['HydroPressure', 'MaterialNumber', 'MaterialName', 'MaterialCode',
  'FluidDensity', 'InsulationDensity', 'InsulationThickness', 'LineNo', 'PipelineReference',
  'PipingClass', 'Rating', 'OutsideDiameter', 'WallThickness', 'CorrosionAllowance', 'Weight',
  'SIF', 'BoreMm', 'Rigid']);
const SUPPORT_KEY = /^(DTXR_|CMPSUPGAP)/;
/** Layer of an add/remove: a restraint belongs to `supports`, anything else to `topology`. */
export const entityLayer = kind => (kind === 'restraint' ? 'supports' : 'topology');
/** Layer of a value key on an entity kind (restraint values are all `supports`). */
export function layerOf(kind, key) {
  if (kind === 'restraint') return 'supports';
  const leaf = String(key).split('#')[0].split('.').at(-1);
  // Step 3: the support annotations a node carries are written by the supports stage.
  if (SUPPORT_KEY.test(leaf)) return 'supports';
  if (NAME_KEYS.has(leaf)) return 'names';
  if (TOPOLOGY_KEYS.has(leaf)) return 'topology';
  if (ENGINEERING_KEYS.has(leaf) || /^(Temperature|Pressure)\d*$/.test(leaf)) return 'engineering';
  return 'other';
}

// ------------------------------------------------------------ verification
/** All refusals of a document (empty list = valid and sealed). */
export function verifyDocument(doc) {
  const out = [];
  const add = (code, details = {}) => out.push({code, ...details});
  if (!doc || doc.schemaVersion !== UXML_V2_SCHEMA_VERSION) {
    add(CODES.VERSION_UNKNOWN, {found: doc?.schemaVersion ?? null});
    return out;
  }
  const seen = new Set();
  const retired = new Set(doc.retiredUids || []);
  for (const {entity, kind} of walkEntities(doc)) {
    if (seen.has(entity.uid)) add(CODES.UID_DUPLICATE, {uid: entity.uid});
    seen.add(entity.uid);
    if (retired.has(entity.uid)) add(CODES.UID_REUSED, {uid: entity.uid});
    if (entity.h !== entityHash(entity, kind)) add(CODES.HASH_MISMATCH, {uid: entity.uid});
    if (!entity.xref?.psi116 && !entity.lineage) add(CODES.LINEAGE_MISSING, {uid: entity.uid});
    for (const [key, value] of Object.entries(entity.values || {})) {
      if (!value || !VALUE_SOURCES.includes(value.src)) add(CODES.PROVENANCE_MISSING, {uid: entity.uid, key});
    }
    if (kind === 'restraint' && hasDirection(entity) && !DIRECTION_FRAMES.includes(entity.frame))
      add(CODES.FRAME_MISSING, {uid: entity.uid});
  }
  const expected = 'r:' + sha256Hex(canonicalJson(documentForId(doc)));
  if (doc.revision?.id !== expected) add(CODES.HASH_MISMATCH, {uid: 'revision'});
  return out;
}
const hasDirection = r => Object.keys(r.values || {}).some(k => /^DirectionCosine[XYZ]/.test(k));
export function assertValid(doc) {
  const problems = verifyDocument(doc);
  if (problems.length) refuse(problems[0].code, {problems: problems.slice(0, 20), count: problems.length});
  return doc;
}

// ------------------------------------------------------------ deltas
const valueKey = path => {
  const m = /^values\.(.+)$/.exec(String(path || ''));
  if (!m) refuse(CODES.DELTA_OP_UNSUPPORTED, {message: 'path ' + path});
  return m[1];
};
const same = (a, b) => canonicalJson(a ?? null) === canonicalJson(b ?? null);

/** `set` of a restraint's direction frame (path 'frame'); after = a DIRECTION_FRAMES name or null. */
function setFrame(item, op) {
  if (item.kind !== 'restraint') refuse(CODES.DELTA_OP_UNSUPPORTED, {message: 'frame on ' + item.kind});
  if (op.after != null && !DIRECTION_FRAMES.includes(op.after)) refuse(CODES.FRAME_MISSING, {uid: op.uid});
  if (!same(item.entity.frame ?? null, op.before)) refuse(CODES.DELTA_BEFORE_MISMATCH, {uid: op.uid, key: 'frame'});
  if (op.after == null) delete item.entity.frame; else item.entity.frame = op.after;
}

function applyOps(doc, ops) {
  let index = indexEntities(doc);
  const retired = new Set(doc.retiredUids || []);
  for (const op of ops) {
    if (op.op === 'set' && op.path === 'frame') {
      const item = index.get(op.uid) || refuse(CODES.UID_UNKNOWN, {uid: op.uid});
      setFrame(item, op);
    } else if (op.op === 'set' || op.op === 'lock' || op.op === 'unlock') {
      const item = index.get(op.uid) || refuse(CODES.UID_UNKNOWN, {uid: op.uid});
      const key = valueKey(op.path);
      const values = item.entity.values || (item.entity.values = {});
      const current = values[key] ?? null;
      if (op.op === 'set') {
        if (!same(current, op.before)) refuse(CODES.DELTA_BEFORE_MISMATCH, {uid: op.uid, key});
        if (op.after == null) delete values[key]; else values[key] = clone(op.after);
        if (op.after != null && !(item.entity.fieldOrder || []).includes(key)) {
          // A new key goes after `afterKey` when the op names one that is there (E2a: today's tag order), else last.
          const order = (item.entity.fieldOrder ||= []), at = op.afterKey == null ? -1 : order.indexOf(op.afterKey);
          order.splice(at < 0 ? order.length : at + 1, 0, key);
        }
      } else {
        if (!current) refuse(CODES.UID_UNKNOWN, {uid: op.uid, key});
        if (!same(current.lock, op.before)) refuse(CODES.DELTA_BEFORE_MISMATCH, {uid: op.uid, key});
        if (op.op === 'lock') current.lock = clone(op.after); else delete current.lock;
      }
    } else if (op.op === 'add' || op.op === 'split') {
      if (index.has(op.uid)) refuse(CODES.UID_DUPLICATE, {uid: op.uid});
      if (op.restore) {
        // undo of a remove: the entity comes back with its own uid (and children)
        if (op.op !== 'add' || !retired.has(op.uid)) refuse(CODES.UID_UNKNOWN, {uid: op.uid});
        for (const e of walkEntities({pipelines: [{components: [op.entity]}]}).slice(1)) retired.delete(e.entity.uid);
        retired.delete(op.uid);
      } else {
        if (retired.has(op.uid)) refuse(CODES.UID_REUSED, {uid: op.uid});
        if (!op.entity?.lineage) refuse(CODES.LINEAGE_MISSING, {uid: op.uid});
      }
      if (op.op === 'split' && !(op.entity.lineage.from || []).includes(op.after))
        refuse(CODES.LINEAGE_MISSING, {uid: op.uid, message: 'split must come from the sibling it follows'});
      const parent = index.get(op.parent) || refuse(CODES.UID_UNKNOWN, {uid: op.parent});
      const listName = CHILDREN[parent.kind];
      if (!listName || CHILD_KIND[parent.kind] !== op.kind) refuse(CODES.DELTA_OP_UNSUPPORTED, {message: 'add ' + op.kind});
      const list = parent.entity[listName] || (parent.entity[listName] = []);
      const at = op.after == null ? 0 : list.findIndex(e => e.uid === op.after) + 1;
      if (op.after != null && at === 0) refuse(CODES.UID_UNKNOWN, {uid: op.after});
      list.splice(at, 0, {...clone(op.entity), uid: op.uid});
      index = indexEntities(doc);
    } else if (op.op === 'remove') {
      const item = index.get(op.uid) || refuse(CODES.UID_UNKNOWN, {uid: op.uid});
      if (item.kind === 'pipeline') refuse(CODES.DELTA_OP_UNSUPPORTED, {message: 'remove pipeline'});
      const before = {...item.entity}; delete before.h;
      if (!same(before, op.before)) refuse(CODES.DELTA_BEFORE_MISMATCH, {uid: op.uid});
      item.list.splice(item.index, 1);
      for (const e of walkEntities({pipelines: [{components: [item.entity]}]}).slice(1)) retired.add(e.entity.uid);
      retired.add(op.uid);
      index = indexEntities(doc);
    } else {
      refuse(CODES.DELTA_OP_UNSUPPORTED, {message: String(op.op)});
    }
  }
  doc.retiredUids = [...retired].sort();
}

/** apply(base, delta) -> next revision; refuses unless it hashes to delta.result. */
export function applyDelta(base, delta) {
  assertValid(base);
  if (delta?.schema !== UXML_DELTA_SCHEMA) refuse(CODES.VERSION_UNKNOWN, {found: delta?.schema});
  if (delta.base !== base.revision.id) refuse(CODES.DELTA_BASE_MISMATCH, {base: delta.base, found: base.revision.id});
  const next = clone(base);
  applyOps(next, delta.ops);
  next.revision = {...clone(delta.revision), parents: [base.revision.id]};
  sealDocument(next);
  assertValid(next);
  if (next.revision.id !== delta.result) refuse(CODES.DELTA_RESULT_MISMATCH, {expected: delta.result, found: next.revision.id});
  return next;
}

/**
 * Undo: the reversed delta, applied to `resultDoc` (the revision `delta` produced).
 * It makes a NEW revision (stage 'undo', parent = resultDoc) whose pipelines equal the
 * base's again; added uids stay retired, removed uids are restored (undo only).
 */
export function undoDelta(resultDoc, delta) {
  assertValid(resultDoc);
  if (delta.result !== resultDoc.revision.id) refuse(CODES.DELTA_BASE_MISMATCH, {base: delta.result, found: resultDoc.revision.id});
  const ops = [...delta.ops].reverse().map(op => {
    if (op.op === 'set') return {...op, before: op.after, after: op.before};
    if (op.op === 'lock') return {...op, op: 'unlock', before: op.after, after: null};
    if (op.op === 'unlock') return {...op, op: 'lock', before: null, after: op.before};
    if (op.op === 'add' || op.op === 'split') {
      const before = clone(op.entity); before.uid = op.uid; delete before.h;
      return {op: 'remove', uid: op.uid, parent: op.parent, after: op.after, kind: op.kind, before: null, undo: true};
    }
    if (op.op === 'remove') return {op: 'add', uid: op.uid, parent: op.parent, after: op.after, kind: op.kind, entity: op.before, restore: true};
    return refuse(CODES.DELTA_OP_UNSUPPORTED, {message: String(op.op)});
  });
  const work = clone(resultDoc);
  for (const op of ops) {
    if (op.op === 'remove') {
      const item = indexEntities(work).get(op.uid);
      op.before = clone(item.entity); delete op.before.h;
    }
    applyOps(work, [op]);
  }
  const revision = {...clone(resultDoc.revision), seq: (resultDoc.revision.seq || 0) + 1,
    parents: [resultDoc.revision.id], stage: 'undo', reverses: delta.result};
  delete revision.id;
  work.revision = clone(revision);
  sealDocument(work);
  const undo = {schema: UXML_DELTA_SCHEMA, base: resultDoc.revision.id, result: work.revision.id,
    stage: 'undo', rulesVersion: delta.rulesVersion, revision, ops};
  return {uxml: applyDelta(resultDoc, undo), delta: undo};
}

// ------------------------------------------------------------ stages
/**
 * A stage: {id, rulesVersion, reads:[layer], writes:[layer], run(doc, inputs, settings) -> {ops, diagnostics}}.
 * `run` must be pure. Ops: set {uid, path:'values.<key>', after:{v,text?,unit?,src,rule?}},
 * add|split {parent, after, kind, entity (with lineage), uid}, remove {uid}, lock|unlock {uid, path, after}.
 * The kernel fills `before`, stamps `rev`, drops writes to locked values (conflict), and
 * refuses undeclared layers and nondeterminism.
 */
export function runStage(stage, base, inputs = {}, settings = {}, {producer = {tool: 'xcu-uxml', version: '2.0.0'}, inputHashes = []} = {}) {
  assertValid(base);
  const first = stage.run(clone(base), inputs, settings) || {};
  const second = stage.run(clone(base), inputs, settings) || {};
  if (canonicalJson(first.ops || []) !== canonicalJson(second.ops || []))
    refuse(CODES.STAGE_NONDETERMINISTIC, {stage: stage.id});
  const seq = (base.revision.seq || 0) + 1;
  const conflicts = [];
  const ops = [];
  const declared = new Set(stage.writes || []);
  const work = clone(base);
  for (const raw of first.ops || []) {
    const op = clone(raw);
    if (op.op === 'set' && op.path === 'frame') {
      const item = indexEntities(work).get(op.uid) || refuse(CODES.UID_UNKNOWN, {uid: op.uid});
      if (!declared.has('supports')) refuse(CODES.LAYER_UNDECLARED_WRITE, {stage: stage.id, uid: op.uid, key: 'frame', layer: 'supports'});
      op.before = item.entity.frame ?? null;
    } else if (op.op === 'set' || op.op === 'lock' || op.op === 'unlock') {
      const item = indexEntities(work).get(op.uid) || refuse(CODES.UID_UNKNOWN, {uid: op.uid});
      const key = valueKey(op.path);
      const layer = layerOf(item.kind, key);
      if (!declared.has(layer)) refuse(CODES.LAYER_UNDECLARED_WRITE, {stage: stage.id, uid: op.uid, key, layer});
      const current = item.entity.values?.[key] ?? null;
      if (op.op === 'set') {
        if (current?.lock) { conflicts.push({code: CODES.LOCKED_VALUE, uid: op.uid, key, lock: current.lock}); continue; }
        op.before = current;
        if (op.after != null) {
          if (!VALUE_SOURCES.includes(op.after.src)) refuse(CODES.PROVENANCE_MISSING, {uid: op.uid, key});
          op.after = {...op.after, rev: seq};
          if (current?.lock) op.after.lock = current.lock;
        }
      } else {
        op.before = current?.lock ?? null;
        if (op.op === 'lock') op.after = {...op.after, rev: seq};
      }
    } else if (op.op === 'add' || op.op === 'split') {
      const layer = op.op === 'add' ? entityLayer(op.kind) : 'topology';
      if (!declared.has(layer)) refuse(CODES.LAYER_UNDECLARED_WRITE, {stage: stage.id, op: op.op, layer});
      if (!op.entity?.lineage) refuse(CODES.LINEAGE_MISSING, {uid: op.uid});
      op.entity = clone(op.entity);
      delete op.entity.h;
      for (const value of Object.values(op.entity.values || {})) {
        if (!VALUE_SOURCES.includes(value?.src)) refuse(CODES.PROVENANCE_MISSING, {uid: op.uid});
        value.rev = seq;
      }
    } else if (op.op === 'remove') {
      const item = indexEntities(work).get(op.uid) || refuse(CODES.UID_UNKNOWN, {uid: op.uid});
      const layer = entityLayer(item.kind);
      if (!declared.has(layer)) refuse(CODES.LAYER_UNDECLARED_WRITE, {stage: stage.id, op: 'remove', layer});
      const before = clone(item.entity); delete before.h;
      Object.assign(op, {before, parent: item.parent?.uid ?? null,
        after: item.index > 0 ? item.list[item.index - 1].uid : null, kind: item.kind});
    } else {
      refuse(CODES.DELTA_OP_UNSUPPORTED, {message: String(op.op)});
    }
    applyOps(work, [op]);
    ops.push(op);
  }
  const revision = {
    seq, parents: [base.revision.id], stage: stage.id, producer,
    inputs: inputHashes, settingsSha256: sha256Hex(canonicalJson(settings)),
    rulesVersion: stage.rulesVersion || '',
  };
  work.revision = clone(revision);
  sealDocument(work);
  assertValid(work);
  const delta = {schema: UXML_DELTA_SCHEMA, base: base.revision.id, result: work.revision.id,
    stage: stage.id, rulesVersion: revision.rulesVersion, revision, ops};
  const check = applyDelta(base, delta);
  if (check.revision.id !== work.revision.id) refuse(CODES.DELTA_RESULT_MISMATCH, {stage: stage.id});
  return {uxml: work, delta, diagnostics: first.diagnostics || [], refusals: conflicts};
}

/** Value helper for stages: {v, text?, unit?, src, rule?}. */
export const makeValue = (v, src, extra = {}) => ({v, src, ...extra});
