<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-content">
        <h2 class="modal-title">新建小说</h2>

        <div class="form-group">
          <label class="form-label">书名</label>
          <input
            ref="titleInput"
            v-model="title"
            class="form-input"
            type="text"
            placeholder="请输入小说名称"
            maxlength="50"
            @keyup.enter="submit"
          />
        </div>

        <div class="form-group">
          <label class="form-label">封面（可选）</label>
          <div class="cover-upload" @click="triggerUpload">
            <template v-if="coverPreview">
              <img :src="coverPreview" alt="封面预览" class="cover-preview" />
              <div class="cover-overlay">
                <RefreshCw :size="20" />
                <span>更换封面</span>
              </div>
            </template>
            <template v-else>
              <ImagePlus :size="28" :stroke-width="1.5" />
              <span>点击上传封面</span>
            </template>
          </div>
          <p class="cover-hint">建议尺寸：600 x 800 像素，支持 JPG、PNG 格式，不超过 5MB</p>
          <input
            ref="fileInput"
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            class="file-input"
            @change="handleFileChange"
          />
        </div>

        <div class="modal-actions">
          <button class="btn btn-cancel" @click="$emit('close')">取消</button>
          <button class="btn btn-confirm" :disabled="!title.trim()" @click="submit">
            确认创建
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { ImagePlus, RefreshCw } from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'confirm', data: { title: string; cover: string }): void;
}>();

const title = ref('');
const cover = ref('');
const coverPreview = ref('');
const titleInput = ref<HTMLInputElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  await nextTick();
  titleInput.value?.focus();
});

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

function triggerUpload() {
  fileInput.value?.click();
}

function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  if (!ALLOWED_TYPES.includes(file.type)) {
    alert('请上传 JPG 或 PNG 格式的图片');
    target.value = '';
    return;
  }

  if (file.size > MAX_FILE_SIZE) {
    alert('图片大小不能超过 5MB');
    target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const result = event.target?.result as string;
    cover.value = result;
    coverPreview.value = result;
  };
  reader.readAsDataURL(file);
}

function submit() {
  if (!title.value.trim()) return;
  emit('confirm', {
    title: title.value.trim(),
    cover: cover.value,
  });
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.modal-content {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 32px;
  width: 90%;
  max-width: 440px;
  box-shadow: var(--shadow-lg);
  animation: slideUp 0.25s ease;
}

.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 15px;
  color: var(--text-primary);
  background: #fafafa;
  transition: var(--transition);
  outline: none;
  box-sizing: border-box;
}

.form-input:focus {
  border-color: var(--primary);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.cover-upload {
  width: 100%;
  aspect-ratio: 3 / 4;
  max-height: 200px;
  border: 2px dashed #d1d5db;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: var(--transition);
  overflow: hidden;
  position: relative;
}

.cover-upload:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(79, 70, 229, 0.02);
}

.cover-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #fff;
  font-size: 13px;
  opacity: 0;
  transition: var(--transition);
}

.cover-upload:hover .cover-overlay {
  opacity: 1;
}

.file-input {
  display: none;
}

.cover-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 28px;
}

.btn {
  padding: 10px 22px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  transition: var(--transition);
}

.btn-cancel {
  background: #f3f4f6;
  color: var(--text-secondary);
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.btn-confirm {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
}

.btn-confirm:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
