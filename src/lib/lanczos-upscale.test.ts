import test from 'node:test';
import assert from 'node:assert/strict';
import { lanczosResample } from './lanczos-upscale';

test('doubles image dimensions with correct output buffer', () => {
  const srcW = 4, srcH = 3;
  const src = new Uint8ClampedArray(srcW * srcH * 4);
  for (let i = 0; i < src.length; i += 4) {
    src[i] = 200; src[i + 1] = 100; src[i + 2] = 50; src[i + 3] = 255;
  }
  const result = lanczosResample({ data: src, width: srcW, height: srcH }, srcW * 2, srcH * 2);
  assert.equal(result.width, srcW * 2);
  assert.equal(result.height, srcH * 2);
  assert.equal(result.data.length, srcW * 2 * srcH * 2 * 4);
  assert.ok(result.durationMs >= 0);
});

test('caps output size at 8000px to avoid freezing the tab', () => {
  const src = new Uint8ClampedArray(4 * 4 * 4);
  const result = lanczosResample({ data: src, width: 4, height: 4 }, 50000, 4);
  assert.equal(result.width, 8000);
});

test('preserves average color after uniform input', () => {
  const srcW = 6, srcH = 6;
  const src = new Uint8ClampedArray(srcW * srcH * 4);
  for (let i = 0; i < src.length; i += 4) {
    src[i] = 128; src[i + 1] = 64; src[i + 2] = 32; src[i + 3] = 255;
  }
  const result = lanczosResample({ data: src, width: srcW, height: srcH }, 12, 12);
  const px = result.data.slice(0, 4);
  assert.ok(Math.abs(px[0] - 128) < 8, `red close: ${px[0]}`);
  assert.ok(Math.abs(px[1] - 64) < 8, `green close: ${px[1]}`);
  assert.ok(Math.abs(px[2] - 32) < 8, `blue close: ${px[2]}`);
});
