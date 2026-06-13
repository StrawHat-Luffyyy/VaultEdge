import { MODEL_PRICING } from '../constants/providers.js';
import type { LLMProvider } from '../types/providers.js';

/**
 * Calculate the cost in USD cents for a given model usage.
 */
export function calculateCost(
  provider: LLMProvider,
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const pricing = MODEL_PRICING.find((p) => p.provider === provider && p.model === model);

  if (!pricing) {
    // Fallback: use a conservative default for unknown models
    return ((promptTokens + completionTokens) / 1_000_000) * 10; // $10/M tokens default
  }

  const inputCost = (promptTokens / 1_000_000) * pricing.inputPricePerMillion;
  const outputCost = (completionTokens / 1_000_000) * pricing.outputPricePerMillion;

  // Convert dollars to cents, round to 6 decimal places
  return Math.round((inputCost + outputCost) * 100 * 1_000_000) / 1_000_000;
}

/**
 * Detect the provider from a model name.
 */
export function detectProvider(model: string): LLMProvider | null {
  if (model.startsWith('gpt-')) return 'openai';
  if (model.startsWith('claude-')) return 'anthropic';
  if (model.startsWith('gemini-')) return 'gemini';
  if (model.startsWith('mistral-') || model.startsWith('open-mistral-')) return 'mistral';
  return null;
}
