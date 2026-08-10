// src/lib/audit.ts
// سجل تدقيق أمني: يكتب أحداثاً حساسة إلى Firestore (securityLogs) عبر firebase-admin.
// يعمل فقط في بيئة Node (مستدعى من API routes) وبصلاحيات الخدمة، ولا يكتب شيئاً
// إن لم تُضبط FIREBASE_SERVICE_ACCOUNT — فلا يكسر النشر أبداً.

let adminReady = false;

function getAdminInstance(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const admin = require('firebase-admin');
    if (adminReady && admin.apps.length > 0) return admin;
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccount) return null;
    const parsed = JSON.parse(serviceAccount);
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(parsed),
        projectId: parsed.project_id,
      });
    }
    adminReady = true;
    return admin;
  } catch (e) {
    console.warn('[audit] firebase-admin unavailable:', (e as Error)?.message ?? e);
    return null;
  }
}

export interface SecurityEvent {
  type: string;
  ip?: string;
  userId?: string;
  email?: string;
  details?: string;
  metadata?: Record<string, unknown>;
}

/**
 * تسجيل حدث أمني في مجموعة securityLogs.
 * - يبتلع كل الأخطاء (لا يعطّل الطلب الرئيسي أبداً).
 * - بدون FIREBASE_SERVICE_ACCOUNT يقوم بالمرور الصامت.
 */
export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    const admin = getAdminInstance();
    if (!admin) return;
    const fs = admin.firestore();
    await fs.collection('securityLogs').add({
      ...event,
      metadata: event.metadata ?? null,
      createdAt: new Date().toISOString(),
      source: 'server',
    });
  } catch (e) {
    console.warn('[audit] Failed to write security log:', (e as Error)?.message ?? e);
  }
}
