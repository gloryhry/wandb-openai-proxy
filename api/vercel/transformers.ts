import {
  OpenAIChoice,
  OpenAIChoiceStream,
  OpenAICompletionResponse,
  OpenAIStreamResponse,
  WandBCompletionResponse,
  WandBStreamResponse,
  WandBChoice,
  WandBStreamChoice,
  OpenAIMessage,
  ModelListResponse,
  ModelInfo,
  OpenAIChatCompletionRequest
} from "./types";

const DEEPSEEK_V3_MODEL = 'deepseek-ai/DeepSeek-V3.1';

export function transformNonStreamResponse(
  wandbData: WandBCompletionResponse,
  originalModel: string
): OpenAICompletionResponse {
  const timestamp = Date.now();
  const id = wandbData.id || `chatcmpl-${generateId()}`;
  const object = (wandbData.object || "chat.completion") as "chat.completion";
  const created = wandbData.created || Math.floor(timestamp / 1000);
  const model = wandbData.model || originalModel;

  const choices = (wandbData.choices || []).map((choice: WandBChoice, index: number) => ({
    index: choice.index ?? index,
    message: {
      role: choice.message?.role || "assistant",
      content: choice.message?.content || "",
      // @ts-ignore: a new field in wandb but not in openai
      tool_calls: choice.message?.tool_calls
    },
    // @ts-ignore
    finish_reason: choice.finish_reason === 'tool_calls' ? 'tool_calls' : choice.finish_reason || null
  }));

  const usage = {
    prompt_tokens: wandbData.usage?.prompt_tokens || 0,
    completion_tokens: wandbData.usage?.completion_tokens || 0,
    total_tokens: wandbData.usage?.total_tokens || 0
  };

  return {
    id,
    object,
    created,
    model,
    choices,
    usage,
    system_fingerprint: ""
  };
}

export function transformStreamChunk(
  wandbChunk: WandBStreamResponse,
  originalModel: string
): OpenAIStreamResponse {
  const timestamp = Date.now();
  const id = wandbChunk.id || `chatcmpl-${generateId()}`;
  const object = (wandbChunk.object || "chat.completion.chunk") as "chat.completion.chunk";
  const created = wandbChunk.created || Math.floor(timestamp / 1000);
  const model = wandbChunk.model || originalModel;

  const choices = (wandbChunk.choices || []).map((choice: WandBStreamChoice, index: number) => ({
    index: choice.index ?? index,
    delta: {
      role: choice.delta?.role,
      content: choice.delta?.content,
      // @ts-ignore
      tool_calls: choice.delta?.tool_calls
    },
    finish_reason: choice.finish_reason || null
  }));

  return {
    id,
    object,
    created,
    model,
    choices,
    system_fingerprint: ""
  };
}

export function transformModelList(wandbModels: any[]): ModelListResponse {
  return {
    object: "list",
    data: wandbModels.map(model => ({
      id: model.id || model.name,
      object: "model",
      created: Date.now(),
      owned_by: model.owned_by || "wandb"
    }))
  };
}

export function buildWandBRequest(
  openAIRequest: OpenAIChatCompletionRequest
): any {
  let messages = [...openAIRequest.messages];

  if (!messages.some(m => m.role === "system")) {
    messages.unshift({
      role: "system",
      content: "你是一个乐于助人的助手。"
    });
  }

  if (openAIRequest.prompt) {
    messages = [{ role: "user", content: openAIRequest.prompt }];
  }

  const wandbMessages = messages.map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  const wandbRequest: any = {
    model: openAIRequest.model,
    messages: wandbMessages
  };

  const optionalParams = [
    "temperature",
    "max_tokens",
    "top_p",
    "frequency_penalty",
    "presence_penalty",
    "stream"
  ] as const;

  for (const param of optionalParams) {
    if (openAIRequest[param] !== undefined) {
      wandbRequest[param] = openAIRequest[param];
    }
  }

  // 优先使用 tools，如果不存在则将 functions 转换为 tools
  if (openAIRequest.tools) {
    wandbRequest.tools = openAIRequest.tools;
  } else if (openAIRequest.functions) {
    wandbRequest.tools = openAIRequest.functions.map(func => ({
      type: "function",
      function: func
    }));
  }

  handleToolChoice(openAIRequest, wandbRequest);

  return wandbRequest;
}

/**
 * 处理工具调用逻辑，包括对DeepSeek-V3.1模型的特殊兼容
 * @param openAIRequest 原始OpenAI请求
 * @param wandbRequest 待构建的WandB请求
 */
function handleToolChoice(openAIRequest: OpenAIChatCompletionRequest, wandbRequest: any) {
  // DeepSeek-V3.1模型在进行工具调用时，需要显式设置tool_choice为"required"
  if (openAIRequest.model === DEEPSEEK_V3_MODEL && (openAIRequest.tools || openAIRequest.functions)) {
    wandbRequest.tool_choice = "required";
    return;
  }

  // 优先使用 tool_choice
  if (openAIRequest.tool_choice) {
    wandbRequest.tool_choice = openAIRequest.tool_choice;
    return;
  }
  
  // 其次处理旧版的 function_call
  if (openAIRequest.function_call) {
    if (typeof openAIRequest.function_call === 'object') {
      wandbRequest.tool_choice = {
        type: "function",
        function: { name: openAIRequest.function_call.name }
      };
    } else {
      wandbRequest.tool_choice = openAIRequest.function_call;
    }
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 4);
}