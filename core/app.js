// Standalone app shell runtime delegate.
import { installAppTabClickStateBridge } from './app-tab-click-state-bridge.js?v=standalone-3';

installAppTabClickStateBridge();

export { init, destroy } from './app-standalone-runtime.js?v=20260729-fbx-preview-auto-zone-1';
