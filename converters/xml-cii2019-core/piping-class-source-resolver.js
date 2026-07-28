import { tokenAtPosition } from './regex-line-key.js';

function text(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function regexGroup(value, pattern, group = 1) {
  const source = text(value);
  const rule = text(pattern);
  if (!source || !rule) return '';
  try {
    const match = new RegExp(rule, 'i').exec(source);
    return text(match?.[Math.max(0, Number(group || 1))] ?? match?.[0]);
  } catch {
    return '';
  }
}

function looksLikeNps(value) {
  return /^\s*\d+(?:\.\d+)?\s*(?:"|in|inch|nps)?\s*$/i.test(text(value));
}

function likelyMaterial(value) {
  return /^(CS|SS|LTCS|DSS|SDSS|ALLOY|GI|CI|DI|PVC|CPVC|HDPE|GRP|GRE)$/i.test(text(value));
}

export function deriveXmlCiiPipingClassFromBranchName(branchName, config = {}) {
  const regexValue = regexGroup(
    branchName,
    config?.rating?.pipingClassRegex,
    config?.rating?.pipingClassGroup || 1,
  );
  if (regexValue) return regexValue;
  const delimiter = config?.rating?.tokenDelimiter || config?.linelist?.tokenDelimiter || '-';
  const index = Number(config?.rating?.pipingClassTokenIndex || 5);
  const value = tokenAtPosition(branchName, delimiter, index);
  if (index !== 5) return text(value);
  const fourth = tokenAtPosition(branchName, delimiter, 4);
  const sixth = tokenAtPosition(branchName, delimiter, 6);
  if (likelyMaterial(value) && looksLikeNps(fourth) && /^S\d+/i.test(text(sixth))) return '';
  return text(value);
}

export function selectXmlCiiRequestedPipingClass({
  branchName = '',
  lineListPipingClass = '',
  config = {},
} = {}) {
  const branchPipingClass = deriveXmlCiiPipingClassFromBranchName(branchName, config);
  const lineListClass = text(lineListPipingClass);
  return {
    requestedPipingClass: branchPipingClass || lineListClass,
    branchPipingClass,
    lineListPipingClass: lineListClass,
    source: branchPipingClass ? 'branch-name' : (lineListClass ? 'line-list' : 'none'),
  };
}
