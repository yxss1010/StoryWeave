import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as storage from './storage.js';

export function registerTools(server: McpServer): void {
  server.tool(
    'create_book',
    '创建一本新小说，返回创建的书籍信息',
    { title: z.string().describe('小说标题'), cover: z.string().optional().describe('封面图 URL 或 base64，可选') },
    async ({ title, cover }) => {
      const book = storage.createBook(title, cover || '');
      return { content: [{ type: 'text' as const, text: JSON.stringify(book, null, 2) }] };
    }
  );

  server.tool(
    'list_books',
    '列出所有小说，按最后修改时间排序',
    {},
    async () => {
      const books = storage.getBookList();
      return { content: [{ type: 'text' as const, text: JSON.stringify(books, null, 2) }] };
    }
  );

  server.tool(
    'get_book',
    '获取指定小说的详细信息',
    { bookId: z.string().describe('书籍 ID') },
    async ({ bookId }) => {
      const book = storage.getBookById(bookId);
      if (!book) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: '书籍不存在' }) }] };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(book, null, 2) }] };
    }
  );

  server.tool(
    'update_book',
    '更新小说元信息（标题、封面、简介、设定等）',
    {
      bookId: z.string().describe('书籍 ID'),
      title: z.string().optional().describe('新标题'),
      cover: z.string().optional().describe('新封面'),
      synopsis: z.string().optional().describe('小说简介'),
      settings: z.string().optional().describe('小说设定（世界观、角色设定、魔法体系等）'),
    },
    async ({ bookId, title, cover, synopsis, settings }) => {
      const updates: Record<string, string> = {};
      if (title !== undefined) updates.title = title;
      if (cover !== undefined) updates.cover = cover;
      if (synopsis !== undefined) updates.synopsis = synopsis;
      if (settings !== undefined) updates.settings = settings;
      const book = storage.updateBook(bookId, updates);
      if (!book) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: '书籍不存在' }) }] };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(book, null, 2) }] };
    }
  );

  server.tool(
    'delete_book',
    '删除一本小说及其所有大纲数据，此操作不可恢复',
    { bookId: z.string().describe('书籍 ID') },
    async ({ bookId }) => {
      const success = storage.deleteBook(bookId);
      return { content: [{ type: 'text' as const, text: JSON.stringify({ success, message: success ? '书籍已删除' : '书籍不存在' }) }] };
    }
  );

  server.tool(
    'add_node',
    '向小说大纲中添加一个节点（卷/幕/场景）。如果提供了 volume_id 或 act_id，会自动创建连线。',
    {
      bookId: z.string().describe('书籍 ID'),
      nodeType: z.enum(['volume', 'act', 'scene']).describe('节点类型：volume=卷, act=幕, scene=场景'),
      title: z.string().optional().describe('节点标题'),
      description: z.string().optional().describe('节点描述（整体概要）'),
      volume_number: z.number().optional().describe('卷次（仅卷类型需要）'),
      summary: z.string().optional().describe('卷概要（仅卷类型）'),
      act_number: z.number().optional().describe('章次/幕次编号（仅幕类型）'),
      conflict: z.string().optional().describe('核心冲突（仅幕类型）'),
      volume_id: z.string().optional().describe('所属卷 ID（仅幕类型，提供则自动连线）'),
      location: z.string().optional().describe('场景地点（仅场景类型）'),
      characters: z.array(z.string()).optional().describe('场景人物列表（仅场景类型）'),
      act_id: z.string().optional().describe('所属幕 ID（仅场景类型，提供则自动连线）'),
      change_before: z.string().optional().describe('转变前状态'),
      change_after: z.string().optional().describe('转变后状态'),
    },
    async (params) => {
      const { bookId, nodeType, ...nodeData } = params;
      const node = storage.addNode(bookId, nodeType, nodeData);
      if (!node) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: '添加节点失败，请检查书籍 ID 是否正确' }) }] };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(node, null, 2) }] };
    }
  );

  server.tool(
    'list_nodes',
    '列出小说大纲中的节点，可按类型筛选',
    {
      bookId: z.string().describe('书籍 ID'),
      nodeType: z.enum(['volume', 'act', 'scene']).optional().describe('筛选节点类型，不传则返回全部'),
    },
    async ({ bookId, nodeType }) => {
      const outline = storage.getOutline(bookId);
      let nodes = outline.nodes;
      if (nodeType) {
        nodes = nodes.filter(n => n.data.type === nodeType);
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(nodes, null, 2) }] };
    }
  );

  server.tool(
    'update_node',
    '更新大纲节点的属性',
    {
      bookId: z.string().describe('书籍 ID'),
      nodeId: z.string().describe('节点 ID'),
      title: z.string().optional().describe('新标题'),
      description: z.string().optional().describe('新描述'),
      volume_number: z.number().optional().describe('新卷次'),
      summary: z.string().optional().describe('新卷概要'),
      act_number: z.number().optional().describe('新章次/幕次编号'),
      conflict: z.string().optional().describe('新核心冲突'),
      location: z.string().optional().describe('新地点'),
      characters: z.array(z.string()).optional().describe('新人物列表'),
      change_before: z.string().optional().describe('新转变前状态'),
      change_after: z.string().optional().describe('新转变后状态'),
    },
    async ({ bookId, nodeId, ...updates }) => {
      const filtered = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
      const node = storage.updateNode(bookId, nodeId, filtered);
      if (!node) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: '节点不存在' }) }] };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(node, null, 2) }] };
    }
  );

  server.tool(
    'delete_node',
    '删除大纲中的一个节点及其所有连线，此操作不可恢复',
    {
      bookId: z.string().describe('书籍 ID'),
      nodeId: z.string().describe('节点 ID'),
    },
    async ({ bookId, nodeId }) => {
      const success = storage.deleteNode(bookId, nodeId);
      return { content: [{ type: 'text' as const, text: JSON.stringify({ success, message: success ? '节点已删除' : '节点不存在' }) }] };
    }
  );

  server.tool(
    'connect_nodes',
    '连接两个节点（创建从 source 到 target 的边）。规则：卷→幕，幕→场景',
    {
      bookId: z.string().describe('书籍 ID'),
      sourceId: z.string().describe('源节点 ID（父节点）'),
      targetId: z.string().describe('目标节点 ID（子节点）'),
    },
    async ({ bookId, sourceId, targetId }) => {
      const edge = storage.connectNodes(bookId, sourceId, targetId);
      if (!edge) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ error: '连接失败，请检查节点是否存在或是否已连接' }) }] };
      }
      return { content: [{ type: 'text' as const, text: JSON.stringify(edge, null, 2) }] };
    }
  );

  server.tool(
    'disconnect_nodes',
    '断开两个节点之间的连接',
    {
      bookId: z.string().describe('书籍 ID'),
      sourceId: z.string().describe('源节点 ID'),
      targetId: z.string().describe('目标节点 ID'),
    },
    async ({ bookId, sourceId, targetId }) => {
      const success = storage.disconnectNodes(bookId, sourceId, targetId);
      return { content: [{ type: 'text' as const, text: JSON.stringify({ success, message: success ? '连接已断开' : '连接不存在' }) }] };
    }
  );

  server.tool(
    'get_outline',
    '获取小说的完整大纲树结构，以层级方式展示卷→幕→场景的关系',
    { bookId: z.string().describe('书籍 ID') },
    async ({ bookId }) => {
      const tree = storage.getOutlineTree(bookId);
      return { content: [{ type: 'text' as const, text: JSON.stringify(tree, null, 2) }] };
    }
  );

  server.tool(
    'validate_outline',
    '校验小说大纲的完整性和一致性，返回发现的问题列表',
    { bookId: z.string().describe('书籍 ID') },
    async ({ bookId }) => {
      const result = storage.validateOutline(bookId);
      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    'batch_create_outline',
    '批量创建大纲结构。一次性创建完整的卷→幕→场景层级结构，自动建立连线。这是构建大纲最高效的方式。',
    {
      bookId: z.string().describe('书籍 ID'),
      volumes: z.array(z.object({
        title: z.string().describe('卷标题'),
        volume_number: z.number().describe('卷次'),
        summary: z.string().optional().describe('卷概要'),
        description: z.string().optional().describe('卷描述'),
        change_before: z.string().optional().describe('转变前'),
        change_after: z.string().optional().describe('转变后'),
        acts: z.array(z.object({
          title: z.string().describe('幕标题'),
          act_number: z.number().describe('章次/幕次编号'),
          conflict: z.string().optional().describe('核心冲突'),
          description: z.string().optional().describe('幕描述'),
          change_before: z.string().optional().describe('转变前'),
          change_after: z.string().optional().describe('转变后'),
          scenes: z.array(z.object({
            title: z.string().describe('场景标题'),
            location: z.string().optional().describe('场景地点'),
            characters: z.array(z.string()).optional().describe('场景人物'),
            description: z.string().optional().describe('场景描述'),
            change_before: z.string().optional().describe('转变前'),
            change_after: z.string().optional().describe('转变后'),
          })).optional().describe('场景列表'),
        })).describe('幕列表'),
      })).describe('卷列表'),
    },
    async ({ bookId, volumes }) => {
      const result: Record<string, unknown>[] = [];

      let volumeX = 50;

      for (const volData of volumes) {
        const volPosition = { x: volumeX, y: 50 };
        const volNode = storage.addNode(bookId, 'volume', volData, volPosition);
        if (!volNode) {
          result.push({ error: `创建卷「${volData.title}」失败` });
          continue;
        }

        const volResult: Record<string, unknown> = {
          volume: { id: volNode.id, title: volNode.data.title },
          acts: [] as Record<string, unknown>[],
        };

        const maxScenesPerAct = Math.max(
          ...volData.acts.map(a => a.scenes?.length || 0),
          1
        );
        const actSpacing = Math.max(maxScenesPerAct * 300, 380);
        let actX = volumeX;

        for (const actData of volData.acts) {
          const actPosition = { x: actX, y: 400 };
          const actInput = { ...actData, volume_id: volNode.id };
          const actNode = storage.addNode(bookId, 'act', actInput, actPosition);
          if (!actNode) {
            (volResult.acts as Record<string, unknown>[]).push({ error: `创建幕「${actData.title}」失败` });
            actX += actSpacing;
            continue;
          }

          const actResult: Record<string, unknown> = {
            act: { id: actNode.id, title: actNode.data.title },
            scenes: [] as Record<string, unknown>[],
          };

          if (actData.scenes) {
            for (let si = 0; si < actData.scenes.length; si++) {
              const sceneData = actData.scenes[si];
              const scenePosition = { x: actX + si * 300, y: 800 };
              const sceneInput = { ...sceneData, act_id: actNode.id };
              const sceneNode = storage.addNode(bookId, 'scene', sceneInput, scenePosition);
              if (sceneNode) {
                (actResult.scenes as Record<string, unknown>[]).push({
                  scene: { id: sceneNode.id, title: sceneNode.data.title },
                });
              }
            }
          }

          (volResult.acts as Record<string, unknown>[]).push(actResult);
          actX += actSpacing;
        }

        volumeX = actX + 120;
        result.push(volResult);
      }

      return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    }
  );
}
