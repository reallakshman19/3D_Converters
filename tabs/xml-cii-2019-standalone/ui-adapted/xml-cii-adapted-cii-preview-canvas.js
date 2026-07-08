import { createElement } from './xml-cii-adapted-dom.js';

function text(value) {
  return String(value ?? '');
}

function byteCount(value) {
  return new TextEncoder().encode(text(value)).length;
}

export function adaptedCiiPreviewStats(ciiText) {
  const source = text(ciiText);
  const lines = source ? source.split(/\r\n|\r|\n/).length : 0;
  return { lines, bytes: byteCount(source), chars: source.length };
}

export function adaptedCiiPreviewLines(ciiText, limit) {
  return text(ciiText).split(/\r\n|\r|\n/).slice(0, limit);
}

function drawFallback(canvas, ciiText) {
  const preview = adaptedCiiPreviewLines(ciiText, 14).join('\n');
  canvas.textContent = preview || 'Run conversion to preview generated .cii output.';
}

export function drawAdaptedCiiPreviewCanvas(canvas, ciiText) {
  const ctx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
  if (!ctx) {
    drawFallback(canvas, ciiText);
    return;
  }

  const rect = typeof canvas.getBoundingClientRect === 'function' ? canvas.getBoundingClientRect() : {};
  const width = Math.max(720, Math.floor(rect.width || 920));
  const height = Math.max(240, Math.floor(rect.height || 280));
  const ratio = Number(canvas.ownerDocument?.defaultView?.devicePixelRatio || 1);
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  ctx.fillStyle = '#07111f';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#0d1b2d';
  ctx.fillRect(0, 0, width, 34);
  ctx.fillStyle = '#9fb7d6';
  ctx.font = '12px Consolas, ui-monospace, monospace';
  ctx.fillText('CII 2019 output preview', 14, 22);

  const lines = adaptedCiiPreviewLines(ciiText, 15);
  if (!lines.length || !text(ciiText).trim()) {
    ctx.fillStyle = '#7f8ea3';
    ctx.fillText('Run conversion to preview generated .cii output.', 18, 70);
    return;
  }

  ctx.font = '12px Consolas, ui-monospace, monospace';
  lines.forEach((line, index) => {
    const y = 58 + index * 14;
    ctx.fillStyle = '#4f6582';
    ctx.fillText(String(index + 1).padStart(3, ' '), 14, y);
    ctx.fillStyle = '#d6e4f7';
    ctx.fillText(text(line).slice(0, 150), 54, y);
  });
}

export function renderAdaptedCiiPreviewCanvas(parent, state, report) {
  const ciiText = text(state?.result?.ciiText);
  const ciiRow = (Array.isArray(report?.artifactRows) ? report.artifactRows : []).find((row) => row.kind === 'cii');
  const available = !!ciiText.trim() && ciiRow?.available !== false;
  const stats = adaptedCiiPreviewStats(ciiText);

  const card = createElement('div', '', 'xml-cii-adapted-cii-preview-card model-converters-preview-card');
  const head = createElement('div', '', 'xml-cii-adapted-cii-preview-head');
  head.appendChild(createElement('strong', 'CII Preview Canvas'));
  const download = createElement('button', 'Download .cii', 'model-converters-download-btn xml-cii-adapted-cii-download');
  download.type = 'button';
  download.dataset.action = 'download-cii';
  download.disabled = !available;
  head.appendChild(download);

  const host = createElement('div', '', 'xml-cii-adapted-cii-preview-host model-converters-preview-host');
  const canvas = createElement('canvas');
  canvas.setAttribute('aria-label', 'CII output preview canvas');
  host.appendChild(canvas);

  const metaText = available
    ? `${ciiRow?.filename || state?.result?.ciiName || 'output.cii'} | ${stats.lines} lines | ${stats.bytes} bytes`
    : 'Run conversion to enable the .cii preview and download.';
  card.append(head, host, createElement('div', metaText, 'xml-cii-adapted-cii-preview-meta model-converters-preview-meta'));
  parent.appendChild(card);
  drawAdaptedCiiPreviewCanvas(canvas, ciiText);
}
