import { childrenByName, childText, createElement, setChildText } from '../PlainDom.js';
import { toText, parseGapValue, normalizeDirectionVector } from './support-mapping-common.js';
import { firstNodeSupportGapText, directionFromRestraint, normalizeXmlType, restraintTypeUsesSupportGap, frictionForEntry } from './support-mapping-entries.js';

// The document argument is kept for the existing core call signature, but is unused.
export function applyXmlRestraints(document, nodeElement, entries, config = {}) {
  if (!entries || entries.length === 0) return;
  const existing = childrenByName(nodeElement, 'Restraint');
  const nodeSupportGapText = firstNodeSupportGapText(nodeElement);
  const nodeSupportGap = parseGapValue(nodeSupportGapText);
  const nodeAlreadyEnriched = !!toText(childText(nodeElement, 'DTXR_SOURCE')).trim();
  let stiffness = config.defaultStiffness || '1.751270E+12';
  let gap = '0';
  let friction = config.defaultFriction || '0.3';
  let existingDirection = null;
  if (existing.length > 0) {
    const r0 = existing[0];
    const s = childText(r0, 'Stiffness');
    if (s && Number.isFinite(Number(s)) && Number(s) > 0) stiffness = s;
    gap = childText(r0, 'Gap') || gap;
    friction = childText(r0, 'Friction') || friction;
    existingDirection = directionFromRestraint(r0);
  }
  for (const r of existing) nodeElement.kids.splice(nodeElement.kids.indexOf(r), 1);
  for (const entry of entries) {
    const type = normalizeXmlType(typeof entry === 'string' ? entry : entry?.type);
    if (!type) continue;
    const restraint = createElement('Restraint');
    nodeElement.kids.push(restraint);
    setChildText(restraint, 'Type', type);
    setChildText(restraint, 'Stiffness', toText(toText(entry?.stiffness).trim() || stiffness));
    const entryGap = toText(entry?.gap).trim();
    const usesSupportGap = restraintTypeUsesSupportGap(type, entry);
    // Owner, 14 Nov (GOLDEN-30 A): a guide and a line stop on one node may need different gaps,
    // or none. A restraint made from one staged item keeps that item's own gap and note; the
    // node-level CMPSUPGAP (merged from every item at the position) fills only the others.
    // A restraint read back from a node that step 10 already enriched (DTXR_SOURCE present) was
    // written per item the first time; re-enrichment keeps its own gap and note too.
    const ownItemOnly = entry?.fromStagedItem === true || (entry?.fromExistingRestraint === true && nodeAlreadyEnriched);
    const explicitSourceGap = toText(entry?.cmpSupGap).trim() !== '';
    // v0.6 PR 9 (Owner, 15 Nov): a source gap policy or an existing XML restraint never takes the node gap.
    const keepOwnGap = ownItemOnly || !!entry?.sourceGapPolicy || !!entry?.fromExistingRestraint;
    const gapValue = usesSupportGap && !keepOwnGap && !explicitSourceGap && (!entryGap || Number(entryGap) === 0) && nodeSupportGap
      ? String(nodeSupportGap)
      : (entryGap || gap);
    setChildText(restraint, 'Gap', toText(gapValue));
    setChildText(restraint, 'Friction', toText(frictionForEntry(entry, type, friction, config)));
    const cmpSupGap = toText(entry?.cmpSupGap).trim() || (usesSupportGap && !keepOwnGap ? nodeSupportGapText : '');
    if (cmpSupGap) setChildText(restraint, 'CMPSUPGAP', cmpSupGap);
    const direction = entry?.fromExistingRestraint
      ? normalizeDirectionVector(entry?.direction)
      : normalizeDirectionVector(entry?.direction) || (entry?.directionMode === 'from-xml' ? existingDirection : null);
    if (direction) {
      setChildText(restraint, 'DirectionCosineX', direction.x.toFixed(9));
      setChildText(restraint, 'DirectionCosineY', direction.y.toFixed(9));
      setChildText(restraint, 'DirectionCosineZ', direction.z.toFixed(9));
    }
  }
}
