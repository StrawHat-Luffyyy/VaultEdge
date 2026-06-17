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
  console.log('--- Starting Provider Resolution Verification ---');

  // Import using monorepo resolution
  const { createDbClient } = await import('@vaultedge/db');
  const { organizations, providerConfigs } = await import('@vaultedge/db/schema');
  const { eq, and } = await import('drizzle-orm');
  const { resolveProvider } = await import('./lib/provider-resolver.js');
  const { PROVIDER_METADATA } = await import('@vaultedge/shared');

  const dbUrl = process.env['DATABASE_URL']!;
  const { db, pool } = createDbClient(dbUrl);

  // Clean up previous runs
  console.log('Cleaning up existing test data...');
  await db.delete(providerConfigs).where(eq(providerConfigs.orgId, TEST_ORG_A));
  await db.delete(providerConfigs).where(eq(providerConfigs.orgId, TEST_ORG_B));
  await db.delete(organizations).where(eq(organizations.id, TEST_ORG_A));
  await db.delete(organizations).where(eq(organizations.id, TEST_ORG_B));

  // Extend the static provider registry for tie-breaker/priority testing
  console.log('Registering custom model in static provider registry...');
  if (!PROVIDER_METADATA.openai.models.includes('custom-shared-model')) {
    PROVIDER_METADATA.openai.models.push('custom-shared-model');
  }
  if (!PROVIDER_METADATA.anthropic.models.includes('custom-shared-model')) {
    PROVIDER_METADATA.anthropic.models.push('custom-shared-model');
  }

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
      { id: TEST_ORG_A, name: 'Tenant A', slug: 'tenant-a-prov-verify' },
      { id: TEST_ORG_B, name: 'Tenant B', slug: 'tenant-b-prov-verify' },
    ]);

    // 1. Seed configurations for TEST_ORG_A
    console.log('Seeding provider configurations for Tenant A...');

    // A UUID format helper
    const makeUuid = (char: string) => Array(32).fill(char).join('').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');

    const openaiId = makeUuid('1');
    const anthropicId = makeUuid('2');
    const geminiId = makeUuid('3');
    const mistralId = makeUuid('4');

    // Create provider configs
    await db.insert(providerConfigs).values([
      {
        id: openaiId,
        orgId: TEST_ORG_A,
        provider: 'openai',
        displayName: 'OpenAI Tenant A',
        baseUrl: 'https://api.openai.com/v1',
        apiKeyEncrypted: 'v1:keyid:cipher:tag',
        apiKeyIv: 'some_iv_16_chars_long',
        isEnabled: true,
        priority: 10,
        modelsAllowed: ['gpt-4o', 'gpt-3.5-turbo', 'custom-shared-model'],
        createdAt: new Date('2026-06-17T10:00:00.000Z'),
      },
      {
        id: anthropicId,
        orgId: TEST_ORG_A,
        provider: 'anthropic',
        displayName: 'Anthropic Tenant A',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKeyEncrypted: 'v1:keyid:cipher:tag2',
        apiKeyIv: 'some_iv_16_chars_long2',
        isEnabled: true,
        priority: 20,
        modelsAllowed: ['claude-3.5-sonnet', 'custom-shared-model'],
        createdAt: new Date('2026-06-17T11:00:00.000Z'),
      },
      {
        id: geminiId,
        orgId: TEST_ORG_A,
        provider: 'gemini',
        displayName: 'Gemini Tenant A (Disabled)',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        apiKeyEncrypted: 'v1:keyid:cipher:tag3',
        apiKeyIv: 'some_iv_16_chars_long3',
        isEnabled: false,
        priority: 30,
        modelsAllowed: ['gemini-1.5-flash'],
        createdAt: new Date('2026-06-17T12:00:00.000Z'),
      },
      {
        id: mistralId,
        orgId: TEST_ORG_A,
        provider: 'mistral',
        displayName: 'Mistral Tenant A (Missing Creds)',
        baseUrl: 'https://api.mistral.ai/v1',
        apiKeyEncrypted: '',
        apiKeyIv: '',
        isEnabled: true,
        priority: 5,
        modelsAllowed: ['mistral-large-latest'],
        createdAt: new Date('2026-06-17T13:00:00.000Z'),
      }
    ]);

    console.log('Seed complete. Running assertions...\n');

    // --- TEST 1: Explicit provider success ---
    console.log('Test 1: Explicit provider success (OpenAI, gpt-4o)');
    const res1 = await resolveProvider({
      db,
      gatewayContext: contextA,
      model: 'gpt-4o',
      preferredProvider: 'openai',
    });
    if (res1.length !== 1 || res1[0]?.provider !== 'openai' || res1[0]?.id !== openaiId) {
      throw new Error(`Test 1 Failed: Expected single OpenAI config, got ${JSON.stringify(res1)}`);
    }
    console.log('✅ Passed');

    // --- TEST 2: Explicit provider disabled ---
    console.log('Test 2: Explicit provider disabled (Gemini)');
    try {
      await resolveProvider({
        db,
        gatewayContext: contextA,
        model: 'gemini-1.5-flash',
        preferredProvider: 'gemini',
      });
      throw new Error('Test 2 Failed: Expected disabled provider to throw');
    } catch (err: any) {
      if (err.code !== 'PROVIDER_UNAVAILABLE' || !err.message.includes('disabled')) {
        throw new Error(`Test 2 Failed with unexpected error: ${err.code} - ${err.message}`);
      }
    }
    console.log('✅ Passed');

    // --- TEST 3: Explicit provider model not allowed ---
    console.log('Test 3: Explicit provider model not allowed');
    try {
      await resolveProvider({
        db,
        gatewayContext: contextA,
        model: 'claude-3.5-sonnet',
        preferredProvider: 'openai',
      });
      throw new Error('Test 3 Failed: Expected unallowed model for explicit provider to throw');
    } catch (err: any) {
      if (err.code !== 'MODEL_NOT_ALLOWED') {
        throw new Error(`Test 3 Failed with unexpected error: ${err.code}`);
      }
    }
    console.log('✅ Passed');

    // --- TEST 4: Implicit provider resolution ---
    console.log('Test 4: Implicit provider resolution');
    const res4 = await resolveProvider({
      db,
      gatewayContext: contextA,
      model: 'gpt-4o',
    });
    if (res4.length !== 1 || res4[0]?.provider !== 'openai') {
      throw new Error(`Test 4 Failed: Got ${JSON.stringify(res4)}`);
    }
    console.log('✅ Passed');

    // --- TEST 5: Priority ordering ---
    console.log('Test 5: Priority ordering (Anthropic priority 20 > OpenAI priority 10)');
    const res5 = await resolveProvider({
      db,
      gatewayContext: contextA,
      model: 'custom-shared-model',
    });
    if (res5.length !== 2 || res5[0]?.provider !== 'anthropic' || res5[1]?.provider !== 'openai') {
      throw new Error(`Test 5 Failed: Expected Anthropic then OpenAI. Got: ${res5.map(r => r.provider).join(', ')}`);
    }
    console.log('✅ Passed');

    // --- TEST 6: Tie-break ordering (createdAt ASC) ---
    console.log('Test 6: Tie-break ordering (createdAt ASC)');
    // Set priority of both to 15 (equal)
    await db.update(providerConfigs)
      .set({ priority: 15 })
      .where(and(eq(providerConfigs.orgId, TEST_ORG_A), eq(providerConfigs.provider, 'openai')));
    await db.update(providerConfigs)
      .set({ priority: 15 })
      .where(and(eq(providerConfigs.orgId, TEST_ORG_A), eq(providerConfigs.provider, 'anthropic')));

    // Since priority is equal, and OpenAI (10:00) is older than Anthropic (11:00)
    // resolveProvider should sort: OpenAI first.
    const res6a = await resolveProvider({
      db,
      gatewayContext: contextA,
      model: 'custom-shared-model',
    });
    if (res6a[0]?.provider !== 'openai' || res6a[1]?.provider !== 'anthropic') {
      throw new Error(`Test 6a Failed: Expected OpenAI first due to older createdAt. Got: ${res6a.map(r => r.provider).join(', ')}`);
    }

    // Now swap createdAt times: Anthropic (09:00) is older than OpenAI (10:00)
    await db.update(providerConfigs)
      .set({ createdAt: new Date('2026-06-17T09:00:00.000Z') })
      .where(and(eq(providerConfigs.orgId, TEST_ORG_A), eq(providerConfigs.provider, 'anthropic')));

    const res6b = await resolveProvider({
      db,
      gatewayContext: contextA,
      model: 'custom-shared-model',
    });
    if (res6b[0]?.provider !== 'anthropic' || res6b[1]?.provider !== 'openai') {
      throw new Error(`Test 6b Failed: Expected Anthropic first due to older createdAt. Got: ${res6b.map(r => r.provider).join(', ')}`);
    }

    // Now set createdAt to the EXACT same date, so it tie-breaks on ID alphabetically
    // We want to verify ID alphabetical tie-break:
    // openaiId = 11111111-...
    // anthropicId = 22222222-...
    // '1' < '2', so OpenAI should be first
    const sameDate = new Date('2026-06-17T10:00:00.000Z');
    await db.update(providerConfigs)
      .set({ createdAt: sameDate })
      .where(eq(providerConfigs.orgId, TEST_ORG_A));

    const res6c = await resolveProvider({
      db,
      gatewayContext: contextA,
      model: 'custom-shared-model',
    });
    if (res6c[0]?.provider !== 'openai' || res6c[1]?.provider !== 'anthropic') {
      throw new Error(`Test 6c Failed: Expected OpenAI first due to UUID '1' < '2'. Got: ${res6c.map(r => r.provider).join(', ')}`);
    }
    console.log('✅ Passed');

    // --- TEST 7: Tenant isolation ---
    console.log('Test 7: Tenant isolation');
    try {
      await resolveProvider({
        db,
        gatewayContext: contextB, // tenant B has no provider configs seeded
        model: 'gpt-4o',
      });
      throw new Error('Test 7 Failed: Expected Tenant B to not resolve Tenant A configs');
    } catch (err: any) {
      if (err.code !== 'MODEL_NOT_ALLOWED' || !err.message.includes('No active provider configuration')) {
        throw new Error(`Test 7 Failed with unexpected error: ${err.code} - ${err.message}`);
      }
    }
    console.log('✅ Passed');

    // --- TEST 8: Unsupported model ---
    console.log('Test 8: Unsupported model');
    try {
      await resolveProvider({
        db,
        gatewayContext: contextA,
        model: 'unsupported-model-xyz',
      });
      throw new Error('Test 8 Failed: Expected unsupported model to throw');
    } catch (err: any) {
      if (err.code !== 'MODEL_NOT_ALLOWED' || !err.message.includes('not supported by any known provider')) {
        throw new Error(`Test 8 Failed with unexpected error: ${err.code} - ${err.message}`);
      }
    }
    console.log('✅ Passed');

    // --- TEST 9: Missing provider config ---
    console.log('Test 9: Missing provider config');
    // Tenant B doesn't have anthropic config configured at all
    try {
      await resolveProvider({
        db,
        gatewayContext: contextB,
        model: 'claude-3.5-sonnet',
        preferredProvider: 'anthropic',
      });
      throw new Error('Test 9 Failed: Expected missing provider configuration to throw');
    } catch (err: any) {
      if (err.code !== 'PROVIDER_UNAVAILABLE' || !err.message.includes('not configured')) {
        throw new Error(`Test 9 Failed with unexpected error: ${err.code} - ${err.message}`);
      }
    }
    console.log('✅ Passed');

    // --- TEST 10: Missing provider credential ---
    console.log('Test 10: Missing provider credential');
    try {
      await resolveProvider({
        db,
        gatewayContext: contextA,
        model: 'mistral-large-latest',
        preferredProvider: 'mistral',
      });
      throw new Error('Test 10 Failed: Expected missing credentials to throw');
    } catch (err: any) {
      if (err.code !== 'PROVIDER_UNAVAILABLE' || !err.message.includes('missing or incomplete')) {
        throw new Error(`Test 10 Failed with unexpected error: ${err.code} - ${err.message}`);
      }
    }
    console.log('✅ Passed');

    console.log('\n🎉 All provider resolution assertions passed successfully!');

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

