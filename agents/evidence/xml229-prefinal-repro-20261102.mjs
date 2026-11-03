// Read-only benchmark-derived reproduction; production modules are Git-pinned.
import {prepareXml229PrefinalRestraints} from '/source/tabs/xml-cii-2019-standalone/integration/xml229-prefinal-restraints.mjs';
import {closeGovernedMdsPositionRestraintsXml} from '/source/tabs/xml-cii-2019-standalone/xml-cii-mds-restraint-closure.js';
import {buildStandaloneDtxrResolutionLedger} from '/source/tabs/xml-cii-2019-standalone/xml-cii-trace-resolution-ledger.js';

const BRANCH = '/ASIM-1836-8"-P8810021-31441C4-PP/B4';
const POSITION = '459657.72 -1481227.40 101259.55';
const NAMES = ['PS-14167/DATUM', 'PS-14167/SREF'];
const CONFIG = {
  defaultStiffness: '1751270000000', defaultGap: '0', defaultFriction: '0.3',
  resolverJsonTrace: {coordinateTolerance: 6},
};
const parse = value => new DOMParser().parseFromString(value, 'application/xml');
const childText = (node, name) => [...node.children].find(c => c.localName === name)?.textContent.trim() || '';
const serialize = doc => new XMLSerializer().serializeToString(doc);

function targetNodes(doc) {
  const branch = [...doc.getElementsByTagName('Branch')].find(b => childText(b, 'Branchname') === BRANCH);
  return [...branch.children].filter(n => n.localName === 'Node' && NAMES.includes(childText(n, 'NodeName')));
}

function members(six = false) {
  const specs = six
    ? [['REST', '0'], ['REST', '0'], ['GUIDE', '6'], ['GUIDE', '6'], ['LINESTOP', '20'], ['LINESTOP', '20']]
    : [['REST', '0'], ['GUIDE', '6']];
  return specs.map(([kind, gap], i) => ({type: kind, name: `CONTROLLED-${kind}-${i + 1}`,
    attributes: {DTXR: kind, NAME: six ? `/PS-14167/MEMBER-${i + 1}` : `/${NAMES[i]}`,
      CMPSUPGAP: `${gap}mm GAP`, NODEGAP: gap},
  }));
}

function staged(sourceMembers) {
  return JSON.stringify([{type: 'BRANCH', name: BRANCH, children: [{
    type: 'DTXR_POS', attributes: {POSI: POSITION}, children: sourceMembers,
  }]}]);
}

function withoutSecondAlias(xml) {
  const doc = parse(xml);
  const second = targetNodes(doc).find(n => childText(n, 'NodeNumber') === '60');
  if (!second) throw new Error('Benchmark alias 60 not found');
  second.remove();
  return serialize(doc);
}

function summarize(doc) {
  return targetNodes(doc).map(n => ({
    nodeNumber: childText(n, 'NodeNumber'), name: childText(n, 'NodeName'),
    componentRef: childText(n, 'ComponentRefNo'), position: childText(n, 'Position'),
    restraints: [...n.children].filter(c => c.localName === 'Restraint').map(r =>
      Object.fromEntries([...r.children].map(c => [c.localName, c.textContent.trim()]))),
  }));
}

function protectedShape(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent.trim() || null;
  if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_NODE) return null;
  if (node.localName === 'Restraint') return null;
  return [node.localName || '#document', [...(node.attributes || [])].map(a => [a.name, a.value]).sort(),
    [...node.childNodes].map(protectedShape).filter(v => v !== null)];
}

function ledgerTargets(xml, json) {
  return buildStandaloneDtxrResolutionLedger(xml, json, CONFIG).records
    .filter(r => r.xmlBranch === BRANCH && NAMES.includes(r.xmlNodeName))
    .map(r => ({xmlIndex: r.xmlIndex, node: r.xmlNodeNumber, status: r.status,
      branchRelationship: r.branchRelationship, distanceMm: r.distanceMm,
      members: r.positionMembers.map(m => ({sourcePath: m.sourcePath, name: m.name, type: m.type})),
    }));
}

function valuesPreserved(nodes) {
  const gapByType = {'+Y': '0', GUI: '6', LIM: '20'};
  return nodes.every(n => n.restraints.every(r =>
    r.Gap === gapByType[r.Type] && r.Stiffness === CONFIG.defaultStiffness
    && r.Friction === (r.Type === '+Y' ? CONFIG.defaultFriction : '-1.010100')));
}

async function runCase(id, xml, sourceMembers, expected, config = CONFIG) {
  const json = staged(sourceMembers);
  const result = {id, expected, config, declaredSourceMembers: sourceMembers, inputNodes: summarize(parse(xml))};
  try {
    result.ledger = ledgerTargets(xml, json);
    const direct = closeGovernedMdsPositionRestraintsXml(xml, json, config, {requireUnambiguous: true});
    result.directClosure = {nodes: summarize(parse(direct.xmlText)), stats: direct.stats};
    const prepared = await prepareXml229PrefinalRestraints({xmlText: xml, stagedJsonText: json, config});
    result.actualNodes = summarize(prepared.document);
    result.actualMemberCount = result.actualNodes.reduce((n, node) => n + node.restraints.length, 0);
    result.nonRestraintShapePreserved = JSON.stringify(protectedShape(parse(xml))) === JSON.stringify(protectedShape(prepared.document));
    result.materializedValuesPreserved = valuesPreserved(result.actualNodes);
    const again = await prepareXml229PrefinalRestraints({xmlText: serialize(prepared.document), stagedJsonText: json, config});
    result.idempotentTargetRestraints = JSON.stringify(summarize(again.document)) === JSON.stringify(result.actualNodes);
    result.proof = prepared.proof;
    result.status = result.actualMemberCount === expected.memberCount ? 'PASS' : 'FAIL';
  } catch (error) {
    result.status = 'ERROR';
    result.error = {message: error.message, code: error.code || null, stack: error.stack};
  }
  return result;
}

export async function runReproduction() {
  const xml = await (await fetch('/fixture.xml')).text();
  const oneAlias = withoutSecondAlias(xml);
  const baseline = summarize(parse(xml));
  if (baseline.length !== 2 || baseline.some(n => n.position !== POSITION || n.restraints.length))
    throw new Error('Unqualified benchmark station');
  const cases = [];
  cases.push(await runCase('single-alias-two-members', oneAlias, members(), {
    memberCount: 2, oracle: 'Controlled source declares REST and GUIDE once at one retained occurrence.',
  }));
  cases.push(await runCase('benchmark-aliases-two-members', xml, members(), {
    memberCount: 2, oracle: 'Owner connected-node contract: adjacent zero-span ATTA aliases share one station; each source member once.',
  }));
  cases.push(await runCase('single-alias-six-members', oneAlias, members(true), {
    memberCount: 6, oracle: 'Controlled cardinality challenge: six distinct declared source paths; physical compatibility/independent ownership is NOT qualified.',
  }));
  cases.push(await runCase('json-disabled-control', xml, members(), {
    memberCount: 0, oracle: 'Original station has no restraints; both JSON closure and ATTA fallback explicitly return when useJsonForRestraints is false (pinned fallback lines110-120).',
  }, {...CONFIG, supportMapping: {version: 2, useJsonForRestraints: false, rules: [], kindProfiles: {}}}));
  return {schema: 'XML229.PrefinalBoundaryReproduction.v1', candidate: '5c39dd7bdbb7f2f63a686823b72bdb81909d52af',
    browser: navigator.userAgent, inputBasis: 'Original EF-05 XML plus explicitly controlled staged JSON; single-alias cases are derived XML.',
    configuration: CONFIG, baseline, cases, limitations: ['Not the unavailable private 21-ambiguity run.',
      'Six-member case demonstrates representation cardinality only; it does not establish engineering compatibility.',
      'No rigid split, native CII export, Final acceptance or engineering release performed.']};
}
