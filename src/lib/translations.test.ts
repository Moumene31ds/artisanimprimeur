import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createTranslator, getLanguageDirection, getTranslation, normalizeLanguage, TRANSLATIONS } from './translations';

describe('translation system', () => {
  test('returns Arabic strings for Arabic locale', () => {
    const t = createTranslator('ar');
    assert.equal(t('login'), 'تسجيل الدخول');
    assert.equal(t('welcomeBackTitle'), 'مرحباً بعودتك');
    assert.equal(getLanguageDirection('ar'), 'rtl');
  });

  test('returns French strings for French locale', () => {
    const t = createTranslator('fr');
    assert.equal(t('login'), 'Connexion');
    assert.equal(t('welcomeBackTitle'), 'Bon retour');
    assert.equal(getLanguageDirection('fr'), 'ltr');
  });

  test('normalizes unsupported values to Arabic', () => {
    assert.equal(normalizeLanguage('es'), 'ar');
    assert.equal(getTranslation('es', 'signup'), 'إنشاء حساب');
  });

  test('keeps translation object populated for both languages', () => {
    assert.ok(TRANSLATIONS.ar.login);
    assert.ok(TRANSLATIONS.fr.login);
    assert.ok(TRANSLATIONS.ar.secureAuthTitle);
    assert.ok(TRANSLATIONS.fr.secureAuthTitle);
  });
});
