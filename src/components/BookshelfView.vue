<template>
  <div class="novel-list-page">
    <header class="page-header">
      <h1 class="page-title">我的小说</h1>
      <button class="btn-create" @click="showCreateModal = true">
        <Plus :size="18" />
        <span>新建小说</span>
      </button>
    </header>

    <main class="novel-grid" v-if="novels.length">
      <NovelCard
        v-for="novel in novels"
        :key="novel.id"
        :novel="novel"
        @navigate="handleNavigate"
        @delete="confirmDelete"
      />
    </main>

    <div class="empty-state" v-else>
      <BookOpen :size="64" :stroke-width="1" />
      <p class="empty-text">还没有小说，点击右上角开始创作吧</p>
    </div>

    <CreateNovelModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @confirm="handleCreate"
    />

    <ConfirmModal
      v-if="showDeleteModal"
      :title="deleteModalTitle"
      @close="showDeleteModal = false"
      @confirm="handleDelete"
    />

    <Transition name="toast">
      <div class="toast" v-if="toastMessage">{{ toastMessage }}</div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Plus, BookOpen } from 'lucide-vue-next';
import { useNovels } from '../composables/useNovels';
import NovelCard from './NovelCard.vue';
import CreateNovelModal from './CreateNovelModal.vue';
import ConfirmModal from './ConfirmModal.vue';
import type { BookMetadata } from '../services/tauri';

const emit = defineEmits<{
  (e: 'open-book', book: BookMetadata): void;
}>();

const { novels, loadNovels, addNovel, removeNovel } = useNovels();

const showCreateModal = ref(false);
const showDeleteModal = ref(false);
const deletingNovelId = ref<string | null>(null);
const toastMessage = ref('');
let toastTimer: ReturnType<typeof setTimeout> | null = null;

const deleteModalTitle = computed(() => {
  const novel = novels.value.find(n => n.id === deletingNovelId.value);
  return novel
    ? `确定要删除《${novel.title}》吗？此操作不可逆。`
    : '';
});

function handleNavigate(novelId: string) {
  const novel = novels.value.find(n => n.id === novelId);
  if (novel) {
    emit('open-book', novel);
  }
}

function confirmDelete(novelId: string) {
  deletingNovelId.value = novelId;
  showDeleteModal.value = true;
}

async function handleDelete() {
  if (deletingNovelId.value) {
    await removeNovel(deletingNovelId.value);
  }
  showDeleteModal.value = false;
  deletingNovelId.value = null;
  showToast('删除成功');
}

async function handleCreate(data: { title: string; cover: string }) {
  const novel = await addNovel(data);
  showCreateModal.value = false;
  emit('open-book', novel);
}

function showToast(msg: string) {
  toastMessage.value = msg;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMessage.value = '';
  }, 2000);
}

onMounted(() => {
  loadNovels();
});
</script>

<style scoped>
.novel-list-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px;
  min-height: 100vh;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.5px;
}

.btn-create {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  background-color: var(--primary);
  color: #fff;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  transition: var(--transition);
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
}

.btn-create:hover {
  background-color: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
}

.novel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120px 0;
  color: var(--text-secondary);
}

.empty-text {
  margin-top: 16px;
  font-size: 16px;
}

.toast {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--text-primary);
  color: #fff;
  padding: 10px 24px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 9999;
  box-shadow: var(--shadow-lg);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}

@media (max-width: 768px) {
  .novel-list-page {
    padding: 20px 16px;
  }

  .page-title {
    font-size: 22px;
  }

  .btn-create {
    padding: 8px 14px;
    font-size: 13px;
  }

  .btn-create span {
    display: none;
  }

  .novel-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 14px;
  }
}
</style>
