// Setup environment variables before loading any modules to satisfy Zod validation
process.env['DATABASE_URL'] = 'postgresql://vaultedge:vaultedge_dev@localhost:5432/vaultedge';
process.env['API_KEY_SECRET'] = 'this-is-a-very-long-api-key-secret-32-chars';
process.env['ENCRYPTION_KEY'] = 'this-is-a-very-long-new-active-key-32-chars';
process.env['APP_URL'] = 'http://localhost:3000';
process.env['API_URL'] = 'http://localhost:4000';
process.env['REDIS_URL'] = 'redis://localhost:6379';
process.env['BULLMQ_REDIS_URL'] = 'redis://localhost:6379';
process.env['BETTER_AUTH_SECRET'] = 'this-is-a-very-long-better-auth-secret-32-chars';
process.env['BETTER_AUTH_URL'] = 'http://localhost:4000';
process.env['CORS_ORIGINS'] = 'http://localhost:3000';

// Actor / Tenant Seed IDs
const TEST_ORG_A = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
const TEST_ORG_B = 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2';

async function test() {
  console.log('--- Starting Provider Adapter Framework Verification ---');

  // Import using monorepo resolution
  const { createDbClient } = await import('@vaultedge/db');
  const { organizations, providerConfigs } = await import('@vaultedge/db/schema');
  const { eq } = await import('drizzle-orm');
  const {
    ProviderFactory,
    MockOpenAIAdapter,
    MockAnthropicAdapter,
    MockGeminiAdapter,
    MockMistralAdapter,
    GatewayError,
  } = await import('./lib/provider-adapter.js');
  const { CredentialService } = await import('./lib/credential-service.js');
  const { ProviderExecutor } = await import('./lib/provider-executor.js');
  const { ExecutionService } = await import('./lib/execution-service.js');
  const { PROVIDER_METADATA } = await import('@vaultedge/shared');

  const dbUrl = process.env['DATABASE_URL']!;
  const { db, pool } = createDbClient(dbUrl);

  // Clean up previous runs
  console.log('Cleaning up existing test data...');
  await db.delete(providerConfigs).where(eq(providerConfigs.orgId, TEST_ORG_A));
  await db.delete(providerConfigs).where(eq(providerConfigs.orgId, TEST_ORG_B));
  await db.delete(organizations).where(eq(organizations.id, TEST_ORG_A));
  await db.delete(organizations).where(eq(organizations.id, TEST_ORG_B));

  // Extend the static provider registry for verification testing
  console.log('Registering custom model in static provider registry...');
  if (!PROVIDER_METADATA.openai.models.includes('custom-shared-model')) {
    PROVIDER_METADATA.openai.models.push('custom-shared-model');
  }

  // Initialize service objects
  const factory = new ProviderFactory();
  factory.register('openai', MockOpenAIAdapter);
  factory.register('anthropic', MockAnthropicAdapter);
  factory.register('gemini', MockGeminiAdapter);
  factory.register('mistral', MockMistralAdapter);

  const credentialService = new CredentialService();
  const executor = new ProviderExecutor(factory);
  const executionService = new ExecutionService(db, credentialService, executor);

  // Gateway contexts
  const contextA = {
    apiKeyId: 'key-a',
    orgId: TEST_ORG_A,
    projectId: null,
    scopes: ['gateway:write'],
    requestId: 'req-a',
    mode: 'test' as const,
  };

  const contextB = {
    apiKeyId: 'key-b',
    orgId: TEST_ORG_B,
    projectId: null,
    scopes: ['gateway:write'],
    requestId: 'req-b',
    mode: 'test' as const,
  };

  try {
    console.log('Seeding organizations...');
    await db.insert(organizations).values([
      { id: TEST_ORG_A, name: 'Tenant A', slug: 'tenant-a-adapter-verify' },
      { id: TEST_ORG_B, name: 'Tenant B', slug: 'tenant-b-adapter-verify' },
    ]);

    console.log('Seeding provider configuration for Tenant A...');
    await db.insert(providerConfigs).values([
      {
        orgId: TEST_ORG_A,
        provider: 'openai',
        displayName: 'OpenAI Tenant A',
        baseUrl: 'https://api.openai.com/v1',
        apiKeyEncrypted: 'v1:keyid:cipher:tag',
        apiKeyIv: 'some_iv_16_chars_long',
        isEnabled: true,
        priority: 10,
        modelsAllowed: ['gpt-4o', 'custom-shared-model'],
      },
    ]);

    console.log('Seed complete. Running assertions...\n');

    // --- TEST 1: Orchestrated Chat Execution Success ---
    console.log('Test 1: Orchestrated Chat Execution Success (OpenAI, gpt-4o)');
    const response = await executionService.executeChat({
      gatewayContext: contextA,
      request: {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Say hello' }],
      },
    });

    if (
      !response.id.startsWith('mock-chat-') ||
      response.choices[0]?.message.content !== 'Mock response from openai adapter for model gpt-4o'
    ) {
      throw new Error(`Test 1 Failed: Unexpected response body ${JSON.stringify(response)}`);
    }
    console.log('✅ Passed');

    // --- TEST 2: CredentialService placeholder retrieval ---
    console.log('Test 2: CredentialService placeholder verification');
    const creds = await credentialService.getCredentials({
      apiKeyEncrypted: 'v1:keyid:cipher:tag',
      apiKeyIv: 'iv',
    });
    if (creds.apiKey !== 'mock-decrypted-api-key') {
      throw new Error(`Test 2 Failed: Expected placeholder decrypted key, got: ${creds.apiKey}`);
    }
    console.log('✅ Passed');

    // --- TEST 3: Registry lookup failure ---
    console.log('Test 3: ProviderFactory registry lookup failure');
    const emptyFactory = new ProviderFactory();
    try {
      emptyFactory.create('openai', { apiKey: 'key', baseUrl: 'url' });
      throw new Error('Test 3 Failed: Expected missing registry lookup to throw');
    } catch (err: any) {
      if (err.code !== 'PROVIDER_UNAVAILABLE' || !err.message.includes('No adapter registered')) {
        throw new Error(`Test 3 Failed: Unexpected error type: ${err.message}`);
      }
    }
    console.log('✅ Passed');

    // --- TEST 4: Error normalization to GatewayError ---
    console.log('Test 4: Error normalization to GatewayError');
    class FailingAdapter extends MockOpenAIAdapter {
      override async chat(): Promise<any> {
        throw new Error('Upstream network timeout');
      }
    }
    const failingFactory = new ProviderFactory();
    failingFactory.register('openai', FailingAdapter);
    const failingExecutor = new ProviderExecutor(failingFactory);
    try {
      await failingExecutor.executeChat({
        provider: 'openai',
        request: { model: 'gpt-4o', messages: [] },
        credentials: { apiKey: 'key' },
        baseUrl: 'url',
      });
      throw new Error('Test 4 Failed: Expected execution to throw');
    } catch (err: any) {
      if (!(err instanceof GatewayError) || err.code !== 'PROVIDER_ERROR' || err.statusCode !== 502) {
        throw new Error(`Test 4 Failed: Unexpected error normalization: ${JSON.stringify(err)}`);
      }
    }
    console.log('✅ Passed');

    // --- TEST 5: Tenant Isolation protection ---
    console.log('Test 5: Tenant isolation verification');
    try {
      await executionService.executeChat({
        gatewayContext: contextB, // Tenant B has no provider configs seeded
        request: { model: 'gpt-4o', messages: [] },
      });
      throw new Error('Test 5 Failed: Expected cross-tenant block to throw');
    } catch (err: any) {
      if (err.code !== 'MODEL_NOT_ALLOWED') {
        throw new Error(`Test 5 Failed: Unexpected error on isolation test: ${err.code}`);
      }
    }
    console.log('✅ Passed');

    console.log('\n🎉 All provider adapter framework assertions passed successfully!');

  } finally {
    console.log('Cleaning up database records...');
    await db.delete(providerConfigs).where(eq(providerConfigs.orgId, TEST_ORG_A));
    await db.delete(providerConfigs).where(eq(providerConfigs.orgId, TEST_ORG_B));
    await db.delete(organizations).where(eq(organizations.id, TEST_ORG_A));
    await db.delete(organizations).where(eq(organizations.id, TEST_ORG_B));

    // Close pool
    await pool.end();
  }
}

test().catch((err) => {
  console.error('❌ Verification script encountered error:', err);
  process.exit(1);
});

export {};

