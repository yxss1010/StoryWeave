<template>
  <div class="outline-tree">
    <div class="tree-header">
      <h3 class="tree-title">大纲导航</h3>
      <button class="tree-close-btn" @click="$emit('close')" title="关闭">
        <X :size="16" />
      </button>
    </div>

    <div class="tree-search">
      <Search :size="14" class="search-icon" />
      <input
        type="text"
        class="search-input"
        v-model="searchQuery"
        placeholder="搜索节点..."
      />
      <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">
        <X :size="12" />
      </button>
    </div>

    <div class="tree-content">
      <template v-if="treeData.length > 0">
        <div
          v-for="volume in treeData"
          :key="volume.id"
          class="tree-group"
        >
          <div
            class="tree-item tree-volume"
            :class="{ 'tree-item-active': selectedNodeId === volume.id }"
            @click="handleClick(volume.id)"
          >
            <button class="tree-toggle" @click.stop="toggleExpand(volume.id)">
              <ChevronRight :size="14" class="toggle-icon" :class="{ 'toggle-expanded': expandedIds.has(volume.id) }" />
            </button>
            <span class="tree-icon">📚</span>
            <span class="tree-label">{{ volume.title }}</span>
            <span class="tree-badge">第{{ volume.volume_number }}卷</span>
          </div>

          <div v-if="expandedIds.has(volume.id)" class="tree-children">
            <template v-for="act in volume.acts" :key="act.id">
              <div
                class="tree-item tree-act"
                :class="{ 'tree-item-active': selectedNodeId === act.id }"
                @click="handleClick(act.id)"
              >
                <button class="tree-toggle" @click.stop="toggleExpand(act.id)">
                  <ChevronRight :size="14" class="toggle-icon" :class="{ 'toggle-expanded': expandedIds.has(act.id) }" />
                </button>
                <span class="tree-icon">🎭</span>
                <span class="tree-label">{{ act.title }}</span>
                <span class="tree-badge">第{{ act.act_number }}幕</span>
              </div>

              <div v-if="expandedIds.has(act.id)" class="tree-children">
                <div
                  v-for="scene in act.scenes"
                  :key="scene.id"
                  class="tree-item tree-scene"
                  :class="{ 'tree-item-active': selectedNodeId === scene.id }"
                  @click="handleClick(scene.id)"
                >
                  <span class="tree-icon tree-icon-indent">🎬</span>
                  <span class="tree-label">{{ scene.title }}</span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>

      <div v-else class="tree-empty">
        <FileText :size="24" :stroke-width="1" />
        <p>暂无大纲节点</p>
      </div>
    </div>

    <div class="tree-footer">
      <span class="tree-stats">共 {{ totalNodes }} 个节点</span>
      <button class="tree-action-btn" @click="expandAll">全部展开</button>
      <button class="tree-action-btn" @click="collapseAll">全部折叠</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { X, Search, ChevronRight, FileText } from 'lucide-vue-next';
import type { Node, Edge } from '@vue-flow/core';

interface Props {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  close: [];
  navigate: [nodeId: string];
}>();

const searchQuery = ref('');
const expandedIds = ref<Set<string>>(new Set());

interface VolumeItem {
  id: string;
  title: string;
  volume_number: number;
  acts: ActItem[];
}

interface ActItem {
  id: string;
  title: string;
  act_number: number;
  scenes: SceneItem[];
}

interface SceneItem {
  id: string;
  title: string;
}

const treeData = computed<VolumeItem[]>(() => {
  const volumes = props.nodes.filter(n => n.data.type === 'volume');
  const acts = props.nodes.filter(n => n.data.type === 'act');
  const scenes = props.nodes.filter(n => n.data.type === 'scene');
  const query = searchQuery.value.trim().toLowerCase();

  const result: VolumeItem[] = [];

  const sortedVolumes = [...volumes].sort((a, b) => {
    const na = (a.data as any).volume_number || 0;
    const nb = (b.data as any).volume_number || 0;
    return na - nb;
  });

  for (const vol of sortedVolumes) {
    const volActs = props.edges
      .filter(e => e.source === vol.id)
      .map(e => acts.find(a => a.id === e.target))
      .filter(Boolean)
      .sort((a, b) => {
        const na = ((a as Node).data as any).act_number || 0;
        const nb = ((b as Node).data as any).act_number || 0;
        return na - nb;
      }) as Node[];

    const actItems: ActItem[] = [];

    for (const act of volActs) {
      const actScenes = props.edges
        .filter(e => e.source === act.id)
        .map(e => scenes.find(s => s.id === e.target))
        .filter(Boolean) as Node[];

      const sceneItems: SceneItem[] = actScenes.map(s => ({
        id: s.id,
        title: (s.data as any).title || '未命名场景',
      }));

      if (query) {
        const actMatch = ((act.data as any).title || '').toLowerCase().includes(query);
        const sceneMatch = sceneItems.some(s => s.title.toLowerCase().includes(query));
        if (!actMatch && !sceneMatch) continue;
      }

      actItems.push({
        id: act.id,
        title: (act.data as any).title || '未命名幕',
        act_number: (act.data as any).act_number || 0,
        scenes: query ? sceneItems.filter(s => s.title.toLowerCase().includes(query)) : sceneItems,
      });
    }

    if (query) {
      const volMatch = ((vol.data as any).title || '').toLowerCase().includes(query);
      if (!volMatch && actItems.length === 0) continue;
    }

    result.push({
      id: vol.id,
      title: (vol.data as any).title || '未命名卷',
      volume_number: (vol.data as any).volume_number || 0,
      acts: actItems,
    });
  }

  return result;
});

const totalNodes = computed(() => props.nodes.length);

const toggleExpand = (id: string) => {
  const next = new Set(expandedIds.value);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  expandedIds.value = next;
};

const expandAll = () => {
  const next = new Set<string>();
  props.nodes.forEach(n => {
    if (n.data.type === 'volume' || n.data.type === 'act') {
      next.add(n.id);
    }
  });
  expandedIds.value = next;
};

const collapseAll = () => {
  expandedIds.value = new Set();
};

const handleClick = (nodeId: string) => {
  emit('navigate', nodeId);
};

watch(searchQuery, (query) => {
  if (query.trim()) {
    expandAll();
  }
});

watch(() => props.nodes, () => {
  const next = new Set<string>();
  props.nodes.forEach(n => {
    if (n.data.type === 'volume' || n.data.type === 'act') {
      if (expandedIds.value.has(n.id)) {
        next.add(n.id);
      }
    }
  });
  expandedIds.value = next;
}, { deep: false });
</script>

<style scoped>
.outline-tree {
  display: flex;
  flex-direction: column;
  width: 280px;
  min-width: 280px;
  height: 100%;
  background: var(--card-bg, #ffffff);
  border-right: 1px solid #e5e7eb;
  user-select: none;
}

.tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.tree-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0;
}

.tree-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 6px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}

.tree-close-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.tree-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.search-icon {
  color: #9ca3af;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.8125rem;
  color: #1f2937;
  background: transparent;
}

.search-input::placeholder {
  color: #9ca3af;
}

.search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: #e5e7eb;
  border-radius: 50%;
  color: #6b7280;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;
}

.search-clear:hover {
  background: #d1d5db;
  color: #374151;
}

.tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.tree-content::-webkit-scrollbar {
  width: 4px;
}

.tree-content::-webkit-scrollbar-track {
  background: transparent;
}

.tree-content::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}

.tree-group {
  margin-bottom: 2px;
}

.tree-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background 0.12s;
  min-height: 32px;
}

.tree-item:hover {
  background: #f3f4f6;
}

.tree-item-active {
  background: #eff6ff;
}

.tree-item-active:hover {
  background: #dbeafe;
}

.tree-volume {
  padding-left: 8px;
}

.tree-act {
  padding-left: 28px;
}

.tree-scene {
  padding-left: 52px;
}

.tree-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  border-radius: 4px;
  color: #9ca3af;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition: all 0.12s;
}

.tree-toggle:hover {
  background: #e5e7eb;
  color: #6b7280;
}

.toggle-icon {
  transition: transform 0.15s;
}

.toggle-expanded {
  transform: rotate(90deg);
}

.tree-icon {
  font-size: 0.875rem;
  flex-shrink: 0;
  line-height: 1;
}

.tree-icon-indent {
  margin-left: 20px;
}

.tree-label {
  font-size: 0.8125rem;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  line-height: 1.4;
}

.tree-badge {
  font-size: 0.6875rem;
  color: #9ca3af;
  flex-shrink: 0;
  background: #f3f4f6;
  padding: 1px 6px;
  border-radius: 4px;
}

.tree-children {
  overflow: hidden;
}

.tree-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 16px;
  color: #9ca3af;
}

.tree-empty p {
  font-size: 0.8125rem;
  margin: 0;
}

.tree-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.tree-stats {
  font-size: 0.6875rem;
  color: #9ca3af;
  flex: 1;
}

.tree-action-btn {
  font-size: 0.6875rem;
  color: #6b7280;
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  padding: 2px 8px;
  cursor: pointer;
  transition: all 0.12s;
}

.tree-action-btn:hover {
  background: #f3f4f6;
  color: #374151;
  border-color: #d1d5db;
}
</style>
