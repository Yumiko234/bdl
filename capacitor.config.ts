import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.bdlsaintandre.app',
  appName: 'BDL Saint-André',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;