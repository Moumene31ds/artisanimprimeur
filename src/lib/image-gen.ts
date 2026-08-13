// src/lib/image-gen.ts
// Multi-provider image generation layer.
//
// Priority (configure with IMAGE_PROVIDER=auto|together|replicate|fal|huggingface|pollinations):
//   1. Together AI    — FLUX.1-schnell (needs TOGETHER_API_KEY)
//   2. Replicate      — black-forest-labs/flux-schnell (needs REPLICATE_API_TOKEN)
//   3. fal.ai         — fal-ai/flux/schnell (needs FAL_KEY)
//   4. Hugging Face   — FLUX.1-schnell free tier (needs HF_TOKEN, no card)
//   5. Pollinations.ai (100% free, no key) — always available as last resort.
//
// Every provider wraps its network call and the chain falls through on failure,
// so the AI Studio always gets an image even if a paid provider is down or unset.

export type ImageProvider = 'together' | 'replicate' | 'fal' | 'huggingface' | 'pollinations';

export interface GenerateImageOptions {
  prompt: string;
  width?: number;
  height?: number;
  /** Optional deterministic seed. */
  seed?: number;
}

export interface GenerateImageResult {
  /** Final image URL (Pollinations URLs are already permanent; others are proxied). */
  imageUrl: string;
  provider: ImageProvider;
  /** True when a paid/primary provider was unavailable and we fell back. */
  fallback: boolean;
}

interface ProviderRunner {
  name: ImageProvider;
  run: (options: Required<Pick<GenerateImageOptions, 'prompt'>> & GenerateImageOptions) => Promise<string>;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const TOGETHER_KEY = () => process.env.TOGETHER_API_KEY?.trim() || '';
const REPLICATE_TOKEN = () => process.env.REPLICATE_API_TOKEN?.trim() || '';
const FAL_KEY = () => process.env.FAL_KEY?.trim() || '';
const HF_TOKEN = () => process.env.HF_TOKEN?.trim() || '';

export function configuredProviders(): ImageProvider[] {
  const mode = (process.env.IMAGE_PROVIDER || 'auto').toLowerCase();
  // "together" mode → Together AI حصرياً (بدون أي fallback) كما طلب المستخدم.
  // auto → السلسلة الكاملة: Together → Replicate → fal → Hugging Face → Pollinations.
  const order: ImageProvider[] =
    mode === 'together'
      ? ['together']
      : mode === 'replicate'
        ? ['replicate', 'pollinations']
        : mode === 'fal'
          ? ['fal', 'pollinations']
          : mode === 'huggingface'
            ? ['huggingface', 'pollinations']
            : ['together', 'replicate', 'fal', 'huggingface', 'pollinations'];

  // Never attempt a provider whose key is missing (except Pollinations, which
  // needs none). This avoids useless failing network calls in "auto" mode.
  return order.filter(
    (p) =>
      p === 'pollinations' ||
      (p === 'together' && TOGETHER_KEY().length > 0) ||
      (p === 'replicate' && REPLICATE_TOKEN().length > 0) ||
      (p === 'fal' && FAL_KEY().length > 0) ||
      (p === 'huggingface' && HF_TOKEN().length > 0)
  );
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

/** Together AI — FLUX.1-schnell (the -free alias was retired). */
async function togetherRun(opts: Required<Pick<GenerateImageOptions, 'prompt'>> & GenerateImageOptions): Promise<string> {
  const res = await fetch('https://api.together.xyz/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOGETHER_KEY()}`,
    },
    body: JSON.stringify({
      model: 'black-forest-labs/FLUX.1-schnell',
      prompt: opts.prompt,
      width: opts.width ?? 1024,
      height: opts.height ?? 1024,
      n: 1,
      ...(opts.seed != null ? { seed: opts.seed } : {}),
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    throw new Error(`Together AI error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = await res.json();
  const url = json?.data?.[0]?.url;
  if (!url) throw new Error('Together AI returned no image URL');
  return url;
}

/** Replicate — black-forest-labs/flux-schnell (synchronous wait API). */
async function replicateRun(opts: Required<Pick<GenerateImageOptions, 'prompt'>> & GenerateImageOptions): Promise<string> {
  const res = await fetch(
    'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${REPLICATE_TOKEN()}`,
        Prefer: 'wait=60',
      },
      body: JSON.stringify({
        input: {
          prompt: opts.prompt,
          width: opts.width ?? 1024,
          height: opts.height ?? 1024,
          num_outputs: 1,
          num_inference_steps: 4,
          ...(opts.seed != null ? { seed: opts.seed } : {}),
        },
      }),
      signal: AbortSignal.timeout(75_000),
    }
  );
  if (!res.ok) {
    throw new Error(`Replicate error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = await res.json();
  const output = json?.output;
  if (Array.isArray(output)) {
    const first = output.find((u: unknown) => typeof u === 'string' && u.startsWith('http'));
    if (first) return first;
  }
  if (typeof output === 'string' && output.startsWith('http')) return output;
  // Not done within the synchronous window — poll the status endpoint.
  if (json?.urls?.get) {
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const poll = await fetch(json.urls.get, {
        headers: { Authorization: `Bearer ${REPLICATE_TOKEN()}` },
        signal: AbortSignal.timeout(20_000),
      });
      const pollJson = await poll.json();
      if (pollJson?.status === 'succeeded' && Array.isArray(pollJson.output)) {
        const first = pollJson.output.find((u: unknown) => typeof u === 'string' && u.startsWith('http'));
        if (first) return first;
      }
      if (pollJson?.status === 'failed') throw new Error('Replicate prediction failed');
    }
  }
  throw new Error('Replicate returned no image URL');
}

/** fal.ai — fal-ai/flux/schnell (synchronous submit endpoint). */
async function falRun(opts: Required<Pick<GenerateImageOptions, 'prompt'>> & GenerateImageOptions): Promise<string> {
  const res = await fetch('https://queue.fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Key ${FAL_KEY()}`,
    },
    body: JSON.stringify({
      prompt: opts.prompt,
      image_size: { width: opts.width ?? 1024, height: opts.height ?? 1024 },
      num_inference_steps: 4,
      num_images: 1,
      ...(opts.seed != null ? { seed: opts.seed } : {}),
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) {
    throw new Error(`fal.ai error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = await res.json();
  const url = json?.images?.[0]?.url;
  if (!url) throw new Error('fal.ai returned no image URL');
  return url;
}

/** Hugging Face Inference — FLUX.1-schnell via the free Inference Providers tier. */
async function huggingfaceRun(opts: Required<Pick<GenerateImageOptions, 'prompt'>> & GenerateImageOptions): Promise<string> {
  const res = await fetch(
    'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${HF_TOKEN()}`,
      },
      body: JSON.stringify({
        inputs: opts.prompt,
        parameters: {
          width: opts.width ?? 1024,
          height: opts.height ?? 1024,
          guidance_scale: 3.5,
          num_inference_steps: 4,
          ...(opts.seed != null ? { seed: opts.seed } : {}),
        },
      }),
      signal: AbortSignal.timeout(90_000),
    }
  );
  if (!res.ok) {
    throw new Error(`Hugging Face error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('image/')) {
    throw new Error(`Hugging Face returned non-image response (${contentType})`);
  }
  // HF returns raw image bytes — upload directly via Cloudinary's data URI support.
  const buf = Buffer.from(await res.arrayBuffer());
  return `data:${contentType.split(';')[0]};base64,${buf.toString('base64')}`;
}

/** Pollinations.ai — free, no key. Serves FLUX.1 (model=flux). Acts as the universal fallback. */
export async function pollinationsRun(opts: Required<Pick<GenerateImageOptions, 'prompt'>> & GenerateImageOptions): Promise<string> {
  const seed = opts.seed ?? Math.floor(Math.random() * 100000);
  const width = opts.width ?? 1024;
  const height = opts.height ?? 1024;
  const prompt = opts.prompt;

  // When a Pollinations API key is configured, use the modern gen endpoint which
  // actually honors `model=flux` (FLUX.1) and serves full-quality images. The
  // legacy image.pollinations.ai endpoint silently ignores `model=flux` and
  // serves the low-quality "sana" model instead.
  const apiKey = process.env.POLLINATIONS_API_KEY?.trim();
  if (apiKey) {
    const params = new URLSearchParams({
      model: 'flux',
      width: String(width),
      height: String(height),
      seed: String(seed),
      nologo: 'true',
      private: 'true',
      key: apiKey,
    });
    return `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?${params.toString()}`;
  }

  const params = new URLSearchParams({
    model: 'flux',
    width: String(width),
    height: String(height),
    seed: String(seed),
    nologo: 'true',
    private: 'true',
  });
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params.toString()}`;
  // Pollinations blocks HEAD requests; return URL directly and let the consumer handle load errors.
  return url;
}

// ---------------------------------------------------------------------------
// Chain
// ---------------------------------------------------------------------------

const RUNNERS: Record<ImageProvider, ProviderRunner['run']> = {
  together: togetherRun,
  replicate: replicateRun,
  fal: falRun,
  huggingface: huggingfaceRun,
  pollinations: pollinationsRun,
};

/**
 * Generate an image through the configured provider chain.
 * Always resolves unless every provider (including the free fallback) fails.
 */
export async function generateImage(
  options: GenerateImageOptions,
  onAttempt?: (info: { provider: ImageProvider; error?: Error }) => void
): Promise<GenerateImageResult> {
  const providers = configuredProviders();
  const ordered: ImageProvider[] = providers.includes('pollinations')
    ? providers
    : [...providers, 'pollinations'];

  let lastError: Error | null = null;
  for (const name of ordered) {
    const provider = name as ImageProvider;
    try {
      const imageUrl = await RUNNERS[provider](options);
      onAttempt?.({ provider });
      return { imageUrl, provider, fallback: provider !== ordered[0] };
    } catch (err: any) {
      lastError = err;
      console.warn(`[image-gen] ${provider} failed:`, err?.message ?? err);
      onAttempt?.({ provider, error: err });
    }
  }
  throw lastError ?? new Error('No image provider available.');
}

/** Human-friendly label for the UI (model badge). */
export function providerLabel(provider: ImageProvider): string {
  switch (provider) {
    case 'together':
      return 'FLUX.1-schnell (Together AI)';
    case 'replicate':
      return 'FLUX.1-schnell (Replicate)';
    case 'fal':
      return 'FLUX.1-schnell (fal.ai)';
    case 'huggingface':
      return 'FLUX.1-schnell (Hugging Face)';
    case 'pollinations':
      return process.env.POLLINATIONS_API_KEY?.trim()
        ? 'FLUX.1 (Pollinations gen.ai)'
        : 'Pollinations.ai (gratuit)';
  }
}
