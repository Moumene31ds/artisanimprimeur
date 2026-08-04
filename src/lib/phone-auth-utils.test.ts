import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  isValidPhone,
  formatPhoneInput,
  maskPhone,
  secondsToTime,
  getAuthErrorMessage,
} from './phone-auth-utils';

describe('phone-auth-utils', () => {
  test('validates international phone numbers', () => {
    assert.equal(isValidPhone('+213555123456'), true);
    assert.equal(isValidPhone('+1 555-123-4567'), true);
    assert.equal(isValidPhone('213555123456'), false);
    assert.equal(isValidPhone('+213555'), false);
    assert.equal(isValidPhone('abc'), false);
    assert.equal(isValidPhone(''), false);
  });

  test('formats phone input while typing', () => {
    assert.equal(formatPhoneInput('555'), '555');
    assert.equal(formatPhoneInput('55512'), '555 12');
    assert.equal(formatPhoneInput('555123456'), '555 12 34 56');
    assert.equal(formatPhoneInput(' 5 5 5abc12'), '555 12');
    assert.equal(formatPhoneInput(''), '');
  });

  test('masks phone keeping first 3 and last 2 digits', () => {
    assert.equal(maskPhone('+213555123456'), '+213•••••••56');
    assert.equal(maskPhone('+33612345678'), '+336••••••78');
    assert.equal(maskPhone('+2135'), '+2135');
  });

  test('converts seconds to mm:ss', () => {
    assert.equal(secondsToTime(59), '00:59');
    assert.equal(secondsToTime(60), '01:00');
    assert.equal(secondsToTime(0), '00:00');
    assert.equal(secondsToTime(-5), '00:00');
  });

  test('maps common auth errors to Arabic and French', () => {
    const err = { code: 'auth/invalid-verification-code' };
    assert.match(getAuthErrorMessage(err, 'ar'), /رمز التحقق غير صحيح/);
    assert.match(getAuthErrorMessage(err, 'fr'), /Code de vérification incorrect/);

    assert.match(getAuthErrorMessage({ code: 'auth/too-many-requests' }, 'ar'), /طلبات كثيرة/);
    assert.match(getAuthErrorMessage({ code: 'auth/quota-exceeded' }, 'ar'), /حد الرسائل/);
    assert.match(getAuthErrorMessage({ code: 'auth/network-request-failed' }, 'fr'), /Erreur réseau/);
    assert.match(getAuthErrorMessage({ code: 'auth/operation-not-allowed' }, 'ar'), /غير مفعّل/);
    assert.match(getAuthErrorMessage({ code: 'auth/missing-recaptcha-token' }, 'fr'), /jeton/i);
  });

  test('falls back to a generic message for unknown errors', () => {
    assert.match(getAuthErrorMessage(new Error('boom'), 'ar'), /خطأ غير متوقع/);
    assert.match(getAuthErrorMessage({ foo: 1 }, 'fr'), /erreur inattendue/i);
    assert.match(getAuthErrorMessage('auth/unknown-code', 'ar'), /خطأ غير متوقع/);
  });

  test('reveals unmapped error codes for diagnosis', () => {
    const msg = getAuthErrorMessage({ code: 'auth/some-future-code' }, 'ar');
    assert.match(msg, /auth\/some-future-code/);
    assert.match(msg, /خطأ غير متوقع/);
  });
});
