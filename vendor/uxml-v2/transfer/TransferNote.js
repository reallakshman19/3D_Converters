/**
 * UXML plan step 6: locks <-> the TOPOFIX-TRANSFER-PROTECT note.
 *
 * Inside UXML the transfer's locks are the truth. In a PSI116 file they travel as the note today's
 * 3D_Converters step 10 already honours (xml-cii-transfer-protection.js), so a file written from
 * UXML stays protected in the live app. The note is written exactly as the U2d transfer writes it
 * (prototypes/u2d-cii-source/u2d.py `protect`): compact ASCII JSON, '-' escaped as - (a
 * comment may not hold two dashes), branches and nodes in receipt order, after the XML declaration.
 *
 * Support locks in step 10, step 1 (Owner 18 Nov 2026): the note also names the nodes whose supports the
 * transfer set, `"supports": ["<Branchname>|<NodeNumber>", ...]` after `nodes`, only when there are any
 * (a note without support locks stays byte for byte as before). Still v1: today's readers ignore the key.
 * Keyed as `nodes` is: a branch name used once and a NodeNumber used once in it; other nodes are listed
 * by supportNoteKeys as not keyable, never protected silently.
 */
import {walkEntities, UxmlRefusal} from '../UxmlV2Kernel.js';

export const TRANSFER_NOTE_MARK = 'TOPOFIX-TRANSFER-PROTECT';
const NOTE_RE = /<!--\s*TOPOFIX-TRANSFER-PROTECT\s*([\s\S]*?)-->/;
const fail = (code, details = {}) => { throw new UxmlRefusal(code, details); };

/** The note in a PSI116 text: {note, raw} or null. Refuses an unreadable note or another version. */
export function readTransferNote(xmlText) {
  const found = NOTE_RE.exec(String(xmlText || ''));
  if (!found) return null;
  let note;
  try { note = JSON.parse(found[1]); } catch { return fail('UXML_TRANSFER_NOTE_UNREADABLE', {raw: found[0].slice(0, 200)}); }
  if (note?.v !== 1) fail('UXML_TRANSFER_NOTE_VERSION', {found: note?.v ?? null});
  return {note, raw: found[0]};
}

/** Transfer locks of the document in receipt order: [{order, scope, branchName, nodeNumber, path}]. */
function transferLocks(doc) {
  const out = [];
  for (const {entity, kind, parent} of walkEntities(doc)) {
    if (kind === 'restraint') continue;
    for (const [key, value] of Object.entries(entity.values || {})) {
      const lock = value?.lock;
      // Support locks are written as the note's `supports` list (supportNoteKeys), not as field paths.
      if (lock?.by !== 'transfer' || lock.follows || lock.supports) continue;
      const pipeline = kind === 'pipeline' ? entity : parent;
      out.push({order: lock.order, scope: kind === 'pipeline' ? 'branch' : 'node', path: key.replace(/\./g, '/'),
        branchName: String(pipeline.values?.Branchname?.v ?? ''), nodeNumber: String(entity.values?.NodeNumber?.v ?? '')});
    }
  }
  return out.sort((a, b) => a.order - b.order);
}

/** Nodes with a supports lock, in lock order: {keys: ['<Branchname>|<NodeNumber>'], unkeyed: [{branchName, nodeNumber, why}]}. */
export function supportNoteKeys(doc) {
  const names = new Map();
  for (const p of doc.pipelines) { const n = String(p.values?.Branchname?.v ?? ''); names.set(n, (names.get(n) || 0) + 1); }
  const found = [];
  for (const p of doc.pipelines) {
    const branchName = String(p.values?.Branchname?.v ?? '');
    const numbers = p.components.map(c => String(c.values?.NodeNumber?.text ?? c.values?.NodeNumber?.v ?? ''));
    p.components.forEach((c, i) => {
      const lock = c.values?.NodeNumber?.lock;
      if (lock?.by !== 'transfer' || !lock.supports) return;
      const nodeNumber = numbers[i];
      const why = names.get(branchName) !== 1 ? 'another branch has the same name'
        : numbers.indexOf(nodeNumber) !== numbers.lastIndexOf(nodeNumber) ? 'another node in the branch has the same number' : null;
      found.push({order: lock.order, branchName, nodeNumber, why});
    });
  }
  found.sort((a, b) => a.order - b.order);
  return {keys: found.filter(f => !f.why).map(f => f.branchName + '|' + f.nodeNumber),
    unkeyed: found.filter(f => f.why).map(({branchName, nodeNumber, why}) => ({branchName, nodeNumber, why}))};
}

/** The v1 note for the document's transfer locks, or null when it has none. */
export function noteFromLocks(doc) {
  const locks = transferLocks(doc);
  const {keys} = supportNoteKeys(doc);
  if (!locks.length && !keys.length) return null;
  const note = {v: 1, branches: {}, nodes: {}};
  for (const l of locks) {
    const list = l.scope === 'branch' ? (note.branches[l.branchName] ||= []) : (note.nodes[l.branchName + '|' + l.nodeNumber] ||= []);
    if (!list.includes(l.path)) list.push(l.path);
  }
  if (keys.length) note.supports = keys;
  return note;
}

/** Comment text of a note, byte for byte as U2d writes it. */
export function noteComment(note) {
  const ascii = JSON.stringify(note).replace(/[\u0080-￿]/g, ch => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));
  return '<!--' + TRANSFER_NOTE_MARK + ' ' + ascii.replace(/-/g, '\\u002d') + '-->';
}

/** Text without the note (and the line end U2d put after it). */
export function withoutTransferNote(xmlText) {
  return String(xmlText).replace(/<!--\s*TOPOFIX-TRANSFER-PROTECT[\s\S]*?-->\r?\n?/, '');
}

/** Text with the note replaced, or inserted after the XML declaration (line end of the file). */
export function withTransferNote(xmlText, note) {
  const text = String(xmlText);
  if (!note) return text;
  const comment = noteComment(note);
  const found = NOTE_RE.exec(text);
  if (found) return text.slice(0, found.index) + comment + text.slice(found.index + found[0].length);
  const decl = /^(?:﻿)?\s*<\?xml[^>]*\?>\r?\n?/.exec(text);
  const at = decl ? decl[0].length : 0;
  const nl = text.slice(0, 4096).includes('\r\n') ? '\r\n' : '\n';
  return text.slice(0, at) + comment + nl + text.slice(at);
}
