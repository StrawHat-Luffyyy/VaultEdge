/**
 * Unified LLM gateway types.
 * These normalize the different provider APIs into a single contract.
 */

export interface UnifiedChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

export interface UnifiedChatRequest {
  model: string;
  messages: UnifiedChatMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string | string[];
  stream?: boolean;
  user?: string;
}

export interface UnifiedTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface UnifiedChatChoice {
  index: number;
  message: UnifiedChatMessage;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

export interface UnifiedChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: UnifiedChatChoice[];
  usage: UnifiedTokenUsage;
  provider: string;
}

export interface UnifiedEmbeddingRequest {
  model: string;
  input: string | string[];
  encodingFormat?: 'float' | 'base64';
}

export interface UnifiedEmbeddingData {
  object: 'embedding';
  index: number;
  embedding: number[];
}

export interface UnifiedEmbeddingResponse {
  object: 'list';
  data: UnifiedEmbeddingData[];
  model: string;
  usage: { promptTokens: number; totalTokens: number };
}

export interface VaultEdgeRequestExtension {
  project?: string;
  cache?: boolean;
  promptTemplate?: string;
  metadata?: Record<string, unknown>;
}

export interface GatewayRequestLog {
  requestId: string;
  orgId: string;
  projectId: string | null;
  apiKeyId: string;
  provider: string;
  model: string;
  requestType: 'chat' | 'completion' | 'embedding';
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  statusCode: number;
  isCacheHit: boolean;
  isStreamed: boolean;
  errorCode: string | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export type GatewayChatMessage = UnifiedChatMessage;
export type GatewayChatRequest = UnifiedChatRequest;
export type GatewayChatResponse = UnifiedChatResponse;

