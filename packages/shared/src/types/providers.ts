/**
 * LLM Provider types and metadata.
 */

export const LLM_PROVIDERS = ['openai', 'anthropic', 'gemini', 'mistral'] as const;
export type LLMProvider = (typeof LLM_PROVIDERS)[number];

export interface ProviderMetadata {
  id: LLMProvider;
  name: string;
  defaultBaseUrl: string;
  models: string[];
}

export interface ModelPricing {
  provider: LLMProvider;
  model: string;
  inputPricePerMillion: number; // USD per 1M input tokens
  outputPricePerMillion: number; // USD per 1M output tokens
}

export interface ProviderHealth {
  provider: LLMProvider;
  isHealthy: boolean;
  lastCheckedAt: string;
  consecutiveFailures: number;
  lastError?: string;
}
