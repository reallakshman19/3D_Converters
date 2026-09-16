import { detectBranchLinePattern } from './xml-cii-adapted-branch-line-pattern-detect.js';

const text = (value) => value === undefined || value === null ? '' : String(value).trim();
const esc = (value) => text(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const unique = (values) => [...new Set((values || []).map(text).filter(Boolean))];
const compact = (value) => text(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
const regexEscape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function markPending(tr, label = '✏ Modified') {
  tr.dataset.status = 'mapped';
  tr.dataset.mappingSource = 'pending';
  const input = tr.querySelector('.bulk-line-input');
  if (input) {
    input.style.borderColor = '#3b82f6';
    input.style.backgroundColor = 'rgba(59,130,246,0.1)';
  }
  const status = tr.querySelector('.bulk-row-status');
  if (status) { status.textContent = label; status.style.color = '#60a5fa'; }
}

function exactMatchScore(branchName, lineKey) {
  const branch = text(branchName).toUpperCase();
  const key = text(lineKey).toUpperCase();
  if (!branch || !key) return 0;
  const parts = key.split(/[^A-Z0-9]+/).filter(Boolean);
  const keyCompact = parts.join('');
  if (!keyCompact) return 0;
  if (compact(branch) === keyCompact) return 300000 + keyCompact.length;
  const flexible = parts.map(regexEscape).join('[^A-Z0-9]*');
  return new RegExp(`(^|[^A-Z0-9])${flexible}(?=$|[^A-Z0-9])`).test(branch)
    ? 200000 + keyCompact.length
    : 0;
}

function familyTokens(branchName) {
  return unique(text(branchName).toUpperCase().match(/[A-Z][A-Z0-9]{4,}/g) || []);
}

function familyResolution(branchName, lineListKeys) {
  const loaded = unique(lineListKeys).map((key) => ({ key, compact: compact(key) })).filter((row) => row.compact);
  const tokens = familyTokens(branchName);
  for (let wildcardCount = 1; wildcardCount <= 4; wildcardCount += 1) {
    const matches = new Map();
    for (const token of tokens) {
      if (token.length <= wildcardCount + 2) continue;
      const prefix = token.slice(0, -wildcardCount);
      const keys = loaded.filter((row) => row.compact.length === token.length && row.compact.startsWith(prefix));
      for (const row of keys) matches.set(row.key, row);
      if (keys.length) {
        const mask = `${prefix}${'X'.repeat(wildcardCount)}`;
        const candidates = [...matches.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        return { status: candidates.length === 1 ? 'match' : 'ambiguous', candidates, key: candidates.length === 1 ? candidates[0] : '', mask, wildcardCount, token };
      }
    }
  }
  return { status: 'none', key: '', candidates: [], mask: '', wildcardCount: 0, token: '' };
}

export function resolveBranchLineKeySuggestion(branchName, lineListKeys = []) {
  const exact = unique(lineListKeys)
    .map((key) => ({ key, score: exactMatchScore(branchName, key) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || b.key.length - a.key.length || a.key.localeCompare(b.key, undefined, { numeric: true }));
  if (exact.length) {
    const topScore = exact[0].score;
    const top = exact.filter((row) => row.score === topScore).map((row) => row.key);
    return top.length === 1
      ? { status: 'match', key: top[0], candidates: top, method: 'exact-boundary', mask: '' }
      : { status: 'ambiguous', key: '', candidates: top, method: 'exact-boundary', mask: '' };
  }
  const family = familyResolution(branchName, lineListKeys);
  return { ...family, method: family.status === 'none' ? 'none' : 'progressive-family-mask' };
}

function unmappedBranches(container) {
  return [...container.querySelectorAll('.bulk-map-tr[data-mapping-source="unmapped"]')]
    .filter((tr) => !tr.querySelector('.bulk-line-input')?.value?.trim())
    .map((tr) => text(tr.getAttribute('data-branch')))
    .filter(Boolean);
}

function confidenceColor(confidence) {
  if (confidence === 'HIGH') return '#34d399';
  if (confidence === 'MEDIUM') return '#fbbf24';
  if (confidence === 'LOW') return '#fb923c';
  return '#f87171';
}

function showPatternResult(container, html) {
  const result = container.querySelector('.bulk-pattern-detect-result');
  if (!result) return;
  result.style.display = 'block';
  result.innerHTML = html;
}

function familyEvidenceHtml(branches, lineListKeys) {
  const rows = branches.map((branch) => ({ branch, result: resolveBranchLineKeySuggestion(branch, lineListKeys) }));
  const family = rows.filter((row) => row.result.method === 'progressive-family-mask' && row.result.status !== 'none');
  if (!family.length) return '';
  return family.slice(0, 6).map(({ branch, result }) => {
    const outcome = result.status === 'match' ? `→ ${result.key}` : `ambiguous: ${result.candidates.join(' / ')}`;
    return `<div style="margin-top:3px;"><code>${esc(branch)}</code> · mask <code>${esc(result.mask)}</code> · ${esc(outcome)}</div>`;
  }).join('');
}

function bindAutoDetectPattern(container, lineListKeys) {
  container.querySelector('.bulk-auto-detect-pattern-btn')?.addEventListener('click', () => {
    const branches = unmappedBranches(container);
    if (!branches.length) return showPatternResult(container, '<span style="color:#94a3b8;">No genuinely unmapped branch is available for pattern detection.</span>');
    if (!lineListKeys?.length) return showPatternResult(container, '<span style="color:#fbbf24;">No loaded Line List keys are available.</span>');
    const result = detectBranchLinePattern(branches, lineListKeys, { exampleLimit: 4 });
    if (result.status === 'ambiguous') {
      const alternatives = (result.candidates || []).map((candidate) => `<div><code>${esc(candidate.expression)}</code> → <code>${esc(candidate.replacement)}</code> · exact ${candidate.evaluation.exactMatchCount}/${candidate.evaluation.testedCount}</div>`).join('');
      return showPatternResult(container, `<strong style="color:#fbbf24;">⚠ Ambiguous exact-pattern evidence — nothing applied.</strong>${alternatives}`);
    }
    if (result.status !== 'detected' || !result.best) {
      const family = familyEvidenceHtml(branches, lineListKeys);
      return showPatternResult(container, '<strong style="color:#94a3b8;">No safe exact-key regex detected.</strong><div>Progressive family evidence is shown below; a family suggestion is auto-applied only when its mask resolves to exactly one loaded key.</div>' + family);
    }
    const best = result.best;
    const regex = container.querySelector('.bulk-pattern-regex');
    const replacement = container.querySelector('.bulk-pattern-replace');
    if (regex) regex.value = best.expression;
    if (replacement) replacement.value = best.replacement;
    const evaluation = best.evaluation;
    const examples = (best.examples || []).map((row) => `<div><code>${esc(row.branchName)}</code> → <code>${esc(row.key)}</code></div>`).join('');
    showPatternResult(container, `<strong style="color:${confidenceColor(best.confidence)};">Detected · ${esc(best.confidence)} confidence</strong> · Exact ${evaluation.exactMatchCount}/${evaluation.testedCount} · Distinct ${evaluation.distinctKeyCount} · Rejected ${evaluation.rejectedCount}<div>Proposal only. $1, $2… in Replace mean captured regex groups.</div>${examples}`);
  });
}

function bindPatternApply(container, lineListKeys) {
  const allowed = new Set(unique(lineListKeys));
  container.querySelector('.bulk-apply-pattern-btn')?.addEventListener('click', () => {
    const pattern = container.querySelector('.bulk-pattern-regex')?.value?.trim();
    const replacement = container.querySelector('.bulk-pattern-replace')?.value || '';
    if (!pattern) return alert('Enter a regex, or use Auto Detect Pattern to generate one. $1, $2… in Replace refer to capture groups.');
    let regex;
    try { regex = new RegExp(pattern); } catch (error) { return alert(`Invalid regex syntax: ${error.message}`); }
    let applied = 0;
    let rejected = 0;
    container.querySelectorAll('.bulk-map-tr[data-mapping-source="unmapped"]').forEach((tr) => {
      const input = tr.querySelector('.bulk-line-input');
      if (!input || input.value.trim()) return;
      const branch = tr.getAttribute('data-branch') || '';
      regex.lastIndex = 0;
      if (!regex.test(branch)) return;
      regex.lastIndex = 0;
      const candidate = branch.replace(regex, replacement).trim();
      if (!allowed.has(candidate)) {
        rejected += 1;
        const status = tr.querySelector('.bulk-row-status');
        if (status) { status.textContent = `⚠ Not in Line List: ${candidate || 'blank'}`; status.style.color = '#fbbf24'; }
        return;
      }
      input.value = candidate;
      markPending(tr);
      applied += 1;
    });
    alert(`${applied} exact loaded key(s) applied.${rejected ? ` ${rejected} non-authoritative result(s) rejected.` : ''}`);
  });
}

function bindAutoSuggest(container, lineListKeys) {
  container.querySelector('.bulk-autosuggest-btn')?.addEventListener('click', () => {
    if (!lineListKeys?.length) return alert('No master Line List keys loaded.');
    let suggested = 0;
    let ambiguous = 0;
    container.querySelectorAll('.bulk-map-tr[data-mapping-source="unmapped"]').forEach((tr) => {
      const input = tr.querySelector('.bulk-line-input');
      if (!input || input.value.trim()) return;
      const result = resolveBranchLineKeySuggestion(tr.getAttribute('data-branch') || '', lineListKeys);
      if (result.status === 'match') {
        input.value = result.key;
        markPending(tr, result.method === 'progressive-family-mask' ? `✨ Family ${result.mask}` : '✨ Suggested');
        suggested += 1;
      } else if (result.status === 'ambiguous') {
        ambiguous += 1;
        const status = tr.querySelector('.bulk-row-status');
        if (status) {
          status.textContent = `⚠ Ambiguous ${result.mask || 'match'}: ${result.candidates.join(' / ')}`;
          status.style.color = '#fbbf24';
          status.title = 'No mapping assigned because the most-specific safe family/exact rule resolves to multiple loaded Line List keys.';
        }
      }
    });
    alert(`${suggested} unambiguous mapping(s) suggested.${ambiguous ? ` ${ambiguous} ambiguous result(s) left for review.` : ''}`);
  });
}

export function bindBranchLineMapActions(container, lineListKeys) {
  bindAutoDetectPattern(container, lineListKeys);
  bindPatternApply(container, lineListKeys);
  bindAutoSuggest(container, lineListKeys);
}
