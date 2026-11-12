#!/usr/bin/env node
// topofix formats validator. Plain Node ESM, no dependencies.
// Usage: node validate.mjs <file> | node validate.mjs --selftest
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HEX64 = /^[0-9a-fA-F]{64}$/;
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string' && v.length > 0;
const isIdx = (v) => Number.isInteger(v) && v >= 0;

export const RULES = {
  R1: 'format/version wrong',
  R2: 'sha256 not 64 hex chars',
  R3: 'duplicate pairId/changeId',
  R4: 'malformed ref or required field',
  R5: 'map pair kind differs from header kind',
  R6: 'change target kind differs from base.kind',
  R7: 'two changes share target and field',
  R8: 'approved item lacks by/at',
  R9: 'newValue 0 without zeroConfirmed',
  R10: 'approved pairs not 1:1',
  R11: 'evidence.source=map without pairId',
  R12: 'xml change approved without ownerApproved',
  R13: 'span length != oldToken length, or spans overlap',
};

function refProblem(ref) {
  if (!isObj(ref)) return 'ref is not an object';
  if (ref.kind === 'cii') {
    if (!isIdx(ref.elementIndex)) return 'cii.elementIndex must be int >= 0';
    if (!isStr(ref.fromNode) || !isStr(ref.toNode)) return 'cii.fromNode/toNode must be non-empty strings';
  } else if (ref.kind === 'cii-node') {
    if (!isStr(ref.node)) return 'cii-node.node must be a non-empty string';
  } else if (ref.kind === 'xml') {
    if (!isIdx(ref.branchOrdinal) || !isIdx(ref.nodeOrdinal)) return 'xml ordinals must be int >= 0';
    for (const k of ['branchName', 'nodeNumber', 'componentRefNo'])
      if (typeof ref[k] !== 'string') return `xml.${k} must be a string`;
  } else return 'ref.kind must be cii, cii-node or xml';
  return null;
}
const refKey = (r) => JSON.stringify(Object.keys(r).sort().map((k) => [k, r[k]]));
const family = (kind) => String(kind).split('-')[0]; // cii-node -> cii
const isZero = (v) => (typeof v === 'number' && v === 0) ||
  (typeof v === 'string' && /^\s*[+-]?(0+(\.0*)?|\.0+)\s*$/.test(v));

export function validate(doc) {
  const errs = [];
  const add = (code, msg) => errs.push({ code, msg });
  if (!isObj(doc)) { add('R1', 'document is not an object'); return errs; }
  const isMap = doc.format === 'topofix.map';
  const isCs = doc.format === 'topofix.changeset';
  if (!isMap && !isCs) { add('R1', `unknown format ${JSON.stringify(doc.format)}`); return errs; }
  if (doc.version !== 1) add('R1', `version must be 1, got ${JSON.stringify(doc.version)}`);
  if (!isStr(doc.createdAt)) add('R4', 'createdAt required');

  const fileRef = (obj, path) => {
    if (!isObj(obj)) { add('R4', `${path} required`); return; }
    if (!['cii', 'xml'].includes(obj.kind)) add('R4', `${path}.kind must be cii or xml`);
    if (!isStr(obj.fileName)) add('R4', `${path}.fileName required`);
    if (typeof obj.sha256 !== 'string' || !HEX64.test(obj.sha256)) add('R2', `${path}.sha256 invalid`);
  };
  const evidence = (e, path) => {
    if (!isObj(e)) { add('R4', `${path} required`); return false; }
    if (!isStr(e.detail)) add('R4', `${path}.detail required`);
    return true;
  };
  const checkRef = (ref, path) => { const p = refProblem(ref); if (p) add('R4', `${path}: ${p}`); return !p; };

  if (isMap) {
    fileRef(doc.source, 'source'); fileRef(doc.target, 'target');
    if (!['geometry-pair', 'node-number', 'name', 'manual'].includes(doc.method)) add('R4', 'method invalid');
    if (!Array.isArray(doc.pairs)) { add('R4', 'pairs must be an array'); return errs; }
    const ids = new Set(); const srcSeen = new Set(); const tgtSeen = new Set();
    doc.pairs.forEach((p, i) => {
      const at = `pairs[${i}]`;
      if (!isObj(p)) { add('R4', `${at} not an object`); return; }
      if (!isStr(p.pairId)) add('R4', `${at}.pairId required`);
      else if (ids.has(p.pairId)) add('R3', `duplicate pairId ${p.pairId}`); else ids.add(p.pairId);
      const sOk = checkRef(p.source, `${at}.source`); const tOk = checkRef(p.target, `${at}.target`);
      if (sOk && doc.source?.kind && family(p.source.kind) !== doc.source.kind) add('R5', `${at}.source kind ${p.source.kind} vs header ${doc.source.kind}`);
      if (tOk && doc.target?.kind && family(p.target.kind) !== doc.target.kind) add('R5', `${at}.target kind ${p.target.kind} vs header ${doc.target.kind}`);
      if (!['approved', 'candidate', 'rejected'].includes(p.status)) add('R4', `${at}.status invalid`);
      if (evidence(p.evidence, `${at}.evidence`) && !isStr(p.evidence.rule)) add('R4', `${at}.evidence.rule required`);
      if (p.status === 'approved') {
        if (!isStr(p.approvedBy) || !isStr(p.approvedAt)) add('R8', `${at} approved without approvedBy/approvedAt`);
        if (sOk) { const k = refKey(p.source); if (srcSeen.has(k)) add('R10', `${at} source already in an approved pair`); srcSeen.add(k); }
        if (tOk) { const k = refKey(p.target); if (tgtSeen.has(k)) add('R10', `${at} target already in an approved pair`); tgtSeen.add(k); }
      }
    });
  } else {
    fileRef(doc.base, 'base');
    if (doc.mapFile !== undefined &&
        (!isObj(doc.mapFile) || typeof doc.mapFile.sha256 !== 'string' || !HEX64.test(doc.mapFile.sha256)))
      add('R2', 'mapFile.sha256 invalid');
    if (!Array.isArray(doc.changes)) { add('R4', 'changes must be an array'); return errs; }
    const ids = new Set(); const seen = new Set(); const spans = [];
    doc.changes.forEach((c, i) => {
      const at = `changes[${i}]`;
      if (!isObj(c)) { add('R4', `${at} not an object`); return; }
      if (!isStr(c.changeId)) add('R4', `${at}.changeId required`);
      else if (ids.has(c.changeId)) add('R3', `duplicate changeId ${c.changeId}`); else ids.add(c.changeId);
      const tOk = checkRef(c.target, `${at}.target`);
      if (tOk && doc.base?.kind && family(c.target.kind) !== doc.base.kind) add('R6', `${at}.target kind ${c.target.kind} vs base ${doc.base.kind}`);
      if (!isStr(c.field)) add('R4', `${at}.field required`);
      if (c.unit !== undefined && typeof c.unit !== 'string') add('R4', `${at}.unit must be string`);
      if (typeof c.oldToken !== 'string') add('R4', `${at}.oldToken must be a string`);
      if (!(typeof c.newValue === 'string' || typeof c.newValue === 'number')) add('R4', `${at}.newValue must be string or number`);
      if (tOk && isStr(c.field)) {
        const k = refKey(c.target) + '|' + c.field;
        if (seen.has(k)) add('R7', `${at} repeats target+field`); seen.add(k);
      }
      if (evidence(c.evidence, `${at}.evidence`)) {
        if (!['map', 'reference-cii', 'master', 'manual'].includes(c.evidence.source)) add('R4', `${at}.evidence.source invalid`);
        if (c.evidence.source === 'map' && !isStr(c.evidence.pairId)) add('R11', `${at} map evidence without pairId`);
      }
      const a = c.approval;
      if (!isObj(a) || typeof a.approved !== 'boolean') add('R4', `${at}.approval.approved must be boolean`);
      else {
        if (a.approved && (!isStr(a.by) || !isStr(a.at))) add('R8', `${at} approved without by/at`);
        if (a.ownerApproved !== undefined && typeof a.ownerApproved !== 'boolean') add('R4', `${at}.approval.ownerApproved must be boolean`);
        if (a.approved && doc.base?.kind === 'xml' && a.ownerApproved !== true) add('R12', `${at} xml change approved without ownerApproved`);
        if (isZero(c.newValue) && a.zeroConfirmed !== true) add('R9', `${at} newValue 0 without zeroConfirmed`);
      }
      if (c.span !== undefined) {
        const sp = c.span;
        if (!isObj(sp) || !isIdx(sp.start) || !Number.isInteger(sp.end) || !(sp.start < sp.end)) add('R4', `${at}.span must be {start,end} ints with 0 <= start < end`);
        else {
          if (typeof c.oldToken === 'string' && sp.end - sp.start !== c.oldToken.length) add('R13', `${at}.span length ${sp.end - sp.start} != oldToken length ${c.oldToken.length}`);
          spans.push({ at, start: sp.start, end: sp.end });
        }
      }
    });
    spans.sort((x, y) => x.start - y.start || x.end - y.end);
    for (let i = 1; i < spans.length; i++)
      if (spans[i].start < spans[i - 1].end) add('R13', `${spans[i].at}.span overlaps ${spans[i - 1].at}.span`);
  }
  return errs;
}

function load(file) { return JSON.parse(readFileSync(file, 'utf8')); }

function selftest() {
  const root = dirname(fileURLToPath(import.meta.url));
  let bad = 0;
  const line = (ok, s) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${s}`); if (!ok) bad++; };
  const ex = join(root, 'examples');
  const valid = readdirSync(ex).filter((f) => f.endsWith('.valid.json')).sort();
  if (valid.length < 3) line(false, 'expected at least 3 valid examples');
  for (const f of valid) {
    const e = validate(load(join(ex, f)));
    line(e.length === 0, `valid   ${f}${e.length ? ' -> ' + e.map((x) => x.code + ':' + x.msg).join('; ') : ''}`);
  }
  const inv = readdirSync(join(ex, 'invalid')).filter((f) => f.endsWith('.json')).sort();
  const covered = new Set();
  for (const f of inv) {
    const want = /^(R\d+)-/.exec(f)?.[1];
    const codes = [...new Set(validate(load(join(ex, 'invalid', f))).map((x) => x.code))];
    covered.add(want);
    line(codes.length === 1 && codes[0] === want, `invalid ${f} -> [${codes.join(',')}] expected [${want}]`);
  }
  for (const r of Object.keys(RULES)) if (!covered.has(r)) line(false, `no invalid example for ${r}`);
  console.log(bad ? `selftest FAILED (${bad})` : 'selftest OK');
  return bad ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = process.argv[2];
  if (!arg) { console.error('usage: node validate.mjs <file> | --selftest'); process.exit(2); }
  if (arg === '--selftest') process.exit(selftest());
  let errs;
  try { errs = validate(load(arg)); } catch (e) { console.error('cannot read/parse: ' + e.message); process.exit(2); }
  if (!errs.length) { console.log('OK'); process.exit(0); }
  for (const e of errs) console.log(`${e.code}  ${e.msg}`);
  process.exit(1);
}
