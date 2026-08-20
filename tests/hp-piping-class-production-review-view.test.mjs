import assert from 'node:assert/strict';
import test from 'node:test';
import {
  renderHpPipingClassProductionReadinessHtml,
  renderHpPipingClassProductionResultHtml,
  summarizeHpPipingClassProductionReadiness,
} from '../tabs/hp-piping-class-production-review-view.js';

function productResult() {
  return {
    productId: 'NPS4-S160',
    engineeringState: 'REVIEW_COMPLETE_NOT_AUTHORIZED',
    selectedFatigueWallBasis: 'END_OF_LIFE_EFFECTIVE',
    selectedFatigueWallMm: 8.80375,
    assessment: {
      staticPass: true,
      fatigueEvaluated: true,
      fatigueUsageWithinUnity: true,
      cumulativeUsage: 0.05,
    },
    calculations: {
      static: {
        outputs: {
          pressureDesignThicknessMm: 7.7103934983403475,
          requiredMinimumThicknessMm: 10.710393498340348,
          requiredNominalThicknessMm: 12.240449712388969,
          minimumAsManufacturedThicknessMm: 11.80375,
          effectiveNetWallMm: 8.80375,
          pressureRatingMpa: 23.086120852009273,
          pressureRatingMargin: 1.1543060426004637,
          minimumWallMarginMm: 1.0933565016596522,
        },
        warnings: [{ code: 'PRODUCTION_REVIEW_NOT_DESIGN_AUTHORITY', message: 'Static review only.' }],
      },
      wallState: {
        outputs: {
          nominalWallMm: 13.49,
          minimumAsManufacturedWallMm: 11.80375,
          beginOfLifeConservativeWallMm: 11.80375,
          reservedServiceLossMm: 3,
          endOfLifeEffectiveWallMm: 8.80375,
        },
      },
      fatigue: {
        outputs: {
          evidenceIssueCount: 1,
          cumulativeUsage: 0.05,
          usageWithinUnity: true,
          cycles: [{
            cycleId: 'C1',
            fromStateId: 'LOW',
            toStateId: 'HIGH',
            appliedCycles: 500,
            pressureRangeMpa: 18,
            coreSaltMpa: 63.29949581051363,
            userSaltMpa: 63.29949581051363,
            saltCrossCheckStatus: 'MATCH',
            equivalentAlternatingStressMpa: 70,
            permissibleCycles: 10000,
            zeroDamage: false,
            usage: 0.05,
          }],
        },
        warnings: [{ code: 'EXTERNAL_KD3_EVIDENCE_ADVISORY', message: 'Evidence completion deferred.' }],
      },
    },
  };
}

test('production readiness separates blockers from advisory method identity', () => {
  const advisoryOnly = {
    ok: true,
    validationPolicy: 'PRODUCTION_REVIEW',
    issues: [],
    advisories: [{ path: 'methodManifest.b313Edition', code: 'METHOD_IDENTITY_REQUIRED', message: 'B31.3 edition is required.' }],
  };
  const summary = summarizeHpPipingClassProductionReadiness(advisoryOnly);
  assert.equal(summary.readyToCalculate, true);
  assert.equal(summary.blockingIssues.length, 0);
  assert.equal(summary.advisories.length, 1);
  const html = renderHpPipingClassProductionReadinessHtml(advisoryOnly);
  assert.match(html, /Calculation available/);
  assert.match(html, /METHOD_IDENTITY_REQUIRED/);
  assert.match(html, /do not block/);
  assert.doesNotMatch(html, /calculation blocker\(s\)/);
});

test('production readiness keeps structural invalidity visually blocking', () => {
  const html = renderHpPipingClassProductionReadinessHtml({
    ok: false,
    validationPolicy: 'PRODUCTION_REVIEW',
    issues: [{ path: 'classBasis.designPressureMpa', code: 'CLASS_BASIS_INVALID', message: 'Design pressure must be > 0 MPa.' }],
    advisories: [],
  });
  assert.match(html, /1 calculation blocker/);
  assert.match(html, /CLASS_BASIS_INVALID/);
  assert.match(html, /hpwb-notice error/);
});

test('production result ledger exposes static, wall and fatigue numerical chain', () => {
  const html = renderHpPipingClassProductionResultHtml({
    ok: true,
    projectState: 'CALCULATED_NOT_AUTHORIZED',
    warnings: [],
    advisories: [],
    products: [productResult()],
  });
  for (const token of [
    'Production engineering-review ledger',
    'Pressure-design thickness',
    '7.71039 mm',
    'Calculated pressure rating',
    '23.08612 MPa',
    'Pressure-rating margin',
    '1.154306',
    'End-of-life effective wall',
    '8.80375 mm',
    'Pressure-cycle fatigue ledger',
    '63.299496',
    '70.000000',
    '10,000',
    '0.050000',
  ]) assert.match(html, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(html, /REVIEW ONLY · NO DESIGN AUTHORITY/);
});

test('calculation warnings are shown as advisory and never promote authority', () => {
  const html = renderHpPipingClassProductionResultHtml({
    ok: true,
    warnings: [{ code: 'PROJECT_REVIEW_WARNING', message: 'Project warning.' }],
    products: [productResult()],
  });
  assert.match(html, /PROJECT_REVIEW_WARNING/);
  assert.match(html, /PRODUCTION_REVIEW_NOT_DESIGN_AUTHORITY/);
  assert.match(html, /EXTERNAL_KD3_EVIDENCE_ADVISORY/);
  assert.doesNotMatch(html, /DESIGN AUTHORITY · TRUE/);
});

test('blocked evaluator does not render a misleading numerical ledger', () => {
  const html = renderHpPipingClassProductionResultHtml({ ok: false, projectState: 'CALCULATION_BLOCKED', products: [] });
  assert.match(html, /CALCULATION_BLOCKED/);
  assert.match(html, /No production result ledger/);
  assert.doesNotMatch(html, /Static pressure ledger/);
});
