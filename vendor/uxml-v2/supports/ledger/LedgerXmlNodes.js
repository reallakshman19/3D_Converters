import { text, decodeEntities, parseStandaloneDtxrPoint, pointLabel } from './LedgerPrimitives.js';

function attrsFromTag(tag) {
  const attrs = {};
  String(tag || '').replace(/([A-Za-z_][\w:.-]*)\s*=\s*["']([^"']*)["']/g, (_, key, value) => {
    attrs[key] = decodeEntities(value);
    return '';
  });
  return attrs;
}

function firstAttr(attrs, keys) {
  for (const key of keys) if (text(attrs[key])) return text(attrs[key]);
  return '';
}

function findXmlBranchPositions(sourceText) {
  const matches = [];
  const re = /<(Branchname|LineNo|LineKey|BranchName)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  while ((match = re.exec(sourceText))) matches.push({ name: decodeEntities(match[2]), index: match.index });
  return matches;
}

function activeBranchAt(index, branchPositions) {
  let active = '';
  let bestIndex = -1;
  for (const item of branchPositions) {
    if (item.index < index && item.index > bestIndex) {
      active = item.name;
      bestIndex = item.index;
    }
  }
  return active;
}

function xmlTagValue(body, tagName) {
  const match = body.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? decodeEntities(match[1]) : '';
}

function descriptorFromNodeBlock(body, charIndex, xmlIndex, branchPositions) {
  const positionRaw = xmlTagValue(body, 'Position') || xmlTagValue(body, 'DTXR_POS') || xmlTagValue(body, 'DtxrPos');
  const xmlPoint = parseStandaloneDtxrPoint(positionRaw);
  const nodeNumber = xmlTagValue(body, 'NodeNumber');
  const nodeName = xmlTagValue(body, 'NodeName');
  const componentRefNo = xmlTagValue(body, 'ComponentRefNo');
  const existingPs = xmlTagValue(body, 'DTXR_PS') || xmlTagValue(body, 'DtxrPs');
  return {
    xmlIndex,
    tagName: 'Node',
    attrs: {},
    nodeKeys: [nodeNumber].filter(Boolean),
    xmlNodeNumber: nodeNumber,
    xmlNodeName: nodeName,
    componentType: xmlTagValue(body, 'ComponentType'),
    componentRefNo,
    xmlBranch: activeBranchAt(charIndex, branchPositions),
    branchName: activeBranchAt(charIndex, branchPositions),
    xmlPosition: positionRaw,
    xmlPoint,
    posPoint: xmlPoint,
    posKey: xmlPoint ? pointLabel(xmlPoint) : positionRaw,
    psKey: nodeName || existingPs || componentRefNo,
  };
}

export function parseStandaloneDtxrXmlNodes(sourceText) {
  const source = String(sourceText || '');
  const branchPositions = findXmlBranchPositions(source);
  const nodes = [];
  const nodeBlockRe = /<Node\b[^>]*>([\s\S]*?)<\/Node>/gi;
  let match;
  while ((match = nodeBlockRe.exec(source))) {
    nodes.push(descriptorFromNodeBlock(match[1], match.index, nodes.length + 1, branchPositions));
  }
  if (nodes.length) return nodes;

  const openingTagRe = /<\s*(?!\/|\?|!)(?:[A-Za-z_][\w.-]*:)?([A-Za-z_][\w.-]*)\b[^>]*>/g;
  while ((match = openingTagRe.exec(source))) {
    const attrs = attrsFromTag(match[0]);
    const nodeKeys = ['NODE', 'Node', 'node', 'FROM_NODE', 'TO_NODE', 'FromNode', 'ToNode'].map((key) => text(attrs[key])).filter(Boolean);
    const positionRaw = firstAttr(attrs, ['DTXR_POS', 'POS', 'Pos', 'position', 'Position']);
    const xyzPoint = attrs.X !== undefined && attrs.Y !== undefined && attrs.Z !== undefined
      ? parseStandaloneDtxrPoint([attrs.X, attrs.Y, attrs.Z])
      : null;
    const xmlPoint = parseStandaloneDtxrPoint(positionRaw) || xyzPoint;
    const psKey = firstAttr(attrs, ['DTXR_PS', 'PS', 'Ps', 'supportPs', 'psNo']);
    if (!nodeKeys.length && !positionRaw && !xmlPoint && !psKey) continue;
    const directBranch = firstAttr(attrs, ['LINE_ID', 'BRANCH', 'Branchname', 'PIPELINE_REF', 'LINE_NO']);
    nodes.push({
      xmlIndex: nodes.length + 1,
      tagName: match[1],
      attrs,
      nodeKeys,
      xmlNodeNumber: nodeKeys[0] || '',
      xmlNodeName: psKey,
      componentType: firstAttr(attrs, ['ComponentType', 'TYPE', 'Type']),
      componentRefNo: firstAttr(attrs, ['ComponentRefNo', 'COMPONENTREFNO', 'REF']),
      xmlBranch: directBranch || activeBranchAt(match.index, branchPositions),
      branchName: directBranch || activeBranchAt(match.index, branchPositions),
      xmlPosition: positionRaw || (xmlPoint ? pointLabel(xmlPoint) : ''),
      xmlPoint,
      posPoint: xmlPoint,
      posKey: xmlPoint ? pointLabel(xmlPoint) : positionRaw,
      psKey,
    });
  }
  return nodes;
}

