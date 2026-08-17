import { normalizeLineListRow } from '../../../converters/xml-cii2019-core/linelist-mapping.js';
import { MASTER_FIELDS } from './xml-cii-adapted-fields-config.js';
import { perfAddMs, perfCount, perfNow } from './xml-cii-adapted-perf.js';

function text(value, fallback = '') {
  const out = String(value ?? '').trim();
  return out || fallback;
}

export function previewSearchFieldMap(masterKey, state) {
  const configKey = MASTER_FIELDS[masterKey]?.configKey;
  const committedConfig = state?.masterContext?.config;
  if (committedConfig && typeof committedConfig === 'object') return committedConfig?.[configKey]?.fieldMap || {};
  let config = {};
  try { config = JSON.parse(state?.supportConfigJson || '{}'); } catch {}
  return config?.[configKey]?.fieldMap || {};
}

function readMappedValue(row, keys) {
  for (const key of keys) {
    const value = key ? row?.[key] : '';
    if (text(value)) return text(value);
  }
  return '';
}

function normalizePreviewSearchRow(row, masterKey, fieldMap, index) {
  if (masterKey !== 'lineList') return row;
  const normalized = row?.lineNoKey || row?.lineNo || row?.lineKey || row?.lineSeqNo
    ? row : normalizeLineListRow(row, fieldMap, index);
  const raw = normalized?._raw || row;
  return {
    ...normalized,
    lineKey1: text(normalized?.lineKey1) || readMappedValue(raw, [fieldMap.lineKey1, 'lineKey1', 'Service', 'SERVICE']),
    lineKey2: text(normalized?.lineKey2) || readMappedValue(raw, [fieldMap.lineKey2, 'lineKey2', 'Line number', 'Line Number']),
    lineSeqNo: text(normalized?.lineSeqNo) || readMappedValue(raw, [fieldMap.lineSeqNo, 'lineSeqNo', 'Line number', 'Line Number']),
  };
}

export function buildPreviewSearchRows(master, state) {
  const started = perfNow();
  const fieldMap = previewSearchFieldMap(master?.key, state);
  const sourceRows = Array.isArray(master?.rows) && master.rows.length
    ? master.rows
    : (Array.isArray(state?.masterContext?.rawRows?.[master?.key]) ? state.masterContext.rawRows[master.key] : []);
  const rows = sourceRows.map((row, index) => normalizePreviewSearchRow(row, master?.key, fieldMap, index));
  perfCount('previewSearchBuildCount');
  perfCount('previewSearchRowsPrepared', rows.length);
  perfAddMs('previewSearchBuildMs', perfNow() - started);
  return rows;
}

export function previewSearchText(row) {
  const values = Object.entries(row || {})
    .filter(([key]) => !key.startsWith('_'))
    .map(([, value]) => text(value));
  const composites = [
    `${text(row?.lineKey1)}${text(row?.lineSeqNo)}`,
    `${text(row?.lineKey1)}${text(row?.lineNoKey)}`,
    `${text(row?.lineKey1)}${text(row?.lineKey2)}`,
    text(row?.lineNoKey),
    text(row?.lineNo),
    text(row?.lineKey),
  ];
  return [...values, ...composites].join(' ').toLowerCase();
}
