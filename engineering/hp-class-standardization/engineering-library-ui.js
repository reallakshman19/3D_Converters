(function () {
  'use strict';
  const Core = globalThis.HpEngineeringLibraryCore;
  const byId = (id) => document.getElementById(id);

  function status(message, kind = 'info') {
    const box = byId('libraryStatusBox');
    box.className = `notice ${kind}`;
    box.textContent = message;
  }

  function inputCell(row, className, value = '', type = 'text') {
    const cell = row.insertCell();
    const input = document.createElement('input');
    input.className = `table-input ${className}`;
    input.type = type;
    if (type === 'number') input.step = 'any';
    input.value = value ?? '';
    cell.appendChild(input);
    return input;
  }

  function removeCell(row) {
    const cell = row.insertCell();
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'small-button remove-row'; button.textContent = 'Remove';
    cell.appendChild(button);
  }

  function addMaterialRow(data = {}) {
    const row = byId('materialBody').insertRow();
    inputCell(row, 'm-spec wide', data.materialSpec);
    inputCell(row, 'm-grade', data.grade);
    inputCell(row, 'm-condition', data.condition);
    inputCell(row, 'm-temp', data.temperatureC, 'number');
    inputCell(row, 'm-s', data.allowableStressMpa, 'number');
    inputCell(row, 'm-syt', data.yieldStrengthMpa, 'number');
    inputCell(row, 'm-source wide', data.sourceRef);
    removeCell(row);
  }

  function addProductRow(data = {}) {
    const row = byId('productBody').insertRow();
    const selectCell = row.insertCell();
    const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'productSelection'; radio.className = 'p-select';
    selectCell.appendChild(radio);
    inputCell(row, 'p-tag', data.tag);
    inputCell(row, 'p-spec wide', data.productSpec);
    inputCell(row, 'p-d', data.designDiameterMm, 'number');
    inputCell(row, 'p-wall', data.nominalWallMm, 'number');
    inputCell(row, 'p-tol', data.minusTolerancePct, 'number');
    inputCell(row, 'p-source wide', data.sourceRef);
    removeCell(row);
  }

  function materialRows() {
    return [...byId('materialBody').rows].map((row) => ({
      materialSpec: row.querySelector('.m-spec').value.trim(), grade: row.querySelector('.m-grade').value.trim(),
      condition: row.querySelector('.m-condition').value.trim(), temperatureC: row.querySelector('.m-temp').value,
      allowableStressMpa: row.querySelector('.m-s').value, yieldStrengthMpa: row.querySelector('.m-syt').value,
      sourceRef: row.querySelector('.m-source').value.trim(),
    }));
  }

  function productRows() {
    return [...byId('productBody').rows].map((row) => ({
      tag: row.querySelector('.p-tag').value.trim(), productSpec: row.querySelector('.p-spec').value.trim(),
      designDiameterMm: row.querySelector('.p-d').value, nominalWallMm: row.querySelector('.p-wall').value,
      minusTolerancePct: row.querySelector('.p-tol').value, sourceRef: row.querySelector('.p-source').value.trim(),
    }));
  }

  function metadata() {
    return {
      libraryId: byId('libraryId').value.trim(), revision: byId('libraryRevision').value.trim(),
      preparedBy: byId('libraryPreparedBy').value.trim(), materialSourceRef: byId('materialSourceRef').value.trim(),
      materialVersion: byId('materialVersion').value.trim(), productSourceRef: byId('productSourceRef').value.trim(),
      productVersion: byId('productVersion').value.trim(),
    };
  }

  function buildLibrary() {
    return Core.createLibrary({ metadata: metadata(), materials: materialRows(), products: productRows() });
  }

  function refreshMaterialSelection() {
    const select = byId('materialSelection');
    const prior = select.value;
    const groups = Core.materialGroups(materialRows());
    select.innerHTML = '<option value="">Select controlled material</option>';
    groups.forEach((group) => {
      const option = document.createElement('option'); option.value = group.key; option.textContent = group.label; select.appendChild(option);
    });
    if ([...select.options].some((o) => o.value === prior)) select.value = prior;
  }

  function calculatorDocument() {
    const packageFrame = byId('packageFrame');
    const packageDoc = packageFrame?.contentDocument;
    const calcFrame = packageDoc?.getElementById('appFrame');
    const calcDoc = calcFrame?.contentDocument;
    if (!calcDoc?.getElementById('diameter')) throw new Error('Calculator is not ready through the same-origin workspace.');
    return { calcDoc, calcFrame };
  }

  function cycleTargets(calcDoc) {
    return [...calcDoc.querySelectorAll('#cycleBody tr')].map((row) => {
      const tMinRaw = row.querySelector('.cycle-tmin')?.value?.trim() || '';
      const tMaxRaw = row.querySelector('.cycle-tmax')?.value?.trim() || '';
      const tMin = tMinRaw ? Number(tMinRaw) : NaN;
      const tMax = tMaxRaw ? Number(tMaxRaw) : NaN;
      return { row, name: row.querySelector('.cycle-name')?.value || row.dataset.cycleId, averageT: (tMin + tMax) / 2 };
    });
  }

  function triggerCalculate(calcDoc) {
    calcDoc.getElementById('calculateButton')?.click();
  }

  function applyMaterial() {
    try {
      const rows = materialRows();
      const key = byId('materialSelection').value;
      const designRaw = byId('materialDesignTemperature').value.trim();
      if (!designRaw) throw new Error('Design temperature for S is required.');
      const designT = Number(designRaw);
      const meta = metadata();
      if (!meta.materialSourceRef || !meta.materialVersion) throw new Error('Material source reference and version are required.');
      const design = Core.evaluateMaterial(rows, key, designT);
      if (!design.ok) throw new Error(design.error);
      const { calcDoc } = calculatorDocument();
      const cycles = cycleTargets(calcDoc);
      const cycleValues = cycles.map((cycle) => {
        if (!Number.isFinite(cycle.averageT)) throw new Error(`Cycle ${cycle.name}: Tmin/Tmax is incomplete.`);
        const evaluated = Core.evaluateMaterial(rows, key, cycle.averageT);
        if (!evaluated.ok) throw new Error(`Cycle ${cycle.name}: ${evaluated.error}`);
        return { ...cycle, evaluated };
      });
      const sample = rows.find((row) => Core.materialKey(row) === key);
      calcDoc.getElementById('materialSpec').value = sample.materialSpec;
      calcDoc.getElementById('materialGrade').value = [sample.grade, sample.condition].filter(Boolean).join(' / ');
      calcDoc.getElementById('allowableStress').value = design.allowableStressMpa;
      cycleValues.forEach(({ row, evaluated }) => { row.querySelector('.cycle-syt').value = evaluated.yieldStrengthMpa; });
      triggerCalculate(calcDoc);
      status(`Applied ${sample.materialSpec} ${sample.grade}: S=${design.allowableStressMpa.toFixed(3)} MPa at ${designT}°C (${design.basis}); Syt evaluated for ${cycleValues.length} cycle block(s). Source: ${meta.materialSourceRef} / ${meta.materialVersion}.`);
    } catch (error) { status(`Material application blocked: ${error.message}`, 'error'); }
  }

  function applyProduct() {
    try {
      const rows = productRows();
      const selected = [...byId('productBody').rows].findIndex((row) => row.querySelector('.p-select')?.checked);
      const result = Core.productByIndex(rows, selected);
      if (!result.ok) throw new Error(result.error);
      const row = result.row;
      const meta = metadata();
      if (!meta.productSourceRef || !meta.productVersion) throw new Error('Product source reference and version are required.');
      const { calcDoc } = calculatorDocument();
      calcDoc.getElementById('diameter').value = row.designDiameterMm;
      calcDoc.getElementById('productSpec').value = row.productSpec;
      calcDoc.getElementById('tolerance').value = row.minusTolerancePct;
      calcDoc.getElementById('toleranceSource').value = [meta.productSourceRef, meta.productVersion, row.sourceRef].filter(Boolean).join(' | ');
      calcDoc.getElementById('candidateWalls').value = String(row.nominalWallMm);
      triggerCalculate(calcDoc);
      status(`Applied product ${row.tag}: D=${row.designDiameterMm} mm, wall=${row.nominalWallMm} mm, minus tolerance=${row.minusTolerancePct}%.`);
    } catch (error) { status(`Product application blocked: ${error.message}`, 'error'); }
  }

  function downloadLibrary() {
    try {
      const lib = buildLibrary(); const validation = Core.validateLibrary(lib);
      if (!validation.ok) throw new Error(validation.errors[0]);
      const blob = new Blob([`${JSON.stringify(lib, null, 2)}\n`], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url;
      link.download = Core.safeFilename(lib.metadata.libraryId, lib.metadata.revision); link.click(); URL.revokeObjectURL(url);
      status(`Exported ${link.download}.`);
    } catch (error) { status(`Library export blocked: ${error.message}`, 'error'); }
  }

  async function importLibrary(file) {
    try {
      const lib = JSON.parse(await file.text()); const validation = Core.validateLibrary(lib);
      if (!validation.ok) throw new Error(validation.errors[0]);
      const m = lib.metadata; byId('libraryId').value = m.libraryId; byId('libraryRevision').value = m.revision;
      byId('libraryPreparedBy').value = m.preparedBy; byId('materialSourceRef').value = m.materialSourceRef;
      byId('materialVersion').value = m.materialVersion; byId('productSourceRef').value = m.productSourceRef; byId('productVersion').value = m.productVersion;
      byId('materialBody').innerHTML = ''; lib.materials.forEach(addMaterialRow);
      byId('productBody').innerHTML = ''; lib.products.forEach(addProductRow);
      refreshMaterialSelection(); status(`Imported ${m.libraryId} rev ${m.revision}: ${lib.materials.length} material point(s), ${lib.products.length} product row(s).`);
    } catch (error) { status(`Library import blocked: ${error.message}`, 'error'); }
  }

  document.addEventListener('click', (event) => {
    if (event.target.matches('.remove-row')) { event.target.closest('tr').remove(); refreshMaterialSelection(); }
  });
  byId('materialBody').addEventListener('input', refreshMaterialSelection);
  byId('addMaterialButton').addEventListener('click', () => addMaterialRow());
  byId('addProductButton').addEventListener('click', () => addProductRow());
  byId('applyMaterialButton').addEventListener('click', applyMaterial);
  byId('applyProductButton').addEventListener('click', applyProduct);
  byId('exportLibraryButton').addEventListener('click', downloadLibrary);
  byId('importLibraryButton').addEventListener('click', () => byId('libraryFile').click());
  byId('libraryFile').addEventListener('change', async () => { if (byId('libraryFile').files?.[0]) await importLibrary(byId('libraryFile').files[0]); byId('libraryFile').value = ''; });
  byId('packageFrame').addEventListener('load', () => status('Authority package workspace loaded. Libraries remain empty until you enter or import controlled data.'));
})();