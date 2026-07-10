// Standalone app shell runtime delegate.
import { installAppTabClickStateBridge } from './app-tab-click-state-bridge.js?v=standalone-2';

installAppTabClickStateBridge();

export { init, destroy } from './app-standalone-runtime.js?v=standalone-2';
