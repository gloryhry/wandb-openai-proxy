import { handler } from "../../../main.ts";

export default async function ChatCompletionsHandler(request: Request, event: any) {
  return await handler(request);
}