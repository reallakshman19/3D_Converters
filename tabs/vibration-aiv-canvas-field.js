export function aivCanvasFieldKey(tableKind, rowIndex, column) {
  const kind = String(tableKind ?? '').trim();
  const row = Number(rowIndex);
  const name = String(column ?? '').trim();
  if (!kind || !Number.isInteger(row) || row < 0 || !name) return null;
  return `${kind}:${row}:${encodeURIComponent(name)}`;
}

export function focusAivCanvasField(container, fieldKey) {
  const key = String(fieldKey ?? '').trim();
  if (!key) return false;
  const input = [...container.querySelectorAll('[data-aiv-field-key]')]
    .find((element) => element.dataset.aivFieldKey === key);
  if (!input) return false;
  input.scrollIntoView?.({ block: 'center', inline: 'nearest' });
  input.focus?.();
  return true;
}
