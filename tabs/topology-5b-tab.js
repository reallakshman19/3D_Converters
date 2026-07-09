const WORKBENCH_URL = new URL('../topology-5b/index.html', import.meta.url).href;

function injectStyles() {
  if (document.getElementById('topology-5b-tab-style')) return;
  const style = document.createElement('style');
  style.id = 'topology-5b-tab-style';
  style.textContent = `
    .topology-5b-tab {
      min-height: calc(100vh - 32px);
      height: calc(100vh - 32px);
      display: flex;
      flex-direction: column;
      background: #07101f;
      color: #e5edf8;
      overflow: hidden;
    }
    .topology-5b-tab__bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      border-bottom: 1px solid #263854;
      background: #0c1729;
      flex: 0 0 auto;
    }
    .topology-5b-tab__title {
      font-weight: 800;
      font-size: 14px;
      letter-spacing: .02em;
    }
    .topology-5b-tab__note {
      color: #9fb0c9;
      font-size: 12px;
      margin-top: 2px;
    }
    .topology-5b-tab__actions {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
    }
    .topology-5b-tab__actions button,
    .topology-5b-tab__actions a {
      border: 1px solid #2e4264;
      border-radius: 7px;
      padding: 7px 10px;
      background: #14253d;
      color: #e5edf8;
      text-decoration: none;
      cursor: pointer;
      font: inherit;
      font-size: 12px;
    }
    .topology-5b-tab__frame {
      width: 100%;
      height: 100%;
      border: 0;
      flex: 1 1 auto;
      background: #07101f;
    }
  `;
  document.head.appendChild(style);
}

export function renderTopology5BTab(container) {
  injectStyles();

  container.innerHTML = `
    <section class="topology-5b-tab" data-topology-5b-tab="visible">
      <div class="topology-5b-tab__bar">
        <div>
          <div class="topology-5b-tab__title">5B Topology Workbench</div>
          <div class="topology-5b-tab__note">Visible app tab: branch multipanel, calc panel, POS-only topology graph canvas.</div>
        </div>
        <div class="topology-5b-tab__actions">
          <button type="button" data-topology-reload>Reload workbench</button>
          <a href="${WORKBENCH_URL}" target="_blank" rel="noreferrer">Open full page</a>
        </div>
      </div>
      <iframe class="topology-5b-tab__frame" title="5B Topology Workbench" src="${WORKBENCH_URL}"></iframe>
    </section>
  `;

  const frame = container.querySelector('iframe');
  const reload = container.querySelector('[data-topology-reload]');
  reload?.addEventListener('click', () => {
    if (frame) frame.src = WORKBENCH_URL;
  });

  return () => {
    container.innerHTML = '';
  };
}
