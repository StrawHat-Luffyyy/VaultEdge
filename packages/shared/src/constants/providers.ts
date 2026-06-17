import type { ProviderMetadata, ModelPricing, LLMProvider } from '../types/providers.js';

/**
 * Provider metadata with supported models and default endpoints.
 */
export const PROVIDER_METADATA: Record<LLMProvider, ProviderMetadata> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    defaultBaseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    defaultBaseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-4-opus', 'claude-4-sonnet', 'claude-3.5-sonnet', 'claude-3-haiku'],
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral',
    defaultBaseUrl: 'https://api.mistral.ai/v1',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'open-mistral-nemo'],
  },
};

/**
 * Model pricing in USD per million tokens.
 * Updated periodically to reflect current provider pricing.
 */
export const MODEL_PRICING: ModelPricing[] = [
  // OpenAI
  { provider: 'openai', model: 'gpt-4o', inputPricePerMillion: 2.5, outputPricePerMillion: 10.0 },
  { provider: 'openai', model: 'gpt-4o-mini', inputPricePerMillion: 0.15, outputPricePerMillion: 0.6 },
  { provider: 'openai', model: 'gpt-4-turbo', inputPricePerMillion: 10.0, outputPricePerMillion: 30.0 },
  { provider: 'openai', model: 'gpt-4', inputPricePerMillion: 30.0, outputPricePerMillion: 60.0 },
  { provider: 'openai', model: 'gpt-3.5-turbo', inputPricePerMillion: 0.5, outputPricePerMillion: 1.5 },

  // Anthropic
  { provider: 'anthropic', model: 'claude-4-opus', inputPricePerMillion: 15.0, outputPricePerMillion: 75.0 },
  { provider: 'anthropic', model: 'claude-4-sonnet', inputPricePerMillion: 3.0, outputPricePerMillion: 15.0 },
  { provider: 'anthropic', model: 'claude-3.5-sonnet', inputPricePerMillion: 3.0, outputPricePerMillion: 15.0 },
  { provider: 'anthropic', model: 'claude-3-haiku', inputPricePerMillion: 0.25, outputPricePerMillion: 1.25 },

  // Gemini
  { provider: 'gemini', model: 'gemini-2.0-flash', inputPricePerMillion: 0.1, outputPricePerMillion: 0.4 },
  { provider: 'gemini', model: 'gemini-2.0-pro', inputPricePerMillion: 1.25, outputPricePerMillion: 5.0 },
  { provider: 'gemini', model: 'gemini-1.5-flash', inputPricePerMillion: 0.075, outputPricePerMillion: 0.3 },
  { provider: 'gemini', model: 'gemini-1.5-pro', inputPricePerMillion: 1.25, outputPricePerMillion: 5.0 },

  // Mistral
  { provider: 'mistral', model: 'mistral-large-latest', inputPricePerMillion: 2.0, outputPricePerMillion: 6.0 },
  { provider: 'mistral', model: 'mistral-medium-latest', inputPricePerMillion: 2.7, outputPricePerMillion: 8.1 },
  { provider: 'mistral', model: 'mistral-small-latest', inputPricePerMillion: 0.2, outputPricePerMillion: 0.6 },
  { provider: 'mistral', model: 'open-mistral-nemo', inputPricePerMillion: 0.15, outputPricePerMillion: 0.15 },
];

/**
 * Helper to check if a model is supported by a provider.
 */
export function isSupportedModel(provider: string, model: string): boolean {
  if (!Object.prototype.hasOwnProperty.call(PROVIDER_METADATA, provider)) {
    return false;
  }
  const metadata = PROVIDER_METADATA[provider as LLMProvider];
  return metadata.models.includes(model);
}

