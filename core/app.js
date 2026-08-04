// Standalone app shell runtime delegate.
import { installAppTabClickStateBridge } from './app-tab-click-state-bridge.js?v=standalone-3';
import * as runtime from './app-standalone-runtime.js?v=20260804-fbx-secondary-preview-1';

const MODEL_CONVERTERS_MODULE = '../tabs/model-converters-tab.js?v=20260804-fbx-secondary-preview-1';

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

export const init = runtime.init;
export const destroy = runtime.destroy;
export const __FBX_LIVE_UI_CACHE_KEY__ = '20260804-fbx-secondary-preview-1';
