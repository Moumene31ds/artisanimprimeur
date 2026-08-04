// src/config/index.ts

// ملف إعدادات مركزي للمشروع
// يسهل إدارة المتغيرات البيئية من مكان واحد، خاصة عند النشر
export const config = {
  // Firebase
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID,
  },

  // Free AI Provider (Ollama local → OpenRouter free fallback)
  ai: {
    provider: (process.env.AI_PROVIDER || 'auto') as 'auto' | 'ollama' | 'openrouter',
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'qwen3:8b',
    ollamaVisionModel: process.env.OLLAMA_VISION_MODEL || 'qwen3-vl:latest',
    openRouterModel: process.env.OPENROUTER_MODEL || 'openrouter/free',
    enabled: true, // free providers need no paid key
  },

  // Cloudinary
  cloudinary: {
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, // هذا المفتاح يمكن أن يكون عاماً (Client-side)
    apiKey: process.env.CLOUDINARY_API_KEY, // سري
    apiSecret: process.env.CLOUDINARY_API_SECRET, // سري
  },

  // WhatsApp Business API
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    businessPhone: process.env.WHATSAPP_BUSINESS_PHONE || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
    enabled: !!process.env.WHATSAPP_ACCESS_TOKEN,
  },

  // VAPID keys for Web Push notifications
  vapid: {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
  },

  // تفاصيل المطبعة (يمكن تعديلها)
  company: {
    name: "L'Artisan Imprimeur",
    slogan: "Votre partenaire premium pour l'impression.",
    phone: "+213549179000",
    email: "imprimeurlartisan@gmail.com",
    address: "Akid lotfi, Oran",
  },

  // قائمة الإيميلات المديرين (من .env.local)
  adminEmails: (process.env.ADMIN_EMAILS || '').split(','),

  // طريقة الدفع: الدفع عند الاستلام (COD) + التحقق اليدوي من وصولات الدفع.
  // لا يوجد أي مزود دفع إلكتروني (لا Stripe، لا PayPal، لا Chargily).
  payment: {
    method: 'cod' as const,
    label: 'Paiement à la livraison',
  },

  // App URL
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
};
