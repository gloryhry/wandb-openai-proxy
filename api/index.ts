import { handleRootRequest, handleModelsRequest, handleChatCompletionsRequest } from "./vercel/handlers";
import { addCorsHeaders, createOptionsResponse, methodNotAllowed, notFound, internalError } from "./vercel/utils";

const WANDB_API_KEY = process.env.WANDB_API_KEY || "";

export default async function IndexHandler(request: Request): Promise<Response> {
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