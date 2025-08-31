import { handler } from "../../main.ts";

export default async function ModelsHandler(request: Request, event: any) {
  return await handler(request);
}