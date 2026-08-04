import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { isValidDzPhone, formatWhatsAppPhone, toLocalDzPhone } from './phone-utils';

describe('phone-utils', () => {
  test('validates Algerian mobile numbers', () => {
    assert.equal(isValidDzPhone('0550123456'), true);
    assert.equal(isValidDzPhone('0650123456'), true);
    assert.equal(isValidDzPhone('0750123456'), true);
    assert.equal(isValidDzPhone('061234567'), false); // 9 digits
    assert.equal(isValidDzPhone('05501234567'), false); // 11 digits
    assert.equal(isValidDzPhone('0450123456'), false); // wrong prefix
    assert.equal(isValidDzPhone('+213550123456'), false); // local format expected
    assert.equal(isValidDzPhone(''), false);
  });

  test('normalizes numbers to international WhatsApp format', () => {
    assert.equal(formatWhatsAppPhone('0550123456'), '+213550123456');
    assert.equal(formatWhatsAppPhone('+213550123456'), '+213550123456');
    assert.equal(formatWhatsAppPhone('00213550123456'), '+213550123456');
    assert.equal(formatWhatsAppPhone('213550123456'), '+213550123456');
  });

  test('converts international to local format', () => {
    assert.equal(toLocalDzPhone('+213550123456'), '0550123456');
    assert.equal(toLocalDzPhone('0550123456'), '0550123456');
  });
});
