const AUTHORITY_FALSE = Object.freeze({
  nativeCoreKd3Qualified: false,
  codeCompliance: false,
  canUseForDesignAuthority: false,
});

export const KD320_Q1_CONTROLLED_SOURCE_BINDINGS = Object.freeze({
  'Q1-SRC-B313-2024': 'SRC-B313-2024-CONTROLLED',
  'Q1-SRC-VIII3-2025': 'SRC-VIII3-2025-CONTROLLED',
});

const PENDING_RECEIPT = 'PENDING_CONTROLLED_SOURCE_RECEIPT';
const VERIFIED_RECEIPT = 'CONTROLLED_RECEIPT_VERIFIED';
const PENDING_SOURCE = 'PENDING_SECURE_HASH_AND_LOCATOR_RECONCILIATION';
const RECONCILED_SOURCE = 'CONTROLLED_SOURCE_RECONCILED';

function text(value) {
  return String(value ?? '').trim();
}

function mapUnique(items, key, duplicateCode, blockers) {
  const map = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const id = text(item?.[key]);
    if (!id || map.has(id)) {
      blockers.push(duplicateCode);
      return null;
    }
    map.set(id, item);
  }
  return map;
}

function authorityFalse(authority) {
  return Object.entries(AUTHORITY_FALSE).every(([key, value]) => authority?.[key] === value);
}

function sourceContractReady(source, receiptId, blockers) {
  const sourceId = KD320_Q1_CONTROLLED_SOURCE_BINDINGS[receiptId];
  let ready = true;
  const require = (condition, code) => {
    if (!condition) {
      blockers.push(`${receiptId}:${code}`);
      ready = false;
    }
  };

  require(Boolean(source), `CONTROLLED_SOURCE_MISSING:${sourceId}`);
  if (!source) return false;
  require(text(source.sourceType) === 'LICENSED_RESTRICTED_CONTROLLED', 'CONTROLLED_SOURCE_TYPE_INVALID');
  require(text(source.publisher) === 'ASME', 'CONTROLLED_SOURCE_PUBLISHER_INVALID');
  require(text(source.storageClass) === 'SECURE_STORE', 'CONTROLLED_SOURCE_STORAGE_CLASS_INVALID');
  require(text(source.licenseClass) === 'LICENSED_RESTRICTED', 'CONTROLLED_SOURCE_LICENSE_CLASS_INVALID');
  require(text(source.receiptRef) === receiptId, 'CONTROLLED_SOURCE_RECEIPT_BACKREF_MISMATCH');
  require(source.publicRepositoryContentAllowed === false, 'CONTROLLED_SOURCE_PUBLIC_CONTENT_MUST_BE_FALSE');
  require(source.formulaOracle === false, 'CONTROLLED_SOURCE_FORMULA_ORACLE_MUST_BE_FALSE');
  require(source.fatigueCurveOracle === false, 'CONTROLLED_SOURCE_CURVE_ORACLE_MUST_BE_FALSE');
  return ready;
}

function receiptSourceStatusReady(receipt, source, blockers) {
  const receiptId = text(receipt.receiptId);
  if (!source) return false;
  if (receipt.status === PENDING_RECEIPT && source.status !== PENDING_SOURCE) {
    blockers.push(`${receiptId}:PENDING_RECEIPT_SOURCE_STATUS_MISMATCH`);
    return false;
  }
  if (receipt.status === VERIFIED_RECEIPT && source.status !== RECONCILED_SOURCE) {
    blockers.push(`${receiptId}:VERIFIED_RECEIPT_REQUIRES_RECONCILED_SOURCE`);
    return false;
  }
  if (![PENDING_RECEIPT, VERIFIED_RECEIPT].includes(receipt.status)) {
    blockers.push(`${receiptId}:RECEIPT_STATUS_INVALID`);
    return false;
  }
  return true;
}

export function auditKd320Q1SourceCustody({ receipts = {}, sourceLedger = {} } = {}) {
  const blockers = [];
  if (!authorityFalse(receipts.authority)) blockers.push('Q1_RECEIPT_AUTHORITY_MUST_REMAIN_FALSE');
  if (!authorityFalse(sourceLedger.authority)) blockers.push('Q1_SOURCE_LEDGER_AUTHORITY_MUST_REMAIN_FALSE');

  const receiptMap = mapUnique(receipts.receipts, 'receiptId', 'Q1_RECEIPT_SET_DUPLICATE_OR_INVALID', blockers);
  const sourceMap = mapUnique(sourceLedger.sources, 'sourceId', 'Q1_SOURCE_SET_DUPLICATE_OR_INVALID', blockers);
  if (!receiptMap || !sourceMap) {
    return {
      ok: false,
      blockers: [...new Set(blockers)],
      sourceCustodyComplete: false,
      authority: { ...AUTHORITY_FALSE },
    };
  }

  const usedSources = new Set();
  for (const [receiptId, expectedSourceId] of Object.entries(KD320_Q1_CONTROLLED_SOURCE_BINDINGS)) {
    const receipt = receiptMap.get(receiptId);
    if (!receipt) {
      blockers.push(`${receiptId}:RECEIPT_MISSING`);
      continue;
    }
    if (text(receipt.controlledLedgerSourceRef) !== expectedSourceId) {
      blockers.push(`${receiptId}:CONTROLLED_LEDGER_SOURCE_REF_MISMATCH`);
    }
    if (usedSources.has(text(receipt.controlledLedgerSourceRef))) {
      blockers.push(`${receiptId}:CONTROLLED_LEDGER_SOURCE_REUSED`);
    }
    usedSources.add(text(receipt.controlledLedgerSourceRef));

    const source = sourceMap.get(expectedSourceId);
    sourceContractReady(source, receiptId, blockers);
    receiptSourceStatusReady(receipt, source, blockers);
  }

  const statusesComplete = Object.keys(KD320_Q1_CONTROLLED_SOURCE_BINDINGS).every((receiptId) =>
    receiptMap.get(receiptId)?.status === VERIFIED_RECEIPT
    && sourceMap.get(KD320_Q1_CONTROLLED_SOURCE_BINDINGS[receiptId])?.status === RECONCILED_SOURCE);
  const ok = blockers.length === 0;

  return {
    ok,
    blockers: [...new Set(blockers)],
    bindings: { ...KD320_Q1_CONTROLLED_SOURCE_BINDINGS },
    sourceCustodyComplete: ok && statusesComplete,
    authority: { ...AUTHORITY_FALSE },
  };
}

export const KD320_Q1_SOURCE_CUSTODY_AUTHORITY = AUTHORITY_FALSE;
