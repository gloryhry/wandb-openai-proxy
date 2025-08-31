import {
  OpenAIChatCompletionRequest,
  OpenAICompletionResponse,
  WandBCompletionResponse,
  WandBStreamResponse,
  ModelListResponse
} from "./types.ts";
import {
  transformNonStreamResponse,
  transformStreamChunk,
  transformModelList,
  buildWandBRequest
} from "./transformers.ts";
import { CONFIG } from "../config.ts";

// 简单的 Markdown 到 HTML 转换函数
function markdownToHtml(markdown: string): string {
  // 简单的转换规则
  let html = markdown
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
    .replace(/^###### (.*$)/gim, '<h6>$1</h6>')
    .replace(/^\*\*([^*].*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/^\*([^*].*?)\*/gim, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
    .replace(/^> (.*$)/gim, '<blockquote><p>$1</p></blockquote>')
    .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
    .replace(/^\d+\. (.*$)/gim, '<ol><li>$1</li></ol>')
    .replace(/\n\n/gim, '</p><p>')
    .replace(/\n/gim, '<br />');
  
  // 处理代码块
  html = html.replace(/```([a-z]*)\n([\s\S]*?)```/gim, '<pre><code class="language-$1">$2</code></pre>');
  
  // 处理行内代码
  html = html.replace(/`([^`]+)`/gim, '<code>$1</code>');
  
  return `<p>${html}</p>`;
}

// 创建 HTML 页面模板
function createHtmlPage(content: string): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wandb OpenAI Proxy</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { color: #2c3e50; }
    code { background-color: #f4f4f4; padding: 2px 4px; border-radius: 3px; font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; }
    pre { background-color: #f4f4f4; padding: 12px; border-radius: 5px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #ddd; padding: 0 15px; color: #777; }
    a { color: #3498db; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;
}

export async function handleRootRequest(): Promise<Response> {
  try {
    // 读取 README.md 文件
    const readmeContent = await Deno.readTextFile("./README.md");
    
    // 转换 Markdown 为 HTML
    const htmlContent = markdownToHtml(readmeContent);
    
    // 创建完整 HTML 页面
    const htmlPage = createHtmlPage(htmlContent);
    
    return new Response(htmlPage, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8"
      }
    });
  } catch (error) {
    console.error("Error reading README.md:", error);
    return new Response("Unable to load README.md", { status: 500 });
  }
}

export async function handleModelsRequest(
  authHeader: string,
  request: Request
): Promise<Response> {
  try {
    const resp = await fetch(`${CONFIG.wandbBaseUrl}/v1/models`, {
      headers: {
        "Authorization": authHeader,
        "User-Agent": "Deno-WandB-OpenAI-Proxy/1.0"
      }
    });

    if (!resp.ok) {
      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: resp.headers
      });
    }

    const wandbModels = await resp.json();
    const standardized = transformModelList(wandbModels.data || []);

    return new Response(JSON.stringify(standardized), {
      status: resp.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600"
      }
    });
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}

export async function handleChatCompletionsRequest(
  authHeader: string,
  request: Request
): Promise<Response> {
  const contentType = request.headers.get("Content-Type");
  if (!contentType || !contentType.includes("application/json")) {
    return createErrorResponse(
      "Unsupported Media Type, expected application/json",
      415
    );
  }

  let originalRequestBody;
  try {
    originalRequestBody = await request.json();
  } catch (e) {
    return createErrorResponse("Invalid JSON", 400);
  }

  if (!originalRequestBody.model) {
    return createErrorResponse("Missing required field: model", 400);
  }

  if (!Array.isArray(originalRequestBody.messages) && !originalRequestBody.prompt) {
    return createErrorResponse("Missing messages or prompt field", 400);
  }

  const wandbRequestBody = buildWandBRequest(originalRequestBody);

  if (originalRequestBody.stream) {
    return handleStreamRequest(wandbRequestBody, authHeader);
  }

  return handleNonStreamRequest(wandbRequestBody, authHeader, originalRequestBody.model);
}

async function handleNonStreamRequest(
  wandbRequestBody: any,
  authHeader: string,
  originalModel: string
): Promise<Response> {
  try {
    const resp = await fetch(`${CONFIG.wandbBaseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
        "User-Agent": "Deno-WandB-OpenAI-Proxy/1.0"
      },
      body: JSON.stringify(wandbRequestBody)
    });

    if (!resp.ok) {
      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: resp.headers
      });
    }

    const wandbResponse = await resp.json() as WandBCompletionResponse;
    const standardized = transformNonStreamResponse(wandbResponse, originalModel);

    return new Response(JSON.stringify(standardized), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache"
      }
    });
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}

async function handleStreamRequest(
  wandbRequestBody: any,
  authHeader: string
): Promise<Response> {
  try {
    const upstreamResponse = await fetch(`${CONFIG.wandbBaseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authHeader,
        "User-Agent": "Deno-WandB-OpenAI-Proxy/1.0"
      },
      body: JSON.stringify(wandbRequestBody)
    });

    if (!upstreamResponse.ok) {
      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: upstreamResponse.headers
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    return new Response(
      new ReadableStream({
        async start(controller) {
          const reader = upstreamResponse.body!.getReader();
          let buffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });

              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (line.trim() === "") continue;
                
                if (line.trim() === "data: [DONE]") {
                  controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                  continue;
                }

                if (line.startsWith("data:")) {
                  try {
                    const raw = JSON.parse(line.slice(5));
                    const std = transformStreamChunk(raw, wandbRequestBody.model);
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify(std)}\n\n`)
                    );
                  } catch (e) {
                    console.warn("Parse stream error:", e);
                    continue;
                  }
                } else {
                  controller.enqueue(encoder.encode(line + "\n"));
                }
              }
            }

            if (buffer.includes("[DONE]")) {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            }
          } catch (err) {
            console.error("Stream transform error:", err);
          } finally {
            controller.close();
            reader.releaseLock();
          }
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no"
        }
      }
    );
  } catch (error) {
    return createErrorResponse(error, 500);
  }
}

function createErrorResponse(error: unknown, status: number): Response {
  const message = error instanceof Error ? error.message : String(error);
  return new Response(
    JSON.stringify({ 
      error: { 
        message, 
        type: "api_error" 
      } 
    }),
    {
      status,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}