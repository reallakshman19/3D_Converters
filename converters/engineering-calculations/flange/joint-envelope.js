/**
 * Load-case envelope selection for flange joint assessments.
 *
 * The governing case for a joint is the one with the highest utilization, which
 * is not always the one that fails or the one with the largest moment: a case
 * with a lower moment but a higher design pressure can govern.
 *
 * Envelopes are only formed across rows sharing a moment basis. A row resolved
 * from actual components and a row taken from the workbook's equal-orthogonal
 * envelope are not comparable, so a joint carrying both is reported as mixed
 * rather than silently ranked.
 */

import { MOMENT_BASES } from './joint-records.js';

function comparableRows(rows) {
  return rows.filter((row) => row.ok && Number.isFinite(row.utilization));
}

export function momentBasisOf(rows) {
  const bases = [...new Set(comparableRows(rows).map((row) => row.momentBasis))];
  if (bases.length === 0) return null;
  if (bases.length === 1) return bases[0];
  return 'MIXED';
}

export function selectGoverningRow(rows = []) {
  const candidates = comparableRows(rows);
  if (!candidates.length) return null;
  return candidates.reduce((worst, row) => (row.utilization > worst.utilization ? row : worst));
}

export function envelopeJoint(assessment) {
  if (!assessment?.ok) {
    return Object.freeze({
      ok: false,
      identity: assessment?.identity ?? null,
      code: assessment?.code ?? 'JOINT_NOT_ASSESSED',
      message: assessment?.message ?? 'Joint was not assessed.',
      canUseForDesignAuthority: false,
    });
  }

  const rows = assessment.rows;
  const governing = selectGoverningRow(rows);
  const failedRows = rows.filter((row) => row.ok && row.pass === false);
  const errored = rows.filter((row) => !row.ok);
  const basis = momentBasisOf(rows);

  return Object.freeze({
    ok: true,
    identity: assessment.identity,
    nominalSizeIn: assessment.nominalSizeIn,
    pressureClass: assessment.pressureClass,
    loadCaseCount: rows.length,
    erroredCaseCount: errored.length,
    failedCaseCount: failedRows.length,
    momentBasis: basis,
    momentBasisComparable: basis !== 'MIXED',
    governingLoadCase: governing ? governing.loadCase : null,
    governingUtilization: governing ? governing.utilization : null,
    governingRow: governing,
    pass: governing ? failedRows.length === 0 : null,
    masters: assessment.masters,
    canUseForDesignAuthority: false,
  });
}

export function envelopeJoints(assessments = []) {
  const envelopes = assessments.map(envelopeJoint);
  const assessed = envelopes.filter((item) => item.ok);
  const governing = assessed.reduce((worst, item) => {
    if (!Number.isFinite(item.governingUtilization)) return worst;
    if (!worst || item.governingUtilization > worst.governingUtilization) return item;
    return worst;
  }, null);

  return Object.freeze({
    jointCount: envelopes.length,
    assessedCount: assessed.length,
    notAssessedCount: envelopes.length - assessed.length,
    failedJointCount: assessed.filter((item) => item.pass === false).length,
    mixedBasisJointCount: assessed.filter((item) => item.momentBasisComparable === false).length,
    governingJoint: governing ? governing.identity.jointKey : null,
    governingUtilization: governing ? governing.governingUtilization : null,
    joints: Object.freeze(envelopes),
    canUseForDesignAuthority: false,
  });
}

export { MOMENT_BASES };
