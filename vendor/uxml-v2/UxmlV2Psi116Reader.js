/**
 * UXML v2 PSI116 reader (UXML revamp step 1).
 *
 * PSI116 text -> sealed `uxml-topology-v2` revision 0:
 *   - one pipeline per <Branch>, one component per <Node>, one restraint per <Restraint>;
 *   - every leaf element is a modelled value {v, text, src:'psi116', rev:0}; `text` is the
 *     exact source literal, so an unchanged value is written back byte for byte;
 *   - `custody` keeps the exact source text around and inside each record (passthrough);
 *     xref.psi116 keeps the recordKey (TopoFix B{i}:N{n}:S{j}) and the value spans;
 *   - uids: readUid(file sha256, recordKey), so the same file gives the same uids.
 * Header (Units, project fields) and anything outside <Branch> stays passthrough text.
 */
import {parsePsi116Structure} from '../UxmlPsi116SchemaMapper.js';
import {
  UXML_V2_SCHEMA_VERSION, UXML_V2_FRAME, readUid, sealDocument, sha256Hex, UxmlRefusal,
} from './UxmlV2Kernel.js';

export const UXML_V2_PSI116_READER = 'uxml-v2-psi116-reader/1';
const VERIFIED_NAMESPACES = new Set(['http://aveva.com/pipeStress116.xsd', 'http://aveva.com/pipestress116.xsd']);
const local = node => String(node?.name || '').split(':').at(-1);
const PY_FLOAT = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const ENTITY = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'"};
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, k) =>
  k[0] === '#' ? String.fromCodePoint(k[1].toLowerCase() === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10)) : ENTITY[k.toLowerCase()]);

/** Typed value of a literal: number when it is a plain decimal, else the decoded trimmed text. */
export function parseLiteral(text) {
  const body = /^<!\[CDATA\[([\s\S]*)\]\]>$/.exec(text.trim());
  const plain = body ? body[1] : decode(text);
  const trimmed = plain.trim();
  return PY_FLOAT.test(trimmed) ? Number(trimmed) : trimmed;
}

/**
 * Leaf values under `element` (relative to `base` offset), skipping child elements named in `skip`.
 * key = tag path joined by '.', repeated paths get '#2', '#3'.
 */
function collectLeaves(element, base, xmlText, skip, values, spans, order, prefix = '') {
  for (const child of element.children) {
    const name = local(child);
    if (skip.has(name)) continue;
    const path = prefix ? prefix + '.' + name : name;
    if (child.children.length) {
      collectLeaves(child, base, xmlText, new Set(), values, spans, order, path);
      continue;
    }
    let key = path;
    for (let n = 2; Object.hasOwn(values, key); n += 1) key = path + '#' + n;
    const singleton = child.closeStart === child.start;
    const text = singleton ? '' : xmlText.slice(child.openEnd, child.closeStart);
    values[key] = {v: parseLiteral(text), text, src: 'psi116', rev: 0};
    spans[key] = singleton
      ? [child.start - base, child.end - base, 1]
      : [child.openEnd - base, child.closeStart - base, 0];
    order.push(key);
  }
}

function intOf(value) {
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

/** Read PSI116 text into a sealed UXML v2 revision 0. */
export function readPsi116V2(xmlText, {fileSha256, producer = {tool: 'xcu-uxml', version: '2.0.0'}} = {}) {
  const sha = String(fileSha256 || '').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(sha)) throw new UxmlRefusal('PSI116_MEASURED_FILE_SHA256_REQUIRED');
  const root = parsePsi116Structure(xmlText);
  const prefix = root.name.includes(':') ? root.name.split(':')[0] : '';
  const namespace = root.attributes[prefix ? 'xmlns:' + prefix : 'xmlns'] || '';
  if (local(root) !== 'PipeStressExport' || !VERIFIED_NAMESPACES.has(namespace))
    throw new UxmlRefusal('PSI116_VERIFIED_NAMESPACE_REQUIRED');

  const branches = [];
  (function find(node) {
    if (local(node) === 'Branch') branches.push(node);
    else node.children.forEach(find);
  })(root);

  const custody = {};
  const pipelines = [];
  let cursor = 0;
  let nodeCount = 0;
  let restraintCount = 0;
  branches.forEach((branch, bi) => {
    const pKey = 'B' + bi;
    const pUid = readUid(sha, pKey);
    const nodes = branch.children.filter(c => local(c) === 'Node');
    const openEnd = nodes.length ? nodes[0].start : branch.end;
    const closeStart = nodes.length ? nodes.at(-1).end : branch.end;
    const values = {}, spans = {}, order = [];
    collectLeaves(branch, branch.start, xmlText, new Set(['Node']), values, spans, order);
    custody[pUid] = {
      before: xmlText.slice(cursor, branch.start),
      open: xmlText.slice(branch.start, openEnd),
      close: xmlText.slice(closeStart, branch.end),
      spans, closeOffset: closeStart - branch.start,
    };
    cursor = branch.end;
    const pipeline = {
      uid: pUid, kind: 'pipeline', sourceKey: pKey,
      xref: {psi116: {recordKey: pKey, branchIndex: bi}},
      fieldOrder: order, values, components: [],
    };
    nodes.forEach((node, si) => {
      const nodeValues = {}, nodeSpans = {}, nodeOrder = [];
      collectLeaves(node, node.start, xmlText, new Set(['Restraint']), nodeValues, nodeSpans, nodeOrder);
      const number = intOf(nodeValues.NodeNumber?.v);
      const recordKey = pKey + ':N' + (number == null ? 'none' : number) + ':S' + si;
      const uid = readUid(sha, recordKey);
      const next = nodes[si + 1];
      const nodeCustody = custody[uid] = {
        raw: xmlText.slice(node.start, node.end),
        gapAfter: next ? xmlText.slice(node.end, next.start) : null,
        spans: nodeSpans, restraints: [],
        closeTag: node.closeStart === node.start ? null : [node.closeStart - node.start, node.end - node.start],
      };
      const component = {
        uid, kind: 'component', sourceKey: recordKey,
        xref: {psi116: {recordKey, sourceIndex: si}},
        fieldOrder: nodeOrder, values: nodeValues, restraints: [],
      };
      node.children.filter(c => local(c) === 'Restraint').forEach((r, ri) => {
        const rValues = {}, rSpans = {}, rOrder = [];
        collectLeaves(r, r.start, xmlText, new Set(), rValues, rSpans, rOrder);
        const rKey = recordKey + ':R' + ri;
        const restraint = {
          uid: readUid(sha, rKey), kind: 'restraint', sourceKey: rKey,
          xref: {psi116: {recordKey: rKey}},
          fieldOrder: rOrder, values: rValues,
        };
        // XML restraint direction cosines are in the CII frame (schema note section 4).
        if (rOrder.some(k => /^DirectionCosine[XYZ]/.test(k))) restraint.frame = 'CII_XYZ';
        custody[restraint.uid] = {raw: xmlText.slice(r.start, r.end), spans: rSpans};
        nodeCustody.restraints.push({uid: restraint.uid, span: [r.start - node.start, r.end - node.start]});
        component.restraints.push(restraint);
        restraintCount += 1;
      });
      pipeline.components.push(component);
      nodeCount += 1;
    });
    pipelines.push(pipeline);
  });
  custody.$tail = xmlText.slice(cursor);

  const doc = {
    schemaVersion: UXML_V2_SCHEMA_VERSION,
    frame: UXML_V2_FRAME,
    revision: {
      seq: 0, parents: [], stage: 'read-psi116', producer,
      inputs: [{role: 'psi116', format: 'PSI116', sha256: sha}],
      settingsSha256: sha256Hex('{}'), rulesVersion: UXML_V2_PSI116_READER,
    },
    sources: [{id: 'psi116', format: 'PSI116', sha256: sha, namespace}],
    layers: {topology: 1, engineering: 1, supports: 1, names: 1, other: 1},
    readCounts: {pipelines: pipelines.length, components: nodeCount, restraints: restraintCount},
    retiredUids: [],
    custody,
    pipelines,
  };
  return sealDocument(doc);
}
