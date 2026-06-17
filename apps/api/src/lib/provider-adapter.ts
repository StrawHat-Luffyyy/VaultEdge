import type { LLMProvider, GatewayChatRequest, GatewayChatResponse } from '@vaultedge/shared';
import crypto from 'crypto';

export interface AdapterConfig {
  apiKey: string;
  baseUrl: string;
}

export interface ProviderAdapter {
  provider: LLMProvider;
  chat(request: GatewayChatRequest): Promise<GatewayChatResponse>;
}

export class GatewayError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly providerCode?: string;

  constructor(params: {
    code: string;
    message: string;
    statusCode: number;
    providerCode?: string;
    cause?: Error;
  }) {
    super(params.message, { cause: params.cause });
    this.name = 'GatewayError';
    this.code = params.code;
    this.statusCode = params.statusCode;
    this.providerCode = params.providerCode;
  }
}

export class ProviderFactory {
  private registry = new Map<LLMProvider, new (config: AdapterConfig) => ProviderAdapter>();

  register(provider: LLMProvider, adapterCtor: new (config: AdapterConfig) => ProviderAdapter): void {
    this.registry.set(provider, adapterCtor);
  }

  create(provider: LLMProvider, config: AdapterConfig): ProviderAdapter {
    const ctor = this.registry.get(provider);
    if (!ctor) {
      throw new GatewayError({
        code: 'PROVIDER_UNAVAILABLE',
        message: `No adapter registered for provider "${provider}"`,
        statusCode: 502,
      });
    }
    return new ctor(config);
  }
}

// Base Mock Adapter class
export class MockProviderAdapter implements ProviderAdapter {
  public provider: LLMProvider = 'openai';

  constructor(protected config: AdapterConfig) {}

  async chat(request: GatewayChatRequest): Promise<GatewayChatResponse> {
    return {
      id: `mock-chat-${crypto.randomUUID()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: request.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: `Mock response from ${this.provider} adapter for model ${request.model}`,
          },
          finishReason: 'stop',
        },
      ],
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
      provider: this.provider,
    };
  }
}

// Subclasses for provider-specific mock testing
export class MockOpenAIAdapter extends MockProviderAdapter {
  public override provider = 'openai' as const;
}

export class MockAnthropicAdapter extends MockProviderAdapter {
  public override provider = 'anthropic' as const;
}

export class MockGeminiAdapter extends MockProviderAdapter {
  public override provider = 'gemini' as const;
}

export class MockMistralAdapter extends MockProviderAdapter {
  public override provider = 'mistral' as const;
}
