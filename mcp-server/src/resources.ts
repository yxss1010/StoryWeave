import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as storage from './storage.js';

export function registerResources(server: McpServer): void {
  server.resource(
    'books-list',
    'storyweave://books',
    async (uri) => {
      const books = storage.getBookList();
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(books, null, 2),
        }],
      };
    }
  );

  server.resource(
    'book-detail',
    new ResourceTemplate('storyweave://books/{bookId}', { list: undefined }),
    async (uri, variables) => {
      const bookId = variables.bookId as string;
      const book = storage.getBookById(bookId);
      if (!book) {
        return {
          contents: [{
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ error: '书籍不存在' }),
          }],
        };
      }
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(book, null, 2),
        }],
      };
    }
  );

  server.resource(
    'book-outline',
    new ResourceTemplate('storyweave://books/{bookId}/outline', { list: undefined }),
    async (uri, variables) => {
      const bookId = variables.bookId as string;
      const outline = storage.getOutline(bookId);
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(outline, null, 2),
        }],
      };
    }
  );

  server.resource(
    'book-outline-tree',
    new ResourceTemplate('storyweave://books/{bookId}/tree', { list: undefined }),
    async (uri, variables) => {
      const bookId = variables.bookId as string;
      const tree = storage.getOutlineTree(bookId);
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(tree, null, 2),
        }],
      };
    }
  );

  server.resource(
    'outline-template-three-act',
    'storyweave://templates/three-act',
    async (uri) => {
      const template = {
        name: '三幕式结构模板',
        description: '经典三幕式戏剧结构，适用于大多数小说',
        structure: {
          volumes: [
            {
              title: '第一卷',
              volume_number: 1,
              acts: [
                {
                  title: '第一幕：建置',
                  act_number: 1,
                  conflict: '主角的日常生活被打破，面临初始挑战',
                  scenes: [
                    { title: '开场', location: '日常场景', characters: ['主角'] },
                    { title: '激励事件', location: '关键地点', characters: ['主角', '关键角色'] },
                    { title: '第一转折', location: '转折点', characters: ['主角'] },
                  ],
                },
                {
                  title: '第二幕：对抗',
                  act_number: 2,
                  conflict: '主角与主要矛盾正面冲突，经历挫折与成长',
                  scenes: [
                    { title: '上升行动', location: '冒险场景', characters: ['主角', '盟友'] },
                    { title: '中点', location: '关键场景', characters: ['主角', '对手'] },
                    { title: '危机', location: '低谷场景', characters: ['主角'] },
                    { title: '第二转折', location: '转折点', characters: ['主角', '关键角色'] },
                  ],
                },
                {
                  title: '第三幕：结局',
                  act_number: 3,
                  conflict: '最终决战，主角解决核心矛盾',
                  scenes: [
                    { title: '高潮', location: '决战场景', characters: ['主角', '对手'] },
                    { title: '下降行动', location: '收束场景', characters: ['主角'] },
                    { title: '结局', location: '尾声场景', characters: ['主角', '重要角色'] },
                  ],
                },
              ],
            },
          ],
        },
      };
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(template, null, 2),
        }],
      };
    }
  );

  server.resource(
    'outline-template-hero-journey',
    'storyweave://templates/hero-journey',
    async (uri) => {
      const template = {
        name: '英雄之旅模板',
        description: '基于约瑟夫·坎贝尔的英雄之旅理论，适用于冒险/成长类小说',
        structure: {
          volumes: [
            {
              title: '第一卷：启程',
              volume_number: 1,
              acts: [
                {
                  title: '第一幕：日常世界与召唤',
                  act_number: 1,
                  conflict: '英雄在平凡世界与冒险召唤之间的抉择',
                  scenes: [
                    { title: '日常世界', location: '英雄的家乡', characters: ['英雄'] },
                    { title: '冒险召唤', location: '触发事件地点', characters: ['英雄', '信使'] },
                    { title: '拒绝召唤', location: '英雄的内心', characters: ['英雄'] },
                    { title: '遇见导师', location: '导师所在', characters: ['英雄', '导师'] },
                  ],
                },
                {
                  title: '第二幕：跨越与考验',
                  act_number: 2,
                  conflict: '英雄在特殊世界中面对重重考验',
                  scenes: [
                    { title: '跨越第一道门槛', location: '特殊世界入口', characters: ['英雄'] },
                    { title: '考验、盟友与敌人', location: '特殊世界', characters: ['英雄', '盟友', '敌人'] },
                    { title: '接近最深的洞穴', location: '危险区域', characters: ['英雄', '盟友'] },
                    { title: '磨难', location: '最深处', characters: ['英雄', '对手'] },
                  ],
                },
                {
                  title: '第三幕：回归',
                  act_number: 3,
                  conflict: '英雄带着恩赐回归，完成最终蜕变',
                  scenes: [
                    { title: '报酬', location: '宝藏所在', characters: ['英雄'] },
                    { title: '返回的路', location: '归途', characters: ['英雄'] },
                    { title: '复活', location: '最终考验', characters: ['英雄', '对手'] },
                    { title: '携万灵丹回归', location: '日常世界', characters: ['英雄'] },
                  ],
                },
              ],
            },
          ],
        },
      };
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(template, null, 2),
        }],
      };
    }
  );

  server.resource(
    'outline-template-web-novel',
    'storyweave://templates/web-novel',
    async (uri) => {
      const template = {
        name: '网文大纲模板',
        description: '适用于百万字级别网络小说的大纲结构，每卷20-40章，每章2-3场景',
        structure: {
          volumes: [
            {
              title: '第一卷：初入江湖',
              volume_number: 1,
              summary: '主角从平凡起步，获得金手指，初露锋芒',
              acts: [
                {
                  title: '第1章：意外觉醒',
                  act_number: 1,
                  conflict: '主角遭遇危机，意外激活金手指',
                  scenes: [
                    { title: '日常与危机', location: '主角所在城镇', characters: ['主角'] },
                    { title: '金手指觉醒', location: '危机现场', characters: ['主角', '对手'] },
                  ],
                },
                {
                  title: '第2章：初试身手',
                  act_number: 2,
                  conflict: '主角尝试使用新能力，遭遇第一次考验',
                  scenes: [
                    { title: '能力试探', location: '修炼场所', characters: ['主角'] },
                    { title: '小试牛刀', location: '城镇集市', characters: ['主角', '路人'] },
                    { title: '初战告捷', location: '比武场', characters: ['主角', '对手'] },
                  ],
                },
                {
                  title: '第3章：崭露头角',
                  act_number: 3,
                  conflict: '主角实力引起关注，面临新的挑战',
                  scenes: [
                    { title: '名声初起', location: '城镇', characters: ['主角', '旁观者'] },
                    { title: '强敌出现', location: '比武场', characters: ['主角', '强敌'] },
                  ],
                },
              ],
            },
            {
              title: '第二卷：崭露头角',
              volume_number: 2,
              summary: '主角实力提升，进入更大舞台，卷入势力纷争',
              acts: [
                {
                  title: '第1章：新世界',
                  act_number: 1,
                  conflict: '主角踏入更广阔的世界，见识更高层次的力量',
                  scenes: [
                    { title: '离开故地', location: '城镇出口', characters: ['主角', '送行者'] },
                    { title: '初到大城', location: '大城市', characters: ['主角'] },
                  ],
                },
              ],
            },
          ],
        },
        notes: {
          volume_structure: '每卷 20-40 章，对应一个完整的剧情弧，卷末设置大高潮',
          chapter_structure: '每章约 3000 字，包含 2-3 个场景',
          pacing: '每 3-5 章一个小高潮（小战斗/小突破/小反转），每卷末一个大高潮（大战斗/大突破/大反转）',
          escalation: '主角实力随卷递进，每卷至少一次明显的等级/能力提升',
          hooks: '每章末设置悬念钩子，驱动读者继续阅读',
        },
      };
      return {
        contents: [{
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(template, null, 2),
        }],
      };
    }
  );
}
