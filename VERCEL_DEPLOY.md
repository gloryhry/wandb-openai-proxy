# 🚀 Vercel 部署指南

本文档将指导您如何将 Wandb OpenAI Proxy 项目一键部署到 Vercel 平台上。

## 📋 部署前准备

1. **注册 Vercel 账户**
   - 访问 [Vercel 官网](https://vercel.com) 并注册账户
   - 完成邮箱验证

2. **获取 Wandb API Key**
   - 登录您的 Wandb 账户
   - 在账户设置中找到 API Key

## 🚀 一键部署方式

### 方法一：通过 GitHub 一键部署（推荐）

1. **Fork 本仓库**
   - 点击页面右上角的 "Fork" 按钮
   - 将项目 Fork 到您的 GitHub 账户

2. **连接 Vercel 和 GitHub**
   - 登录 Vercel 控制台
   - 点击 "New Project"
   - 选择您 Fork 的仓库

3. **配置环境变量**
   - 在项目设置页面，找到 "Environment Variables"
   - 添加以下环境变量：
     - `WANDB_API_KEY`: 您的 Wandb API Key

4. **部署项目**
   - 点击 "Deploy" 按钮
   - 等待部署完成

### 方法二：通过 Vercel CLI 部署

1. **安装 Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **克隆项目**
   ```bash
   git clone https://github.com/your-username/wandb-openai-proxy.git
   cd wandb-openai-proxy
   ```

3. **登录 Vercel**
   ```bash
   vercel login
   ```

4. **部署项目**
   ```bash
   vercel --env WANDB_API_KEY=your_wandb_api_key_here
   ```

## ⚙️ 环境变量配置

在 Vercel 中，您可以选择配置以下环境变量：

| 变量名 | 必需 | 说明 |
|--------|------|------|
| `WANDB_API_KEY` | ❌ | 您的 Wandb API 密钥，用于认证（可选，也可在请求时通过 Authorization 头提供） |

## 🧪 测试部署

部署完成后，您可以使用以下命令测试您的 API：

### 获取模型列表
```bash
# 如果设置了 WANDB_API_KEY 环境变量
curl https://your-project-url.vercel.app/v1/models

# 如果没有设置环境变量，需要提供 API Key
curl https://your-project-url.vercel.app/v1/models \
  -H "Authorization: Bearer your_wandb_api_key"
```

### 聊天完成 - 非流式响应
```bash
# 如果设置了 WANDB_API_KEY 环境变量
curl https://your-project-url.vercel.app/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "解释一下机器学习中的过拟合问题"}
    ],
    "max_tokens": 500,
    "temperature": 0.7
  }'

# 如果没有设置环境变量，需要提供 API Key
curl https://your-project-url.vercel.app/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_wandb_api_key" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "解释一下机器学习中的过拟合问题"}
    ],
    "max_tokens": 500,
    "temperature": 0.7
  }'
```

### 聊天完成 - 流式响应
```bash
# 如果设置了 WANDB_API_KEY 环境变量
curl https://your-project-url.vercel.app/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "你好，请介绍一下你自己"}
    ],
    "max_tokens": 100,
    "stream": true
  }'

# 如果没有设置环境变量，需要提供 API Key
curl https://your-project-url.vercel.app/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_wandb_api_key" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "你好，请介绍一下你自己"}
    ],
    "max_tokens": 100,
    "stream": true
  }'
```

## 🔄 与 Deno Deploy 的兼容性

本项目同时支持 Deno Deploy 和 Vercel 部署：

- **Deno Deploy**: 保持原有的部署方式，通过 `deployctl` 部署
- **Vercel**: 通过 Vercel Edge Functions 运行

两种部署方式功能完全一致，您可以根据需要选择合适的平台。

## 📞 支持与贡献

如果您在部署过程中遇到任何问题，请通过以下方式获得支持：

- 🐛 **问题反馈**: 在 GitHub Issues 中提交问题
- 💡 **功能建议**: 在 Discussions 中提出想法
- 🔧 **代码贡献**: 提交 Pull Request

## 📝 注意事项

1. **CORS 设置**: 项目默认允许所有来源的请求，如需限制，请修改 `config.ts` 中的 CORS 配置
2. **API 限制**: 请遵守 Wandb 的 API 使用限制
3. **费用**: 请了解 Vercel 的免费额度和付费计划

部署成功后，您将获得一个类似于 `https://your-project-name.vercel.app` 的 URL，可以用于访问您的 API 服务。