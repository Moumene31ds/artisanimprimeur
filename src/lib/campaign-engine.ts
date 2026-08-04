// src/lib/campaign-engine.ts
// محرّك إرسال الحملات الفعلي: تخصيص القوالب، اختيار القناة حسب التفضيلات،
// والإرسال عبر البريد (Resend) / واتساب / الإشعارات، مع تسجيل نتيجة كل مستلم.
// يُستخدم من واجهة الإدارة (إرسال فوري) ومن الـ cron للحملات المجدولة.

import { sendSimpleEmail } from './email-service';
import { sendWhatsAppMessage } from './whatsapp-service';
import { formatWhatsAppPhone } from './phone-utils';

export type CampaignChannel = 'email' | 'sms' | 'push' | 'social';

/** القناة الفعلية بعد التحويل (sms/social → whatsapp) */
export type ResolvedChannel = 'email' | 'whatsapp' | 'push';

export interface CampaignRecipient {
  id: string;
  userId?: string;
  email?: string;
  phone?: string;
  name?: string;
  segments?: string[];
  preferences?: {
    emailFrequency?: string; // 'daily' | 'weekly' | 'monthly' | 'never'
    smsOptIn?: boolean;
    pushOptIn?: boolean;
    language?: string;
  };
  vars?: Record<string, string>;
}

export interface CampaignMessage {
  channel: CampaignChannel;
  subject?: string;
  body: string;
  language?: 'ar' | 'fr';
  ctaUrl?: string;
}

export interface SendResult {
  recipientId: string;
  channel: string;
  status: 'sent' | 'skipped' | 'failed';
  detail?: string;
}

export interface DispatchSummary {
  total: number;
  sent: number;
  skipped: number;
  failed: number;
  results: SendResult[];
}

/** استبدال متغيرات القالب {{name}} و {{firstName}} و {{code}} ... إلخ */
export function personalize(template: string, vars: Record<string, string>): string {
  return (template || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    const value = vars?.[key];
    return value != null ? String(value) : match;
  });
}

/**
 * تحديد القناة الفعلية للمستلم حسب تفضيلاته.
 *  - email: يتخطى إن كان emailFrequency === 'never' أو لا يوجد بريد.
 *  - sms: يتخطى إن لم يشترك في smsOptIn أو لا يوجد هاتف صالح.
 *  - push: يتخطى إن لم يشترك في pushOptIn أو لا يوجد userId.
 */
export function resolveChannel(
  channel: CampaignChannel,
  recipient: CampaignRecipient
): ResolvedChannel | null {
  const prefs = recipient.preferences || {};

  if (channel === 'email') {
    if (!recipient.email) return null;
    if (prefs.emailFrequency === 'never') return null;
    return 'email';
  }

  if (channel === 'sms' || channel === 'social') {
    if (!recipient.phone) return null;
    if (prefs.smsOptIn === false) return null;
    return 'whatsapp'; // الإرسال عبر واتساب (بديل SMS في السوق المحلي)
  }

  if (channel === 'push') {
    if (!recipient.userId) return null;
    if (prefs.pushOptIn === false) return null;
    return 'push';
  }

  return null;
}

/** بناء متغيرات التخصيص الأساسية للمستلم */
export function buildVars(recipient: CampaignRecipient): Record<string, string> {
  const firstName = recipient.name?.trim().split(/\s+/)[0] || 'cher client';
  return {
    name: recipient.name || 'client',
    firstName,
    email: recipient.email || '',
    phone: recipient.phone ? formatWhatsAppPhone(recipient.phone) : '',
    ...(recipient.vars || {}),
  };
}

async function sendEmail(
  to: string,
  subject: string,
  textBody: string
): Promise<{ success: boolean; detail?: string }> {
  const res = await sendSimpleEmail(to, subject, textBody);
  return res.success ? { success: true } : { success: false, detail: res.reason || 'email failed' };
}

async function sendWhatsApp(
  to: string,
  textBody: string
): Promise<{ success: boolean; detail?: string }> {
  const res = await sendWhatsAppMessage({ to, body: textBody });
  return res.success ? { success: true } : { success: false, detail: res.error };
}

async function sendPush(
  userId: string,
  title: string,
  textBody: string,
  url?: string
): Promise<{ success: boolean; detail?: string }> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/push/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, body: textBody, url: url || '/rewards' }),
    });
    const data = await res.json();
    return res.ok ? { success: true } : { success: false, detail: data?.error || `HTTP ${res.status}` };
  } catch (err: any) {
    return { success: false, detail: String(err?.message || err) };
  }
}

/** إرسال رسالة واحدة إلى مستلم واحد مع احترام التفضيلات */
export async function sendToRecipient(
  recipient: CampaignRecipient,
  message: CampaignMessage
): Promise<SendResult> {
  const channel = resolveChannel(message.channel, recipient);
  if (!channel) {
    return {
      recipientId: recipient.id,
      channel: message.channel,
      status: 'skipped',
      detail: 'no eligible channel (opt-out or missing contact)',
    };
  }

  const vars = buildVars(recipient);
  const body = personalize(message.body, vars);
  const subject = message.subject ? personalize(message.subject, vars) : undefined;

  try {
    if (channel === 'email') {
      const res = await sendEmail(recipient.email as string, subject || 'L\'Artisan Imprimeur', body);
      return { recipientId: recipient.id, channel, status: res.success ? 'sent' : 'failed', detail: res.detail };
    }
    if (channel === 'whatsapp') {
      const res = await sendWhatsApp(recipient.phone as string, body);
      return { recipientId: recipient.id, channel, status: res.success ? 'sent' : 'failed', detail: res.detail };
    }
    if (channel === 'push') {
      const res = await sendPush(recipient.userId as string, subject || 'L\'Artisan Imprimeur', body, message.ctaUrl);
      return { recipientId: recipient.id, channel, status: res.success ? 'sent' : 'failed', detail: res.detail };
    }
    return { recipientId: recipient.id, channel, status: 'skipped', detail: 'unsupported channel' };
  } catch (err: any) {
    return { recipientId: recipient.id, channel, status: 'failed', detail: String(err?.message || err) };
  }
}

/** إرسال الحملة لمجموعة مستلمين مع سجل لكل حالة (تزامن محدود) */
export async function dispatchCampaign(
  recipients: CampaignRecipient[],
  message: CampaignMessage,
  concurrency = 4
): Promise<DispatchSummary> {
  const summary: DispatchSummary = { total: recipients.length, sent: 0, skipped: 0, failed: 0, results: [] };
  if (recipients.length === 0) return summary;

  let index = 0;
  const worker = async () => {
    while (index < recipients.length) {
      const current = index++;
      const result = await sendToRecipient(recipients[current], message);
      summary.results.push(result);
      if (result.status === 'sent') summary.sent++;
      else if (result.status === 'skipped') summary.skipped++;
      else summary.failed++;
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, recipients.length) }, () => worker());
  await Promise.all(workers);
  return summary;
}
