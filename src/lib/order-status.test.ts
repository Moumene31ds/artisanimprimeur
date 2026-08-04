import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  ORDER_STATUSES,
  getStepIndex,
  isCompleted,
  isCancelled,
  isActive,
  statusLabel,
  toSafeDate,
  formatDate,
  formatDateTime,
  buildStatusHistory,
  getLastStatus,
} from './order-status';

describe('order-status', () => {
  test('central status list is ordered for the production flow', () => {
    assert.equal(ORDER_STATUSES[0], 'En attente');
    assert.equal(ORDER_STATUSES.at(-1), 'Annulé');
    assert.ok(ORDER_STATUSES.includes('Impression'));
    assert.ok(ORDER_STATUSES.includes('Prêt'));
  });

  test('getStepIndex maps known statuses and edge cases', () => {
    assert.equal(getStepIndex('En attente'), 0);
    assert.equal(getStepIndex('Impression'), 2);
    assert.equal(getStepIndex('Annulé'), -1);
    assert.equal(getStepIndex('Livré'), getStepIndex('Terminé'));
    assert.equal(getStepIndex('Unknown status'), 0);
  });

  test('completion/cancellation helpers', () => {
    assert.equal(isCompleted('Terminé'), true);
    assert.equal(isCompleted('Livré'), true);
    assert.equal(isCompleted('Impression'), false);
    assert.equal(isCancelled('Annulé'), true);
    assert.equal(isCancelled('Prêt'), false);
    assert.equal(isActive('Conception'), true);
    assert.equal(isActive('Terminé'), false);
    assert.equal(isActive('Annulé'), false);
  });

  test('statusLabel returns localized label', () => {
    assert.equal(statusLabel('Impression', 'ar'), 'الطباعة');
    assert.equal(statusLabel('Impression', 'fr'), 'Impression');
    assert.equal(statusLabel('Inconnu'), 'Inconnu');
  });

  test('date helpers handle Timestamp-like objects and invalid values', () => {
    const ts = { toDate: () => new Date(2024, 0, 15, 10, 30) };
    const d = toSafeDate(ts);
    assert.equal(d?.getFullYear(), 2024);
    assert.equal(toSafeDate(null), null);
    assert.equal(toSafeDate('garbage'), null);
    assert.match(formatDate(ts), /15/);
    assert.match(formatDateTime(ts), /10:30/);
  });

  test('buildStatusHistory appends and prunes on regression', () => {
    const history = buildStatusHistory(null, 'En attente');
    const h2 = buildStatusHistory(history, 'Conception');
    const h3 = buildStatusHistory(h2, 'Impression');
    assert.equal(h3.length, 3);
    assert.equal(h3[2].status, 'Impression');

    // الرجوع إلى مرحلة سابقة يزيل الأحدث
    const h4 = buildStatusHistory(h3, 'En attente');
    assert.equal(h4.length, 1);
    assert.equal(h4[0].status, 'En attente');

    // ملاحظة تُحفظ مع المرحلة
    const h5 = buildStatusHistory(h4, 'Impression', 'ضبط الألوان');
    assert.equal(h5.at(-1)?.note, 'ضبط الألوان');
  });

  test('getLastStatus returns latest entry', () => {
    const history = buildStatusHistory(null, 'Prêt', 'جاهز للتسليم');
    assert.equal(getLastStatus(history), 'Prêt');
    assert.equal(getLastStatus(null), null);
    assert.equal(getLastStatus([]), null);
  });
});
