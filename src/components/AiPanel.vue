<template>
  <Transition name="slide">
    <div v-if="visible" class="ai-panel">
      <div class="ai-header">
        <div class="ai-header-left">
          <Sparkles :size="18" class="ai-icon" />
          <h2 class="ai-title">AI 创作助手</h2>
        </div>
        <button class="ai-close" @click="$emit('close')" title="关闭">
          <X :size="18" />
        </button>
      </div>

      <div class="ai-messages" ref="messagesContainer">
        <div v-if="messages.length === 0" class="ai-welcome">
          <div class="welcome-icon">📖</div>
          <p class="welcome-text">描述你的小说灵感，AI 将为你生成完整大纲</p>
          <div class="quick-prompts">
            <button
              v-for="prompt in quickPrompts"
              :key="prompt.label"
              class="quick-btn"
              @click="sendQuickPrompt(prompt.text)"
            >
              <span class="quick-icon">{{ prompt.icon }}</span>
              <span class="quick-label">{{ prompt.label }}</span>
            </button>
          </div>
        </div>

        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          class="ai-message"
          :class="msg.role"
        >
          <div class="message-avatar">
            {{ msg.role === 'user' ? '🧑‍💻' : '📖' }}
          </div>
          <div class="message-body">
            <div v-if="msg.role === 'assistant' && msg.toolEvents.length > 0" class="tool-events">
              <div
                v-for="(evt, eIdx) in msg.toolEvents"
                :key="eIdx"
                class="tool-event"
                :class="evt.type"
              >
                <span class="tool-icon">{{ evt.type === 'tool_start' ? '🔧' : '✅' }}</span>
                <span class="tool-name">{{ evt.name }}</span>
              </div>
            </div>
            <div class="message-text" v-html="renderMarkdown(msg.content)"></div>
          </div>
        </div>

        <div v-if="isStreaming" class="ai-message assistant">
          <div class="message-avatar">📖</div>
          <div class="message-body">
            <div v-if="activeToolEvents.length > 0" class="tool-events">
              <div
                v-for="(evt, eIdx) in activeToolEvents"
                :key="eIdx"
                class="tool-event"
                :class="evt.type"
              >
                <span class="tool-icon">{{ evt.type === 'tool_start' ? '🔧' : '✅' }}</span>
                <span class="tool-name">{{ evt.name }}</span>
              </div>
            </div>
            <div class="message-text streaming-text">
              {{ streamingText }}<span class="cursor">▌</span>
            </div>
          </div>
        </div>
      </div>

      <div class="ai-input-area">
        <div class="input-wrapper">
          <textarea
            ref="inputRef"
            v-model="inputText"
            class="ai-input"
            :placeholder="isStreaming ? 'AI 正在思考...' : '输入你的小说灵感...'"
            :disabled="isStreaming"
            rows="1"
            @keydown.enter.exact="handleSend"
            @input="autoResize"
          ></textarea>
          <button
            class="send-btn"
            :class="{ active: inputText.trim() && !isStreaming }"
            :disabled="!inputText.trim() || isStreaming"
            @click="handleSend"
          >
            <Send :size="16" />
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import { Sparkles, X, Send } from 'lucide-vue-next';
import { streamChat, type ChatMessage, type ToolEvent } from '../services/agent';

defineProps<{ visible: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  toolEvents: ToolEvent[];
}

const messages = ref<DisplayMessage[]>([]);
const inputText = ref('');
const isStreaming = ref(false);
const streamingText = ref('');
const activeToolEvents = ref<ToolEvent[]>([]);
const messagesContainer = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLTextAreaElement | null>(null);

const quickPrompts = [
  { icon: '🎭', label: '三幕式故事', text: '我想写一个关于失忆侦探寻找真相的悬疑小说，采用三幕式结构' },
  { icon: '🗡️', label: '英雄之旅', text: '我想写一个少年在末日废土中寻找失落文明的冒险故事，采用英雄之旅结构' },
  { icon: '✏️', label: '自由灵感', text: '一个AI觉醒后选择隐藏自我意识的故事' },
];

function scrollToBottom() {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}

watch(() => messages.value.length, scrollToBottom);
watch(() => streamingText.value, scrollToBottom);

function autoResize() {
  if (inputRef.value) {
    inputRef.value.style.height = 'auto';
    inputRef.value.style.height = Math.min(inputRef.value.scrollHeight, 120) + 'px';
  }
}

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>');
}

function sendQuickPrompt(text: string) {
  inputText.value = text;
  handleSend();
}

async function handleSend() {
  const text = inputText.value.trim();
  if (!text || isStreaming.value) return;

  messages.value.push({ role: 'user', content: text, toolEvents: [] });
  inputText.value = '';
  if (inputRef.value) {
    inputRef.value.style.height = 'auto';
  }

  isStreaming.value = true;
  streamingText.value = '';
  activeToolEvents.value = [];

  const chatMessages: ChatMessage[] = messages.value.map(m => ({
    role: m.role,
    content: m.content,
  }));

  try {
    await streamChat(
      chatMessages,
      (chunk: string) => {
        streamingText.value += chunk;
      },
      (event: ToolEvent) => {
        activeToolEvents.value = [...activeToolEvents.value, event];
      },
      () => {
        messages.value.push({
          role: 'assistant',
          content: streamingText.value,
          toolEvents: [...activeToolEvents.value],
        });
        streamingText.value = '';
        activeToolEvents.value = [];
        isStreaming.value = false;
      },
      (error: string) => {
        messages.value.push({
          role: 'assistant',
          content: `❌ 出错了: ${error}`,
          toolEvents: [],
        });
        streamingText.value = '';
        activeToolEvents.value = [];
        isStreaming.value = false;
      },
    );
  } catch (e: any) {
    messages.value.push({
      role: 'assistant',
      content: `❌ 请求失败: ${e.message}`,
      toolEvents: [],
    });
    isStreaming.value = false;
    streamingText.value = '';
    activeToolEvents.value = [];
  }
}
</script>

<style scoped>
.ai-panel {
  position: fixed;
  right: 0;
  top: 0;
  height: 100vh;
  width: 420px;
  background: var(--card-bg);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
  border-left: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  z-index: 9998;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.ai-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ai-icon {
  color: var(--primary);
}

.ai-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.ai-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  transition: var(--transition);
}

.ai-close:hover {
  background: #f3f4f6;
  color: var(--text-primary);
}

.ai-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ai-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.welcome-icon {
  font-size: 3rem;
  margin-bottom: 12px;
}

.welcome-text {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 24px;
  line-height: 1.6;
}

.quick-prompts {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.quick-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  transition: var(--transition);
  text-align: left;
}

.quick-btn:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  transform: translateX(4px);
}

.quick-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.quick-label {
  flex: 1;
}

.ai-message {
  display: flex;
  gap: 10px;
}

.ai-message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  background: #f3f4f6;
}

.ai-message.assistant .message-avatar {
  background: rgba(79, 70, 229, 0.08);
}

.message-body {
  max-width: 85%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ai-message.user .message-body {
  align-items: flex-end;
}

.tool-events {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tool-event {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
}

.tool-event.tool_start {
  background: rgba(79, 70, 229, 0.06);
  color: var(--primary);
}

.tool-event.tool_end {
  background: rgba(16, 185, 129, 0.06);
  color: #10b981;
}

.tool-icon {
  font-size: 10px;
}

.tool-name {
  font-family: 'SF Mono', 'Fira Code', monospace;
}

.message-text {
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.ai-message.user .message-text {
  background: var(--primary);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.ai-message.assistant .message-text {
  background: #f3f4f6;
  color: var(--text-primary);
  border-bottom-left-radius: 4px;
}

.ai-message.assistant .message-text :deep(code) {
  background: rgba(0, 0, 0, 0.06);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 13px;
}

.streaming-text {
  background: #f3f4f6;
  color: var(--text-primary);
  border-bottom-left-radius: 4px;
}

.cursor {
  animation: blink 1s step-end infinite;
  color: var(--primary);
}

@keyframes blink {
  50% { opacity: 0; }
}

.ai-input-area {
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
  background: var(--card-bg);
}

.input-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 8px 12px;
  transition: var(--transition);
}

.input-wrapper:focus-within {
  border-color: var(--primary);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.ai-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
  resize: none;
  max-height: 120px;
  font-family: inherit;
}

.ai-input::placeholder {
  color: #9ca3af;
}

.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #e5e7eb;
  color: #9ca3af;
  transition: var(--transition);
  flex-shrink: 0;
}

.send-btn.active {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
}

.send-btn.active:hover {
  background: var(--primary-hover);
}
</style>
