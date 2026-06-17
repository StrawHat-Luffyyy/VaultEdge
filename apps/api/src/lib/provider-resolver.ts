import type { Database } from '@vaultedge/db';
import { providerConfigs } from '@vaultedge/db/schema';
import { and, eq } from 'drizzle-orm';
import {
  AppError,
  ERROR_CODES,
  isSupportedModel,
  PROVIDER_METADATA,
} from '@vaultedge/shared';
import type { GatewayContext } from '../middleware/gateway-auth.js';

export interface ResolvedProvider {
  id: string;
  provider: string;
  displayName: string;
  baseUrl: string;
  apiKeyEncrypted: string;
  apiKeyIv: string;
  priority: number;
}

export interface ResolveProviderParams {
  db: Database;
  gatewayContext: GatewayContext;
  model: string;
  preferredProvider?: string;
}

/**
 * Resolves which provider configuration(s) should serve an authenticated gateway request.
 * Returns a prioritized list of enabled, validated provider configs.
 *
 * Security: Scoped by orgId, returns only encrypted payloads, no plaintext keys are exposed.
 */
export async function resolveProvider(
  params: ResolveProviderParams
): Promise<ResolvedProvider[]> {
  const { db, gatewayContext, model, preferredProvider } = params;
  const orgId = gatewayContext.orgId;

  if (preferredProvider !== undefined) {
    // Explicit Provider Resolution
    const validProviders = ['openai', 'anthropic', 'gemini', 'mistral'];
    if (!validProviders.includes(preferredProvider)) {
      throw new AppError({
        code: ERROR_CODES.VALIDATION_ERROR,
        message: `Unsupported provider "${preferredProvider}". Supported providers: ${validProviders.join(', ')}`,
        statusCode: 400,
      });
    }

    // 1. Fetch provider configuration scoped by organization
    const config = await db.query.providerConfigs.findFirst({
      where: and(
        eq(providerConfigs.orgId, orgId),
        eq(providerConfigs.provider, preferredProvider)
      ),
    });

    // 2. Validate configuration exists
    if (!config) {
      throw new AppError({
        code: ERROR_CODES.PROVIDER_UNAVAILABLE,
        message: `Provider "${preferredProvider}" is not configured for this organization`,
        statusCode: 502,
      });
    }

    // 3. Validate configuration is enabled
    if (!config.isEnabled) {
      throw new AppError({
        code: ERROR_CODES.PROVIDER_UNAVAILABLE,
        message: `Provider "${preferredProvider}" is disabled for this organization`,
        statusCode: 502,
      });
    }

    // 4. Validate requested model is supported by provider and allowed by policy
    const isRegSupported = isSupportedModel(preferredProvider, model);
    if (!isRegSupported) {
      throw new AppError({
        code: ERROR_CODES.MODEL_NOT_ALLOWED,
        message: `Model "${model}" is not supported by provider "${preferredProvider}"`,
        statusCode: 403,
      });
    }

    const isAllowedByPolicy = config.modelsAllowed?.includes(model);
    if (!isAllowedByPolicy) {
      throw new AppError({
        code: ERROR_CODES.MODEL_NOT_ALLOWED,
        message: `Model "${model}" is not allowed by organization policy for provider "${preferredProvider}"`,
        statusCode: 403,
      });
    }

    // 5. Validate encrypted credential exists
    if (!config.apiKeyEncrypted || !config.apiKeyIv) {
      throw new AppError({
        code: ERROR_CODES.PROVIDER_UNAVAILABLE,
        message: `Credentials for provider "${preferredProvider}" are missing or incomplete`,
        statusCode: 502,
      });
    }

    // 6. Return single-item array
    const defaultMeta = PROVIDER_METADATA[preferredProvider as 'openai' | 'anthropic' | 'gemini' | 'mistral'];
    return [
      {
        id: config.id,
        provider: config.provider,
        displayName: config.displayName || defaultMeta.name,
        baseUrl: config.baseUrl || defaultMeta.defaultBaseUrl,
        apiKeyEncrypted: config.apiKeyEncrypted,
        apiKeyIv: config.apiKeyIv,
        priority: config.priority,
      },
    ];
  }

  // Implicit Provider Resolution
  // 1. Fetch all enabled configurations for the tenant
  const configs = await db.query.providerConfigs.findMany({
    where: and(
      eq(providerConfigs.orgId, orgId),
      eq(providerConfigs.isEnabled, true)
    ),
  });

  // 2. Filter configurations where the model is supported by the provider AND allowed by configuration
  const candidates = configs.filter((config) => {
    const isRegSupported = isSupportedModel(config.provider, model);
    const isAllowedByPolicy = config.modelsAllowed?.includes(model);
    const hasCredentials = !!config.apiKeyEncrypted && !!config.apiKeyIv;
    return isRegSupported && isAllowedByPolicy && hasCredentials;
  });

  if (candidates.length === 0) {
    // Check if the model is registered under any provider at all
    let isKnownModel = false;
    for (const providerMeta of Object.values(PROVIDER_METADATA)) {
      if (providerMeta.models.includes(model)) {
        isKnownModel = true;
        break;
      }
    }

    if (isKnownModel) {
      throw new AppError({
        code: ERROR_CODES.MODEL_NOT_ALLOWED,
        message: `No active provider configuration allows the model "${model}"`,
        statusCode: 403,
      });
    } else {
      throw new AppError({
        code: ERROR_CODES.MODEL_NOT_ALLOWED,
        message: `Model "${model}" is not supported by any known provider`,
        statusCode: 403,
      });
    }
  }

  // 3. Sort by priority DESC, then by createdAt ASC (older first), and fallback to id ASC
  candidates.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    if (a.createdAt && b.createdAt) {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      if (timeA !== timeB) {
        return timeA - timeB;
      }
    }
    return a.id.localeCompare(b.id);
  });

  // 4. Map to ResolvedProvider array
  return candidates.map((config) => {
    const defaultMeta = PROVIDER_METADATA[config.provider as 'openai' | 'anthropic' | 'gemini' | 'mistral'];
    return {
      id: config.id,
      provider: config.provider,
      displayName: config.displayName || defaultMeta.name,
      baseUrl: config.baseUrl || defaultMeta.defaultBaseUrl,
      apiKeyEncrypted: config.apiKeyEncrypted,
      apiKeyIv: config.apiKeyIv,
      priority: config.priority,
    };
  });
}
