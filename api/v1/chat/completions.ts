import { handleChatCompletionsRequest } from "../../../api/vercel/handlers";
import { addCorsHeaders, createOptionsResponse, methodNotAllowed, internalError } from "../../../api/vercel/utils";

const WANDB_API_KEY = process.env.WANDB_API_KEY || "";

export default async function ChatCompletionsHandler(request: Request): Promise<Response> {
  try {
    // 处理预检请求
    if (request.method === "OPTIONS") {
      return createOptionsResponse();
    }

    // 处理基本HTTP方法限制
    if (request.method !== "POST") {
      return addCorsHeaders(methodNotAllowed());
    }

    // 认证处理
    let authHeader = request.headers.get("Authorization");
    
    // 如果环境变量设置了WANDB_API_KEY，则使用它
    if (!authHeader && WANDB_API_KEY !== "") {
      authHeader = `Bearer ${WANDB_API_KEY}`;
    }
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return addCorsHeaders(
        new Response(JSON.stringify({
          error: {
            message: "Missing or invalid Authorization header. Use Bearer token.",
            type: "invalid_request_error"
          }
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        })
      );
    }

    // 处理聊天完成请求
    return handleChatCompletionsRequest(authHeader, request).then(addCorsHeaders);

  } catch (error) {
    console.error("Server error:", error);
    return addCorsHeaders(internalError(error));
  }
}