// Standalone app shell runtime delegate.
import { installAppTabClickStateBridge } from './app-tab-click-state-bridge.js?v=standalone-3';
import { installEngineeringTabs } from './engineering-tabs-extension.js?v=engineering-1';
import * as runtime from './app-standalone-runtime.js?v=20260804-fbx-multifamily-release-1';

const MODEL_CONVERTERS_MODULE = '../tabs/model-converters-tab.js?v=20260804-fbx-multifamily-release-1';
let destroyEngineeringTabs = null;

function loadLiveModelConverters() {
  return import(MODEL_CONVERTERS_MODULE).then((module) => {
    if (typeof module?.renderModelConvertersTab !== 'function') {
      throw new Error('Live Model Converters renderer export is missing.');
    }
    return module.renderModelConvertersTab;
  });
}

function installLiveModelConvertersLoader() {
  const modelConverters = runtime.STANDALONE_TABS?.find((tab) => tab.id === 'model-converters');
  if (!modelConverters) throw new Error('Standalone model-converters tab is unavailable.');
  modelConverters.load = loadLiveModelConverters;
}

installAppTabClickStateBridge();
installLiveModelConvertersLoader();

export async function init(root) {
  await runtime.init(root);
  destroyEngineeringTabs?.();
  destroyEngineeringTabs = installEngineeringTabs(root);
}

export function destroy() {
  destroyEngineeringTabs?.();
  destroyEngineeringTabs = null;
  runtime.destroy();
}

export const __FBX_LIVE_UI_CACHE_KEY__ = '20260804-fbx-multifamily-release-1';
