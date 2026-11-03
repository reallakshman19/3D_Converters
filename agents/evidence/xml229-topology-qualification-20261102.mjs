// Isolated read-only qualification of original occurrence/route semantics.
import {preparePreviewNodeOccurrenceDocument} from '/source/tabs/xml-cii-2019-standalone/ui-adapted/xml-cii-adapted-preview-node-occurrence-ledger.js';
import {collectXmlCiiTopologyElementLengthAssignments} from '/source/converters/xml-cii2019-core/topology/xml-cii-topology-element-length.js';

const BRANCH = '/ASIM-1836-8"-P8810021-31441C4-PP/B4';
const parse = s => new DOMParser().parseFromString(s, 'application/xml');
const field = (n, k) => [...n.children].find(c => c.localName === k)?.textContent.trim() || '';
const children = (n, k) => [...n.children].filter(c => c.localName === k);
const xml = doc => new XMLSerializer().serializeToString(doc);
const shape = n => [n.localName || '#document', [...(n.attributes || [])].map(a => [a.name, a.value]),
  [...n.childNodes].filter(c => c.nodeType === 1 || (c.nodeType === 3 && c.textContent.trim()))
    .map(c => c.nodeType === 3 ? c.textContent.trim() : shape(c))];

function station(doc) {
  const b = [...doc.getElementsByTagName('Branch')].find(n => field(n, 'Branchname') === BRANCH);
  return children(b, 'Node').filter(n => ['50', '60'].includes(field(n, 'NodeNumber')))
    .map(n => ({number: field(n, 'NodeNumber'), name: field(n, 'NodeName'), position: field(n, 'Position')}));
}

function node(number, x, y, z) {
  return `<Node><NodeNumber>${number}</NodeNumber><Endpoint>0</Endpoint><ComponentType>TUBE</ComponentType><Position>${x} ${y} ${z}</Position></Node>`;
}

function disconnectedInput() {
  return '<CleanXML><Branch><Branchname>CONTROL-A</Branchname>'
    + node(10, 0, 0, 0) + node(20, 100, 0, 0) + node(30, 200, 0, 0)
    + '</Branch><Branch><Branchname>CONTROL-B</Branchname>'
    + node(40, 100, -100, 0) + node(50, 100, 0, 0) + node(60, 100, 100, 0)
    + '</Branch></CleanXML>';
}

function originalCase(source) {
  const sourceDoc = parse(source), before = JSON.stringify(shape(sourceDoc));
  const prepared = preparePreviewNodeOccurrenceDocument({xmlText: source, sourceDocument: sourceDoc});
  const lengths = collectXmlCiiTopologyElementLengthAssignments(source);
  const rows = prepared.ledger.allByBranch[0];
  const aliases = rows.filter(r => [7, 8].includes(r.sourceNodeOrdinal));
  const olet = rows.filter(r => [9, 10, 11, 12].includes(r.sourceNodeOrdinal));
  const keys = prepared.ledger.allByBranch.flatMap(b => b.map(r => `${r.branchOccurrenceIndex}:${r.sourceNodeOrdinal}`));
  const unchanged = before === JSON.stringify(shape(sourceDoc));
  return {id: 'original-EF-occurrence-and-route', status:
    unchanged && new Set(keys).size === keys.length && aliases.every(r => r.status === 'retained')
      && olet.filter(r => r.dropReason === 'OLET_GEOMETRY_HELPER').length === 3 ? 'PASS' : 'FAIL',
    originalUnchanged: unchanged, ledgerCount: prepared.ledger.originalCount,
    uniqueOccurrenceKeys: new Set(keys).size, retained: prepared.ledger.retainedCount,
    dropped: prepared.ledger.droppedCount, aliases, olet,
    stationAfterCleanup: station(prepared.document),
    stationLengths: lengths.assignments.filter(r => r.branchName === BRANCH && ['50', '60'].includes(r.nodeNumber)),
    stationSkips: lengths.skipped.filter(r => r.branchName === BRANCH && ['50', '60'].includes(r.nodeNumber)),
    expectation: 'Original ordinals distinguish all occurrences. Adjacent ATTA aliases stay in the working DOM; OLET anonymous helper witnesses are classified without erasing source lineage.',
  };
}

function crossingCase() {
  const input = disconnectedInput();
  const prepared = preparePreviewNodeOccurrenceDocument({xmlText: input});
  const lengths = collectXmlCiiTopologyElementLengthAssignments(input);
  const byBranch = [...prepared.document.getElementsByTagName('Branch')].map(b => ({
    branch: field(b, 'Branchname'), nodes: children(b, 'Node').map(n => ({number: field(n, 'NodeNumber'), position: field(n, 'Position')})),
  }));
  return {id: 'disconnected-interior-crossing', status: lengths.assignments.length === 4
      && byBranch.length === 2 && byBranch.every(b => b.nodes.length === 3) ? 'PASS' : 'FAIL',
    inputBasis: 'Explicit synthetic two-branch crossing, distinct positive node identities and no connection witness.',
    byBranch, assignments: lengths.assignments,
    expectation: 'Two branch routes; equal XYZ at nodes20/50 does not create a cross-branch edge or shared vertex.',
  };
}

function helperAuthorityCase(source) {
  const doc = parse(source);
  const helper = [...doc.getElementsByTagName('Node')].find(n => field(n, 'ComponentRefNo') === '=1006649732/119347' && field(n, 'Endpoint') === '3');
  const name = children(helper, 'NodeName')[0] || doc.createElementNS(helper.namespaceURI, 'NodeName');
  name.textContent = 'CONTROLLED-NAMED-HELPER';
  if (!name.parentNode) helper.appendChild(name);
  try {
    preparePreviewNodeOccurrenceDocument({xmlText: xml(doc)});
    return {id: 'negative-helper-authority-conflict', status: 'FAIL', observed: 'No rejection'};
  } catch (error) {
    return {id: 'negative-helper-authority-conflict', status: error.code === 'OLET_HELPER_AUTHORITY_CONFLICT' ? 'PASS' : 'FAIL',
      code: error.code, message: error.message,
      expectation: 'A named negative helper cannot be silently dropped as geometry-only.',
      inputBasis: 'Original XML with one explicit in-memory helper-name mutation.',
    };
  }
}

export async function runReproduction() {
  const source = await (await fetch('/fixture.xml')).text();
  return {schema: 'XML229.OriginalTopologyQualification.v1', candidate: '5c39dd7bdbb7f2f63a686823b72bdb81909d52af',
    browser: navigator.userAgent, cases: [originalCase(source), crossingCase(), helperAuthorityCase(source)],
    limits: ['No new physical-vertex graph or production mutation.', 'Native reader results are recorded separately.',
      'Helper cleanup does not authorize a restraint or mass owner; exact private21 and engineering release NOT_RUN.']};
}
