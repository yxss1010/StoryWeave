<template>
  <div class="novel-card" @click="$emit('navigate', novel.id)">
    <button class="delete-btn" @click.stop="$emit('delete', novel.id)" title="删除">
      <Trash2 :size="16" />
    </button>
    <div class="card-cover">
      <img v-if="novel.cover" :src="novel.cover" :alt="novel.title" />
      <div v-else class="cover-placeholder">
        <BookOpen :size="36" :stroke-width="1.2" />
      </div>
    </div>
    <div class="card-info">
      <h3 class="card-title">{{ novel.title }}</h3>
      <p class="card-meta">更新于 {{ formatTimeAgo(novel.last_modified) }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Trash2, BookOpen } from 'lucide-vue-next';
import { useNovels } from '../composables/useNovels';
import type { BookMetadata } from '../services/tauri';

const { formatTimeAgo } = useNovels();

defineProps<{
  novel: BookMetadata;
}>();

defineEmits<{
  (e: 'navigate', id: string): void;
  (e: 'delete', id: string): void;
}>();
</script>

<style scoped>
.novel-card {
  position: relative;
  background: var(--card-bg);
  border-radius: var(--border-radius);
  overflow: hidden;
  cursor: pointer;
  transition: var(--transition);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
}

.novel-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  border-radius: 8px;
  color: var(--text-secondary);
  opacity: 0;
  transition: var(--transition);
  z-index: 2;
}

.novel-card:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: var(--danger);
  background: rgba(239, 68, 68, 0.1);
}

.card-cover {
  width: 100%;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  background: #f0f0f3;
}

.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e8e8f0 0%, #d8d8e8 100%);
  color: #b0b0c0;
}

.card-info {
  padding: 14px 16px 16px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.card-meta {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
