import { ref, computed } from 'vue';
import { getBookList, createNewBook, deleteBook, updateBookMetadata } from '../services/tauri';
import type { BookMetadata } from '../services/tauri';

const novels = ref<BookMetadata[]>([]);

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 30) return `${diffDay}天前`;
  return date.toLocaleDateString('zh-CN');
}

export function useNovels() {
  const sortedNovels = computed(() => {
    return [...novels.value].sort(
      (a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime()
    );
  });

  async function loadNovels() {
    novels.value = await getBookList();
  }

  async function addNovel({ title, cover }: { title: string; cover: string }) {
    const novel = await createNewBook(title, cover);
    novels.value.push(novel);
    return novel;
  }

  async function removeNovel(id: string) {
    await deleteBook(id);
    const index = novels.value.findIndex(n => n.id === id);
    if (index !== -1) {
      novels.value.splice(index, 1);
    }
  }

  function getNovelById(id: string) {
    return novels.value.find(n => n.id === id);
  }

  async function updateNovel(id: string, updates: Partial<BookMetadata>) {
    await updateBookMetadata(id, updates);
    const index = novels.value.findIndex(n => n.id === id);
    if (index !== -1) {
      novels.value[index] = { ...novels.value[index], ...updates, last_modified: new Date().toISOString() };
    }
  }

  return {
    novels: sortedNovels,
    loadNovels,
    addNovel,
    removeNovel,
    getNovelById,
    updateNovel,
    formatTimeAgo,
  };
}
