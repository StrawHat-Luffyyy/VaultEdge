import type { Database } from '@vaultedge/db';
import type { GatewayChatRequest, GatewayChatResponse } from '@vaultedge/shared';
import type { GatewayContext } from '../middleware/gateway-auth.js';
import { resolveProvider } from './provider-resolver.js';
import { CredentialService } from './credential-service.js';
import { ProviderExecutor } from './provider-executor.js';

export class ExecutionService {
  constructor(
    private db: Database,
    private credentialService: CredentialService,
    private executor: ProviderExecutor
  ) {}

  /**
   * Orchestrates provider resolution, credential retrieval, and execution for chat requests.
   */
  async executeChat(params: {
    gatewayContext: GatewayContext;
    request: GatewayChatRequest;
    preferredProvider?: string;
  }): Promise<GatewayChatResponse> {
    // 1. Resolve Provider Configurations using Milestone 4B resolution logic
    const resolved = await resolveProvider({
      db: this.db,
      gatewayContext: params.gatewayContext,
      model: params.request.model,
      preferredProvider: params.preferredProvider,
    });

    const primary = resolved[0]!;

    // 2. Retrieve credentials (thin mock layer for Milestone 5A)
    const credentials = await this.credentialService.getCredentials({
      apiKeyEncrypted: primary.apiKeyEncrypted,
      apiKeyIv: primary.apiKeyIv,
    });

    // 3. Delegate execution to the provider executor
    return await this.executor.executeChat({
      provider: primary.provider as any,
      request: params.request,
      credentials,
      baseUrl: primary.baseUrl,
    });
  }
}
