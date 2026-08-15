import { installLegacyBridge } from './legacy-bridge.js';

if (typeof window !== 'undefined') {
  installLegacyBridge(window);
}
