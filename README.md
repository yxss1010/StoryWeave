# StoryWeave - 故事编织者

一个现代化的小说大纲管理工具，帮助作者以可视化流程图的方式规划和管理小说的卷、幕、场景结构。同时提供 MCP 服务和 AI Agent，让用户能够基于灵感自动生成结构化大纲。**AI 创作与手动编辑合而为一**，在同一个编辑器中无缝切换。

## 功能特性

### 书籍管理

- 卡片式书架展示，一目了然
- 创建新小说，支持自定义封面图上传
- 删除书籍时二次确认，防止误操作
- 按最后修改时间自动排序
- 数据持久化存储于服务端 JSON 文件

### 大纲流程图编辑

- 三层节点结构：**卷 → 幕 → 场景**，清晰呈现故事架构
- 可视化拖拽画布，自由排列节点位置
- 节点连线规则约束：卷只能连幕，幕只能连场景
- 一键自动排列（基于 dagre 算法），快速整理布局
- 侧边编辑面板，实时编辑节点属性
- 删除节点时二次确认弹窗
- 画布缩放、平移、小地图导航
- 自动保存，编辑即保存

### AI 创作助手（集成于编辑器）

- **统一交互**：AI 聊天面板直接嵌入编辑器，无需切换应用
- **四阶段工作流**：灵感解析 → 创建书籍 → 构建大纲 → 校验优化
- **SSE 流式输出**：实时显示 AI 生成内容，工具调用可视化
- **GLM-5 大模型驱动**：通过 Anthropic 兼容协议接入
- **MCP 协议集成**：Agent 自动调用 MCP Tools 完成大纲创建
- **快速灵感模板**：三幕式/英雄之旅/自由灵感一键启动
- **多轮对话**：支持设定调整、大纲修改等交互式创作
- **对话持久化**：基于 IndexedDB (Dexie) 按书籍存储对话历史，刷新/重启后自动恢复
- **Markdown 渲染**：AI 回复完整支持 Markdown 格式（标题、列表、代码块、表格、引用等）
- **一键切换**：点击 ✨ 按钮即可打开/关闭 AI 面板，手动编辑与 AI 创作自由切换

### MCP 服务（供 AI Agent 使用）

- **14 个 MCP Tools**：完整的书籍和节点 CRUD 操作，包括批量创建大纲
- **6 个 MCP Resources**：暴露书籍列表、大纲数据、结构模板等资源
- **4 个 MCP Prompts**：大纲分析、场景建议、故事梗概生成、灵感转大纲
- **HTTP API 服务器**：供 UI 前端调用的 RESTful 接口
- **共享数据层**：MCP 服务与 UI 前端操作同一数据源，Agent 创建的大纲在 UI 中实时可见

### 节点类型

| 类型 | 图标 | 颜色标识 | 属性 |
|------|------|----------|------|
| 卷 | 📚 | 琥珀色 | 标题、卷次、转变前后、卷概要 |
| 幕 | 🎭 | 紫色 | 标题、幕次（1/2/3）、所属卷、转变前后、核心冲突 |
| 场景 | 🎬 | 青色 | 标题、所属幕、转变前后、地点、人物列表 |

## 技术栈

### 前端

- **Vue 3** — Composition API + `<script setup>` + TypeScript
- **Vue Flow** — 流程图可视化与交互
- **Dagre** — 自动布局算法
- **Dexie** — IndexedDB 封装，对话历史持久化
- **Marked** — Markdown 解析渲染
- **Lucide Vue Next** — 图标库
- **Tailwind CSS 4** — 原子化样式
- **Vite** — 构建工具

### MCP 服务端

- **Node.js** — 运行时
- **TypeScript** — 类型安全
- **@modelcontextprotocol/sdk** — MCP 协议 SDK
- **Express** — HTTP API 服务器
- **Zod** — 参数校验

### AI Agent

- **Python 3.12+** — 运行时
- **FastAPI** — Agent HTTP API 服务（SSE 流式推送）
- **Uvicorn** — ASGI 服务器
- **LangChain** — LLM 应用框架
- **LangGraph** — ReAct Agent 构建
- **langchain-anthropic** — Anthropic 协议适配（接入 GLM-5）
- **langchain-mcp-adapters** — MCP 协议适配

## 项目结构

```
story-weave/
├── src/                           # 前端源码
│   ├── App.vue                    # 主应用组件（书架/编辑器视图切换 + AI 面板）
│   ├── main.ts                    # 入口文件
│   ├── style.css                  # 全局样式与 CSS 变量
│   ├── components/
│   │   ├── BookshelfView.vue      # 书架页面
│   │   ├── NovelCard.vue          # 书籍卡片组件
│   │   ├── CreateNovelModal.vue   # 新建小说弹窗
│   │   ├── ConfirmModal.vue       # 确认弹窗（删除等操作）
│   │   ├── PlotNode.vue           # 流程图节点组件（卷/幕/场景）
│   │   ├── EditorPanel.vue        # 节点编辑侧边面板
│   │   └── AiPanel.vue            # AI 创作助手聊天面板
│   ├── composables/
│   │   ├── useNovels.ts           # 书籍数据管理 composable
│   │   └── useAiChat.ts           # AI 对话状态管理 + Dexie 持久化
│   └── services/
│       ├── tauri.ts               # 数据持久化服务（HTTP API 实现）
│       └── agent.ts               # AI Agent SSE 流式通信服务
├── mcp-server/                    # MCP 服务端
│   ├── src/
│   │   ├── index.ts               # MCP Server 入口（stdio 传输）
│   │   ├── api-server.ts          # HTTP API 服务器（供 UI 调用）
│   │   ├── storage.ts             # 数据存储层（JSON 文件读写）
│   │   ├── tools.ts               # MCP Tools 定义
│   │   ├── resources.ts           # MCP Resources 定义
│   │   └── prompts.ts             # MCP Prompts 定义
│   ├── dist/                      # 编译输出
│   ├── package.json
│   └── tsconfig.json
├── agent/                         # AI Agent
│   ├── __init__.py                # 包初始化
│   ├── config.py                  # LLM 配置、MCP 连接配置、系统提示词
│   ├── agent.py                   # Agent 核心逻辑（LangChain + MCP + LangGraph）
│   ├── server.py                  # FastAPI 服务端（SSE 流式推送 + REST API）
│   └── requirements.txt           # Python 依赖
├── .mcp.json                      # MCP 服务配置
├── vite.config.ts                 # Vite 配置（含 API 代理）
└── package.json
```

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9
- Python >= 3.12

### 安装依赖

```bash
# 安装前端依赖
npm install

# 安装 MCP 服务端依赖
cd mcp-server
npm install
cd ..

# 安装 AI Agent 依赖
pip install -r agent/requirements.txt
```

### 启动开发环境

需要启动三个服务（分别在三个终端中运行）：

```bash
# 终端 1：启动 MCP HTTP API 服务器（数据层）
cd mcp-server
npm run api

# 终端 2：启动 AI Agent FastAPI 服务
python -m agent.server

# 终端 3：启动前端开发服务器
npm run dev
```

> **Windows PowerShell 注意**：PowerShell 5.x 不支持 `&&` 语法，请将 `cd xxx && command` 拆分为两行分别执行，或升级到 PowerShell 7+。上例已采用分行写法，可直接使用。

前端开发服务器会自动将请求代理到对应后端：
- `/api/agent/*` → `http://localhost:8000`（AI Agent 服务）
- `/api/*` → `http://localhost:3001`（MCP HTTP API 服务）

### 构建生产版本

```bash
# 构建前端
npm run build

# 构建 MCP 服务端
cd mcp-server
npm run build
```

## MCP 服务详解

### 架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           StoryWeave                                    │
│                                                                         │
│  ┌──────────────┐    MCP/stdio    ┌──────────────┐                     │
│  │  AI Agent    │ ◄─────────────► │  MCP Server  │                     │
│  │  (Python)    │                 │  (Node.js)   │                     │
│  │  LangChain   │                 │  Tools × 14  │                     │
│  │  LangGraph   │                 │  Resources×6 │                     │
│  │  FastAPI     │                 │  Prompts × 4 │                     │
│  └──────┬───────┘                 └──────┬───────┘                     │
│         │ SSE 流式推送                     │                             │
│         │                                │ JSON 文件读写                │
│  ┌──────┴───────┐    REST API     ┌──────┴───────┐                     │
│  │  Vue 前端    │ ◄─────────────► │  HTTP API    │                     │
│  │  (Vite)      │                 │  Server      │                     │
│  │  AiPanel     │                 │              │                     │
│  └──────────────┘                 └──────────────┘                     │
│                                                                         │
│                        共享数据存储 (JSON)                               │
└─────────────────────────────────────────────────────────────────────────┘
```

MCP Server 和 HTTP API Server 共享同一套数据存储层，确保 Agent 和 UI 操作的数据完全一致。AI Agent 通过 FastAPI 提供 SSE 流式接口，Vue 前端的 AiPanel 组件直接消费该接口，实现统一的创作体验。

### MCP Tools（14 个）

#### 书籍管理

| 工具名 | 说明 |
|--------|------|
| `create_book` | 创建新小说 |
| `list_books` | 列出所有小说 |
| `get_book` | 获取指定小说详情 |
| `update_book` | 更新小说元信息 |
| `delete_book` | 删除小说及大纲数据 |

#### 节点操作

| 工具名 | 说明 |
|--------|------|
| `add_node` | 添加节点（卷/幕/场景），可自动连线 |
| `list_nodes` | 列出节点，可按类型筛选 |
| `update_node` | 更新节点属性 |
| `delete_node` | 删除节点及关联连线 |
| `connect_nodes` | 连接两个节点 |
| `disconnect_nodes` | 断开节点连接 |

#### 大纲操作

| 工具名 | 说明 |
|--------|------|
| `get_outline` | 获取大纲树结构（卷→幕→场景层级） |
| `validate_outline` | 校验大纲完整性和一致性 |
| `batch_create_outline` | 批量创建完整大纲结构（最高效方式） |

### MCP Resources（6 个）

| URI | 说明 |
|-----|------|
| `storyweave://books` | 所有书籍列表 |
| `storyweave://books/{bookId}` | 指定书籍详情 |
| `storyweave://books/{bookId}/outline` | 大纲原始数据（节点+边） |
| `storyweave://books/{bookId}/tree` | 大纲树结构 |
| `storyweave://templates/three-act` | 三幕式结构模板 |
| `storyweave://templates/hero-journey` | 英雄之旅模板 |

### MCP Prompts（4 个）

| 提示名 | 说明 |
|--------|------|
| `analyze_plot` | 分析大纲结构，发现薄弱环节并提供改进建议 |
| `suggest_scenes` | 根据现有幕结构，建议补充缺失的场景 |
| `generate_synopsis` | 基于大纲生成故事梗概 |
| `create_outline_from_idea` | 根据灵感描述创建完整小说大纲 |

### 配置 MCP 客户端

在支持 MCP 的客户端（如 Claude Desktop、Cursor 等）中添加以下配置：

```json
{
  "mcpServers": {
    "storyweave": {
      "command": "node",
      "args": ["dist/index.js"],
      "cwd": "/path/to/story-weave/mcp-server",
      "env": {
        "STORYWEAVE_DATA_DIR": "/path/to/story-weave/data"
      }
    }
  }
}
```

### HTTP API 接口

API 服务器默认运行在 `http://localhost:3001`，可通过环境变量 `STORYWEAVE_API_PORT` 修改端口。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/books` | 获取书籍列表 |
| POST | `/api/books` | 创建新小说 |
| GET | `/api/books/:bookId` | 获取书籍详情 |
| PUT | `/api/books/:bookId` | 更新书籍信息 |
| DELETE | `/api/books/:bookId` | 删除书籍 |
| GET | `/api/books/:bookId/outline` | 获取大纲数据 |
| PUT | `/api/books/:bookId/outline` | 保存大纲数据 |
| GET | `/api/books/:bookId/outline/tree` | 获取大纲树结构 |
| GET | `/api/books/:bookId/outline/validate` | 校验大纲完整性 |
| POST | `/api/books/:bookId/nodes` | 添加节点 |
| PUT | `/api/books/:bookId/nodes/:nodeId` | 更新节点 |
| DELETE | `/api/books/:bookId/nodes/:nodeId` | 删除节点 |
| POST | `/api/books/:bookId/edges` | 连接节点 |
| DELETE | `/api/books/:bookId/edges` | 断开节点连接 |
| GET | `/api/health` | 健康检查 |

### Agent API 接口

Agent FastAPI 服务默认运行在 `http://localhost:8000`，可通过环境变量 `AGENT_PORT` 修改端口。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/agent/health` | 健康检查 |
| POST | `/api/agent/chat` | 同步聊天（返回完整响应） |
| POST | `/api/agent/chat/stream` | SSE 流式聊天（实时推送文本和工具调用事件） |

## AI Agent 详解

### 工作流程

Agent 采用四阶段工作流，严格按顺序执行：

```
用户灵感
   │
   ▼
┌──────────────────────────────┐
│  阶段一：灵感解析（纯 LLM）   │  无工具调用
│  输出：核心前提、世界观、     │
│  人物、主题、推荐结构         │
└──────────┬───────────────────┘
           │ 用户确认
           ▼
┌──────────────────────────────┐
│  阶段二：创建书籍 + 读模板    │  MCP Tools: create_book
│                              │  MCP Resource: templates/*
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  阶段三：批量构建大纲         │  MCP Tool: batch_create_outline
│  输出：完整卷→幕→场景树      │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  阶段四：校验与优化           │  MCP Tools: validate_outline
│  输出：最终大纲摘要           │  MCP Tools: get_outline, update_node
└──────────────────────────────┘
```

### 模块说明

| 文件 | 职责 |
|------|------|
| `agent/config.py` | GLM-5 模型配置、MCP Server 连接配置、系统提示词（四阶段工作流） |
| `agent/agent.py` | `StoryWeaveAgent` 类：MCP 客户端管理、Agent 创建、流式输出、工具调用可视化 |
| `agent/server.py` | FastAPI 服务端：SSE 流式推送、REST API、CORS 支持、Agent 生命周期管理 |

### 模型配置

| 配置项 | 值 |
|--------|-----|
| 模型 | GLM-5 (`astron-code-latest`) |
| API 端点 | `https://maas-coding-api.cn-huabei-1.xf-yun.com/anthropic` |
| 协议 | Anthropic 兼容 |
| 接入方式 | `langchain-anthropic` → `ChatAnthropic` |

### 大纲质量标准

Agent 生成的大纲必须满足以下标准：

- 每卷包含 3 个幕（act_number 分别为 1、2、3）
- 第一幕至少 3 个场景，第二幕至少 4 个场景，第三幕至少 3 个场景
- 每个场景必须有明确的 `change_before` 和 `change_after`，形成转变弧线
- 幕与幕之间的冲突必须层层递进
- 关键人物在各场景中合理出现，不可凭空消失
- 场景地点需具体，不可使用模糊描述

### 自定义模型

如需切换为其他模型，修改 `agent/config.py` 中的配置：

```python
# 切换为 OpenAI
GLM_MODEL_ID = "gpt-4o"
GLM_ANTHROPIC_URL = "https://api.openai.com/v1"

# 切换为其他 Anthropic 兼容端点
GLM_MODEL_ID = "your-model-id"
GLM_ANTHROPIC_URL = "https://your-api-endpoint/anthropic"
```

同时在 `agent/agent.py` 中将 `ChatAnthropic` 替换为对应的 LangChain Chat 类。

## 使用指南

### 创建小说

1. 在书架页面点击「新建小说」按钮
2. 输入小说名称，可选择上传封面图
3. 点击确认创建

### 编辑大纲

1. 在书架页面点击任意书籍卡片进入编辑器
2. 使用左侧工具栏添加卷、幕、场景节点
3. 从节点底部连接点拖拽到另一节点顶部建立层级关系
4. 点击节点打开右侧编辑面板，修改节点属性
5. 点击「自动排列」一键整理布局

### 使用 AI 创作助手

1. 在编辑器页面点击右上角 ✨ 按钮打开 AI 面板
2. 在聊天框中输入你的小说灵感，或点击快速灵感模板
3. Agent 会先生成小说设定（世界观、人物、主题），确认后自动创建大纲
4. AI 创建的大纲会通过 MCP 服务写入数据层，刷新编辑器即可看到流程图展示
5. 可以随时在 AI 面板中继续对话，调整大纲内容
6. 点击 ✨ 按钮关闭 AI 面板，回到手动编辑模式

### 编辑节点属性

- **卷**：设置标题、卷次、转变前后状态、卷概要
- **幕**：设置标题、幕次、所属卷、转变前后状态、核心冲突
- **场景**：设置标题、所属幕、转变前后状态、地点、人物（回车添加）

### 删除节点

- 在编辑面板中点击「删除节点」按钮
- 或选中节点后按 Delete / Backspace 键
- 均会弹出确认弹窗，确认后删除

### 使用 MCP 客户端生成大纲

1. 启动 API 服务器和 MCP 服务
2. 在 MCP 客户端中配置 StoryWeave 服务
3. 向 Agent 描述你的小说灵感
4. Agent 将调用 `create_outline_from_idea` 提示模板，自动创建完整的卷→幕→场景大纲
5. 在 UI 中打开对应书籍，即可看到流程图式的大纲展示

## 设计规范

### 配色方案

| 用途 | 色值 | 说明 |
|------|------|------|
| 主色 | `#4f46e5` | 按钮、选中态、强调元素 |
| 主色悬停 | `#4338ca` | 按钮悬停态 |
| 背景 | `#f5f5f7` | 页面背景 |
| 卡片 | `#ffffff` | 卡片、面板背景 |
| 卷标识 | `#f59e0b` | 琥珀色 |
| 幕标识 | `#8b5cf6` | 紫色 |
| 场景标识 | `#06b6d4` | 青色 |
| 危险操作 | `#ef4444` | 删除按钮、错误提示 |

### 交互规范

- 圆角统一 12px
- 过渡动画 0.2s ease
- 删除操作均需二次确认
- 表单聚焦时显示主色边框和浅色光晕
