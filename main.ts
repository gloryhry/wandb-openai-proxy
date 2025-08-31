import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { handleRootRequest, handleModelsRequest, handleChatCompletionsRequest } from "./src/handlers.ts";
import {
  addCorsHeaders,
  validateAuth,
  methodNotAllowed,
  notFound,
  internalError,
  createOptionsResponse
} from "./src/utils.ts";

const PORT = Deno.env.get("PORT") || 8000;
const WANDB_API_KEY = Deno.env.get("WANDB_API_KEY");

export async function handler(request: Request): Promise<Response> {
  try {
    // 处理预检请求
    if (request.method === "OPTIONS") {
      return createOptionsResponse();
    }

    // 处理基本HTTP方法限制
    if (request.method !== "GET" && request.method !== "POST") {
      return addCorsHeaders(methodNotAllowed());
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    // 路由分发 - 根路径不需要认证
    if (pathname === "/" && request.method === "GET") {
      return handleRootRequest();
    }

    // 其他路径需要认证
    let authHeader = request.headers.get("Authorization");
    
    // 如果环境变量设置了WANDB_API_KEY，则使用它
    if (!authHeader && WANDB_API_KEY) {
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

    // 处理其他路由
    if (pathname === "/v1/models" && request.method === "GET") {
      return handleModelsRequest(authHeader, request).then(addCorsHeaders);
    } else if (pathname === "/v1/chat/completions" && request.method === "POST") {
      return handleChatCompletionsRequest(authHeader, request).then(addCorsHeaders);
    } else {
      return addCorsHeaders(notFound());
    }

  } catch (error) {
    console.error("Server error:", error);
    return addCorsHeaders(internalError(error));
  }
}

// Deno Deploy适配
if (import.meta.main) {
  console.log(`Server running on http://localhost:${PORT}`);
  
  if (!WANDB_API_KEY) {
    console.warn(`⚠️  WARNING: WANDB_API_KEY environment variable is not set.`);
    console.warn(`   You must provide Authorization header with requests.`);
  } else {
    console.log(`✅ Using WANDB_API_KEY from environment`);
  }

  serve(handler, { 
    port: typeof PORT === "string" ? parseInt(PORT) : PORT,
    onListen: ({ port }) => {
      console.log(`🚀 Deno server listening on port ${port}`);
    }
  });
}

// Deno Deploy入口点
export default handler;