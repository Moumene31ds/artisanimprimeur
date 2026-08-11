// src/lib/lanczos-upscale.ts
// Real, high-quality image upscaling using a Lanczos-3 resampling kernel.
// Runs entirely on a plain RGBA buffer ({data, width, height}) so it works in
// the browser AND in Node tests. Wrap the result with `new ImageData(...)` in
// the browser when you need a canvas-ready object.

export interface RgbaBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface UpscaleResult extends RgbaBuffer {
  durationMs: number;
}

function sinc(x: number): number {
  if (x === 0) return 1;
  const px = Math.PI * x;
  return Math.sin(px) / px;
}

/** Lanczos-3 kernel (a=3): higher quality than the browser's default bilinear. */
function lanczosKernel(x: number): number {
  if (x === 0) return 1;
  if (x <= -3 || x >= 3) return 0;
  return sinc(x) * sinc(x / 3);
}

/**
 * Resample `source` to `targetWidth` x `targetHeight` using Lanczos-3.
 * Locks target size to a sensible maximum (8000px) to avoid freezing the tab.
 */
export function lanczosResample(
  source: RgbaBuffer,
  targetWidth: number,
  targetHeight: number
): UpscaleResult {
  const started = performance.now();
  const srcW = source.width;
  const srcH = source.height;
  const dstW = Math.max(1, Math.min(Math.round(targetWidth), 8000));
  const dstH = Math.max(1, Math.min(Math.round(targetHeight), 8000));

  const src = source.data;
  const dst = new Uint8ClampedArray(dstW * dstH * 4);

  const xScale = srcW / dstW;
  const yScale = srcH / dstH;
  const radius = 3;

  for (let y = 0; y < dstH; y++) {
    const srcY = (y + 0.5) * yScale - 0.5;
    const y0 = Math.max(0, Math.floor(srcY - radius + 0.5));
    const y1 = Math.min(srcH - 1, Math.floor(srcY + radius + 0.5));

    for (let x = 0; x < dstW; x++) {
      const srcX = (x + 0.5) * xScale - 0.5;
      const x0 = Math.max(0, Math.floor(srcX - radius + 0.5));
      const x1 = Math.min(srcW - 1, Math.floor(srcX + radius + 0.5));

      let r = 0, g = 0, b = 0, a = 0, wSum = 0;
      for (let sy = y0; sy <= y1; sy++) {
        const wy = lanczosKernel((srcY - sy) * yScale);
        for (let sx = x0; sx <= x1; sx++) {
          const wx = lanczosKernel((srcX - sx) * xScale);
          const w = wx * wy;
          const si = (sy * srcW + sx) * 4;
          const sa = src[si + 3] / 255;
          r += src[si] * w * sa;
          g += src[si + 1] * w * sa;
          b += src[si + 2] * w * sa;
          a += 255 * w * sa;
          wSum += w * sa;
        }
      }
      const di = (y * dstW + x) * 4;
      if (wSum > 0) {
        dst[di] = clampByte(r / wSum);
        dst[di + 1] = clampByte(g / wSum);
        dst[di + 2] = clampByte(b / wSum);
        dst[di + 3] = clampByte(a / wSum);
      }
    }
  }

  return {
    data: dst,
    width: dstW,
    height: dstH,
    durationMs: Math.round(performance.now() - started),
  };
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}
