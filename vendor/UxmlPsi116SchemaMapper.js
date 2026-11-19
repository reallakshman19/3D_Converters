/**
 * UXML-S1: strictly read-only PSI116 → uxml-topology-v1 TOPOLOGY_FULL reader.
 * The file's actual SHA-256 is supplied by the intake/CLI; this module never
 * edits XML, infers connections, or emits a reconstructed source format.
 *
 * Each UXML "component" represents ONE source Node record (not an inferred
 * physical pipe), preserving TopoFix B0:N120:S4 key identity and ordered rows.
 * Topology solving remains exclusively in the existing Python TopoFix engine.
 */
import {SOURCE_FORMATS, XML_PROFILES, CONFIDENCE_LEVELS} from './UxmlConstants.js';
import {detectUxmlProfile} from './UxmlProfileDetector.js';
import {
  createUxmlDocument, createUxmlHeader, createUxmlSource, createUxmlPipeline,
  createUxmlComponent, createUxmlAnchor, createUxmlPort,
  createUxmlSupport, createUxmlTopologyHint, createUxmlLoss,
} from './UxmlTypes.js';
import {validateUxmlDocument} from './UxmlValidationGate.js';

export const UXML_PSI116_MAPPER_SCHEMA = 'uxml-psi116-source-reader/v1';
const VERIFIED_NAMESPACES = new Set([
  'http://aveva.com/pipeStress116.xsd', 'http://aveva.com/pipestress116.xsd',
]);
const NODE_FIELDS = Object.freeze([
  'NodeNumber', 'NodeName', 'Endpoint', 'ComponentType', 'ComponentRefNo',
  'ConnectionType', 'Position', 'Rigid', 'Weight', 'OutsideDiameter',
  'WallThickness', 'BendRadius', 'AlphaAngle', 'Restraint',
]);
const PARSER_ALIASES = Object.freeze({
  BEND: 'ELBO', ELBOW: 'ELBO', REDUCER: 'REDU',
  WELDOLET: 'OLET', SOCKOLET: 'OLET', SUPPORT: 'ATTA', ANCI: 'ATTA',
});
const NUMBER = /[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][-+]?\d+)?/g;
const XML_ENTITY = Object.freeze({amp: '&', lt: '<', gt: '>', quot: '"', apos: "'"});

function decodeEntities(text) {
  return String(text).replace(/&(#x[0-9a-f]+|#\d+|[A-Za-z][A-Za-z0-9]*);/gi, (_, key) => {
    if (key.startsWith('#')) {
      const code = key[1].toLowerCase() === 'x'
        ? Number.parseInt(key.slice(2), 16) : Number.parseInt(key.slice(1), 10);
      if (!Number.isInteger(code) || code <= 0 || code > 0x10ffff) throw new Error('PSI116_XML_INVALID_ENTITY');
      return String.fromCodePoint(code);
    }
    if (!Object.hasOwn(XML_ENTITY, key)) throw new Error('PSI116_XML_UNSUPPORTED_ENTITY:' + key);
    return XML_ENTITY[key];
  });
}
function attrsOf(rest) {
  const attrs = {};
  const token = /([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m, last = 0;
  while ((m = token.exec(rest))) {
    if (rest.slice(last, m.index).trim()) throw new Error('PSI116_XML_INVALID_ATTRIBUTE');
    if (Object.hasOwn(attrs, m[1])) throw new Error('PSI116_XML_DUPLICATE_ATTRIBUTE');
    attrs[m[1]] = decodeEntities((m[2] ?? m[3] ?? '').replace(/\r\n?/g, '\n'));
    last = token.lastIndex;
  }
  if (rest.slice(last).trim()) throw new Error('PSI116_XML_INVALID_ATTRIBUTE');
  return attrs;
}

/**
 * Minimal, deterministic, namespace-aware structural XML reader for Node CLI
 * and browser without an extra parser dependency. It does not expand DTDs,
 * external entities or source URLs. Tag ends honour quoted '>' characters.
 * Unknown XML elements remain in the source snapshot + lossContract, not
 * silently interpreted as an engineering field.
 */
function parseDocument(text) {
  if (typeof text !== 'string' || !text.trim()) throw new Error('PSI116_XML_EMPTY');
  const stack = [];
  let root = null, at = 0;
  while (at < text.length) {
    if (text[at] !== '<') {
      const end = text.indexOf('<', at);
      const until = end === -1 ? text.length : end;
      if (stack.length) stack[stack.length - 1].text += decodeEntities(text.slice(at, until).replace(/\r\n?/g, '\n'));
      at = until;
      continue;
    }
    if (text.startsWith('<!--', at)) {
      const end = text.indexOf('-->', at + 4);
      if (end < 0) throw new Error('PSI116_XML_UNCLOSED_COMMENT');
      at = end + 3;
      continue;
    }
    if (text.startsWith('<![CDATA[', at)) {
      const end = text.indexOf(']]>', at + 9);
      if (end < 0) throw new Error('PSI116_XML_UNCLOSED_CDATA');
      if (stack.length) stack[stack.length - 1].text += text.slice(at + 9, end).replace(/\r\n?/g, '\n');
      at = end + 3;
      continue;
    }
    if (text.startsWith('<?', at)) {
      const end = text.indexOf('?>', at + 2);
      if (end < 0) throw new Error('PSI116_XML_UNCLOSED_PI');
      at = end + 2;
      continue;
    }
    if (text.startsWith('<!', at)) throw new Error('PSI116_XML_DTD_OR_DECLARATION_FORBIDDEN');
    let end = at + 1, quote = '';
    for (; end < text.length; end += 1) {
      const ch = text[end];
      if (quote) { if (ch === quote) quote = ''; }
      else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === '>') break;
    }
    if (end >= text.length) throw new Error('PSI116_XML_UNCLOSED_TAG');
    const token = text.slice(at + 1, end).trim();
    if (token.startsWith('/')) {
      const name = token.slice(1).trim();
      const item = stack.pop();
      if (!item || item.name !== name) throw new Error('PSI116_XML_MISMATCHED_TAG:' + name);
      item.closeStart = at; item.end = end + 1;
    } else {
      const singleton = token.endsWith('/');
      const raw = singleton ? token.slice(0, -1).trimEnd() : token;
      const match = raw.match(/^([A-Za-z_:][\w:.-]*)([\s\S]*)$/);
      if (!match) throw new Error('PSI116_XML_INVALID_TAG');
      const node = {
        name: match[1], attributes: attrsOf(match[2]), children: [],
        text: '', start: at, openEnd: end + 1,
        closeStart: singleton ? at : -1, end: singleton ? end + 1 : -1,
      };
      if (stack.length) stack[stack.length - 1].children.push(node);
      else if (root) throw new Error('PSI116_XML_MULTIPLE_ROOTS');
      else root = node;
      if (!singleton) stack.push(node);
    }
    at = end + 1;
  }
  if (!root || stack.length) throw new Error('PSI116_XML_UNCLOSED_DOCUMENT');
  return root;
}
const local = node => String(node?.name || '').split(':').at(-1);
const direct = (node, name) => node.children.filter(child => local(child) === name);
const first = (node, name) => direct(node, name)[0] || null;
const textOf = (node, name) => pythonWhitespaceTrim(first(node, name)?.text ?? '');
function descendants(node, name, found = []) {
  if (local(node) === name) found.push(node);
  for (const child of node.children) descendants(child, name, found);
  return found;
}
// Strict Python int(str) and float(str) decimal grammars. Disallow JS
// Number() extras such as 0x10; accept underscores only between digits.
// For large integers, use an exact decimal string for the Python adapter.
const PY_DIGIT = '\\p{Nd}(?:_?\\p{Nd})*';
const PY_INT = new RegExp('^[+-]?' + PY_DIGIT + '$', 'u');
const PY_FLOAT = new RegExp(
  '^[+-]?(?:' + PY_DIGIT + '(?:\\.(?:' + PY_DIGIT + ')?)?|\\.' +
  PY_DIGIT + ')(?:[eE][+-]?' + PY_DIGIT + ')?$', 'u');
const IS_DECIMAL = /^\p{Nd}$/u;
function pythonWhitespaceTrim(value) {
  // Python str.strip() uses Unicode White_Space plus U+001C..U+001F.
  // JS String.trim() additionally strips U+FEFF, but Python does NOT.
  return String(value ?? '').replace(/^[\p{White_Space}\u001C-\u001F]+|[\p{White_Space}\u001C-\u001F]+$/gu, '');
}
function toAsciiDecimalDigits(value) {
  return value.replace(/\p{Nd}/gu, digit => {
    const code = digit.codePointAt(0);
    let first = code;
    while (first > 0 && IS_DECIMAL.test(String.fromCodePoint(first - 1))) first -= 1;
    return String((code - first) % 10);
  });
}
function intOrNull(value) {
  const text = pythonWhitespaceTrim(value);
  if (!PY_INT.test(text)) return null;
  const number = BigInt(toAsciiDecimalDigits(text).replaceAll('_', ''));
  return number <= BigInt(Number.MAX_SAFE_INTEGER) &&
    number >= -BigInt(Number.MAX_SAFE_INTEGER)
    ? Number(number)
    : String(number);
}
function floatOrNull(value) {
  const text = pythonWhitespaceTrim(value);
  if (!PY_FLOAT.test(text)) return null;
  const valueNumber = Number(toAsciiDecimalDigits(text).replaceAll('_', ''));
  return Number.isFinite(valueNumber) ? valueNumber : null;
}
function positionOrNull(value) {
  const tokens = String(value || '').match(NUMBER) || [];
  if (tokens.length < 3) return null;
  const numbers = tokens.slice(0, 3).map(Number);
  return numbers.every(Number.isFinite)
    ? {x: numbers[0], y: numbers[1], z: numbers[2]} : null;
}
function namespaceOf(root) {
  const prefix = root.name.includes(':') ? root.name.split(':')[0] : '';
  return root.attributes[prefix ? 'xmlns:' + prefix : 'xmlns'] || '';
}
function tailAfterNode(xmlText, node) {
  const start = node.end;
  const next = xmlText.indexOf('<', start);
  return xmlText.slice(start, next < 0 ? xmlText.length : next);
}
function lossPath(path, item) {return path + '/' + local(item);}
function unmappedLosses(doc, root, xmlText) {
  let next = 0;
  const structural = new Set(['PipeStressExport', 'Branch', 'Branchname', 'Node', ...NODE_FIELDS]);
  function append(kind, path, raw) {
    next += 1;
    doc.lossContract.push(createUxmlLoss({
      id: 'PSI116-LOSS-' + String(next).padStart(6, '0'),
      severity: 'WARNING', code: 'PSI116_RAW_SOURCE_ONLY_NOT_SEMANTICALLY_CARRIED',
      sourceId: 'PSI116-SOURCE',
      message: kind + ' at ' + path + ' retained in original-source snapshot only',
      details: {kind, sourcePath: path, raw: raw.slice(0, 512)},
    }));
  }
  function walk(node, path) {
    if (!structural.has(local(node))) append('ELEMENT', path, xmlText.slice(node.start, node.end));
    // Namespace declarations are carried by doc.psi116.namespace.
    for (const [key, value] of Object.entries(node.attributes)) {
      if ((key === 'xmlns' || key.startsWith('xmlns:')) && local(node) === 'PipeStressExport') continue;
      append('ATTRIBUTE', path + '/@' + key, value);
    }
    node.children.forEach((child, index) => walk(child, lossPath(path, child) + '[' + index + ']'));
  }
  walk(root, '/PipeStressExport[0]');
}
/**
 * TopoFix source record model:
 *   branch_index = enumerate(all descendant Branch) from ZERO,
 *   source_index = enumerate(direct child Node) from ZERO,
 *   node_number = Python int(...) or None,
 *   key = B{branch_index}:N{number|'none'}:S{source_index}.
 * Never use component-occurrence grouping for recordKey.
 */
export function mapPsi116ToUxml(xmlText, {fileSha256} = {}) {
  if (!/^[a-f0-9]{64}$/i.test(String(fileSha256 || ''))) throw new Error('PSI116_MEASURED_FILE_SHA256_REQUIRED');
  const report = detectUxmlProfile(xmlText);
  if (report.profile !== XML_PROFILES.PSI116) throw new Error('PSI116_VERIFIED_NAMESPACE_REQUIRED');
  const root = parseDocument(xmlText);
  const namespace = namespaceOf(root);
  if (local(root) !== 'PipeStressExport' || !VERIFIED_NAMESPACES.has(namespace))
    throw new Error('PSI116_VERIFIED_NAMESPACE_REQUIRED');

  const sha256 = String(fileSha256).toLowerCase();
  const doc = createUxmlDocument({
    header: createUxmlHeader({createdBy: 'UXML-S1/PSI116', notes: 'Read-only; patch original via sourceRefs, never rebuild.'}),
    sources: [createUxmlSource({
      id: 'PSI116-SOURCE', format: SOURCE_FORMATS.PSI116,
      name: 'original-psi116.xml', hash: sha256,
      // Immutable original text custody for equal-source resolution only.
      // This is NOT a format writer and must not be rebuilt for export.
      sourceText: xmlText, namespace,
      namespaceDeclarations: Object.fromEntries(Object.entries(root.attributes)
        .filter(([name]) => name === 'xmlns' || name.startsWith('xmlns:'))),
    })],
    psi116: {readerSchema: UXML_PSI116_MAPPER_SCHEMA, namespace,
      sourceFormat: 'PSI116', sourceSha256: sha256,
      recordKeyRule: 'B{zeroBasedBranchIndex}:N{numberOrNone}:S{zeroBasedSourceIndex}',
      outputPolicy: 'PATCH_ORIGINAL_RECORDS_BY_SOURCE_REFS_ONLY'},
  });
  const branches = descendants(root, 'Branch');
  let recordCount = 0;
  branches.forEach((branch, branchIndex) => {
    const branchName = textOf(branch, 'Branchname');
    doc.pipelines.push(createUxmlPipeline({
      id: 'PSI116-BRANCH-' + branchIndex,
      pipelineRef: 'PSI116-BRANCH-' + branchIndex, lineKey: branchName, lineNo: branchName,
      rawAttributes: {branchIndex, branchName},
    }));
    direct(branch, 'Node').forEach((node, sourceIndex) => {
      const rawType = textOf(node, 'ComponentType').toUpperCase();
      const componentType = PARSER_ALIASES[rawType] || rawType || 'PIPE';
      const nodeNumber = intOrNull(textOf(node, 'NodeNumber'));
      const endpoint = intOrNull(textOf(node, 'Endpoint'));
      const recordKey = 'B' + branchIndex + ':N' +
        (nodeNumber == null ? 'none' : nodeNumber) + ':S' + sourceIndex;
      const position = positionOrNull(textOf(node, 'Position'));
      const connectionType = textOf(node, 'ConnectionType').toUpperCase();
      const rawRef = {
        format: 'PSI116', fileSha256: sha256, recordKey, branchName, nodeNumber, endpoint,
      };
      const componentId = 'PSI116-' + recordKey;
      const raw = {
        branchIndex, sourceIndex, branchName, recordKey,
        nodeNumber, nodeName: textOf(node, 'NodeName'), endpoint,
        componentType, rawComponentType: rawType,
        componentRefNo: textOf(node, 'ComponentRefNo'),
        connectionType, position,
        rigid: intOrNull(textOf(node, 'Rigid')),
        weight: floatOrNull(textOf(node, 'Weight')),
        outsideDiameter: floatOrNull(textOf(node, 'OutsideDiameter')),
        wallThickness: floatOrNull(textOf(node, 'WallThickness')),
        bendRadius: floatOrNull(textOf(node, 'BendRadius')),
        alphaAngle: floatOrNull(textOf(node, 'AlphaAngle')),
        hasRestraint: !!first(node, 'Restraint'),
        rawXml: xmlText.slice(node.start, node.end),
        rawTail: tailAfterNode(xmlText, node),
      };
      const component = createUxmlComponent({
        id: componentId,
        sourceRefs: [{...rawRef}],
        type: componentType,
        // A Node row is NOT necessarily a whole pipe/component. This
        // explicit record type avoids invented EP1/EP2/bore/span geometry.
        normalizedType: 'UNKNOWN', // record-only, not an invented physical pipe/port
        pipelineRef: 'PSI116-BRANCH-' + branchIndex,
        refNo: raw.componentRefNo, seqNo: String(sourceIndex),
        name: raw.nodeName, bore: raw.outsideDiameter,
        rawAttributes: {psi116: raw},
        normalized: {sourceRecordOnly: true},
        confidence: CONFIDENCE_LEVELS.EXACT_SOURCE,
      });
      doc.components.push(component);
      if (position) {
        const anchorId = componentId + ':POS';
        const portId = componentId + ':PORT';
        doc.anchors.push(createUxmlAnchor({
          id: anchorId, componentId, role: 'POS', point: position,
          nodeNumber: nodeNumber == null ? '' : String(nodeNumber),
          nodeLabel: raw.nodeName, sourceRef: {...rawRef},
          sourceField: 'Position', confidence: CONFIDENCE_LEVELS.EXACT_SOURCE,
        }));
        doc.ports.push(createUxmlPort({
          id: portId, componentId, anchorId, role: 'PSI116_SOURCE_RECORD_POINT',
          point: position, bore: raw.outsideDiameter,
          sourceRefs: [{...rawRef}], fixed: true, futureMovable: false,
          mutableNow: false, connectsTo: 'UNQUALIFIED_SOURCE_RECORD',
        }));
        component.anchorIds.push(anchorId);
        component.portIds.push(portId);
      }
      if (raw.hasRestraint) {
        const supportId = componentId + ':RESTRAINT';
        doc.supports.push(createUxmlSupport({
          id: supportId, componentId, type: 'PSI116_RESTRAINT_PRESENCE',
          supportAnchorId: component.anchorIds[0] || '',
          restraints: [{sourceRefs: [{...rawRef}], present: true,
            status: 'DETAILS_RAW_XML_ONLY'}],
        }));
        component.supportId = supportId;
      }
      if (connectionType === 'CLOS') {
        doc.topologyHints.push(createUxmlTopologyHint({
          id: componentId + ':CLOS',
          type: 'PSI116_DECLARED_CLOS_NOT_A_CONNECTION',
          componentId, portId: component.portIds[0] || '',
          sourceRefs: [{...rawRef}],
          confidence: CONFIDENCE_LEVELS.EXACT_SOURCE,
          reason: 'CLOS declaration preserved for TopoFix Python port/witness rules; never infer connection in UXML',
        }));
      }
      recordCount += 1;
    });
  });
  doc.psi116.branchCount = branches.length;
  doc.psi116.sourceNodeRecordCount = recordCount;
  unmappedLosses(doc, root, xmlText);
  // UxmlValidationGate can warn about rich sourceRef objects or raw-only
  // semantics. Never silently claim physical topology/transaction readiness.
  const checked = validateUxmlDocument(doc);
  doc.validation = {
    schema: checked.schema, ready: checked.ready,
    blockerCodes: checked.blockers.map(item => item.code),
    warningCodes: checked.warnings.map(item => item.code),
    outputPolicy: 'READ_ONLY_HUB_ONLY',
  };
  return doc;
}

/**
 * UXML v2 (revamp step 1): the same strict structural parse, exported so the v2
 * reader keeps exact byte offsets (start/openEnd/closeStart/end) per element.
 */
export function parsePsi116Structure(xmlText) {
  return parseDocument(xmlText);
}
