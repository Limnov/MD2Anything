# API 文档

本文档详细描述 MD2Anything API 的所有端点、请求格式和响应格式。

## 基础信息

- **基础 URL**: `http://localhost:3001`
- **内容类型**: `application/json`
- **字符编码**: `UTF-8`

## 端点概览

| 端点 | 方法 | 描述 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/api` | GET | API 文档 |
| `/api/convert/html` | POST | 转换为带样式的 HTML |
| `/api/convert/email` | POST | 转换为邮件兼容 HTML |
| `/api/convert/wechat` | POST | 转换为微信兼容 HTML |
| `/api/convert/plain` | POST | 转换为纯 HTML |
| `/api/convert/templates` | GET | 获取所有模板列表 |

---

## 详细端点说明

### 健康检查

```http
GET /health
```

检查 API 服务是否正常运行。

**响应示例**：

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

---

### API 文档

```http
GET /api
```

获取 API 文档信息。

**响应示例**：

```json
{
  "name": "MD2Anything API",
  "version": "1.0.0",
  "endpoints": {
    "POST /api/convert/html": "Convert Markdown to styled HTML",
    "POST /api/convert/email": "Convert Markdown to email-compatible HTML",
    "POST /api/convert/wechat": "Convert Markdown to WeChat-compatible HTML",
    "POST /api/convert/plain": "Convert Markdown to plain HTML",
    "GET /api/convert/templates": "Get all available templates"
  }
}
```

---

### 获取模板列表

```http
GET /api/convert/templates
```

获取所有可用的模板。

**响应示例**：

```json
{
  "success": true,
  "data": [
    {
      "id": "general-modern",
      "name": "现代简约",
      "format": "general",
      "description": "简洁现代的风格",
      "themeColors": ["#1a1a1a", "#1677ff", "#f5f5f5"]
    },
    {
      "id": "wechat-tech",
      "name": "技术文章",
      "format": "wechat",
      "description": "适合技术博客",
      "themeColors": ["#24292e", "#0366d6", "#f6f8fa"]
    }
  ]
}
```

---

### 转换为 HTML

```http
POST /api/convert/html
```

将 Markdown 转换为带样式的完整 HTML 文档。

**请求体**：

```json
{
  "markdown": "string",        // 必填，Markdown 内容
  "templateId": "string",      // 可选，模板 ID，默认 "general-modern"
  "fontSize": 16,              // 可选，字体大小，默认 16
  "margin": 24,                // 可选，边距，默认 24
  "backgroundColor": "#ffffff" // 可选，背景颜色，默认 #ffffff
}
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "html": "<!DOCTYPE html>...",
    "template": {
      "id": "general-modern",
      "name": "现代简约"
    }
  }
}
```

---

### 转换为邮件 HTML

```http
POST /api/convert/email
```

将 Markdown 转换为邮件兼容的 HTML（使用 table 布局和内联样式）。

**请求体**：

```json
{
  "markdown": "string",        // 必填
  "templateId": "string",      // 可选，默认 "email-business"
  "fontSize": 16,              // 可选
  "backgroundColor": "#ffffff" // 可选
}
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "html": "<!DOCTYPE html>...",
    "template": {
      "id": "email-business",
      "name": "商务简约"
    }
  }
}
```

---

### 转换为微信 HTML

```http
POST /api/convert/wechat
```

将 Markdown 转换为微信兼容的 HTML（使用内联样式，可直接粘贴）。

**请求体**：

```json
{
  "markdown": "string",  // 必填
  "templateId": "string", // 可选，默认 "wechat-tech"
  "fontSize": 15,         // 可选
  "margin": 24            // 可选
}
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "html": "<div style=\"...\">...</div>",
    "template": {
      "id": "wechat-tech",
      "name": "技术文章"
    }
  }
}
```

---

### 转换为纯 HTML

```http
POST /api/convert/plain
```

将 Markdown 转换为不带样式的纯 HTML。

**请求体**：

```json
{
  "markdown": "string" // 必填
}
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "html": "<h1>...</h1><p>...</p>"
  }
}
```

---

## 错误响应

当请求失败时，API 会返回以下格式的错误信息：

```json
{
  "success": false,
  "error": "错误描述",
  "message": "详细错误信息（可选）"
}
```

### 常见错误码

| HTTP 状态码 | 描述 |
|------------|------|
| 400 | 请求参数错误 |
| 404 | 端点不存在 |
| 500 | 服务器内部错误 |

---

## 请求示例

### cURL

```bash
# 获取模板列表
curl http://localhost:3001/api/convert/templates

# 转换 Markdown 为 HTML
curl -X POST http://localhost:3001/api/convert/html \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# Hello World\n\nThis is a **test**.",
    "templateId": "general-modern",
    "fontSize": 16
  }'

# 转换为微信格式
curl -X POST http://localhost:3001/api/convert/wechat \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# 标题\n\n这是内容。",
    "templateId": "wechat-tech"
  }'
```

### JavaScript (fetch)

```javascript
// 获取模板列表
const templates = await fetch('http://localhost:3001/api/convert/templates')
  .then(res => res.json());

// 转换 Markdown
const response = await fetch('http://localhost:3001/api/convert/html', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    markdown: '# Hello\n\nWorld',
    templateId: 'general-modern',
    fontSize: 16
  })
}).then(res => res.json());

console.log(response.data.html);
```

### Python (requests)

```python
import requests

# 获取模板列表
response = requests.get('http://localhost:3001/api/convert/templates')
templates = response.json()

# 转换 Markdown
response = requests.post('http://localhost:3001/api/convert/html', json={
    'markdown': '# Hello\n\nWorld',
    'templateId': 'general-modern',
    'fontSize': 16
})
result = response.json()
print(result['data']['html'])
```

---

## 可用模板 ID

### 通用模板

| ID | 名称 | 描述 |
|----|------|------|
| `general-modern` | 现代简约 | 简洁现代的黑白灰配色 |
| `general-ocean` | 深海蓝 | 深邃优雅的蓝色主题 |
| `general-forest` | 森林绿 | 清新自然的绿色主题 |
| `general-vintage` | 复古书卷 | 典雅复古的书籍风格 |
| `general-purple` | 星空紫 | 神秘优雅的紫色主题 |
| `general-dark` | 暗夜黑 | 护眼舒适的深色主题 |

### 微信模板

| ID | 名称 | 描述 |
|----|------|------|
| `wechat-tech` | 技术文章 | 适合技术博客、代码教程 |
| `wechat-story` | 情感故事 | 适合散文、故事、情感类文章 |
| `wechat-news` | 新闻资讯 | 适合新闻、公告、快讯 |
| `wechat-product` | 产品介绍 | 适合产品发布、功能介绍 |
| `wechat-tutorial` | 教程指南 | 适合操作教程、步骤说明 |
| `wechat-business` | 商务报告 | 适合商业分析、工作汇报 |
| `wechat-lifestyle` | 生活分享 | 适合日常、旅行、美食分享 |
| `wechat-dark` | 暗夜模式 | 护眼暗色主题 |

### 邮件模板

| ID | 名称 | 描述 |
|----|------|------|
| `email-business` | 商务简约 | 专业商务邮件风格 |
| `email-newsletter` | 新闻简报 | 适合邮件简报、周刊 |
| `email-marketing` | 营销推广 | 适合产品推广、营销活动 |
| `email-warm` | 温馨问候 | 适合节日问候、感谢信 |
| `email-minimal` | 极简清新 | 简洁现代，适合日常邮件 |

---

## 限制

- **请求体大小**：最大 10MB
- **请求超时**：30 秒
- **并发限制**：无限制（本地部署）
- **安全限制**：服务端会复用统一 Markdown 渲染与清洗逻辑，危险标签、事件属性和 `javascript:` 等协议会被过滤；手工回归用例见 [SECURITY_REGRESSION.md](./SECURITY_REGRESSION.md)

---

## 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0.0 | 2024-01 | 初始版本 |
