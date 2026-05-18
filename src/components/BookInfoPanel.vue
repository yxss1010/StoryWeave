<template>
  <div class="book-info-panel">

    <div class="panel-header">
      <h2 class="header-title">
        <BookOpen :size="18" />
        书籍信息
      </h2>
      <button class="close-btn" @click="$emit('close')" title="关闭">
        <X :size="18" />
      </button>
    </div>

    <form @submit.prevent class="panel-form">
      <div class="form-group">
        <label class="form-label">标题</label>
        <input
          type="text"
          class="form-input"
          v-model="localTitle"
          placeholder="输入小说标题..."
        />
      </div>

      <div class="form-group">
        <div class="form-label-row">
          <label class="form-label">简介</label>
          <button type="button" class="toggle-btn" @click="synopsisMode = synopsisMode === 'edit' ? 'preview' : 'edit'">
            <component :is="synopsisMode === 'edit' ? Eye : Edit3" :size="13" />
            {{ synopsisMode === 'edit' ? '预览' : '编辑' }}
          </button>
        </div>
        <textarea
          v-if="synopsisMode === 'edit'"
          class="form-textarea"
          v-model="localSynopsis"
          placeholder="描述小说的核心故事、主题和卖点...（支持 Markdown 语法）"
          rows="6"
        ></textarea>
        <div v-else class="form-preview markdown-body" v-html="renderMarkdown(localSynopsis)"></div>
      </div>

      <div class="form-group">
        <div class="form-label-row">
          <label class="form-label">设定</label>
          <button type="button" class="toggle-btn" @click="settingsMode = settingsMode === 'edit' ? 'preview' : 'edit'">
            <component :is="settingsMode === 'edit' ? Eye : Edit3" :size="13" />
            {{ settingsMode === 'edit' ? '预览' : '编辑' }}
          </button>
        </div>
        <textarea
          v-if="settingsMode === 'edit'"
          class="form-textarea form-textarea-lg"
          v-model="localSettings"
          placeholder="世界观、角色设定、力量体系、社会结构、历史背景等...（支持 Markdown 语法）"
          rows="12"
        ></textarea>
        <div v-else class="form-preview form-preview-lg markdown-body" v-html="renderMarkdown(localSettings)"></div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-cancel" @click="$emit('close')">取消</button>
        <button type="button" class="btn-save" @click="handleSave">保存</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { BookOpen, X, Eye, Edit3 } from 'lucide-vue-next';
import { Marked } from 'marked';

const props = defineProps<{
  title: string;
  synopsis: string;
  settings: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', data: { title: string; synopsis: string; settings: string }): void;
}>();

const localTitle = ref(props.title);
const localSynopsis = ref(props.synopsis);
const localSettings = ref(props.settings);

const synopsisMode = ref<'edit' | 'preview'>('preview');
const settingsMode = ref<'edit' | 'preview'>('preview');

watch(() => props.title, (v) => { localTitle.value = v; });
watch(() => props.synopsis, (v) => { localSynopsis.value = v; });
watch(() => props.settings, (v) => { localSettings.value = v; });

const marked = new Marked({
  gfm: true,
  breaks: true,
});

function renderMarkdown(text: string): string {
  if (!text) return '<span class="empty-hint">暂无内容</span>';
  return marked.parse(text) as string;
}

const handleSave = () => {
  emit('save', {
    title: localTitle.value,
    synopsis: localSynopsis.value,
    settings: localSettings.value,
  });
};
</script>

<style scoped>
.book-info-panel {
  width: 720px;
  height: 100%;
  background: #fff;
  border-left: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #fafbfc;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: var(--transition);
}

.close-btn:hover {
  background: #e5e7eb;
  color: var(--text-primary);
}

.panel-form {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border: 1px solid #e5e7eb;
  border-radius: 5px;
  background: #fff;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: var(--transition);
  line-height: 1;
}

.toggle-btn:hover {
  background: #f3f4f6;
  color: var(--text-primary);
  border-color: #d1d5db;
}

.form-input {
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-primary);
  background: #fff;
  transition: var(--transition);
  outline: none;
}

.form-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.form-textarea {
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: var(--text-primary);
  background: #fff;
  transition: var(--transition);
  outline: none;
  resize: vertical;
  line-height: 1.6;
  font-family: inherit;
}

.form-textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.form-textarea-lg {
  min-height: 200px;
}

.form-preview {
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafbfc;
  min-height: 100px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  overflow-y: auto;
}

.form-preview-lg {
  min-height: 200px;
}

.form-preview :deep(.empty-hint) {
  color: #9ca3af;
  font-style: italic;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 0.6em 0 0.4em;
  font-weight: 700;
  line-height: 1.3;
}

.markdown-body :deep(h1) { font-size: 1.25em; }
.markdown-body :deep(h2) { font-size: 1.15em; }
.markdown-body :deep(h3) { font-size: 1.05em; }
.markdown-body :deep(h4) { font-size: 1em; }

.markdown-body :deep(p) {
  margin: 0.4em 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 0.4em 0;
  padding-left: 1.5em;
}

.markdown-body :deep(li) {
  margin: 0.2em 0;
}

.markdown-body :deep(code) {
  background: rgba(0, 0, 0, 0.06);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 13px;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
}

.markdown-body :deep(pre) {
  background: #1e1e2e;
  color: #cdd6f4;
  padding: 12px 14px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0.6em 0;
}

.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
  font-size: 13px;
  color: inherit;
}

.markdown-body :deep(blockquote) {
  border-left: 3px solid var(--primary);
  margin: 0.6em 0;
  padding: 0.3em 0.8em;
  color: var(--text-secondary);
  background: rgba(79, 70, 229, 0.04);
  border-radius: 0 6px 6px 0;
}

.markdown-body :deep(strong) {
  font-weight: 700;
}

.markdown-body :deep(em) {
  font-style: italic;
}

.markdown-body :deep(a) {
  color: var(--primary);
  text-decoration: underline;
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid #e5e7eb;
  margin: 0.8em 0;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  margin: 0.6em 0;
  width: 100%;
  font-size: 13px;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #e5e7eb;
  padding: 6px 10px;
  text-align: left;
}

.markdown-body :deep(th) {
  background: #f3f4f6;
  font-weight: 600;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding-top: 8px;
  border-top: 1px solid #e5e7eb;
}

.btn-cancel {
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.btn-cancel:hover {
  background: #f3f4f6;
  color: var(--text-primary);
}

.btn-save {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background: var(--primary);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
}

.btn-save:hover {
  background: var(--primary-hover);
}
</style>
