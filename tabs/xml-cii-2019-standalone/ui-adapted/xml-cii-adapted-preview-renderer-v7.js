import {
  xmlCiiBuildAndRenderPreview as buildLegacyPreview,
  xmlCiiRenderPreviewPhase,
} from './xml-cii-adapted-preview-renderer.js';
import {
  XML_CII_PREVIEW_CACHE_SCHEMA,
  XML_CII_PREVIEW_LEGACY_CACHE_KEY,
  capturePreviewCacheV7,
  clearPreviewCacheBridge,
  createPreviewCacheAuthority,
  discardPreviewCacheV7,
  restorePreviewCacheV7,
  shortPreviewCacheDigest,
} from './xml-cii-adapted-preview-cache-v7.js';

export { xmlCiiRenderPreviewPhase };

function text(value) {
  return value === undefined || value === null ? '' : String(value);
}

function esc(value) {
  return text(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function resolveStagedSource(options, config) {
  if (typeof options?.resolveStagedJsonText === 'function') {
    const resolved = await options.resolveStagedJsonText(config);
    if (resolved && typeof resolved === 'object') {
      return {
        text: text(resolved.text ?? resolved.stagedJsonText),
        label: text(resolved.label || resolved.sourceLabel),
      };
    }
    return { text: text(resolved), label: '' };
  }
  return {
    text: text(options?.stagedJsonText),
    label: text(options?.stagedSourceLabel),
  };
}

function previewRendered(host) {
  return !!host?.querySelector?.('table, [data-mc-edit-type], .mc-preview-editable-val');
}

function legacyBridgePresent() {
  try {
    return typeof localStorage !== 'undefined' && !!localStorage.getItem(XML_CII_PREVIEW_LEGACY_CACHE_KEY);
  } catch {
    return false;
  }
}

function addCacheEvidence(host, { status, authority, reason = '' } = {}) {
  if (!host) return;
  const existing = host.querySelector?.('[data-mc-preview-cache-evidence]');
  if (existing) existing.remove();
  host.dataset.mcPreviewCacheSchema = XML_CII_PREVIEW_CACHE_SCHEMA;
  host.dataset.mcPreviewCacheStatus = status;
  host.dataset.mcPreviewCacheDigest = authority?.digest || '';
  const digest = shortPreviewCacheDigest(authority);
  const byteDetail = authority
    ? `XML ${authority.xmlBytes} B · staged JSON ${authority.stagedJsonBytes} B · canonical authority ${authority.canonicalBytes} B`
    : 'SHA-256 authority unavailable';
  const reasonDetail = reason ? ` · ${reason}` : '';
  host.insertAdjacentHTML?.(
    'afterbegin',
    `<div data-mc-preview-cache-evidence class="model-converters-workflow-detail-note" style="margin:0 0 8px;border-color:#475569;color:#334155;background:#f8fafc;">Preview cache v7: <strong>${esc(status)}</strong> · SHA-256 ${esc(digest)} · ${esc(byteDetail)}${esc(reasonDetail)}</div>`,
  );
}

function installInternalRebuildCapture(host, xmlText, config, options) {
  if (!host || typeof MutationObserver === 'undefined') return;
  host.__xmlCiiPreviewCacheV7Observer?.disconnect?.();
  let timer = null;
  let running = false;
  const observer = new MutationObserver(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(async () => {
      timer = null;
      if (running || !previewRendered(host) || !legacyBridgePresent()) return;
      running = true;
      try {
        const stagedSource = await resolveStagedSource(options, config);
        const authority = await createPreviewCacheAuthority({
          xmlText,
          stagedJsonText: stagedSource.text,
          config,
        });
        const captured = capturePreviewCacheV7(authority);
        addCacheEvidence(host, {
          status: captured.stored ? 'REBUILT' : 'UNCACHED',
          authority,
          reason: captured.stored ? '' : captured.reason,
        });
      } catch (error) {
        clearPreviewCacheBridge();
        addCacheEvidence(host, {
          status: 'UNCACHED',
          authority: null,
          reason: text(error?.message || error),
        });
      } finally {
        running = false;
      }
    }, 0);
  });
  observer.observe(host, { childList: true, subtree: true });
  host.__xmlCiiPreviewCacheV7Observer = observer;
}

export async function xmlCiiBuildAndRenderPreview(rootEl, xmlText, config, options = {}) {
  const host = rootEl?.querySelector?.('#mc-preview-table-host');
  if (!host) return;
  installInternalRebuildCapture(host, xmlText, config, options);

  const stagedSource = await resolveStagedSource(options, config);
  const delegatedOptions = {
    ...options,
    stagedJsonText: stagedSource.text,
    stagedSourceLabel: stagedSource.label,
    resolveStagedJsonText: async () => stagedSource,
  };

  let authority = null;
  let restored = { restored: false, reason: 'not-attempted' };
  let digestError = null;
  try {
    authority = await createPreviewCacheAuthority({
      xmlText,
      stagedJsonText: stagedSource.text,
      config,
    });
    if (options.forceBuild === true) clearPreviewCacheBridge();
    else restored = restorePreviewCacheV7(authority);
  } catch (error) {
    digestError = error;
    clearPreviewCacheBridge();
  }

  await buildLegacyPreview(rootEl, xmlText, config, delegatedOptions);

  const rendered = previewRendered(host);
  if (!authority) {
    clearPreviewCacheBridge();
    addCacheEvidence(host, {
      status: rendered ? 'UNCACHED' : 'DISABLED',
      authority,
      reason: text(digestError?.message || digestError),
    });
    return;
  }

  if (!rendered) {
    if (restored.restored) discardPreviewCacheV7();
    else clearPreviewCacheBridge();
    addCacheEvidence(host, {
      status: 'MISS',
      authority,
      reason: restored.restored ? 'legacy fingerprint rejected; rebuild required' : restored.reason,
    });
    return;
  }

  const captured = capturePreviewCacheV7(authority);
  const status = options.forceBuild === true
    ? (captured.stored ? 'REBUILT' : 'UNCACHED')
    : (restored.restored ? 'HIT' : (captured.stored ? 'REBUILT' : 'UNCACHED'));
  addCacheEvidence(host, {
    status,
    authority,
    reason: captured.stored ? '' : captured.reason,
  });
}
