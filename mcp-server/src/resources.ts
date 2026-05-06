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
        name: '网文大纲模板（大纲逻辑体系）',
        description: '基于大纲逻辑体系的网文大纲结构，涵盖社会类型、势力体系、S级势力、信息差、爽点推动、三支线、神器体系',
        structure: {
          volumes: [
            {
              title: '第一卷：初入江湖',
              volume_number: 1,
              summary: '主角从平凡起步，获得金手指，初露锋芒，卷入S级势力暗线',
              acts: [
                {
                  title: '第1章：意外觉醒',
                  act_number: 1,
                  conflict: '【情绪任务】主角遭遇危机，意外激活金手指（能力转折）',
                  scenes: [
                    { title: '日常与危机', location: '主角所在城镇', characters: ['主角'], emotion_curve: '平静→紧张', desire_type: '生存欲' },
                    { title: '金手指觉醒', location: '危机现场', characters: ['主角', '对手'], emotion_curve: '绝望→惊喜', desire_type: '生存欲→工具欲' },
                  ],
                },
                {
                  title: '第2章：初试身手',
                  act_number: 2,
                  conflict: '【欲望任务】主角尝试使用新能力，遭遇第一次考验',
                  scenes: [
                    { title: '能力试探', location: '修炼场所', characters: ['主角'], emotion_curve: '好奇→期待', desire_type: '求知欲' },
                    { title: '小试牛刀', location: '城镇集市', characters: ['主角', '路人'], emotion_curve: '期待→满足', desire_type: '个欲' },
                    { title: '初战告捷', location: '比武场', characters: ['主角', '对手'], emotion_curve: '紧张→爽快', desire_type: '超能欲' },
                  ],
                },
                {
                  title: '第3章：暗流涌动',
                  act_number: 3,
                  conflict: '【信息任务】主角实力引起关注，S级势力暗线初现端倪',
                  scenes: [
                    { title: '名声初起', location: '城镇', characters: ['主角', '旁观者'], emotion_curve: '得意→警觉', desire_type: '个欲→求知欲' },
                    { title: '神秘线索', location: '暗巷', characters: ['主角', '神秘人'], emotion_curve: '好奇→疑惑', desire_type: '求知欲', info_gap: '伪装者提供错误信息' },
                  ],
                },
              ],
            },
            {
              title: '第二卷：崭露头角',
              volume_number: 2,
              summary: '主角实力提升，进入更大舞台，卷入势力纷争，S级势力暗线加深',
              acts: [
                {
                  title: '第1章：新世界',
                  act_number: 1,
                  conflict: '【规定任务】主角踏入更广阔的世界，见识更高层次的力量',
                  scenes: [
                    { title: '离开故地', location: '城镇出口', characters: ['主角', '送行者'], emotion_curve: '不舍→期待', desire_type: '掌控欲' },
                    { title: '初到大城', location: '大城市', characters: ['主角'], emotion_curve: '震撼→好奇', desire_type: '求知欲' },
                  ],
                },
              ],
            },
          ],
        },
        outline_logic: {
          social_types: [
            '① 神话部落式：信奉高能力者为酋长神明，以狩猎/游牧/农业为生',
            '② 游牧城邦式：资源凝聚形成阶级，游牧族群与城邦并存',
            '③ 封建联邦式：最强者"王"统一，分封诸侯领主',
            '④ 帝国神权式：最强者"皇"统一，有专属行政和军队系统',
            '⑤ 军阀官僚式：皇室权利没落，军阀混战',
            '⑥ 现代文明式：当代社会结构',
          ],
          faction_types: [
            '反派势力（掠夺）：推动主线冲突的核心',
            '正派势力（均衡）：制衡反派的力量',
            '中立势力（竞争）：根据利益选择立场',
            '弱派势力（自保）：被动卷入冲突',
            '工具势力（和平）：提供资源/信息/服务',
          ],
          character_complexity: {
            S: 'boss级，有完整欲望行动线，驱动主线和暗线',
            A: '核心配角，有独立行动线和信息差',
            B: '重要配角，有部分信息差和立场',
            C: '功能性角色，推动剧情的工具人',
          },
          info_gap_characters: [
            '忠诚者 → 信息差人物（背后隐藏秘密）',
            '预期反差人物（和自己想象的完全相反）',
            '两难人物（因某种原因做了自己不愿做的事）',
            '伪装者（身份越高，预期反差越大）',
          ],
          plot_logic_lines: {
            simple: '被动 → 能力转折 → 旁观者信息 → 能力转折 → 参与者信息 → 解决boss',
            standard: '被动 → 错误信息 → 行动受挫 → 信息线索 → 旁观者转折 → 参与者转折 → 伪装者转折 → 预期反差 → 解决boss',
            complex: '被动 → 错误信息 → 行动受挫 → 伪装者转折 → 预期反差 → 循环… → 完整信息 → 解决',
          },
          satisfaction_push: {
            process: [
              '① 任务发布 → 建立欲望，获得预期 → 情绪↑',
              '② 遭遇阻碍 → 没有实力，阻碍困境 → 情绪↓',
              '③ 加强期待 → 获得方法，解决神器 → 情绪↑↑',
              '④ 再次转折 → 遭遇未知，预期反差 → 情绪↓↓↓',
              '⑤ 获得预期 → 最终获得，超预期 → 情绪↑↑↑↑↑',
            ],
            desire_types: {
              passive: ['色欲', '生存欲', '需求欲', '求知欲'],
              active: ['掌控欲', '工具欲', '超能欲', '个欲（自我认同）', '社欲（社会认同）'],
            },
            task_types: ['信息任务', '情绪任务', '规定任务', '奖励任务', '欲望任务', '前提任务'],
            expectation_types: ['情欲期待', '需求欲期待', '个欲社欲期待', '能力转折期待', '掌控欲期待', '求知欲期待', '信息前置期待', '信息差期待', '终极期待'],
          },
          three_branches: {
            growth: {
              name: '成长线',
              aspects: ['阶段突破', '势力积攒', '外在工具'],
              power_upgrade: ['元素控制 → 精神控制 → 自身加强'],
              skill_upgrade: ['功法招式 → 工具辅助 → 异体控制'],
            },
            life: {
              name: '生活线',
              aspects: ['娱乐爽点', '赚钱职业', '生存需求'],
              entertainment: ['艺术类', '体育类', '休闲类'],
              professions: ['服务娱乐类', '职业技能类', '社会维持类', '经营策略类', '手工制造类', '农牧猎渔类'],
            },
            emotion: {
              name: '情感线',
              aspects: ['爱情友情', '社会江湖', '爱恨情仇'],
              five_layers: [
                '第一层：信息差误会，错怪别人，愧疚感',
                '第二层：两难选择，共情悲剧荒唐',
                '第三层：预期反差，对方在帮却被误解，强愧疚感',
                '第四层：伤害了被误解的人，负罪感',
                '第五层：伤害了在帮自己的人，最强烈负罪感',
              ],
            },
          },
          artifact_system: {
            external: {
              name: '外神器（金手指）',
              types: [
                '① 万能类：封印灵魂的戒指、任务奖励系统、复制技能、抽奖盲盒',
                '② 成长类：等级封印宝物、吞噬进化、宝物升级解锁新技能',
                '③ 职业技能类：灵草宝地、读心术、超强记忆、顶级炼丹炉、空间仓库',
                '④ 超强天赋类：天选之子、稀有魔法、远古血脉、解析进化能力',
              ],
            },
            internal: {
              name: '内神器（道德人格）',
              types: [
                '① 小强之躯：绝境生存，无限能量和复活，勇敢坚韧永不放弃',
                '② 善有善报：提升幸运和魅力，不欺弱者，力所能及帮助他人',
                '③ 利他之心：提升魅力，获得追随者信仰，提升统帅值',
              ],
            },
            rationalization: [
              '① 未知天赋积累：不直接描写会某种技能，要有天赋积累过程',
              '② 金手指技能辅助：金手指帮助快速学习或超强辅助',
              '③ 均衡合理化：有利有害降低排斥感，使用后有副作用',
              '④ 限制可成长：使用有时间/冷却/场景限制，前期很弱逐步变强',
            ],
          },
          opening_modes: {
            survival_env: [
              'S级势力下的被动开局：重生/复仇/重要宝物/家族覆灭',
              '社会底层低谷开局：欺压/讥讽/绝望/全村的希望',
              '灾难前的平稳开局：预言/梦境/天选/使命/幸存重生',
            ],
            growth_style: [
              '学院成长流：进入学院/门派/家族等势力',
              '职业成长流：某种职业开局，逐渐了解势力分布',
              '冒险成长流：社会崩塌/末日/战争/混乱下开局',
            ],
          },
          plot_turning_points: [
            '信息转折：获得重要信息，剧情转折推动',
            '能力转折：获得能力工具后，剧情转折推动',
            '情绪转折：他人遭迫害或自身情绪爆发，剧情推动',
            '任务转折：被动接受任务，剧情转折发展',
          ],
        },
        notes: {
          volume_structure: '每卷 20-40 章，对应一个完整的剧情弧，卷末设置大高潮',
          chapter_structure: '每章约 3000 字，包含 2-3 个场景',
          pacing: '每 3-5 章一个小高潮，每卷末一个大高潮，遵循爽点推动五步法',
          escalation: '主角实力随卷递进，每卷至少一次明显的等级/能力提升',
          hooks: '每章末设置悬念钩子，驱动读者继续阅读',
          s_level_faction: 'S级势力暗线贯穿全书，每卷通过信息差逐步揭露',
          info_gap: '每个场景标注信息差类型和情绪曲线，确保剧情逻辑清晰',
          three_branches: '成长线/生活线/情感线交织，三支线相辅相成',
          anti_writer_block: '设定完整的社会背景、S级势力暗线、神器合理化，预防卡文',
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
