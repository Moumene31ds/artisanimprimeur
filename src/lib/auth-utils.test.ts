import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { getPasswordStrength, validateEmail, validateSignupForm, getAuthErrorMessage } from './auth-utils';

describe('auth utilities', () => {
  test('detects weak password', () => {
    assert.equal(getPasswordStrength('12345'), 'weak');
  });

  test('detects strong password', () => {
    assert.equal(getPasswordStrength('StrongPass123!'), 'strong');
  });

  test('validates email format', () => {
    assert.equal(validateEmail('user@example.com'), true);
    assert.equal(validateEmail('bad-email'), false);
  });

  test('validates signup form requirements', () => {
    assert.deepEqual(validateSignupForm({ name: '', email: 'user@example.com', password: 'StrongPass123!' }), {
      ok: false,
      message: 'name'
    });

    assert.deepEqual(validateSignupForm({ name: 'Ali', email: 'user@example.com', password: 'StrongPass123!' }), {
      ok: true,
      message: ''
    });
  });

  test('maps auth errors to friendly messages', () => {
    assert.match(getAuthErrorMessage('auth/invalid-credential'), /Identifiants/);
    assert.match(getAuthErrorMessage('auth/email-already-in-use'), /déjà/);
  });
});
