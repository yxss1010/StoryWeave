import { ref } from 'vue';
import Dexie, { type Table } from 'dexie';
import { streamChat, type ChatMessage, type ToolEvent } from '../services/agent';

interface StoredMessage {
  id?: number;
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
  messages!: Table<StoredMessage>;

  constructor() {
    super('StoryWeaveChat');
    this.version(1).stores({
      messages: '++id, bookId, createdAt',
    });
  }
}

const db = new ChatDB();

const messages = ref<DisplayMessage[]>([]);
const isStreaming = ref(false);
const streamingText = ref('');
const activeToolEvents = ref<ToolEvent[]>([]);
let currentBookId = ref<string | null>(null);

async function loadMessages(bookId: string) {
  const stored = await db.messages
    .where('bookId')
    .equals(bookId)
    .sortBy('createdAt');

  messages.value = stored.map((s) => ({
    role: s.role,
    content: s.content,
    toolEvents: JSON.parse(s.toolEvents || '[]'),
  }));
}

async function saveMessage(bookId: string, msg: DisplayMessage) {
  await db.messages.add({
    bookId,
    role: msg.role,
    content: msg.content,
    toolEvents: JSON.stringify(msg.toolEvents),
    createdAt: Date.now(),
  });
}

async function clearMessages(bookId?: string) {
  if (bookId) {
    await db.messages.where('bookId').equals(bookId).delete();
  } else {
    await db.messages.clear();
  }
  messages.value = [];
}

function switchBook(bookId: string | null) {
  if (currentBookId.value === bookId) return;
  currentBookId.value = bookId;
  if (bookId) {
    loadMessages(bookId);
  } else {
    messages.value = [];
  }
}

async function sendMessage(text: string) {
  const bookId = currentBookId.value;
  if (!text.trim() || isStreaming.value) return;

  const userMsg: DisplayMessage = { role: 'user', content: text, toolEvents: [] };
  messages.value.push(userMsg);
  if (bookId) await saveMessage(bookId, userMsg);

  isStreaming.value = true;
  streamingText.value = '';
  activeToolEvents.value = [];

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
        const assistantMsg: DisplayMessage = {
          role: 'assistant',
          content: streamingText.value,
          toolEvents: [...activeToolEvents.value],
        };
        messages.value.push(assistantMsg);
        if (bookId) await saveMessage(bookId, assistantMsg);
        streamingText.value = '';
        activeToolEvents.value = [];
        isStreaming.value = false;
      },
      async (error: string) => {
        const errorMsg: DisplayMessage = {
          role: 'assistant',
          content: `❌ 出错了: ${error}`,
          toolEvents: [],
        };
        messages.value.push(errorMsg);
        if (bookId) await saveMessage(bookId, errorMsg);
        streamingText.value = '';
        activeToolEvents.value = [];
        isStreaming.value = false;
      },
    );
  } catch (e: any) {
    const errorMsg: DisplayMessage = {
      role: 'assistant',
      content: `❌ 请求失败: ${e.message}`,
      toolEvents: [],
    };
    messages.value.push(errorMsg);
    if (bookId) await saveMessage(bookId, errorMsg);
    isStreaming.value = false;
    streamingText.value = '';
    activeToolEvents.value = [];
  }
}

export function useAiChat() {
  return {
    messages,
    isStreaming,
    streamingText,
    activeToolEvents,
    currentBookId,
    switchBook,
    sendMessage,
    clearMessages,
  };
}
