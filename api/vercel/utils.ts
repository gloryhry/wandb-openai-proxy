// Vercel 环境下的配置
export const CONFIG = {
  wandbBaseUrl: "https://api.inference.wandb.ai",
  apiVersion: "/v1",
  cors: {
    origins: ["*"],
    methods: ["GET", "POST", "OPTIONS"],
    headers: ["Content-Type", "Authorization", "User-Agent"]
  }
};

export function addCorsHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  
  newHeaders.set("Access-Control-Allow-Origin", CONFIG.cors.origins[0]);
  newHeaders.set("Access-Control-Allow-Methods", CONFIG.cors.methods.join(", "));
  newHeaders.set("Access-Control-Allow-Headers", CONFIG.cors.headers.join(", "));
  
  if (CONFIG.cors.origins[0] !== "*") {
    newHeaders.set("Vary", "Origin");
  }
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

export function validateAuth(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }
  
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  const token = authHeader.slice(7);
  return token;
}

export function createOptionsResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": CONFIG.cors.origins[0],
      "Access-Control-Allow-Methods": CONFIG.cors.methods.join(", "),
      "Access-Control-Allow-Headers": CONFIG.cors.headers.join(", ")
    }
  });
}

export function methodNotAllowed(): Response {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: {
      "Allow": "GET, POST, OPTIONS"
    }
  });
}

export function notFound(): Response {
  return new Response("Not Found", { status: 404 });
}

export function internalError(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Internal Server Error";
  return new Response(
    JSON.stringify({ error: { message, type: "server_error" } }),
    {
      status: 500,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}