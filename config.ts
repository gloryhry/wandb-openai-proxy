export const CONFIG = {
  wandbBaseUrl: "https://api.inference.wandb.ai",
  apiVersion: "/v1",
  cors: {
    origins: ["*"],
    methods: ["GET", "POST", "OPTIONS"],
    headers: ["Content-Type", "Authorization", "User-Agent"]
  }
} as const;

// 在 Vercel 中，您可以通过以下方式设置环境变量：
// 1. 在 Vercel 控制台的项目设置中添加环境变量
// 2. 或者使用 vercel.json 中的 env 字段配置
// 3. 或者在部署时通过命令行参数传递