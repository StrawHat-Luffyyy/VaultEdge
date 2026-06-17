import type { LLMProvider, GatewayChatRequest, GatewayChatResponse } from '@vaultedge/shared';
import { ProviderFactory, GatewayError } from './provider-adapter.js';
import type { DecryptedCredentials } from './credential-service.js';

export class ProviderExecutor {
  constructor(private factory: ProviderFactory) {}

  /**
   * Resolves the provider adapter, executes the request, and normalizes errors.
   */
  async executeChat(params: {
    provider: LLMProvider;
    request: GatewayChatRequest;
    credentials: DecryptedCredentials;
    baseUrl: string;
  }): Promise<GatewayChatResponse> {
    try {
      const adapter = this.factory.create(params.provider, {
        apiKey: params.credentials.apiKey,
        baseUrl: params.baseUrl || params.credentials.baseUrl || '',
      });

      return await adapter.chat(params.request);
    } catch (err: any) {
      if (err instanceof GatewayError) {
        throw err;
      }
      throw new GatewayError({
        code: 'PROVIDER_ERROR',
        message: err.message || 'An error occurred during downstream LLM execution',
        statusCode: err.statusCode || 502,
        providerCode: err.code || undefined,
        cause: err,
      });
    }
  }
}
