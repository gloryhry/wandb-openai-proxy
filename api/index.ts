import { handler } from "../main.ts";

export default async function IndexHandler(request: Request, event: any) {
  return await handler(request);
}