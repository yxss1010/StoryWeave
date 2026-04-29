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
        <label class="form-label">简介</label>
        <textarea
          class="form-textarea"
          v-model="localSynopsis"
          placeholder="描述小说的核心故事、主题和卖点..."
          rows="6"
        ></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">设定</label>
        <textarea
          class="form-textarea form-textarea-lg"
          v-model="localSettings"
          placeholder="世界观、角色设定、力量体系、社会结构、历史背景等..."
          rows="12"
        ></textarea>
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
import { BookOpen, X } from 'lucide-vue-next';

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

watch(() => props.title, (v) => { localTitle.value = v; });
watch(() => props.synopsis, (v) => { localSynopsis.value = v; });
watch(() => props.settings, (v) => { localSettings.value = v; });

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
  width: 360px;
  min-width: 360px;
  height: 100%;
  background: #fff;
  border-left: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

.form-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
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
