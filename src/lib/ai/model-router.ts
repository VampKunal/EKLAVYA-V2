import { google } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { wrapLanguageModel, extractReasoningMiddleware } from 'ai';
import type { LanguageModel } from 'ai';

// OpenRouter gives access to free models (look for ":free" suffix models)
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY ?? '',
});

type TaskType = 'coding' | 'math' | 'general' | 'fast' | 'reasoning';

/**
 * PRIMARY models — Google Gemini (free tier via GOOGLE_AI_API_KEY).
 *
 * FALLBACK models — OpenRouter free models.
 *   openrouter/auto: smart router that picks the best currently-available free model.
 *   deepseek/deepseek-r1:free: great for reasoning tasks.
 *   meta-llama/llama-3.3-70b-instruct:free: solid general purpose.
 *
 * Fallback kicks in automatically when Gemini returns:
 *   - 404 NOT_FOUND (model deprecated / not available to new users)
 *   - 429 RESOURCE_EXHAUSTED (quota exceeded)
 */

const GEMINI_MODELS: Record<TaskType, string> = {
  coding: 'gemini-2.5-flash',
  math: 'gemini-2.5-pro',
  reasoning: 'gemini-2.5-flash',
  fast: 'gemini-2.5-flash',   // gemini-2.5-flash-lite is deprecated — use flash
  general: 'gemini-2.5-flash',
};

const OPENROUTER_FALLBACKS: Record<TaskType, string> = {
  coding: 'deepseek/deepseek-r1:free',
  math: 'deepseek/deepseek-r1:free',
  reasoning: 'deepseek/deepseek-r1:free',
  fast: 'openrouter/auto',
  general: 'meta-llama/llama-3.3-70b-instruct:free',
};

/** Codes that signal a model is gone / unavailable — triggers fallback immediately */
const FALLBACK_STATUS_CODES = new Set([404, 429]);

/**
 * Returns a Gemini model wrapped with OpenRouter fallback logic.
 * If Gemini returns 404 (deprecated) or 429 (quota), the call is retried
 * transparently using the matching OpenRouter free model.
 */
export function callModel(taskType: TaskType = 'general'): LanguageModel {
  const geminiId = GEMINI_MODELS[taskType];
  const fallbackId = OPENROUTER_FALLBACKS[taskType];

  // Return a proxy that tries Gemini, falls back to OpenRouter on error
  return createFallbackModel(
    google(geminiId),
    openrouter(fallbackId),
    geminiId,
    fallbackId,
  );
}

/**
 * Creates a LanguageModel that wraps `primary` and transparently falls back to
 * `fallback` when the primary throws a 404 or 429.
 */
function createFallbackModel(
  primary: LanguageModel,
  fallback: LanguageModel,
  primaryId: string,
  fallbackId: string,
): LanguageModel {
  // We implement this via a Proxy that intercepts doGenerate / doStream
  return new Proxy(primary, {
    get(target, prop) {
      const original = (target as any)[prop];

      if (prop === 'doGenerate' || prop === 'doStream') {
        return async function (...args: any[]) {
          try {
            return await original.apply(target, args);
          } catch (err: any) {
            const status = err?.statusCode ?? err?.status ?? err?.data?.error?.code;
            const isDeprecated =
              FALLBACK_STATUS_CODES.has(Number(status)) ||
              String(err?.message ?? '').includes('no longer available') ||
              String(err?.message ?? '').includes('deprecated');

            if (isDeprecated) {
              console.warn(
                `[ModelRouter] ${primaryId} unavailable (${status}). Falling back to ${fallbackId} via OpenRouter.`,
              );
              return await (fallback as any)[prop](...args);
            }
            throw err;
          }
        };
      }

      return typeof original === 'function' ? original.bind(target) : original;
    },
  });
}
