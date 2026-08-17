import { installLegacyBridge } from './legacy-bridge.js?v=performance-storage-v2';

if (typeof window !== 'undefined') {
  installLegacyBridge(window);
}
