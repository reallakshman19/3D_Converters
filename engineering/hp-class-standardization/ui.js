(function () {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const tabs = [...document.querySelectorAll('[data-workflow-target]')];
  const panels = [...document.querySelectorAll('[data-workflow-panel]')];
  const statusEls = new Map([...document.querySelectorAll('[data-workflow-status]')].map((el) => [el.dataset.workflowStatus, el]));
  const stageTitles = {
    design: 'Design Basis',
    static: 'Static Wall',
    cycles: 'Pressure Cycles',
    kd: 'KD Qualification',
    envelope: 'Class Envelope',
  };

  function nonBlank(id) {
    return Boolean((byId(id)?.value || '').trim());
  }

  function finitePositive(id) {
    const value = Number(byId(id)?.value);
    return Number.isFinite(value) && value > 0;
  }

  function setStatus(key, state, label) {
    const el = statusEls.get(key);
    if (!el) return;
    el.className = `workflow-status ${state}`;
    el.textContent = label;
  }

  function railState(id, state, label) {
    const el = byId(id);
    if (!el) return;
    el.textContent = label;
    el.dataset.state = state;
    el.style.color =
      state === 'complete' ? '#274e13' :
      state === 'special' ? '#7a2e16' :
      state === 'pending' ? '#765800' : '#59636d';
  }

  function stageDesign() {
    const engineering = finitePositive('diameter') && finitePositive('designPressure') && finitePositive('allowableStress') &&
      Number(byId('ci')?.value) >= 0 && Number(byId('co')?.value) >= 0 &&
      Number(byId('tolerance')?.value) >= 0 && nonBlank('candidateWalls');
    const identity = nonBlank('materialSpec') && nonBlank('materialGrade') && nonBlank('productSpec') && nonBlank('toleranceSource');
    if (engineering && identity) return ['complete', 'Complete'];
    if (engineering) return ['pending', 'Evidence pending'];
    return ['pending', 'Pending'];
  }

  function stageStatic() {
    const rows = [...document.querySelectorAll('#staticBody tr')];
    if (!rows.length) return ['pending', 'Pending'];
    const passes = rows.filter((row) => row.querySelector('.badge.good')).length;
    if (passes > 0) return ['complete', `${passes} pass`];
    return ['special', 'Blocked'];
  }

  function cycleRowsValid() {
    const rows = [...document.querySelectorAll('#cycleBody tr')];
    if (!rows.length) return false;
    return rows.every((row) => {
      const pmin = Number(row.querySelector('.cycle-pmin')?.value);
      const pmax = Number(row.querySelector('.cycle-pmax')?.value);
      const tmin = Number(row.querySelector('.cycle-tmin')?.value);
      const tmax = Number(row.querySelector('.cycle-tmax')?.value);
      const syt = Number(row.querySelector('.cycle-syt')?.value);
      const n = Number(row.querySelector('.cycle-n')?.value);
      return [pmin,pmax,tmin,tmax,syt,n].every(Number.isFinite) && pmin >= 0 && pmax >= pmin && tmax >= tmin && syt > 0 && n > 0;
    });
  }

  function stageCycles() {
    const rows = [...document.querySelectorAll('#cycleBody tr')];
    if (!rows.length) return ['pending', 'Pending'];
    return cycleRowsValid() ? ['complete', `${rows.length} block${rows.length === 1 ? '' : 's'}`] : ['pending', 'Incomplete'];
  }

  function kd2State() {
    if (!nonBlank('kd2Edition')) return ['blocked', 'Edition missing'];
    if (byId('kd2AnalysisMethod')?.value === 'unassessed') return ['blocked', 'Route pending'];
    if (['inelastic','special'].includes(byId('kd2AnalysisMethod')?.value)) return ['special', 'Special route'];
    if (byId('kd2StressModel')?.value !== 'pressure-analytic' || byId('kd2Geometry')?.value !== 'uniform') return ['special', 'External model'];
    if (!nonBlank('kd2LimitCalcId')) return ['blocked', 'Limit check pending'];
    if (!byId('kd2Approved')?.checked) return ['blocked', 'Approval pending'];
    return ['complete', 'Approved'];
  }

  function kd3Rows() {
    return [...document.querySelectorAll('#fatigueBody tr')];
  }

  function normalizedEdition(value) {
    return String(value || '').toLowerCase().replace(/[^0-9a-z]/g, '');
  }

  function kd3SourceState() {
    if (!nonBlank('kd3SourceEdition')) return ['blocked', 'Source edition missing'];
    if (!byId('kd3SourceConfirmed')?.checked) return ['blocked', 'Source not verified'];
    const project = normalizedEdition(byId('viii3Edition')?.value);
    const source = normalizedEdition(byId('kd3SourceEdition')?.value);
    if (project && source && project !== source) return ['special', 'Edition mismatch'];
    return ['complete', 'Source verified'];
  }

  function kd3State() {
    const sourceState = kd3SourceState();
    if (sourceState[0] !== 'complete') return sourceState;
    const rows = kd3Rows();
    if (!rows.length) return ['blocked', 'No results'];
    if (!nonBlank('viii3Edition') || !nonBlank('kdRoute') || !nonBlank('fatigueCurveId')) return ['blocked', 'Authority missing'];
    const complete = rows.every((row) => {
      const seq = Number(row.querySelector('input[id^="seq-"]')?.value);
      const ni = Number(row.querySelector('input[id^="ni-"]')?.value);
      const source = (row.querySelector('input[id^="source-"]')?.value || '').trim();
      const approved = row.querySelector('input[id^="approved-"]')?.checked;
      return seq > 0 && ni > 0 && source && approved;
    });
    return complete ? ['complete', 'Approved'] : ['blocked', 'Seq / Ni pending'];
  }

  function fractureState() {
    const status = byId('fractureStatus')?.value;
    if (status === 'special') return ['special', 'Special route'];
    if (!status || status === 'unassessed') return ['blocked', 'Unassessed'];
    if (!nonBlank('fractureEvidence')) return ['blocked', 'Evidence missing'];
    return ['complete', status === 'kd4-approved' ? 'KD-4 approved' : 'Cleared'];
  }

  function stageKd() {
    const k2 = kd2State();
    const k3 = kd3State();
    const fm = fractureState();
    if ([k2,k3,fm].some(([state]) => state === 'special')) return ['special', 'Special route'];
    if ([k2,k3,fm].every(([state]) => state === 'complete')) return ['complete', 'Complete'];
    return ['blocked', 'Blocked'];
  }

  function stageEnvelope() {
    const rows = [...document.querySelectorAll('#summaryBody tr')];
    if (!rows.length) return ['blocked', 'Blocked'];
    const text = rows.map((row) => row.textContent || '').join(' ');
    if (text.includes('Eligible for class-release review')) return ['complete', 'Review ready'];
    if (text.includes('Static fail') || text.includes('Cumulative fatigue usage > 1.0')) return ['special', 'Failed'];
    return ['blocked', 'Blocked'];
  }

  function currentContext() {
    const D = byId('diameter')?.value || '—';
    const walls = (byId('candidateWalls')?.value || '').split(',').map((value) => value.trim()).filter(Boolean);
    const cycles = document.querySelectorAll('#cycleBody tr').length;
    return `D ${D} mm · ${walls.length} candidate wall${walls.length === 1 ? '' : 's'} · ${cycles} pressure-cycle block${cycles === 1 ? '' : 's'}`;
  }

  function evidenceState(id, complete, good = 'Complete', bad = 'Missing') {
    const el = byId(id);
    if (!el) return;
    el.textContent = complete ? good : bad;
    el.className = complete ? 'evidence-ok' : '';
  }

  function blockers() {
    const items = [];
    if (!nonBlank('viii3Edition')) items.push('Confirm governing BPVC VIII-3 edition / addenda.');
    if (!(nonBlank('materialSpec') && nonBlank('materialGrade'))) items.push('Complete material specification / grade identity.');
    if (!(nonBlank('productSpec') && nonBlank('toleranceSource'))) items.push('Complete product specification and dimensional tolerance source.');

    const k2 = kd2State();
    if (k2[0] !== 'complete') items.push(`KD-2: ${k2[1]}.`);

    const k3 = kd3State();
    if (k3[0] !== 'complete') items.push(`KD-3: ${k3[1]}.`);

    const fm = fractureState();
    if (fm[0] !== 'complete') items.push(`Fracture / KD-4 gate: ${fm[1]}.`);

    const staticState = stageStatic();
    if (staticState[0] === 'special') items.push('No candidate wall currently passes the static pressure gate.');

    const inelastic = [...document.querySelectorAll('#fatigueBody .badge.warn')].length;
    if (inelastic) items.push(`${inelastic} wall × cycle case(s) require an inelastic/special route.`);

    return items;
  }

  function updateReviewUi() {
    const states = {
      design: stageDesign(),
      static: stageStatic(),
      cycles: stageCycles(),
      kd: stageKd(),
      envelope: stageEnvelope(),
    };
    Object.entries(states).forEach(([key,[state,label]]) => setStatus(key,state,label));

    const k2 = kd2State();
    const k3 = kd3State();
    const fm = fractureState();
    const kd2Chip = byId('kd2StatusChip');
    if (kd2Chip) { kd2Chip.className = `status-chip ${k2[0]}`; kd2Chip.textContent = k2[1]; }
    const kd3Chip = byId('kd3StatusChip');
    if (kd3Chip) { kd3Chip.className = `status-chip ${k3[0]}`; kd3Chip.textContent = k3[1]; }
    const fmChip = byId('fractureStatusChip');
    if (fmChip) { fmChip.className = `status-chip ${fm[0]}`; fmChip.textContent = fm[1]; }

    railState('rail-design', states.design[0], states.design[1]);
    railState('rail-static', states.static[0], states.static[1]);
    railState('rail-cycles', states.cycles[0], states.cycles[1]);
    railState('rail-kd2', k2[0], k2[1]);
    railState('rail-kd3', k3[0], k3[1]);
    railState('rail-fracture', fm[0], fm[1]);

    evidenceState('evidence-viii3', nonBlank('viii3Edition'));
    evidenceState('evidence-material', nonBlank('materialSpec') && nonBlank('materialGrade') && nonBlank('productSpec') && nonBlank('toleranceSource'));
    evidenceState('evidence-kd3', kd3SourceState()[0] === 'complete' && nonBlank('kdRoute') && nonBlank('fatigueCurveId'));

    const context = byId('railContext');
    if (context) context.textContent = currentContext();

    const list = byId('blockingReasons');
    const count = byId('blockerCount');
    const blockersNow = blockers();
    if (count) count.textContent = blockersNow.length ? String(blockersNow.length) : '0';
    if (list) {
      list.innerHTML = blockersNow.length
        ? blockersNow.map((item) => `<li>${item}</li>`).join('')
        : '<li>No current class-release blockers.</li>';
    }
  }

  function activateStage(key, push = false) {
    panels.forEach((panel) => {
      const active = panel.dataset.workflowPanel === key;
      panel.hidden = !active;
      panel.classList.toggle('active', active);
    });
    tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.workflowTarget === key));
    const title = byId('railStageTitle');
    if (title) title.textContent = stageTitles[key] || 'Qualification';
    if (push && history.replaceState) history.replaceState(null, '', `#${key}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateReviewUi();
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => activateStage(tab.dataset.workflowTarget, true)));
  document.querySelectorAll('[data-go-to]').forEach((button) => {
    button.addEventListener('click', () => activateStage(button.dataset.goTo, true));
  });

  document.addEventListener('input', () => setTimeout(updateReviewUi, 0));
  document.addEventListener('change', () => setTimeout(updateReviewUi, 0));
  document.addEventListener('click', () => setTimeout(updateReviewUi, 0));

  ['staticBody','cycleBody','kd2Body','fatigueBody','summaryBody'].forEach((id) => {
    const target = byId(id);
    if (target) new MutationObserver(() => updateReviewUi()).observe(target, { childList:true, subtree:true, characterData:true });
  });

  const requested = location.hash.replace('#','');
  activateStage(stageTitles[requested] ? requested : 'design');
  setTimeout(updateReviewUi, 0);
})();