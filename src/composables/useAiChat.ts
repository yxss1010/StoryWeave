import { ref } from 'vue';
import Dexie, { type Table } from 'dexie';
import { streamChat, type ChatMessage, type ToolEvent } from '../services/agent';

interface Conversation {
  id: string;
  bookId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

interface StoredMessage {
  id?: number;
  conversationId: string;
  bookId: string;
  role: 'user' | 'assistant';
  content: string;
  toolEvents: string;
  createdAt: number;
}

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  toolEvents: ToolEvent[];
}

class ChatDB extends Dexie {
  conversations!: Table<Conversation>;
  messages!: Table<StoredMessage>;

  constructor() {
    super('StoryWeaveChat');
    this.version(2).stores({
      conversations: 'id, bookId, updatedAt',
      messages: '++id, conversationId, bookId, createdAt',
    });
  }
}

const db = new ChatDB();

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

const messages = ref<DisplayMessage[]>([]);
const isStreaming = ref(false);
const streamingText = ref('');
const activeToolEvents = ref<ToolEvent[]>([]);
const currentBookId = ref<string | null>(null);
const currentConversationId = ref<string | null>(null);
const conversations = ref<Conversation[]>([]);
let abortController: AbortController | null = null;

async function loadConversations(bookId: string) {
  const list = await db.conversations
    .where('bookId')
    .equals(bookId)
    .reverse()
    .sortBy('updatedAt');
  conversations.value = list;
}

async function createConversation(bookId: string, title?: string): Promise<string> {
  const id = generateId();
  const now = Date.now();
  const conv: Conversation = {
    id,
    bookId,
    title: title || `会话 ${conversations.value.length + 1}`,
    createdAt: now,
    updatedAt: now,
  };
  await db.conversations.add(conv);
  conversations.value.unshift(conv);
  return id;
}

async function deleteConversation(conversationId: string) {
  await db.messages.where('conversationId').equals(conversationId).delete();
  await db.conversations.delete(conversationId);
  conversations.value = conversations.value.filter(c => c.id !== conversationId);
  if (currentConversationId.value === conversationId) {
    currentConversationId.value = null;
    messages.value = [];
  }
}

async function updateConversationTitle(conversationId: string, title: string) {
  await db.conversations.update(conversationId, { title, updatedAt: Date.now() });
  const conv = conversations.value.find(c => c.id === conversationId);
  if (conv) {
    conv.title = title;
    conv.updatedAt = Date.now();
  }
}

async function loadMessages(conversationId: string) {
  const stored = await db.messages
    .where('conversationId')
    .equals(conversationId)
    .sortBy('createdAt');

  messages.value = stored.map((s) => ({
    role: s.role,
    content: s.content,
    toolEvents: JSON.parse(s.toolEvents || '[]'),
  }));
}

async function saveMessage(conversationId: string, bookId: string, msg: DisplayMessage) {
  await db.messages.add({
    conversationId,
    bookId,
    role: msg.role,
    content: msg.content,
    toolEvents: JSON.stringify(msg.toolEvents),
    createdAt: Date.now(),
  });
  await db.conversations.update(conversationId, { updatedAt: Date.now() });
  const conv = conversations.value.find(c => c.id === conversationId);
  if (conv) {
    conv.updatedAt = Date.now();
  }
}

async function clearMessages(conversationId?: string) {
  if (conversationId) {
    await db.messages.where('conversationId').equals(conversationId).delete();
    await db.conversations.update(conversationId, { updatedAt: Date.now() });
  } else {
    await db.messages.clear();
  }
  messages.value = [];
}

function switchBook(bookId: string | null) {
  currentBookId.value = bookId;
  currentConversationId.value = null;
  messages.value = [];
  const convBookId = bookId || '__bookshelf__';
  loadConversations(convBookId).then(() => {
    if (conversations.value.length > 0) {
      switchConversation(conversations.value[0].id);
    }
  });
}

async function switchConversation(conversationId: string) {
  currentConversationId.value = conversationId;
  await loadMessages(conversationId);
}

async function startNewConversation() {
  const bookId = currentBookId.value || '__bookshelf__';
  const id = await createConversation(bookId);
  currentConversationId.value = id;
  messages.value = [];
}

async function sendMessage(text: string) {
  const bookId = currentBookId.value;
  if (!text.trim() || isStreaming.value) return;

  if (!currentConversationId.value) {
    const convBookId = bookId || '__bookshelf__';
    const id = await createConversation(convBookId, text.slice(0, 30));
    currentConversationId.value = id;
  }

  const convId = currentConversationId.value;
  const convBookId = bookId || '__bookshelf__';

  if (messages.value.length === 0) {
    await updateConversationTitle(convId, text.slice(0, 30));
  }

  const userMsg: DisplayMessage = { role: 'user', content: text, toolEvents: [] };
  messages.value.push(userMsg);
  await saveMessage(convId, convBookId, userMsg);

  isStreaming.value = true;
  streamingText.value = '';
  activeToolEvents.value = [];
  abortController = new AbortController();

  const chatMessages: ChatMessage[] = messages.value.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  try {
    await streamChat(
      chatMessages,
      bookId,
      (chunk: string) => {
        streamingText.value += chunk;
      },
      (event: ToolEvent) => {
        activeToolEvents.value = [...activeToolEvents.value, event];
      },
      async () => {
        const content = streamingText.value;
        if (content) {
          const assistantMsg: DisplayMessage = {
            role: 'assistant',
            content,
            toolEvents: [...activeToolEvents.value],
          };
          messages.value.push(assistantMsg);
          await saveMessage(convId, convBookId, assistantMsg);
        }
        streamingText.value = '';
        activeToolEvents.value = [];
        isStreaming.value = false;
        abortController = null;
      },
      async (error: string) => {
        const content = streamingText.value;
        if (content) {
          const partialMsg: DisplayMessage = {
            role: 'assistant',
            content: content + '\n\n⚠️ 生成中断',
            toolEvents: [...activeToolEvents.value],
          };
          messages.value.push(partialMsg);
          await saveMessage(convId, convBookId, partialMsg);
        } else {
          const errorMsg: DisplayMessage = {
            role: 'assistant',
            content: `❌ 出错了: ${error}`,
            toolEvents: [],
          };
          messages.value.push(errorMsg);
          await saveMessage(convId, convBookId, errorMsg);
        }
        streamingText.value = '';
        activeToolEvents.value = [];
        isStreaming.value = false;
        abortController = null;
      },
      abortController.signal,
    );
  } catch (e: any) {
    const content = streamingText.value;
    if (content) {
      const partialMsg: DisplayMessage = {
        role: 'assistant',
        content: content + '\n\n⚠️ 生成中断',
        toolEvents: [...activeToolEvents.value],
      };
      messages.value.push(partialMsg);
      await saveMessage(convId, convBookId, partialMsg);
    } else {
      const errorMsg: DisplayMessage = {
        role: 'assistant',
        content: `❌ 请求失败: ${e.message}`,
        toolEvents: [],
      };
      messages.value.push(errorMsg);
      await saveMessage(convId, convBookId, errorMsg);
    }
    isStreaming.value = false;
    streamingText.value = '';
    activeToolEvents.value = [];
    abortController = null;
  }
}

function stopGeneration() {
  if (abortController) {
    abortController.abort();
  }
}

export function useAiChat() {
  return {
    messages,
    isStreaming,
    streamingText,
    activeToolEvents,
    currentBookId,
    currentConversationId,
    conversations,
    switchBook,
    switchConversation,
    startNewConversation,
    deleteConversation,
    sendMessage,
    stopGeneration,
    clearMessages,
  };
}
