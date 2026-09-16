import { resolveLineListDensity } from './line-density-resolver.js';

export const LINE_LIST_PROCESS_VALUE_ALIASES = Object.freeze({
  p1: Object.freeze(['p1', 'P1', 'Pressure1', 'Design Pressure', 'Design Pres', 'DesignPressure', 'Pressure Design', 'Pressure Max kPa(g)', 'Pressure Max', 'PressureMax', 'P1 / Design Pressure', 'P1 / Design Pres', 'P1 Design Pressure', 'P1 Design Pres']),
  hydroPressure: Object.freeze(['hydroPressure', 'HydroPressure', 'hydro_pressure', 'Hydro Test Pressure', 'Hydrotest Pressure', 'Hydro Pressure', 'Hydro Pr', 'Hyd Test Pr', 'Hyd. Test Pressure', 'Test Pressure', 'TEST_PRESSURE', 'HYDRO_TEST_PRESSURE', 'Pressure Test', 'Proof Pressure', 'Hydro/Test Pressure', 'Pressure2']),
  t1: Object.freeze(['t1', 'T1', 'Temperature1', 'Design Temp', 'Design Temperature', 'Temp Max C', 'Temp Max', 'T1 (C)', 'T1 C']),
  t2: Object.freeze(['t2', 'T2', 'Temperature2', 'Temperature 2', 'Operating Temp', 'Operating Temperature', 'Temp. C', 'Temp C', 'T2 (C)', 'T2 C']),
  t3: Object.freeze(['t3', 'T3', 'Temperature3', 'Temperature 3', 'Temp Min C', 'Temp Min', 'Minimum Temp', 'Min Temp', 'T3 (C)', 'T3 C']),
  density: Object.freeze(['density', 'Density', 'DENSITY', 'FluidDensity', 'Fluid Density', 'Density kg/m3', 'kg/m3']),
  densityMixed: Object.freeze(['densityMixed', 'Density Mixed', 'Mixed Density', 'Mixed kg/m3', 'Density (Mixed)', 'Mixed']),
  densityGas: Object.freeze(['densityGas', 'Density Gas', 'Gas Density', 'Gas kg/m3', 'Density (Gas)', 'Gas']),
  densityLiquid: Object.freeze(['densityLiquid', 'Density Liquid', 'Liquid Density', 'Liquid kg/m3', 'Density (Liquid)', 'Liquid', 'Liq Density']),
  phase: Object.freeze(['phase', 'Phase', 'PHASE', 'Fluid Phase', 'Medium Phase', 'Medium', 'State']),
  from: Object.freeze(['from', 'From', 'FROM', 'Source', 'Origin', 'Line From']),
  to: Object.freeze(['to', 'To', 'TO', 'Destination', 'Line To']),
});

export function clean(value) {
  return String(value ?? '').toUpperCase().replace(/\s+/g, '');
}

export function readRowValue(row, keys) {
  if (!row || !keys) return '';
  for (const key of keys) {
    const value = key ? (row[key] ?? row._raw?.[key]) : '';
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return '';
}

export function computeLineNoKey(row, fieldMap = {}) {
  const key1 = readRowValue(row, [fieldMap.lineKey1, 'lineKey1', 'Service']);
  const key2 = readRowValue(row, [fieldMap.lineKey2, 'lineKey2', 'Line number', 'Line Number']);
  const composite = `${clean(key1)}${clean(key2)}`;
  if (composite && !/^service\s*line\s*(number|no)?$/i.test(composite) && !/pipingclass/i.test(composite)) return composite;
  return readRowValue(row, [
    fieldMap.lineNoKey, fieldMap.lineNo, fieldMap.lineSeqNo,
    'lineNoKey', 'lineNo', 'lineKey', 'lineSeqNo', 'Line No', 'Line Number', 'ColumnX1',
  ]);
}

export function cleanMaterialText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
}

export function cleanMaterialCode(value) {
  return String(value ?? '').trim().replace(/\s+/g, '').toUpperCase();
}

export function mapMaterialTextToCiiCode(materialText, materialMap) {
  const key = cleanMaterialText(materialText);
  if (!key) return null;
  return (Array.isArray(materialMap) ? materialMap : []).find((row) => [
    row.material, row.Material, row.materialName, row.Material_Name,
    row.description, row.Description, row.name, row.Name,
  ].some((value) => cleanMaterialText(value) === key)) || null;
}

export function readNumericRowValue(row, keys) {
  const match = String(readRowValue(row, keys) ?? '').match(/[-+]?\d*\.?\d+/);
  return match ? Number(match[0]) : null;
}

function endpointValue(row, fieldMap, field) {
  return readRowValue(row, [fieldMap?.[field], ...LINE_LIST_PROCESS_VALUE_ALIASES[field]]);
}

export function normalizeLineListRow(row, fieldMap = {}, index) {
  const lineNoKey = computeLineNoKey(row, fieldMap);
  const materialText = readRowValue(row, [
    fieldMap.material, 'material', 'Material', 'MATERIAL', 'MOC', 'Pipe Material', 'Material_Name',
  ]);
  const from = endpointValue(row, fieldMap, 'from');
  const to = endpointValue(row, fieldMap, 'to');

  const normalized = {
    ...row,
    _sourceRowIndex: row?._rowIndex || (index !== undefined ? index + 1 : 1),
    _raw: row,
    lineNoKey,
    lineNo: lineNoKey,
    lineKey: lineNoKey,
    lineSeqNo: readRowValue(row, [fieldMap.lineSeqNo, 'lineSeqNo', 'Sequence', 'Seq']),
    pipingClass: readRowValue(row, [fieldMap.pipingClass]),
    rating: readRowValue(row, [fieldMap.rating]),
    material: cleanMaterialText(materialText),
    convertedBore: readRowValue(row, [fieldMap.convertedBore]),
    p1: readRowValue(row, [fieldMap.p1, ...LINE_LIST_PROCESS_VALUE_ALIASES.p1]),
    t1: readRowValue(row, [fieldMap.t1, ...LINE_LIST_PROCESS_VALUE_ALIASES.t1]),
    t2: readRowValue(row, [fieldMap.t2, ...LINE_LIST_PROCESS_VALUE_ALIASES.t2]),
    t3: readRowValue(row, [fieldMap.t3, ...LINE_LIST_PROCESS_VALUE_ALIASES.t3]),
    hydroPressure: readRowValue(row, [fieldMap.hydroPressure, ...LINE_LIST_PROCESS_VALUE_ALIASES.hydroPressure]),
    insThk: readRowValue(row, [fieldMap.insThk]),
    density: readRowValue(row, [fieldMap.density, ...LINE_LIST_PROCESS_VALUE_ALIASES.density]),
    densityMixed: readRowValue(row, [fieldMap.densityMixed, ...LINE_LIST_PROCESS_VALUE_ALIASES.densityMixed]),
    densityGas: readRowValue(row, [fieldMap.densityGas, ...LINE_LIST_PROCESS_VALUE_ALIASES.densityGas]),
    densityLiquid: readRowValue(row, [fieldMap.densityLiquid, ...LINE_LIST_PROCESS_VALUE_ALIASES.densityLiquid]),
    phase: readRowValue(row, [fieldMap.phase, ...LINE_LIST_PROCESS_VALUE_ALIASES.phase]),
    from,
    to,
    lineFrom: from,
    lineTo: to,
  };

  const densityInfo = resolveLineListDensity(normalized, null);
  normalized.density = densityInfo.value || normalized.density || '';
  normalized.densitySource = densityInfo.source || (normalized.density ? 'generic' : 'none');
  return normalized;
}
