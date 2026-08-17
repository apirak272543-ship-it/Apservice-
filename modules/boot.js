import { installLegacyBridge } from './legacy-bridge.js?v=admin-performance-v1';

if (typeof window !== 'undefined') {
  installLegacyBridge(window);
}
