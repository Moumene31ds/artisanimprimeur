import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMarketingInsight } from './marketing-ai';

// Force the deterministic offline fallback path (no network / no AI call).
process.env.AI_PROVIDER = 'openrouter';
delete process.env.OPENROUTER_API_KEY;

test('buildMarketingInsight returns a concrete campaign draft', async () => {
  const insight = await buildMarketingInsight({
    orders: [
      { total: 25000, status: 'Prêt', wilaya: 'Oran' },
      { total: 15000, status: 'En attente', wilaya: 'Oran' },
      { total: 34000, status: 'Prêt', wilaya: 'Alger' },
    ],
    products: [{ name: 'Cartes de visite', price: 1200 }],
    promoCodes: [{ code: 'SUMMER10', active: true }],
  });

  assert.equal(typeof insight.headline, 'string');
  assert.ok(insight.headline.length > 0);
  assert.equal(typeof insight.body, 'string');
  assert.ok(insight.body.includes('Oran') || insight.body.includes('Alger'));
  assert.ok(insight.cta.includes('Commander'));
});
