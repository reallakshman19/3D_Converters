/**
 * Functionality: maps an element-aware stagedJson context into the existing
 * XML->CII resolver input, resolves line/spec/material/weight facts, sanitizes
 * legacy default-zero outputs, and emits the flat enrichment contract.
 * Parameters: context, resolver master context, and visible config.
 * Outputs: enrichedAttributes plus diagnostics and trace; no node mutation.
 */

import { resolveBranchProcessData } from '../../../converters/xml-cii2019-core/branch-process-resolver.js';
import { buildWeightCandidateRows } from '../xml-cii-weight-match.js';
import { STAGEDJSON_ENRICHMENT_SCHEMA, createStagedJsonDiagnostic } from './stagedjson-enrichment-contract.js';

const SUPPORT_TYPES = new Set(['SUPPORT', 'ATTA', 'REST', 'GUIDE', 'LINESTOP', 'LINE_STOP', 'ANCHOR', 'SPRING']);
const PURE_PIPE_TYPES = new Set(['PIPE']);
const DISTRIBUTED_TYPES = new Set(['PIPE', 'BEND', 'ELBOW', 'ELBO', 'REDUCER', 'REDU']);

export function resolveStagedJsonContext(context, masters, config) {
  const lineResolution = resolveLineRow(context, masters?.lineRows || [], config);
  const lineRow = lineResolution.row;
  const process = resolveBranchProcessData({
    branchName: context.branchName,
    lineKey: lineResolution.lineKey,
    lineRow,
    boreMm: context.nominalBoreMm,
    componentType: context.type,
    rating: context.rating,
    schedule: context.schedule,
    materialMap: masters?.materialMapRows || [],
    pipingClassIndex: masters?.pipingClassIndex,
    overrides: {},
    config: { pipingClassMatch: config?.pipingClassMatch || {} },
  });
  const flat = buildResolvedFields(context, lineResolution, process, masters, config);
  const missing = requiredMissing(context, flat);
  const diagnostics = missing.map((field) => missingDiagnostic(context, field));
  const conflicts = lineResolution.conflict ? ['lineKey'] : [];
  if (lineResolution.conflict) diagnostics.push(conflictDiagnostic(context, lineResolution));
  const status = conflicts.length ? 'conflict' : missing.length ? (flat.lineNo ? 'partial' : 'missing') : 'resolved';
  return {
    ...flat,
    status,
    needsReview: status !== 'resolved',
    missing,
    conflicts,
    diagnostics,
  };
}

function buildResolvedFields(context, lineResolution, process, masters, config) {
  const classRow = process.pipingClassMatchedRow || {};
  const materialRow = materialRowFor(process, masters?.materialMapRows || []);
  const wall = safeResolverNumber(process.wallThicknessMm, process.wallThicknessSource);
  const corrosion = safeResolverNumber(process.corrosionAllowanceMm, process.corrosionSource);
  const od = numberAny(classRow, ['pipeOdMm', 'OD_MM', 'Outside Diameter', 'OD', 'outsideDiameter']);
  const materialDensity = firstNumber(numberAny(materialRow, densityAliases()), numberAny(classRow, densityAliases()), numberAny(lineResolution.row, densityAliases()));
  const directPipeWeight = firstNumber(numberAny(classRow, pipeWeightAliases()), numberAny(lineResolution.row, pipeWeightAliases()));
  const pipeWeight = directPipeWeight ?? calculatedPipeWeight(od, wall, materialDensity);
  const component = componentWeight(context, masters?.weightMasterRows || [], config);
  const insulationThickness = firstNumber(numberAny(lineResolution.row, ['insThk', 'INSULATION_THICKNESS_MM', 'Insulation Thickness']), numberAny(context.attributes, ['INSULATION_THICKNESS_MM']));
  const insulationDensity = firstNumber(numberAny(lineResolution.row, ['INSULATION_DENSITY_KG_M3', 'Insulation Density']), numberAny(context.attributes, ['INSULATION_DENSITY_KG_M3']));
  const opeDensity = firstNumber(numberAny(lineResolution.row, ['density', 'fluidDensityOpeKgM3', 'FLUID_DENSITY_OPE_KG_M3', 'DENSITY']), numberAny(context.attributes, ['FLUID_DENSITY_OPE_KG_M3']));
  const hydDensity = firstNumber(numberAny(lineResolution.row, ['fluidDensityHydKgM3', 'HYD_DENSITY_KG_M3', 'Hydro Density']), numberAny(context.attributes, ['FLUID_DENSITY_HYD_KG_M3']));
  const id = od !== null && wall !== null && od > 2 * wall ? od - 2 * wall : null;
  return {
    schema: STAGEDJSON_ENRICHMENT_SCHEMA,
    lineNo: lineResolution.row?.lineNo || null,
    lineKey: lineResolution.lineKey || null,
    branchName: context.branchName || null,
    sourceBranchPath: context.hierarchyPath,
    nodeId: context.nodeId,
    componentType: context.type,
    pipingClass: process.pipingClass || null,
    pressureRating: process.rating || null,
    nominalBoreMm: context.nominalBoreMm,
    pipeOdMm: od,
    schedule: textAny(classRow, ['schedule', 'Schedule', 'SCH']) || context.schedule || null,
    wallThicknessMm: wall,
    corrosionAllowanceMm: corrosion,
    material: process.material || null,
    materialCode: process.materialCode || null,
    materialDensityKgM3: materialDensity,
    designPressure: valueAny(lineResolution.row, ['p1', 'P1', 'DESIGN_PRESSURE']) ?? null,
    designPressureMpa: numberAny(lineResolution.row, ['p1', 'P1', 'DESIGN_PRESSURE']),
    designTemperatureC: numberAny(lineResolution.row, ['t1', 'T1', 'DESIGN_TEMPERATURE']),
    operatingTemperatureC: numberAny(lineResolution.row, ['t2', 'T2', 'OPERATING_TEMPERATURE']),
    minimumTemperatureC: numberAny(lineResolution.row, ['t3', 'T3', 'MINIMUM_TEMPERATURE']),
    hydroPressure: valueAny(lineResolution.row, ['hydroPressure', 'HYDRO_PRESSURE']) ?? null,
    fluidService: textAny(lineResolution.row, ['service', 'Service', 'FLUID_SERVICE']) || null,
    fluidPhase: textAny(lineResolution.row, ['phase', 'PHASE']) || null,
    fluidDensityOpeKgM3: opeDensity,
    fluidDensityHydKgM3: hydDensity,
    insulationThicknessMm: insulationThickness,
    insulationDensityKgM3: insulationDensity,
    pipeWeightKgPerM: pipeWeight,
    componentWeightKg: component.value,
    componentWeightMethod: component.method,
    weightMasterMatchedRowId: component.rowId,
    sources: { lineList: lineResolution.source, pipingClass: process.pipingClassRowMethod || null, material: process.materialSource || null, weight: component.source, pipeWeight: directPipeWeight !== null ? 'master' : pipeWeight !== null ? 'calculated' : null },
    trace: { lineKeyResolver: lineResolution.trace, pipingClassResolver: { method: process.pipingClassRowMethod, score: process.pipingClassRowScore, reasons: process.pipingClassRowReasons }, weightResolver: component.trace, pipeWeightFormula: pipeWeight !== null && directPipeWeight === null ? 'pi/4 * (OD^2 - ID^2) * 1e-6 * materialDensity' : null, insideDiameterMm: id },
  };
}

function resolveLineRow(context, rows, config) {
  const candidates = context.lineHints.map(normalizeKey).filter(Boolean);
  const exact = rows.filter((row) => candidates.includes(normalizeKey(row.lineNoKey || row.lineNo || row.lineKey)));
  if (exact.length === 1) return resolution(exact[0], 'exact-hint', false, context);
  if (exact.length > 1) return resolution(null, 'ambiguous-exact-hint', true, context, exact);
  if (config?.allowContainedLineKey !== true) return resolution(null, 'no-match', false, context);
  const contained = rows.filter((row) => candidates.some((hint) => hint.includes(normalizeKey(row.lineNoKey || row.lineNo || row.lineKey))));
  if (contained.length === 1) return resolution(contained[0], 'contained-line-key', false, context);
  return resolution(null, contained.length ? 'ambiguous-contained-line-key' : 'no-match', contained.length > 1, context, contained);
}

function resolution(row, method, conflict, context, candidates = []) {
  return { row, lineKey: row?.lineNoKey || row?.lineNo || row?.lineKey || null, source: row ? `line-list-row-${row._sourceRowIndex || ''}` : null, conflict, candidates, trace: { method, hints: context.lineHints, candidateCount: candidates.length || (row ? 1 : 0) } };
}

function componentWeight(context, weightRows, config) {
  if (PURE_PIPE_TYPES.has(context.type) || SUPPORT_TYPES.has(context.type) || context.type === 'BRANCH') return { value: null, method: 'not-applicable', rowId: null, source: 'not-applicable', trace: { candidateCount: 0 } };
  const direct = numberAny(context.attributes, ['COMPONENT_WEIGHT_KG', 'WEIGHT_KG', 'WEIGHT']);
  if (direct !== null) return { value: direct, method: 'source-attribute', rowId: null, source: 'sourceAttributes', trace: { candidateCount: 0 } };
  const issue = { id: context.nodeId, componentType: context.type, bore: context.nominalBoreMm, rating: context.rating, length: context.componentLengthMm };
  const candidates = buildWeightCandidateRows({ componentRows: [issue], masterContext: { weightMasterRows: weightRows } }).sort((left, right) => right.totalScore - left.totalScore);
  const best = candidates[0] || null;
  const ambiguous = best && candidates[1] && best.totalScore - candidates[1].totalScore < config.weightAmbiguityDelta;
  if (!best || best.totalScore < config.weightMinimumScore || ambiguous) return { value: null, method: '', rowId: null, source: null, trace: { candidateCount: candidates.length, bestScore: best?.totalScore ?? null, ambiguous: Boolean(ambiguous) } };
  return { value: best.candidateWeight, method: 'xml-cii-weight-candidate', rowId: best.candidateId, source: 'weightMaster', trace: { candidateCount: candidates.length, bestScore: best.totalScore, score: { bore: best.boreScore, rating: best.ratingScore, length: best.lengthScore, componentType: best.componentTypeScore } } };
}

function requiredMissing(context, fields) {
  if (SUPPORT_TYPES.has(context.type)) return context.center ? [] : ['supportPosition'];
  const required = ['lineNo', 'pipingClass', 'nominalBoreMm'];
  if (DISTRIBUTED_TYPES.has(context.type)) required.push('pipeOdMm', 'wallThicknessMm', 'pipeWeightKgPerM', 'fluidDensityOpeKgM3', 'fluidDensityHydKgM3', 'insulationThicknessMm', 'insulationDensityKgM3');
  if (!PURE_PIPE_TYPES.has(context.type) && context.type !== 'BRANCH') required.push('componentWeightKg');
  return required.filter((field) => fields[field] === null || fields[field] === undefined || fields[field] === '');
}

function missingDiagnostic(context, field) { return createStagedJsonDiagnostic({ nodeId: context.nodeId, severity: 'BLOCKED', category: field === 'componentWeightKg' ? 'MISSING_WEIGHT' : 'MISSING_ATTRIBUTE', field, message: `${field} is unresolved for ${context.name || context.nodeId}; no fallback was applied.`, requiredFor: ['ElementWeight', 'SupportVerticalLoad'], sourceExpected: expectedSource(field) }); }
function conflictDiagnostic(context, resolutionValue) { return createStagedJsonDiagnostic({ nodeId: context.nodeId, severity: 'ENGINEERING_REVIEW_REQUIRED', category: 'CONFLICT', field: 'lineKey', message: `Multiple line-list rows match ${context.name || context.nodeId}.`, requiredFor: ['AllEnrichedAttributes'], sourceExpected: `lineList (${resolutionValue.candidates.length} candidates)` }); }
function expectedSource(field) { if (field === 'componentWeightKg') return 'componentWeightMaster'; if (field.includes('fluid') || field.includes('insulation') || field === 'lineNo') return 'lineList'; return 'pipingClassMaster'; }
function safeResolverNumber(value, source) { return source === 'default-zero' || source === 'config-default' ? null : finite(value); }
function calculatedPipeWeight(od, wall, density) { if (od === null || wall === null || density === null || wall <= 0 || od <= 2 * wall) return null; const id = od - 2 * wall; return round6(Math.PI / 4 * (od ** 2 - id ** 2) * 1e-6 * density); }
function materialRowFor(process, rows) { const material = normalizeKey(process.material), code = normalizeKey(process.materialCode); return rows.find((row) => normalizeKey(textAny(row, ['materialCode', 'code', 'MAT_CODE'])) === code || normalizeKey(textAny(row, ['material', 'materialName', 'description'])) === material) || {}; }
function densityAliases() { return ['materialDensityKgM3', 'MATERIAL_DENSITY_KG_M3', 'Density kg/m3', 'DENSITY_KG_M3']; }
function pipeWeightAliases() { return ['pipeWeightKgPerM', 'unitPipeWeightKgPerM', 'PIPE_WEIGHT_KG_PER_M', 'Weight kg/m']; }
function numberAny(row, keys) { return finite(valueAny(row, keys)); }
function textAny(row, keys) { const value = valueAny(row, keys); return value === null ? '' : String(value).trim(); }
function valueAny(row, keys) { if (!row || typeof row !== 'object') return null; const wanted = keys.map(normalizeKey); for (const source of [row, row._raw]) for (const [key, value] of Object.entries(source || {})) if (wanted.includes(normalizeKey(key)) && value !== '') return value; return null; }
function firstNumber(...values) { return values.find((value) => value !== null && value !== undefined) ?? null; }
function finite(value) { if (value === null || value === undefined || value === '') return null; const match = String(value).replace(/,/g, '').match(/[-+]?\d*\.?\d+/); const parsed = match ? Number(match[0]) : NaN; return Number.isFinite(parsed) ? parsed : null; }
function normalizeKey(value) { return String(value ?? '').toUpperCase().replace(/[^A-Z0-9]+/g, ''); }
function round6(value) { return Math.round(value * 1e6) / 1e6; }
