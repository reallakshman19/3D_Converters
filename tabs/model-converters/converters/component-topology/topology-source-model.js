import { createSourceEnvelope } from '../../../universal-enrichment-workbench/source-envelope.js';
import { assignSourceEntityIds } from '../../../universal-enrichment-workbench/graph-identity.js';
import { cleanText, componentCategory, normalizePoint, pointDistance } from './topology-values.js';

/** @param {unknown} value @returns {Record<string, unknown>} */
function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

/** @param {Record<string, unknown>} source @returns {Record<string, unknown>} */
function attributes(source) {
  return record(source.attributes);
}

/** @param {Record<string, unknown>} source @returns {Record<string, unknown>} */
function enrichedAttributes(source) {
  return record(source.enrichedAttributes);
}

/** @param {Record<string, unknown>} source @returns {string} */
function sourceType(source) {
  return cleanText(source.type || attributes(source).TYPE).toUpperCase();
}

/** @param {Record<string, unknown>} source @returns {string} */
function sourceName(source) {
  const attrs = attributes(source);
  return cleanText(source.name || attrs.NAME);
}

/** @param {Record<string, unknown>} source @returns {string} */
function sourceRef(source) {
  return cleanText(attributes(source).REF);
}

/** @param {Record<string, unknown>} source @param {string} field @returns {Record<string, number>|null} */
function point(source, field) {
  return normalizePoint(attributes(source)[field]);
}

/** @param {Record<string, unknown>} source @returns {boolean} */
function routeBearing(source) {
  return ['PIPE', 'ELBO', 'BEND', 'TEE', 'OLET', 'VALV', 'VALVE', 'FLAN', 'FLANGE', 'GASK', 'GASKET', 'INST', 'REDU', 'REDUCER'].includes(sourceType(source));
}

/** @param {Record<string, unknown>} component @param {number} toleranceMm @returns {Record<string, unknown>} */
function geometry(component, toleranceMm) {
  const from = point(component, 'APOS');
  const middle = point(component, 'POS');
  const to = point(component, 'LPOS');
  const finiteSpan = Boolean(from && to && pointDistance(from, to) > toleranceMm);
  return {
    from,
    middle,
    to,
    finiteSpan,
    spanLengthMm: finiteSpan ? pointDistance(from, to) : 0,
    geometryClassification: finiteSpan ? 'FINITE_SPAN' : (middle || from || to ? 'POINT' : 'NONE'),
  };
}

/** @param {Record<string, unknown>} branch @param {number} branchIndex @param {number} order @param {number} toleranceMm @param {string} rootPath @returns {Record<string, unknown>} */
function branchDescriptor(branch, branchIndex, order, toleranceMm, rootPath) {
  const path = `${rootPath}[${branchIndex}]`;
  const attrs = attributes(branch);
  const children = Array.isArray(branch.children) ? branch.children : [];
  const descriptor = {
    sourcePath: path,
    sourceType: sourceType(branch) || 'BRANCH',
    name: sourceName(branch),
    sourceRef: sourceRef(branch),
    attributes: attrs,
    order,
    sourceBranchEntityId: '',
    sourceBranchName: '',
    isRouteComponent: false,
    components: children.map((child, childIndex) => {
      const source = record(child);
      const componentPath = `${path}.children[${childIndex}]`;
      const type = sourceType(source);
      return {
        sourcePath: componentPath,
        sourceType: type,
        name: sourceName(source),
        sourceRef: sourceRef(source),
        attributes: attributes(source),
        enrichedAttributes: enrichedAttributes(source),
        order: order + childIndex + 1,
        sourceBranchEntityId: '',
        sourceBranchName: '',
        isRouteComponent: routeBearing(source),
        category: componentCategory(type),
        ...geometry(source, toleranceMm),
      };
    }),
  };
  return descriptor;
}

/** @param {Record<string, unknown>[]} entities @param {string} sourceFileId @returns {Promise<Record<string, unknown>[]>} */
async function assignEntityIds(entities, sourceFileId) {
  const requests = entities.map((entity) => ({
    sourceFileId,
    sourceKind: 'stagedjson',
    sourcePath: entity.sourcePath,
    entityKind: 'json-object',
  }));
  const ids = await assignSourceEntityIds(requests);
  return entities.map((entity, index) => ({ ...entity, sourceEntityId: ids[index] }));
}

/** @param {Record<string, unknown>[]} entities @param {string} sourceFileId @returns {Promise<Record<string, unknown>[]>} */
async function assignPortIds(entities, sourceFileId) {
  const descriptors = entities.flatMap((entity) => {
    const fields = entity.sourceType === 'BRANCH'
      ? [['HPOS', 'H'], ['TPOS', 'T']]
      : [['APOS', 'A'], ['POS', 'P'], ['LPOS', 'L']];
    return fields.flatMap(([field, role]) => {
      const position = normalizePoint(entity.attributes[field]);
      if (!position) return [];
      return [{
        sourceEntityId: entity.sourceEntityId,
        sourcePath: `${entity.sourcePath}.attributes.${field}`,
        sourceType: entity.sourceType,
        field,
        role,
        position,
      }];
    });
  });
  const requests = descriptors.map((port) => ({
    sourceFileId,
    sourceKind: 'stagedjson',
    sourcePath: port.sourcePath,
    entityKind: 'json-object',
  }));
  const ids = await assignSourceEntityIds(requests);
  return descriptors.map((port, index) => ({
    ...port,
    key: `${port.sourceEntityId}:${port.role}`,
    sourcePortId: ids[index],
  }));
}

/** @param {Record<string, unknown>[]} entities @param {Record<string, unknown>[]} ports @returns {Record<string, unknown>[]} */
function attachPorts(entities, ports) {
  const byEntity = new Map();
  for (const port of ports) byEntity.set(port.sourceEntityId, [...(byEntity.get(port.sourceEntityId) ?? []), port]);
  return entities.map((entity) => ({ ...entity, ports: Object.freeze(byEntity.get(entity.sourceEntityId) ?? []) }));
}

/** @param {string} sourceText @param {{sourceName:string,sourceRevision?:number,toleranceMm:number}} options @returns {Promise<Readonly<Record<string, unknown>>>} */
export async function buildTopologySourceModel(sourceText, options) {
  const revision = Number(options.sourceRevision);
  if (!Number.isInteger(revision) || revision < 1) throw new TypeError('Managed-stage sourceRevision must be a positive integer.');
  const envelope = await createSourceEnvelope({
    sourceText,
    sourceKind: 'stagedjson',
    sourceName: options.sourceName,
    origin: 'file',
    revision,
  });
  if (!envelope.validation.ok) throw new TypeError(`Invalid managed-stage source: ${envelope.validation.errors.join('; ')}`);
  const parsed = JSON.parse(envelope.sourceText);
  const parsedRecord = record(parsed);
  const rawBranches = Array.isArray(parsed) ? parsed : (
    Array.isArray(parsedRecord.objects) ? parsedRecord.objects
      : Array.isArray(parsedRecord.hierarchy) ? parsedRecord.hierarchy : parsedRecord.branches
  );
  if (!Array.isArray(rawBranches) || !rawBranches.length) throw new TypeError('Managed-stage source must contain a non-empty branch array.');
  const rootPath = Array.isArray(parsed) ? '$' : Array.isArray(parsedRecord.objects) ? '$.objects'
    : Array.isArray(parsedRecord.hierarchy) ? '$.hierarchy' : '$.branches';
  let order = 0;
  const bareBranches = rawBranches.map((branch, branchIndex) => {
    const descriptor = branchDescriptor(record(branch), branchIndex, order, options.toleranceMm, rootPath);
    order += descriptor.components.length + 1;
    return descriptor;
  });
  const bareEntities = bareBranches.flatMap((branch) => [branch, ...branch.components]);
  const identifiedEntities = await assignEntityIds(bareEntities, envelope.sourceFileId);
  const ports = await assignPortIds(identifiedEntities, envelope.sourceFileId);
  const entities = attachPorts(identifiedEntities, ports);
  const entityByPath = new Map(entities.map((entity) => [entity.sourcePath, entity]));
  const branches = bareBranches.map((branch) => {
    const identified = entityByPath.get(branch.sourcePath);
    const components = branch.components.map((component) => ({
      ...entityByPath.get(component.sourcePath),
      sourceBranchEntityId: identified.sourceEntityId,
      sourceBranchName: identified.name,
    }));
    return Object.freeze({ ...identified, components: Object.freeze(components) });
  });
  return Object.freeze({
    schema: 'ComponentTopologySourceModel.v1',
    sourceIdentity: Object.freeze({
      schema: 'SourceEnvelope.v1',
      entityIdentitySchema: 'UniversalSourceGraph.v1',
      sourceFileId: envelope.sourceFileId,
      contentHash: envelope.contentHash,
      sourceName: envelope.sourceName,
      sourceKind: envelope.sourceKind,
      sourceRevision: envelope.revision,
    }),
    branches: Object.freeze(branches),
    components: Object.freeze(branches.flatMap((branch) => branch.components)),
    entities: Object.freeze(branches.flatMap((branch) => [branch, ...branch.components])),
    sourcePorts: Object.freeze(ports),
  });
}

export const _test = Object.freeze({
  record, attributes, enrichedAttributes, sourceType, sourceName, sourceRef,
  point, routeBearing, geometry, branchDescriptor, assignEntityIds, assignPortIds, attachPorts,
});
