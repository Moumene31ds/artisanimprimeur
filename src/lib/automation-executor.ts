import { fsQuery } from './firestore-rest';
import { sendWhatsAppMessage } from './whatsapp-service';
import { sendSimpleEmail } from './email-service';

export interface AutomationContext {
  [key: string]: unknown;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface AutomationActionResult {
  action: string;
  status: 'sent' | 'skipped' | 'failed';
  detail?: string;
}

export interface AutomationRunResult {
  ran: number;
  skipped: number;
  results: AutomationActionResult[];
}

/**
 * Reads the active automations matching the given trigger using the
 * customer's Firestore token, then executes their actions in order.
 *
 * Actions supported:
 *  - send_whatsapp  -> sendSimpleEmail fallback of a WhatsApp template message
 *  - send_email     -> plain-text email via Resend
 *  - webhook        -> fire a fetch to an external URL
 *  - add_to_segment -> no-op server-side (must be done by the admin UI)
 */
export async function executeAutomations(
  token: string,
  trigger: string,
  context: AutomationContext
): Promise<AutomationRunResult> {
  const summary: AutomationRunResult = { ran: 0, skipped: 0, results: [] };

  if (!token || !trigger) return summary;

  let automations: any[] = [];
  try {
    automations = await fsQuery(token, {
      from: [{ collectionId: 'marketing_automations' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'trigger' },
          op: 'EQUAL',
          value: { stringValue: trigger },
        },
      },
      limit: 10,
    });
  } catch (err) {
    console.error('❌ [automation-executor] failed to fetch automations:', err);
    return summary;
  }

  const active = (automations || []).filter(
    (a: any) => a.enabled !== false && Array.isArray(a.actions) && a.actions.length > 0
  );

  for (const automation of active) {
    const actions: any[] = [...automation.actions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (const action of actions) {
      const result = await runAction(action, context);
      summary.results.push(result);
      if (result.status === 'sent') summary.ran++;
      else if (result.status === 'skipped') summary.skipped++;
    }
  }

  return summary;
}

async function runAction(action: any, context: AutomationContext): Promise<AutomationActionResult> {
  const type = action?.type;
  const payload = action?.payload || {};

  switch (type) {
    case 'send_whatsapp': {
      if (!context.customerPhone) {
        return { action: 'send_whatsapp', status: 'skipped', detail: 'no phone in context' };
      }
      try {
        const res = await sendWhatsAppMessage({
          to: context.customerPhone,
          body: String(payload.body || ''),
        });
        return { action: 'send_whatsapp', status: res.success ? 'sent' : 'failed', detail: res.error };
      } catch (err: any) {
        return { action: 'send_whatsapp', status: 'failed', detail: String(err?.message || err) };
      }
    }
    case 'send_email': {
      if (!context.customerEmail) {
        return { action: 'send_email', status: 'skipped', detail: 'no email in context' };
      }
      try {
        const res = await sendSimpleEmail(
          context.customerEmail,
          String(payload.subject || 'Message de L\'Artisan Imprimeur'),
          String(payload.body || '')
        );
        return { action: 'send_email', status: res.success ? 'sent' : 'failed', detail: res.reason || res.id };
      } catch (err: any) {
        return { action: 'send_email', status: 'failed', detail: String(err?.message || err) };
      }
    }
    case 'webhook': {
      if (!payload.url) {
        return { action: 'webhook', status: 'skipped', detail: 'no url' };
      }
      try {
        const res = await fetch(payload.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context, ...(payload.body || {}) }),
        });
        if (!res.ok) {
          return { action: 'webhook', status: 'failed', detail: `HTTP ${res.status}` };
        }
        return { action: 'webhook', status: 'sent', detail: `HTTP ${res.status}` };
      } catch (err: any) {
        return { action: 'webhook', status: 'failed', detail: String(err?.message || err) };
      }
    }
    case 'add_to_segment':
    default:
      return { action: type || 'unknown', status: 'skipped', detail: 'unsupported server-side' };
  }
}
