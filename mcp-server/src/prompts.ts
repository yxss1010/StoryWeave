import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerPrompts(server: McpServer): void {
  server.prompt(
    'analyze_plot',
    '分析小说大纲结构，发现薄弱环节并提供改进建议',
    { bookId: z.string().describe('书籍 ID') },
    async ({ bookId }) => {
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `请分析 ID 为「${bookId}」的小说大纲结构。

请先使用 get_outline 工具获取完整大纲树，然后使用 validate_outline 工具校验完整性。

基于获取的数据，请从以下维度进行分析：

1. **结构完整性**：是否缺少卷/幕/场景，是否有孤立节点
2. **节奏平衡**：各卷/幕的场景数量是否均衡，是否存在过长或过短的幕
3. **冲突递进**：三幕的冲突是否层层递进，转折是否合理
4. **转变弧线**：每个节点的 change_before → change_after 是否形成有效的角色/情节弧线
5. **人物覆盖**：关键人物是否在各场景中合理出现

请用中文给出具体的改进建议，并使用 batch_create_outline 工具提供补充建议的具体节点数据。`,
            },
          },
        ],
      };
    }
  );

  server.prompt(
    'suggest_scenes',
    '根据现有幕结构，建议补充缺失的场景',
    {
      bookId: z.string().describe('书籍 ID'),
      actId: z.string().optional().describe('指定幕 ID，仅分析该幕；不传则分析所有幕'),
    },
    async ({ bookId, actId }) => {
      const scopeText = actId ? `ID 为「${actId}」的幕` : '所有幕';
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `请为 ID 为「${bookId}」的小说中${scopeText}建议补充缺失的场景。

请先使用 get_outline 工具获取大纲结构，然后分析每个幕下的场景是否完整。

对于每个幕，请检查：
1. 是否缺少开场场景（建立幕的初始状态）
2. 是否缺少转折场景（推动情节发展）
3. 是否缺少高潮场景（幕的核心冲突爆发）
4. 是否缺少收束场景（为下一幕铺垫）

请用中文描述建议添加的场景，并使用 add_node 工具逐个添加，或使用 batch_create_outline 工具批量添加。`,
            },
          },
        ],
      };
    }
  );

  server.prompt(
    'generate_synopsis',
    '基于小说大纲生成故事梗概',
    { bookId: z.string().describe('书籍 ID') },
    async ({ bookId }) => {
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `请为 ID 为「${bookId}」的小说生成故事梗概。

请先使用 get_outline 工具获取完整大纲树，然后基于大纲中的卷→幕→场景层级结构，生成一篇 300-500 字的故事梗概。

梗概要求：
1. 涵盖故事的主要情节线
2. 体现主角的成长弧线（基于各节点的转变前后状态）
3. 突出核心冲突和转折点
4. 语言精炼，引人入胜
5. 用中文撰写`,
            },
          },
        ],
      };
    }
  );

  server.prompt(
    'create_outline_from_idea',
    '根据用户的灵感描述，创建完整的小说大纲',
    {
      bookTitle: z.string().describe('小说标题'),
      idea: z.string().describe('灵感描述，可以是故事构思、主题、角色设定等'),
      structureType: z.enum(['three-act', 'hero-journey', 'custom']).optional().describe('结构类型：three-act=三幕式, hero-journey=英雄之旅, custom=自定义（默认三幕式）'),
    },
    async ({ bookTitle, idea, structureType }) => {
      const structType = structureType || 'three-act';
      const templateUri = structType === 'hero-journey'
        ? 'storyweave://templates/hero-journey'
        : 'storyweave://templates/three-act';

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: `请根据以下灵感描述，创建一部名为「${bookTitle}」的小说大纲。

**灵感描述**：
${idea}

**结构类型**：${structType === 'three-act' ? '三幕式' : structType === 'hero-journey' ? '英雄之旅' : '自定义'}

请先读取模板资源 ${templateUri} 了解推荐的结构，然后：

1. 使用 create_book 工具创建书籍
2. 根据灵感和模板，构思完整的卷→幕→场景结构
3. 为每个节点填写：
   - 标题（贴合故事内容）
   - 转变前后状态（change_before / change_after）
   - 卷概要 / 核心冲突 / 地点和人物
4. 使用 batch_create_outline 工具一次性创建完整大纲

确保大纲结构完整、情节连贯、冲突递进。用中文输出所有内容。`,
            },
          },
        ],
      };
    }
  );
}
