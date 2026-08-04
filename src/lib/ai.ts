import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateText, type LanguageModel } from 'ai';

/**
 * Free AI provider layer (no Gemini, no paid APIs).
 *
 * Tier 1 — Ollama (local, 100% free, no account, no keys):
 *   - OLLAMA_BASE_URL        (default http://localhost:11434)
 *   - OLLAMA_MODEL           (default qwen3:8b)
 *   - OLLAMA_VISION_MODEL    (default qwen3-vl:latest)
 *
 * Tier 2 — OpenRouter free models (cloud fallback, free key, no credit card):
 *   - OPENROUTER_API_KEY
 *   - OPENROUTER_MODEL       (default openrouter/free — auto-routes to a free
 *                             model matching the request: text, vision, tools)
 *   - OPENROUTER_VISION_MODEL
 *
 * Selection is controlled by AI_PROVIDER (auto | ollama | openrouter). In "auto"
 * mode Ollama is used when reachable (dev), otherwise OpenRouter is used (e.g.
 * Vercel, where a local model cannot run). A small circuit breaker parks a
 * provider for a while after rate-limit (429) or capacity (503) errors.
 */

export type ProviderName = 'ollama' | 'openrouter';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OLLAMA_BASE = () => (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/+$/, '');
const OLLAMA_MODEL = () => process.env.OLLAMA_MODEL?.trim() || 'qwen3:8b';
const OLLAMA_VISION_MODEL = () => process.env.OLLAMA_VISION_MODEL?.trim() || 'qwen3-vl:latest';
const OPENROUTER_KEY = () => process.env.OPENROUTER_API_KEY?.trim() || '';
const OPENROUTER_MODEL = () => process.env.OPENROUTER_MODEL?.trim() || 'openrouter/free';
const OPENROUTER_VISION_MODEL = () =>
  process.env.OPENROUTER_VISION_MODEL?.trim() || OPENROUTER_MODEL();

export function hasOpenRouterKey(): boolean {
  return OPENROUTER_KEY().length > 0;
}

// ---------------------------------------------------------------------------
// Provider factories
// ---------------------------------------------------------------------------

function ollamaProvider() {
  return createOpenAICompatible({
    name: 'ollama',
    baseURL: `${OLLAMA_BASE()}/v1`,
    apiKey: 'ollama',
    transformRequestBody: (args) => {
      const body: Record<string, any> = { ...args };
      const isVision =
        Array.isArray(body.messages) &&
        body.messages.some((m: any) =>
          Array.isArray(m?.content)
            ? m.content.some((p: any) => p?.type === 'image' || p?.type === 'image_url')
            : false
        );
      if (!isVision) body.reasoning_effort = 'none';
      return body;
    },
  });
}

function openRouterProvider() {
  return createOpenAICompatible({
    name: 'openrouter',
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: OPENROUTER_KEY(),
    headers: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': "L'Artisan Imprimeur",
    },
  });
}

// ---------------------------------------------------------------------------
// Ollama health probe (cached to avoid hammering localhost)
// ---------------------------------------------------------------------------

let ollamaProbe: { ok: boolean; at: number } | null = null;
const PROBE_TTL_MS = 5000;

export async function isOllamaReachable(): Promise<boolean> {
  if (ollamaProbe && Date.now() - ollamaProbe.at < PROBE_TTL_MS) return ollamaProbe.ok;
  try {
    const res = await fetch(`${OLLAMA_BASE()}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    ollamaProbe = { ok: res.ok, at: Date.now() };
  } catch {
    ollamaProbe = { ok: false, at: Date.now() };
  }
  return ollamaProbe.ok;
}

// ---------------------------------------------------------------------------
// Circuit breaker
// ---------------------------------------------------------------------------

const providerCooldown = new Map<ProviderName, number>();
const MAX_COOLDOWN_SECONDS = 300;

function parkProvider(name: ProviderName, seconds: number) {
  providerCooldown.set(name, Date.now() + Math.min(seconds, MAX_COOLDOWN_SECONDS) * 1000);
}
function unparkProvider(name: ProviderName) {
  providerCooldown.delete(name);
}
function isParked(name: ProviderName): boolean {
  const until = providerCooldown.get(name);
  return !!until && until > Date.now();
}

export function recordProviderFailure(name: ProviderName, err?: any) {
  if (err && isQuotaError(err)) parkProvider(name, parseRetryAfterSeconds(err));
  else if (err && isTransientError(err)) parkProvider(name, 30);
  else if (err) parkProvider(name, 15); // fatal — avoid hot loops
}
export function recordProviderSuccess(name: ProviderName) {
  unparkProvider(name);
}

/** Lowest active cooldown (seconds), or 0. */
export function minRetryAfter(): number {
  let min = Infinity;
  const now = Date.now();
  for (const until of providerCooldown.values()) {
    if (until > now) min = Math.min(min, until - now);
  }
  return min === Infinity ? 0 : Math.ceil(min / 1000);
}

// ---------------------------------------------------------------------------
// Error classification
// ---------------------------------------------------------------------------

export function parseRetryAfterSeconds(err: any): number {
  // OpenRouter/APIs often send an explicit Retry-After header.
  try {
    const h = err?.headers;
    const ra = typeof h?.get === 'function' ? h.get('retry-after') : h?.['retry-after'];
    if (ra) {
      const n = Number(ra);
      if (Number.isFinite(n) && n > 0) return Math.ceil(n);
    }
  } catch {
    /* ignore */
  }

  // Structured google.rpc-style RetryInfo (also emitted by some gateways).
  try {
    const body =
      typeof err?.responseBody === 'string' ? JSON.parse(err.responseBody) : err?.responseBody;
    const detail = (body?.error?.details ?? []).find(
      (d: any) =>
        String(d?.['@type'] ?? d?.type ?? '').includes('RetryInfo') ||
        d?.retryDelay != null ||
        d?.retry_delay != null
    );
    const rd = detail?.retryDelay ?? detail?.retry_delay;
    if (typeof rd === 'string') {
      const m = rd.match(/(\d+)s/);
      if (m) return Number(m[1]);
    }
    if (rd && typeof rd === 'object' && rd.seconds != null) return Number(rd.seconds);
  } catch {
    /* not JSON */
  }

  // Human-readable hints: "retry in 3m 14s", "retry after 60".
  const msg = String(err?.message ?? err?.statusMessage ?? '');
  let m = msg.match(/retry in (\d+)m ?(\d+)s/i);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = msg.match(/retry in (\d+)s/i);
  if (m) return Number(m[1]);
  m = msg.match(/retry[ -]?after[=: ](\d+)/i);
  if (m) return Number(m[1]);

  if (typeof err?.retryDelayInSeconds === 'number') return err.retryDelayInSeconds;
  if (typeof err?.retryDelay === 'number') return err.retryDelay;

  return 60;
}

export function isQuotaError(err: any): boolean {
  const msg = String(err?.message ?? '');
  const status = Number(err?.status ?? err?.statusCode ?? 0);
  const code = String(err?.code ?? '');
  return (
    status === 429 ||
    code.includes('RESOURCE_EXHAUSTED') ||
    /RESOURCE_EXHAUSTED|quota|rate limit|429/i.test(msg)
  );
}

export function isTransientError(err: any): boolean {
  if (isQuotaError(err)) return false;
  const msg = String(err?.message ?? '');
  const status = Number(err?.status ?? err?.statusCode ?? 0);
  return (
    status === 502 ||
    status === 503 ||
    status === 504 ||
    /503|502|504|UNAVAILABLE|overloaded|high demand|ECONNRESET|ETIMEDOUT|socket hang up|fetch failed|network error|timeout|not loaded|pull model|not found/i.test(
      msg
    )
  );
}

// ---------------------------------------------------------------------------
// Errors & responses
// ---------------------------------------------------------------------------

export class AIUnavailableError extends Error {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super('No free AI provider is currently available (rate limit or capacity).');
    this.name = 'AIUnavailableError';
    this.retryAfterSeconds = retryAfterSeconds || 60;
  }
}

export const NO_PROVIDER_MESSAGE =
  'Aucun fournisseur IA gratuit disponible : Ollama est injoignable et OPENROUTER_API_KEY est vide. ' +
  'Installez Ollama (https://ollama.com) ou ajoutez une clé OpenRouter gratuite (https://openrouter.ai).';

// ---------------------------------------------------------------------------
// Provider ordering
// ---------------------------------------------------------------------------

interface ProviderEntry {
  name: ProviderName;
  modelId: string;
}

async function providerChain(vision: boolean): Promise<ProviderEntry[]> {
  const configured = (process.env.AI_PROVIDER || 'auto').toLowerCase();

  if (configured === 'ollama') {
    return [{ name: 'ollama', modelId: vision ? OLLAMA_VISION_MODEL() : OLLAMA_MODEL() }];
  }
  if (configured === 'openrouter') {
    if (!hasOpenRouterKey()) throw new Error('OPENROUTER_API_KEY is not set.');
    return [{ name: 'openrouter', modelId: vision ? OPENROUTER_VISION_MODEL() : OPENROUTER_MODEL() }];
  }

  // auto
  const chain: ProviderEntry[] = [];
  // For vision, prefer OpenRouter when a key exists: the local vision model
  // (moondream) is impractically slow on low-RAM machines (minutes to load,
  // then OOM). Text stays on Ollama first for free local inference.
  if (vision) {
    if (hasOpenRouterKey()) {
      chain.push({ name: 'openrouter', modelId: OPENROUTER_VISION_MODEL() });
    }
    if (await isOllamaReachable()) {
      chain.push({ name: 'ollama', modelId: OLLAMA_VISION_MODEL() });
    }
  } else {
    if (await isOllamaReachable()) {
      chain.push({ name: 'ollama', modelId: OLLAMA_MODEL() });
    }
    if (hasOpenRouterKey()) {
      chain.push({ name: 'openrouter', modelId: OPENROUTER_MODEL() });
    }
  }
  if (chain.length === 0) throw new Error(NO_PROVIDER_MESSAGE);
  return chain;
}

function buildProvider(entry: ProviderEntry) {
  return entry.name === 'ollama' ? ollamaProvider() : openRouterProvider();
}

// ---------------------------------------------------------------------------
// Streaming (chat): pick the healthiest provider
// ---------------------------------------------------------------------------

export interface ResolvedModel {
  model: LanguageModel;
  providerName: ProviderName;
  modelId: string;
}

export async function resolveModel(vision = false): Promise<ResolvedModel> {
  const chain = await providerChain(vision);
  for (const entry of chain) {
    if (isParked(entry.name)) continue;
    return {
      model: buildProvider(entry).chatModel(entry.modelId),
      providerName: entry.name,
      modelId: entry.modelId,
    };
  }
  throw new AIUnavailableError(minRetryAfter() || 60);
}

// ---------------------------------------------------------------------------
// Non-streaming: full fallback across providers
// ---------------------------------------------------------------------------

export interface FreeTextOptions {
  messages?: any[];
  prompt?: string;
  system?: string;
  temperature?: number;
  vision?: boolean;
  /** Attempts per provider for transient (503) errors. Default 2. */
  maxRetries?: number;
  onAttempt?: (info: { provider: ProviderName; model: string; attempt: number; error?: any }) => void;
}

export async function generateTextWithFallback(options: FreeTextOptions) {
  const chain = await providerChain(!!options.vision);
  const maxRetries = options.maxRetries ?? 2;
  let lastError: any = null;

  for (const entry of chain) {
    if (isParked(entry.name)) continue;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const payload: any = {
          model: buildProvider(entry).chatModel(entry.modelId),
          temperature: options.temperature ?? 0.7,
          maxRetries: 0, // we own the retry policy
        };
        if (options.system) payload.system = options.system;
        if (options.messages && options.messages.length > 0) {
          payload.messages = options.messages;
        } else {
          payload.prompt = options.prompt ?? '';
        }
        const result = await generateText(payload);
        recordProviderSuccess(entry.name);
        options.onAttempt?.({ provider: entry.name, model: entry.modelId, attempt });
        return result;
      } catch (err: any) {
        lastError = err;
        options.onAttempt?.({ provider: entry.name, model: entry.modelId, attempt, error: err });

        if (isQuotaError(err)) {
          recordProviderFailure(entry.name, err);
          console.warn(
            `[ai] rate limit on ${entry.name} (${entry.modelId}) — parking, switching provider`
          );
          break;
        }
        if (isTransientError(err) && attempt < maxRetries) {
          const delay = 1000 * Math.pow(2, attempt - 1);
          console.warn(`[ai] ${entry.name} transient error, retrying in ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        recordProviderFailure(entry.name, err);
        console.warn(`[ai] ${entry.name} failed (${err?.message ?? err}) — next provider`);
        break;
      }
    }
  }

  if (lastError && isQuotaError(lastError)) {
    throw new AIUnavailableError(parseRetryAfterSeconds(lastError));
  }
  if (lastError) throw lastError;
  throw new AIUnavailableError(minRetryAfter() || 60);
}
