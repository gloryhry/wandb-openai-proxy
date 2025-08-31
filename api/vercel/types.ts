// OpenAI API Types
export interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "function";
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface OpenAIChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string | null;
}

export interface OpenAIChoiceStream {
  index: number;
  delta: {
    role?: string;
    content?: string;
    function_call?: {
      name?: string;
      arguments?: string;
    };
  };
  finish_reason: string | null;
}

export interface OpenAICompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  system_fingerprint: string;
}

export interface OpenAIStreamResponse {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: OpenAIChoiceStream[];
  system_fingerprint: string;
}

export interface OpenAIChatCompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  prompt?: string; // 兼容旧格式

  // 新增：支持tool calling
  tools?: OpenAITool[];
  tool_choice?: "auto" | "none" | {
    type: "function";
    function: { name: string };
  };

  // 兼容旧的function calling
  functions?: OpenAICompatibleFunction[];
  function_call?: "auto" | "none" | {
    name: string;
  };
}

// 新增：定义Tool类型
export interface OpenAITool {
  type: "function";
  function: OpenAICompatibleFunction;
}

// 新增：定义Function类型
export interface OpenAICompatibleFunction {
  name: string;
  description?: string;
  parameters: object;
}

// wandb API Types
export interface WandBChatCompletionRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

export interface WandBChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string | null;
}

export interface WandBStreamChoice {
  index: number;
  delta: {
    role?: string;
    content?: string;
  };
  finish_reason: string | null;
}

export interface WandBCompletionResponse {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices: WandBChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface WandBStreamResponse {
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices: WandBStreamChoice[];
}

// Model Types
export interface ModelInfo {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface ModelListResponse {
  object: string;
  data: ModelInfo[];
}