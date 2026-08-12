import test from 'node:test';
import assert from 'node:assert/strict';
import { configuredProviders, providerLabel } from './image-gen';

// Note: configuredProviders reads process.env at call time, so tests can set
// keys per-case. Pollinations needs no key and is always offered as a fallback.

test('auto mode only includes providers with keys + pollinations fallback', () => {
  process.env.IMAGE_PROVIDER = 'auto';
  delete process.env.TOGETHER_API_KEY;
  delete process.env.REPLICATE_API_TOKEN;
  delete process.env.FAL_KEY;

  const list = configuredProviders();
  assert.ok(list.includes('pollinations'), 'pollinations always available');
  assert.ok(!list.includes('together'));
  assert.ok(!list.includes('replicate'));
  assert.ok(!list.includes('fal'));
});

test('auto mode includes configured keys in priority order', () => {
  process.env.IMAGE_PROVIDER = 'auto';
  process.env.TOGETHER_API_KEY = 'tog';
  process.env.REPLICATE_API_TOKEN = 'rep';
  delete process.env.FAL_KEY;

  const list = configuredProviders();
  assert.deepEqual(list, ['together', 'replicate', 'pollinations']);
});

test('specific provider mode prepends itself then falls back to pollinations', () => {
  process.env.IMAGE_PROVIDER = 'fal';
  process.env.FAL_KEY = 'fal-key';

  const list = configuredProviders();
  assert.deepEqual(list, ['fal', 'pollinations']);
});

test('providerLabel returns human-friendly labels', () => {
  assert.ok(providerLabel('together').includes('FLUX.1'));
  assert.ok(providerLabel('replicate').includes('FLUX.1'));
  assert.ok(providerLabel('fal').includes('FLUX.1'));
  assert.ok(providerLabel('pollinations').includes('Pollinations'));
});

test('providerLabel for each valid provider is non-empty', () => {
  for (const p of ['together', 'replicate', 'fal', 'pollinations'] as const) {
    assert.ok(providerLabel(p).length > 0);
  }
});
