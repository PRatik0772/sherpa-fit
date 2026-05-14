import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sherpafit.app',
  appName: 'Sherpa Fit',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#f5f5f7',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
      iosSpinnerStyle: 'small',
    },
    StatusBar: {
      style: 'LIGHT',
      overlaysWebView: true,
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    Haptics: {},
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scheme: 'SherpaFit',
    backgroundColor: '#f5f5f7',
    allowsLinkPreview: false,
  },
};

export default config;
