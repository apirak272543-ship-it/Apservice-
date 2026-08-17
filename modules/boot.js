import { installLegacyBridge } from './legacy-bridge.js?v=img-hardcap-v1';

if (typeof window !== 'undefined') {
  installLegacyBridge(window);
}
