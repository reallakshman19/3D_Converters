(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HpAuthorityPackageCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SCHEMA = 'hp-piping-class-authority-package/v1';
  const LIFECYCLES = new Set(['draft', 'for-review', 'approved-record']);
  const SOURCES = Object.freeze({
    b31: Object.freeze({
      edition: '2024',
      commit: '00f47512e96780ebab10416dcc9354f719346457',
      blob: '3395ececce7731053dd0f6317008b4cd77446b78',
    }),
    kd2: Object.freeze({
      commit: '4dd651abbc86310077eaace6caa8b6788c1a6697',
      blob: '8f20cd0dab683d28359e02207f6f65b834144ec9',
    }),
    kd3: Object.freeze({
      commit: 'f4d49f2a47d970ae0abf913b537193e324556177',
      blob: 'e6abaddb7833eb0a61c9460ae39201e2252dc596',
      size: 1179548,
    }),
  });

  function plainClone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function same(actual, expected) {
    return String(actual ?? '') === String(expected ?? '');
  }

  function sourceErrors(sources) {
    const errors = [];
    if (!sources || typeof sources !== 'object') return ['Source manifest is missing.'];

    for (const field of ['edition', 'commit', 'blob']) {
      if (!same(sources.b31?.[field], SOURCES.b31[field])) {
        errors.push(`B31.3 source ${field} does not match this tool.`);
      }
    }
    for (const field of ['commit', 'blob']) {
      if (!same(sources.kd2?.[field], SOURCES.kd2[field])) {
        errors.push(`KD-2 source ${field} does not match this tool.`);
      }
    }
    for (const field of ['commit', 'blob', 'size']) {
      if (!same(sources.kd3?.[field], SOURCES.kd3[field])) {
        errors.push(`KD-3 source ${field} does not match this tool.`);
      }
    }
    return errors;
  }

  function metadataErrors(metadata) {
    const errors = [];
    if (!metadata || typeof metadata !== 'object') return ['Package metadata is missing.'];
    if (!String(metadata.packageId || '').trim()) errors.push('Package ID is required.');
    if (!String(metadata.revision || '').trim()) errors.push('Package revision is required.');
    if (!String(metadata.preparedBy || '').trim()) errors.push('Prepared by is required.');
    if (!LIFECYCLES.has(metadata.lifecycle)) errors.push('Package lifecycle is invalid.');
    if (metadata.lifecycle === 'approved-record' && !String(metadata.checkedBy || '').trim()) {
      errors.push('Checked by is required for an approved record.');
    }
    return errors;
  }

  function cycleErrors(cycles) {
    const errors = [];
    if (!Array.isArray(cycles) || !cycles.length) return ['At least one cycle block is required.'];
    const ids = new Set();
    cycles.forEach((cycle, index) => {
      const id = String(cycle?.id || '').trim();
      if (!id) errors.push(`Cycle ${index + 1} has no ID.`);
      else if (ids.has(id)) errors.push(`Duplicate cycle ID ${id}.`);
      else ids.add(id);
    });
    return errors;
  }

  function rowEvidenceErrors(rowEvidence) {
    const errors = [];
    if (rowEvidence == null) return errors;
    if (!Array.isArray(rowEvidence)) return ['rowEvidence must be an array.'];
    const keys = new Set();
    rowEvidence.forEach((item, index) => {
      const key = String(item?.key || '').trim();
      if (!key) errors.push(`rowEvidence item ${index + 1} has no key.`);
      else if (keys.has(key)) errors.push(`Duplicate rowEvidence key ${key}.`);
      else keys.add(key);
    });
    return errors;
  }

  function validatePackage(pkg) {
    const errors = [];
    if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) {
      return { ok: false, errors: ['Package must be a JSON object.'] };
    }
    if (pkg.schema !== SCHEMA) errors.push(`Unsupported package schema: ${pkg.schema || '(missing)'}.`);
    errors.push(...sourceErrors(pkg.sources));
    errors.push(...metadataErrors(pkg.metadata));
    if (!pkg.inputs || typeof pkg.inputs !== 'object') {
      errors.push('Package inputs are missing.');
    } else {
      if (!pkg.inputs.design || typeof pkg.inputs.design !== 'object') errors.push('Design inputs are missing.');
      else if (!same(pkg.inputs.design.b31Edition, SOURCES.b31.edition)) errors.push('Design B31.3 edition does not match this tool.');
      if (!pkg.inputs.authority || typeof pkg.inputs.authority !== 'object') errors.push('Authority inputs are missing.');
      errors.push(...cycleErrors(pkg.inputs.cycles));
    }
    errors.push(...rowEvidenceErrors(pkg.rowEvidence));
    return { ok: errors.length === 0, errors };
  }

  function importPayload(pkg) {
    const validation = validatePackage(pkg);
    if (!validation.ok) return { ok: false, errors: validation.errors, payload: null };
    return {
      ok: true,
      errors: [],
      payload: {
        metadata: plainClone(pkg.metadata),
        inputs: plainClone(pkg.inputs),
        rowEvidence: plainClone(pkg.rowEvidence || []),
      },
    };
  }

  function matchRowEvidence(rowEvidence, availableKeys) {
    const available = new Set((availableKeys || []).map((key) => String(key || '')));
    const matched = [];
    const missing = [];
    (rowEvidence || []).forEach((item) => {
      if (available.has(String(item?.key || ''))) matched.push(plainClone(item));
      else missing.push(String(item?.key || ''));
    });
    return { matched, missing };
  }

  function createPackage({ metadata, inputs, rowEvidence = [], snapshot = {}, generatedAt } = {}) {
    return {
      schema: SCHEMA,
      generatedAt: generatedAt || new Date().toISOString(),
      generator: {
        repository: 'reallaksh19/3D_Converters',
        path: 'engineering/hp-class-standardization/authority-package.html',
      },
      sources: plainClone(SOURCES),
      metadata: plainClone(metadata || {}),
      inputs: plainClone(inputs || {}),
      rowEvidence: plainClone(rowEvidence || []),
      snapshot: plainClone(snapshot || {}),
      authorityNote: 'snapshot is audit-only; import restores inputs/evidence and recalculates',
    };
  }

  function rowKey(wall, cycleId) {
    const numericWall = Number(wall);
    if (!Number.isFinite(numericWall)) return '';
    return `${numericWall.toFixed(4)}-${String(cycleId || '').trim()}`;
  }

  function safeFilename(packageId, revision) {
    const raw = `${packageId || 'hp-class'}-${revision || 'draft'}`.trim();
    const safe = raw.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
    return `${safe || 'hp-class-authority-package'}.json`;
  }

  return Object.freeze({
    SCHEMA,
    SOURCES,
    createPackage,
    validatePackage,
    importPayload,
    matchRowEvidence,
    sourceErrors,
    rowKey,
    safeFilename,
  });
});