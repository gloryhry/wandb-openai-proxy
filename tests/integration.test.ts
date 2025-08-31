import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { handler } from "../main.ts";
import { CONFIG } from "../config.ts";

// 模拟网络响应
const mockFetch = (response: any, ok = true) => {
  return () => Promise.resolve({
    ok,
    json: () => Promise.resolve(response),
    status: ok ? 200 : 400,
    statusText: ok ? "OK" : "Bad Request",
    headers: new Headers(),
    body: null as any,
    clone: () => ({} as any)
  });
};

// 测试工具函数
function createRequest(
  url: string,
  method = "GET",
  body?: any,
  headers: Record<string, string> = {}
): Request {
  return new Request(`http://localhost:8000${url}`, {
    method,
    headers: {
      "Authorization": "Bearer test-token",
      "Content-Type": "application/json",
      ...headers
    },
    body: body ? JSON.stringify(body) : null
  });
}

// 测试中模拟网络请求
const originalFetch = globalThis.fetch;

async function withMock(response: any, test: () => Promise<void>) {
  globalThis.fetch = mockFetch(response) as any;
  try {
    await test();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

Deno.test("根路径访问", async () => {
  const request = createRequest("/", "GET");
  const response = await handler(request);
  assertEquals(response.status, 200);
});

Deno.test("方法限制", async () => {
  const request = createRequest("/v1/chat/completions", "PUT");
  const response = await handler(request);
  assertEquals(response.status, 405);
});

Deno.test("认证检查 - 无授权头", async () => {
  const request = new Request("http://localhost:8000/v1/models");
  const response = await handler(request);
  assertEquals(response.status, 401);
});

Deno.test("路径检查 - 无效路径", async () => {
  const request = createRequest("/invalid", "GET");
  const response = await handler(request);
  assertEquals(response.status, 404);
});

Deno.test("预检请求", async () => {
  const request = new Request("http://localhost:8000/v1/chat/completions", {
    method: "OPTIONS"
  });
  const response = await handler(request);
  assertEquals(response.status, 204);
});

Deno.test("模型列表", async () => {
  await withMock({
    object: "list",
    data: [
      { id: "gpt-4", owned_by: "openai" },
      { id: "gpt-3.5-turbo", owned_by: "openai" }
    ]
  }, async () => {
    const request = createRequest("/v1/models", "GET");
    const response = await handler(request);
    const data = await response.json();
    
    assertEquals(response.status, 200);
    assertEquals(data.object, "list");
    assertEquals(Array.isArray(data.data), true);
    assertEquals(data.data.length, 2);
  });
});

Deno.test("对话完成 - 非流式", async () => {
  await withMock({
    id: "test-123",
    object: "chat.completion",
    created: Date.now(),
    model: "gpt-4",
    choices: [{
      index: 0,
      message: { role: "assistant", content: "Hello test" },
      finish_reason: "stop"
    }],
    usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 }
  }, async () => {
    const request = createRequest("/v1/chat/completions", "POST", {
      model: "gpt-4",
      messages: [{ role: "user", content: "Hello" }]
    });
    
    const response = await handler(request);
    const data = await response.json();
    
    assertEquals(response.status, 200);
    assertEquals(data.object, "chat.completion");
    assertEquals(data.model, "gpt-4");
    assertEquals(Array.isArray(data.choices), true);
  });
});

Deno.test("无效JSON", async () => {
  const request = new Request("http://localhost:8000/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer test-token",
      "Content-Type": "application/json"
    },
    body: "invalid json"
  });
  
  const response = await handler(request);
  assertEquals(response.status, 400);
});

Deno.test("缺少model参数", async () => {
  const request = createRequest("/v1/chat/completions", "POST", {
    messages: [{ role: "user", content: "Hello" }]
  });
  
  const response = await handler(request);
  assertEquals(response.status, 400);
});

Deno.test("缺少messages", async () => {
  const request = createRequest("/v1/chat/completions", "POST", {
    model: "gpt-4"
  });
  
  const response = await handler(request);
  assertEquals(response.status, 400);
});

Deno.test("Content-Type检查", async () => {
  const request = createRequest("/v1/chat/completions", "POST", {}, {
    "Content-Type": "text/plain"
  });
  
  const response = await handler(request);
  assertEquals(response.status, 415);
});