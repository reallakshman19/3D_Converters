import { loadStickyState, state, setActiveTab } from './state.js';
import { RuntimeEvents } from '../contracts/runtime-events.js';
import { emit, on } from './event-bus.js';
import { hideLoading } from './loading.js';
import { initDevDebugWindow } from '../debug/dev-debug-window.js';

export const STANDALONE_APP = Object.freeze({
  id: 'format-converters',
  name: 'FormatConverters',
  subtitle: 'Converters, Exchange, Mapping',
  defaultTab: 'model-converters',
});

const TAB_VISIBILITY_URL = new URL('../config/tab-visibility.json', import.meta.url).href;
const APP_ICON_URL = new URL('../assets/app-icon.svg?v=standalone-1', import.meta.url).href;
const ACTIVE_TAB_STORAGE_KEY = 'format-converters.activeTabId';
const TAB_ID_ALIASES = new Map([
  ['model-converters', 'model-converters'],
  ['basic-glb-pcf', 'basic-glb-pcf'],
  ['universal-xml', 'universal-xml'],
  ['model-exchange', 'model-exchange'],
  ['interchange-config', 'interchange-config'],
  ['support-mapping-config', 'support-mapping-config'],
  ['adapter-mapping', 'adapter-mapping']
]);
const TAB_ICON_SVGS = Object.freeze({
  cube: '<path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>',
  pipe: '<path d="M4 15h6a4 4 0 0 0 4-4V5"/><path d="M14 5h5"/><circle cx="4" cy="15" r="1.5"/><circle cx="19" cy="5" r="1.5"/>',
  convert: '<path d="M5 7h12l-3-3M17 17H5l3 3"/><path d="M17 7 14 10M5 17l3-3"/>',
  exchange: '<path d="M4 8h12l-3-3M20 16H8l3 3"/><path d="M16 8h4v8M8 16H4V8"/>',
  gear: '<path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
  support: '<path d="M5 19h14M8 19l4-12 4 12M9.4 15h5.2"/><path d="M7 7h10"/>',
  map: '<path d="M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2V6Z"/><path d="M9 4v14M15 6v14"/>',
  xml: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M13 6l-2 12"/>',
  compare: '<path d="M7 5h10M7 19h10M8 5v14M16 5v14"/><path d="M4 9h7M13 15h7"/>',
  tool: '<path d="M14.5 5.5 18 2l4 4-3.5 3.5"/><path d="M15 6 5 16l-1 4 4-1L18 9"/>',
  json: '<path d="M8 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"/><path d="M16 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2"/><path d="M10 8l-2 8M14 8l2 8M11 12h2"/>',
});

export const STANDALONE_TABS = Object.freeze([
  { id: 'model-converters', label: '3D Model Converters', icon: 'convert', load: () => import('../tabs/model-converters-tab.js?v=standalone-2').then((module) => pickRenderer(module, 'renderModelConvertersTab', 'model-converters')) },
  { id: 'basic-glb-pcf', label: 'Basic GLB-PCF', icon: 'pipe', load: loadBasicGlbPcfRenderer },
  { id: 'universal-xml', label: 'Universal XML', icon: 'xml', load: () => import('../tabs/universal-xml-converter-tab.js?v=standalone-1').then((module) => pickRenderer(module, 'renderUniversalXmlConverterTab', 'universal-xml')) },
  { id: 'model-exchange', label: 'Model Exchange', icon: 'exchange', load: () => import('../tabs/model-exchange-tab.js?v=standalone-1').then((module) => pickRenderer(module, 'renderModelExchangeTab', 'model-exchange')) },
  { id: 'interchange-config', label: 'Interchange Config', icon: 'gear', load: () => import('../tabs/interchange-config-tab.js?v=standalone-1').then((module) => pickRenderer(module, 'renderInterchangeConfigTab', 'interchange-config')) },
  { id: 'support-mapping-config', label: 'Support Mapping', icon: 'support', load: () => import('../tabs/support-mapping-config-tab.js?v=standalone-1').then((module) => pickRenderer(module, 'renderSupportMappingConfigTab', 'support-mapping-config')) },
  { id: 'adapter-mapping', label: 'Adapter Mapping', icon: 'map', load: () => import('../tabs/adapter-mapping-tab.js?v=standalone-1').then((module) => pickRenderer(module, 'renderAdapterMappingTab', 'adapter-mapping')) }
]);
const TAB_GROUPS = Object.freeze([
  { label: 'Converters', ids: [
  "model-converters",
  "basic-glb-pcf",
  "universal-xml"
] },
  { label: 'Exchange', ids: [
  "model-exchange",
  "interchange-config",
  "support-mapping-config",
  "adapter-mapping"
] }
]);
let activeTabDestroy = null;
let appDestroy = null;

function cleanupActiveTab() {
  if (!activeTabDestroy) return;
  try { activeTabDestroy(); } catch (error) { console.warn('Tab cleanup failed', error); }
  activeTabDestroy = null;
}

function hideStartupOverlay() {
  try { hideLoading(); } catch {}
  const overlay = document.getElementById('app-loading-overlay');
  if (!overlay) return;
  overlay.classList.remove('is-visible');
  overlay.setAttribute('aria-hidden', 'true');
}

function pickRenderer(module, exportName, tabId) {
  const renderer = module?.[exportName];
  if (typeof renderer !== 'function') throw new Error(`Tab ${tabId} did not export renderer ${exportName}`);
  return renderer;
}

async function loadBasicGlbPcfRenderer() {
  await import('../js/pcf2glb/ui/basicGlbPcfUiEnhancer.js?v=standalone-1');
  return import('../js/pcf2glb/ui/BasicGlbPcfPanel.js?v=standalone-1').then((module) => pickRenderer(module, 'renderBasicGlbPcfPanel', 'basic-glb-pcf'));
}

async function resolveVisibleTabs() {
  try {
    const response = await fetch(TAB_VISIBILITY_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const config = await response.json();
    const hidden = new Set(Array.isArray(config.hiddenTabs) ? config.hiddenTabs : []);
    return STANDALONE_TABS.filter((tab) => !hidden.has(tab.id));
  } catch {
    return STANDALONE_TABS;
  }
}

function groupTabs(visibleTabs) {
  const byId = new Map(visibleTabs.map((tab) => [tab.id, tab]));
  const grouped = TAB_GROUPS.map((group) => ({ label: group.label, tabs: group.ids.map((id) => byId.get(id)).filter(Boolean) })).filter((group) => group.tabs.length);
  const groupedIds = new Set(grouped.flatMap((group) => group.tabs.map((tab) => tab.id)));
  const remaining = visibleTabs.filter((tab) => !groupedIds.has(tab.id));
  if (remaining.length) grouped.push({ label: 'More', tabs: remaining });
  return grouped;
}

function normalizeTabId(tabId, visibleTabs) {
  const requested = TAB_ID_ALIASES.get(tabId) || tabId;
  if (visibleTabs.some((tab) => tab.id === requested)) return requested;
  if (visibleTabs.some((tab) => tab.id === STANDALONE_APP.defaultTab)) return STANDALONE_APP.defaultTab;
  return visibleTabs[0]?.id || STANDALONE_APP.defaultTab;
}

function renderTabNav(navEl, visibleTabs, activeTabId) {
  navEl.innerHTML = '';
  const groups = groupTabs(visibleTabs);
  for (const group of groups) {
    const section = document.createElement('section');
    section.className = 'tab-group';
    const title = document.createElement('h2');
    title.textContent = group.label;
    section.appendChild(title);
    const list = document.createElement('div');
    list.className = 'tab-list';
    for (const tab of group.tabs) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tab-button';
      button.dataset.tabId = tab.id;
      button.setAttribute('aria-selected', tab.id === activeTabId ? 'true' : 'false');
      button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${TAB_ICON_SVGS[tab.icon] || TAB_ICON_SVGS.convert}</svg><span>${tab.label}</span>`;
      list.appendChild(button);
    }
    section.appendChild(list);
    navEl.appendChild(section);
  }
}

function renderShell(container, visibleTabs, activeTabId) {
  container.innerHTML = '';
  const shell = document.createElement('div');
  shell.className = 'standalone-shell';
  shell.innerHTML = `
    <aside class="standalone-sidebar">
      <div class="app-brand">
        <img src="${APP_ICON_URL}" alt="" />
        <div><strong>${STANDALONE_APP.name}</strong><span>${STANDALONE_APP.subtitle}</span></div>
      </div>
      <nav class="standalone-tabs" aria-label="Format converter tools"></nav>
    </aside>
    <main class="standalone-main" id="standalone-tab-content"></main>
  `;
  container.appendChild(shell);
  renderTabNav(shell.querySelector('.standalone-tabs'), visibleTabs, activeTabId);
  return shell.querySelector('#standalone-tab-content');
}

async function renderActiveTab(contentEl, visibleTabs, activeTabId) {
  cleanupActiveTab();
  const active = visibleTabs.find((tab) => tab.id === activeTabId) || visibleTabs[0];
  if (!active) {
    contentEl.innerHTML = '<section class="empty-tab"><h1>No tabs available</h1></section>';
    return;
  }
  contentEl.innerHTML = '<section class="loading-tab"><h1>Loading…</h1></section>';
  try {
    const renderer = await active.load();
    contentEl.innerHTML = '';
    activeTabDestroy = renderer(contentEl, { state, emit, on, setActiveTab });
  } catch (error) {
    console.error('Failed to render tab', active.id, error);
    contentEl.innerHTML = `<section class="error-tab"><h1>Tab failed to load</h1><p>${String(error?.message || error)}</p></section>`;
  }
}

export async function initStandaloneApp(container = document.getElementById('app')) {
  if (!container) return;
  try { initDevDebugWindow(); } catch {}
  loadStickyState();
  const visibleTabs = await resolveVisibleTabs();
  let activeTabId = normalizeTabId(state.activeTabId || localStorage.getItem(ACTIVE_TAB_STORAGE_KEY), visibleTabs);
  state.activeTabId = activeTabId;
  localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTabId);
  let contentEl = renderShell(container, visibleTabs, activeTabId);
  await renderActiveTab(contentEl, visibleTabs, activeTabId);
  hideStartupOverlay();
  appDestroy = on(RuntimeEvents.APP_SET_ACTIVE_TAB, async ({ tabId }) => {
    const next = normalizeTabId(tabId, visibleTabs);
    if (next === activeTabId) return;
    activeTabId = next;
    state.activeTabId = next;
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, next);
    contentEl = renderShell(container, visibleTabs, activeTabId);
    await renderActiveTab(contentEl, visibleTabs, activeTabId);
  });
}

export function destroyStandaloneApp() {
  cleanupActiveTab();
  try { appDestroy?.(); } catch {}
  appDestroy = null;
}