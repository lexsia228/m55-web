import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'jp.m55.app',
  appName: 'M55',
  webDir: 'public/legacy',
  bundledWebRuntime: false,
  server: {
    // For packaged builds, keep this unset.
    // For dev on device, you can set url to your LAN devserver.
  }
};

export default config;
