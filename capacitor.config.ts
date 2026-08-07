import type { CapacitorConfig } from '@capacitor/cli';

/**
 * إعدادات كاباسيتور — تُغلِّف تطبيق الويب الحالي في تطبيق أندرويد/iOS أصلي.
 *
 * الوضع المعتمد هنا هو « server.url »: التطبيق الأصلي يحمّل الموقع المنشور
 * على Vercel مباشرة (وهذا يحافظ على كل مزايا الخادم: واجهات API، لوحة
 * المشرف، الدفع، الذكاء الاصطناعي…) مع إضافة إمكانيات الأجهزة الأصلية عبر
 * الجسر الأصلي لكاباسيتور (مشاركة، اهتزاز، كاميرا، بصمة، إشعارات…).
 *
 * بدائل:
 *  - للاختبار أثناء التطوير: `npx cap run android --server https://artisanimprimeur.vercel.app`
 *  - للوضع المحلي بالكامل (بلا خادم): اضبط `webDir` على مجلد التصدير الثابت
 *    — يتطلب `output: 'export'` في next.config، ولا يدعم واجهات API.
 */
const config: CapacitorConfig = {
  appId: 'dz.lartisan.imprimeur',
  appName: "L'Artisan Imprimeur",
  webDir: 'web-dist',
  server: {
    url: 'https://artisanimprimeur.vercel.app',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#000000',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#000000',
      overlaysWebView: true,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    BiometricAuth: {
      androidBiometryStrength: 'strong',
      allowDeviceCredentials: true,
      enableDebugLog: false,
    },
    PrivacyScreen: {
      enable: false,
    },
  },
};

export default config;
