import { createVaultEdgeAuthClient } from '@vaultedge/auth/client';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

export const authClient = createVaultEdgeAuthClient(API_URL) as any;

export const { useSession, signIn, signUp, signOut } = authClient;


