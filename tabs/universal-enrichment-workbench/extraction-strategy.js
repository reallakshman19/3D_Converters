const ALLOWED_FLAGS = new Set(['i', 'm', 's', 'u']);
const VALUE_SOURCE_KINDS = new Set(['entity-name', 'entity-value', 'source-path', 'attribute']);

function rejected(kind, input, reason) {
  return { kind, input, outcome: 'rejected', candidate: null, reason };
}

function matched(kind, input, candidate) {
  return { kind, input, outcome: 'matched', candidate, reason: '' };
}

export function validateRegexStrategy(strategy = {}) {
  const errors = [];
  const flags = String(strategy.flags ?? '');
  if (String(strategy.pattern ?? '').length > 500) errors.push('Regex pattern exceeds 500 characters.');
  const seen = new Set();
  for (const flag of flags) {
    if (!ALLOWED_FLAGS.has(flag)) errors.push(`Regex flag ${flag} is unsupported.`);
    if (seen.has(flag)) errors.push(`Regex flag ${flag} is duplicated.`);
    seen.add(flag);
  }
  const group = strategy.captureGroup;
  if (!(Number.isInteger(group) && group >= 0) && !(typeof group === 'string' && group.trim())) {
    errors.push('Regex captureGroup must be a non-negative integer or named group.');
  }
  try { new RegExp(String(strategy.pattern ?? ''), flags); }
  catch (error) { errors.push(`Regex pattern is invalid: ${error.message}`); }
  return errors;
}

export function validateTokenStrategy(strategy = {}) {
  const errors = [];
  if (!['literal', 'whitespace'].includes(strategy.delimiterMode)) errors.push('Token delimiterMode is invalid.');
  if (strategy.delimiterMode === 'literal' && String(strategy.delimiter ?? '') === '') {
    errors.push('Literal token delimiter is required.');
  }
  if (!Number.isInteger(strategy.tokenIndex) || strategy.tokenIndex < 0) {
    errors.push('Token index must be a non-negative integer.');
  }
  return errors;
}

export function validateExtractionStrategyDefinition(strategy = {}) {
  if (strategy.kind === 'regex') return validateRegexStrategy(strategy);
  if (strategy.kind === 'token') return validateTokenStrategy(strategy);
  return [`Extraction strategy kind ${strategy.kind || '(empty)'} is unsupported.`];
}

export function compileRegexStrategy(strategy) {
  const errors = validateRegexStrategy(strategy);
  if (errors.length) return { ok: false, error: errors.join(' ') };
  return { ok: true, regex: new RegExp(strategy.pattern, strategy.flags) };
}

function regexCandidate(match, group) {
  if (typeof group === 'string') return match.groups?.[group];
  return match[group];
}

export function executeExtractionStrategy(strategy, input) {
  const text = String(input ?? '');
  if (strategy.kind === 'regex') {
    const compiled = compileRegexStrategy(strategy);
    if (!compiled.ok) return rejected('regex', text, compiled.error);
    const match = compiled.regex.exec(text);
    if (!match) return rejected('regex', text, 'Regex did not match.');
    const candidate = regexCandidate(match, strategy.captureGroup);
    if (candidate === undefined) return rejected('regex', text, 'Configured capture group was not present.');
    return matched('regex', text, strategy.trim ? String(candidate).trim() : String(candidate));
  }
  if (strategy.kind !== 'token') return rejected(String(strategy.kind || ''), text, 'Unsupported strategy kind.');
  const errors = validateTokenStrategy(strategy);
  if (errors.length) return rejected('token', text, errors.join(' '));
  const tokens = strategy.delimiterMode === 'whitespace'
    ? (text.trim() ? text.trim().split(/\s+/u) : [])
    : text.split(strategy.delimiter);
  if (strategy.tokenIndex >= tokens.length) return rejected('token', text, 'Token index is out of range.');
  const candidate = tokens[strategy.tokenIndex];
  return matched('token', text, strategy.trim ? candidate.trim() : candidate);
}

export function matchesSourceSelector(selector = {}, entity = {}) {
  const kinds = selector.entityKinds || [];
  if (kinds.length && !kinds.includes(entity.entityKind)) return false;
  if (selector.nameEquals && entity.name !== selector.nameEquals) return false;
  if (selector.sourcePathPrefix && !String(entity.sourcePath || '').startsWith(selector.sourcePathPrefix)) return false;
  return true;
}

export function resolveExtractionInput(valueSource = {}, entity = {}) {
  if (!VALUE_SOURCE_KINDS.has(valueSource.kind)) return { ok: false, reason: 'Unsupported value source.' };
  let value;
  if (valueSource.kind === 'entity-name') value = entity.name;
  if (valueSource.kind === 'entity-value') value = entity.value;
  if (valueSource.kind === 'source-path') value = entity.sourcePath;
  if (valueSource.kind === 'attribute') {
    if (!Object.hasOwn(entity.attributes || {}, valueSource.attributeName)) return { ok: false, reason: 'Attribute is missing.' };
    value = entity.attributes[valueSource.attributeName];
  }
  if (value !== null && typeof value === 'object') return { ok: false, reason: 'Object and array values are unsupported.' };
  if (value === undefined) return { ok: false, reason: 'Source value is missing.' };
  return { ok: true, input: value === null ? '' : String(value) };
}

export function testExtractionRule(rule, entity, inputLimit = 10000) {
  if (!matchesSourceSelector(rule.sourceSelector, entity)) return null;
  const resolved = resolveExtractionInput(rule.valueSource, entity);
  if (!resolved.ok) return createRejectedRuleResult(rule, entity, '', resolved.reason);
  if (resolved.input.length > inputLimit) return createRejectedRuleResult(rule, entity, '', `Input exceeds ${inputLimit} characters.`);
  const attempts = [];
  for (let index = 0; index < rule.strategies.length; index += 1) {
    const outcome = executeExtractionStrategy(rule.strategies[index], resolved.input);
    attempts.push({ strategyIndex: index, ...outcome });
    if (outcome.outcome === 'matched') return createRuleResult(rule, entity, resolved.input, attempts, index, outcome.candidate);
  }
  return createRuleResult(rule, entity, resolved.input, attempts, null, null);
}

function createRuleResult(rule, entity, input, attempts, winningStrategyIndex, value) {
  return {
    ruleId: rule.ruleId, fieldKey: rule.fieldKey, entityId: entity.entityId,
    sourcePath: entity.sourcePath, input,
    status: winningStrategyIndex === null ? 'rejected' : 'matched', value,
    winningStrategyIndex, attempts,
  };
}

function createRejectedRuleResult(rule, entity, input, reason) {
  const strategy = rule.strategies[0] || { kind: 'regex' };
  const attempts = [{ strategyIndex: 0, ...rejected(strategy.kind, input, reason) }];
  return createRuleResult(rule, entity, input, attempts, null, null);
}
