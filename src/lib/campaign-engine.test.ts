import { test } from 'node:test';
import assert from 'node:assert/strict';
import { personalize, resolveChannel, buildVars, type CampaignRecipient } from './campaign-engine';

const base: CampaignRecipient = {
  id: 'u1',
  email: 'client@example.com',
  phone: '0550123456',
  name: 'Karim Benali',
};

test('personalize replaces template variables', () => {
  const vars = { name: 'Karim', code: 'VIP20' };
  assert.equal(
    personalize('Bonjour {{name}}, votre code {{code}}', vars),
    'Bonjour Karim, votre code VIP20'
  );
  assert.equal(personalize('{{firstName}} et {{lastName}}', { firstName: 'A' }), 'A et {{lastName}}');
});

test('personalize handles RTL and missing keys safely', () => {
  assert.equal(personalize('مرحبا {{name}}', { name: 'كريم' }), 'مرحبا كريم');
  assert.equal(personalize('texte {{inconnu}}', {}), 'texte {{inconnu}}');
});

test('buildVars derives firstName and phone format', () => {
  const vars = buildVars(base);
  assert.equal(vars.name, 'Karim Benali');
  assert.equal(vars.firstName, 'Karim');
  assert.equal(vars.phone, '+213550123456');
});

test('resolveChannel honors opt-out preferences', () => {
  assert.equal(resolveChannel('email', base), 'email');
  assert.equal(
    resolveChannel('email', { ...base, preferences: { emailFrequency: 'never' } }),
    null
  );
  assert.equal(resolveChannel('email', { ...base, email: undefined }), null);
  assert.equal(resolveChannel('sms', base), 'whatsapp');
  assert.equal(resolveChannel('sms', { ...base, preferences: { smsOptIn: false } }), null);
  assert.equal(resolveChannel('sms', { ...base, phone: undefined }), null);
  assert.equal(resolveChannel('push', { ...base, userId: 'u1' }), 'push');
  assert.equal(resolveChannel('push', { ...base, preferences: { pushOptIn: false } }), null);
  assert.equal(resolveChannel('push', { ...base, userId: undefined }), null);
});
