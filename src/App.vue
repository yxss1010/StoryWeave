<template>
  <BookshelfView
    v-if="currentView === 'bookshelf'"
    @open-book="openBook"
    @toggle-ai="toggleAiPanel"
  />

  <div v-else-if="currentView === 'editor'" class="editor-page">
    <header class="editor-header">
      <button class="btn-back" @click="backToBookshelf">
        <ArrowLeft :size="18" />
        <span>返回</span>
      </button>
      <h1 class="editor-title">{{ currentBook?.title || '未命名书籍' }}</h1>
      <div class="header-actions">
        <button class="btn-icon" :class="{ 'btn-icon-active': showAiPanel }" @click="toggleAiPanel" title="AI 创作助手">
          <Sparkles :size="18" />
        </button>
        <button class="btn-icon" @click="saveBook" title="保存">
          <Save :size="18" />
        </button>
      </div>
    </header>

    <div class="editor-body">
      <aside class="toolbar">
        <button class="toolbar-btn" :disabled="isAiStreaming" @click="addNode('volume')">
          <BookOpen :size="18" />
          <span>添加卷</span>
        </button>
        <button class="toolbar-btn" :disabled="isAiStreaming" @click="addNode('act')">
          <Drama :size="18" />
          <span>添加幕</span>
        </button>
        <button class="toolbar-btn" :disabled="isAiStreaming" @click="addNode('scene')">
          <Clapperboard :size="18" />
          <span>添加场景</span>
        </button>
        <div class="toolbar-divider"></div>
        <button class="toolbar-btn toolbar-btn-primary" :disabled="isAiStreaming" @click="autoLayout">
          <Sparkles :size="18" />
          <span>自动排列</span>
        </button>
      </aside>

      <div class="canvas-wrapper">
        <VueFlow
          v-model:nodes="nodes"
          v-model:edges="edges"
          class="vue-flow-container"
          :delete-key-code="null"
          :connect-on-click="false"
          :snap-to-grid="false"
          :is-valid-connection="() => true"
          :default-edge-options="{ type: 'smoothstep' }"
          @node-click="handleNodeClick"
          @edge-click="handleEdgeClick"
          @connect="handleConnect"
          @connect-start="handleConnectStart"
          @connect-end="handleConnectEnd"
          @nodes-change="handleNodesChange"
        >
          <Background
            pattern-color="#d1d5db"
            :gap="24"
            :size="1"
          />
          <Controls class="custom-controls" />
          <MiniMap class="custom-minimap" />

          <template #node-plotNode="{ id, data, selected }">
            <PlotNode
              :id="id"
              :data="data as PlotNodeData"
              :selected="selected"
            />
          </template>
        </VueFlow>

        <div v-if="nodes.length === 0 && !isAiStreaming" class="canvas-empty">
          <FileText :size="48" :stroke-width="1" />
          <p>点击左侧工具栏添加节点，或点击右上角 ✨ 使用 AI 生成大纲</p>
        </div>

        <div v-if="isAiStreaming" class="ai-working-overlay">
          <div class="ai-working-content">
            <div class="ai-working-spinner"></div>
            <p class="ai-working-text">AI 正在创作中...</p>
            <p class="ai-working-sub">大纲生成完成后将自动刷新</p>
          </div>
        </div>
      </div>
    </div>

    <AiPanel
      ref="aiPanelRef"
      :visible="showAiPanel"
      :book-title="currentBook?.title || null"
      @close="showAiPanel = false"
    />

    <EditorPanel
      v-if="selectedNode"
      :node-data="selectedNode.data as PlotNodeData"
      :all-nodes="nodes"
      :current-node-id="selectedNode.id"
      @close="closeEditor"
      @delete="requestDeleteNode"
      @update-parent="handleUpdateParent"
    />

    <ConfirmModal
      v-if="showDeleteConfirm"
      :title="`确定删除节点「${selectedNode?.data?.title || ''}」吗？删除后无法恢复。`"
      @close="showDeleteConfirm = false"
      @confirm="confirmDeleteNode"
    />

    <Transition name="toast">
      <div v-if="showToast" class="toast toast-error">{{ toastMessage }}</div>
    </Transition>

    <Transition name="toast">
      <div v-if="showSaveSuccess" class="toast toast-success">保存成功！</div>
    </Transition>

    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <span>加载中...</span>
    </div>
  </div>

  <AiPanel
    v-if="currentView === 'bookshelf'"
    ref="aiPanelRefBookshelf"
    :visible="showAiPanel"
    :book-title="null"
    @close="showAiPanel = false"
  />
</template>

<script setup lang="ts">
import { ref, watch, provide, onMounted, onUnmounted, nextTick } from 'vue';
import { VueFlow, useVueFlow } from '@vue-flow/core';
import { Background } from '@vue-flow/background';
import { Controls } from '@vue-flow/controls';
import { MiniMap } from '@vue-flow/minimap';
import '@vue-flow/core/dist/style.css';
import '@vue-flow/controls/dist/style.css';
import '@vue-flow/minimap/dist/style.css';
import type { Node, Edge, NodeMouseEvent, Connection, NodeChange } from '@vue-flow/core';
import { ArrowLeft, Save, BookOpen, Drama, Clapperboard, Sparkles, FileText } from 'lucide-vue-next';
import PlotNode from './components/PlotNode.vue';
import EditorPanel from './components/EditorPanel.vue';
import BookshelfView from './components/BookshelfView.vue';
import ConfirmModal from './components/ConfirmModal.vue';
import AiPanel from './components/AiPanel.vue';
import { loadBookData, saveBookData } from './services/tauri';
import type { BookMetadata } from './services/tauri';
import { useAiChat } from './composables/useAiChat';
import dagre from 'dagre';

interface BasePlotNodeData {
  title: string;
  type: 'volume' | 'act' | 'scene';
  change_before: string;
  change_after: string;
}

interface VolumeNodeData extends BasePlotNodeData {
  type: 'volume';
  volume_number: number;
  summary: string;
}

interface ActNodeData extends BasePlotNodeData {
  type: 'act';
  act_number: 1 | 2 | 3;
  conflict: string;
  volume_id?: string;
}

interface SceneNodeData extends BasePlotNodeData {
  type: 'scene';
  location: string;
  characters: string[];
  act_id?: string;
}

type PlotNodeData = VolumeNodeData | ActNodeData | SceneNodeData;

const currentView = ref<'bookshelf' | 'editor'>('bookshelf');
const currentBook = ref<BookMetadata | null>(null);

const nodes = ref<Node[]>([]);
const edges = ref<Edge[]>([]);

const { addEdges, applyNodeChanges } = useVueFlow();

const selectedNode = ref<Node | null>(null);
const selectedEdge = ref<Edge | null>(null);
const showToast = ref(false);
const toastMessage = ref('');
let skipAutoSave = true;
const showSaveSuccess = ref(false);
const isLoading = ref(false);
const showDeleteConfirm = ref(false);
const showAiPanel = ref(false);

const { isStreaming: isAiStreaming } = useAiChat();
const aiPanelRef = ref<InstanceType<typeof AiPanel> | null>(null);
const aiPanelRefBookshelf = ref<InstanceType<typeof AiPanel> | null>(null);

const toggleAiPanel = () => {
  showAiPanel.value = !showAiPanel.value;
  if (showAiPanel.value) {
    nextTick(() => {
      if (currentView.value === 'bookshelf') {
        aiPanelRefBookshelf.value?.switchBook(null);
      } else {
        aiPanelRef.value?.switchBook(currentBook.value?.id || null);
      }
    });
  }
};

const getNodeTitle = (id: string): string => {
  const node = nodes.value.find(n => n.id === id);
  return node?.data?.title || '未知';
};
provide('getNodeTitle', getNodeTitle);

const handleNodeClick = (event: NodeMouseEvent) => {
  selectedNode.value = event.node;
  selectedEdge.value = null;
};

const handleEdgeClick = (event: { edge: Edge }) => {
  selectedEdge.value = event.edge;
  selectedNode.value = null;
};

const showToastMessage = (message: string) => {
  toastMessage.value = message;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 3000);
};

const handleConnect = (params: Connection) => {
  const sourceNode = nodes.value.find(n => n.id === params.source);
  const targetNode = nodes.value.find(n => n.id === params.target);

  if (!sourceNode || !targetNode) return;

  const sourceType = sourceNode.data.type;
  const targetType = targetNode.data.type;

  if (sourceType === 'volume' && targetType !== 'act') {
    showToastMessage('卷只能连接到幕！');
    return;
  }

  if (sourceType === 'act' && targetType !== 'scene') {
    showToastMessage('幕只能连接到场景！');
    return;
  }

  if (sourceType === 'scene') {
    showToastMessage('场景不能连接其他节点！');
    return;
  }

  if (targetType === 'volume') {
    showToastMessage('卷不能被其他节点连接！');
    return;
  }

  if (sourceType === 'volume' && targetType === 'act') {
    targetNode.data.volume_id = params.source;
  }

  if (sourceType === 'act' && targetType === 'scene') {
    targetNode.data.act_id = params.source;
  }

  const newEdge: Edge = {
    id: `e-${params.source}-${params.target}-${Date.now()}`,
    source: params.source,
    target: params.target,
    sourceHandle: params.sourceHandle,
    targetHandle: params.targetHandle,
    type: 'smoothstep',
  };

  addEdges([newEdge]);
};

const handleConnectStart = (params: { event?: MouseEvent; nodeId?: string; handleId?: string | null; handleType?: 'source' | 'target' }) => {
  console.log('Connection started:', params.nodeId);
};

const handleConnectEnd = (_event?: MouseEvent) => {
  console.log('Connection ended');
};

const handleNodesChange = (changes: NodeChange[]) => {
  const removeChanges = changes.filter(c => c.type === 'remove');
  if (removeChanges.length > 0) {
    return;
  }
  applyNodeChanges(changes);
};

const handleKeyDown = (event: KeyboardEvent) => {
  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNode.value) {
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) {
      return;
    }
    event.preventDefault();
    requestDeleteNode();
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});

const closeEditor = () => {
  selectedNode.value = null;
};

const handleUpdateParent = (parentId: string, _parentType: 'volume' | 'act') => {
  if (!selectedNode.value) return;

  const currentNodeId = selectedNode.value.id;

  edges.value = edges.value.filter(edge => edge.target !== currentNodeId);

  if (!parentId) return;

  const newEdge: Edge = {
    id: `e-${parentId}-${currentNodeId}-${Date.now()}`,
    source: parentId,
    target: currentNodeId,
    type: 'smoothstep',
  };

  edges.value = [...edges.value, newEdge];
};

const addNode = (type: 'volume' | 'act' | 'scene') => {
  const id = Date.now().toString();
  const x = Math.round(300 + Math.random() * 200);
  const y = Math.round(200 + Math.random() * 200);

  let newNode: Node;

  if (type === 'volume') {
    newNode = {
      id,
      type: 'plotNode',
      position: { x, y },
      data: {
        title: '新卷',
        type: 'volume',
        volume_number: 1,
        change_before: '',
        change_after: '',
        summary: '',
      },
    };
  } else if (type === 'act') {
    newNode = {
      id,
      type: 'plotNode',
      position: { x, y },
      data: {
        title: '新幕',
        type: 'act',
        act_number: 1,
        change_before: '',
        change_after: '',
        conflict: '',
      },
    };
  } else {
    newNode = {
      id,
      type: 'plotNode',
      position: { x, y },
      data: {
        title: '新场景',
        type: 'scene',
        change_before: '',
        change_after: '',
        location: '',
        characters: [],
      },
    };
  }

  nodes.value = [...nodes.value, newNode];
};

const requestDeleteNode = () => {
  if (selectedNode.value) {
    showDeleteConfirm.value = true;
  }
};

const confirmDeleteNode = () => {
  if (selectedNode.value) {
    nodes.value = nodes.value.filter(node => node.id !== selectedNode.value?.id);
    edges.value = edges.value.filter(
      edge => edge.source !== selectedNode.value?.id && edge.target !== selectedNode.value?.id
    );
    closeEditor();
  }
  showDeleteConfirm.value = false;
};

const normalizeEdges = (edges: Edge[]) => {
  return edges.map((edge, index) => ({
    ...edge,
    id: edge.id || `auto-edge-${edge.source}-${edge.target}-${index}`,
  }));
};

const openBook = async (book: BookMetadata) => {
  skipAutoSave = true;
  isLoading.value = true;
  try {
    const { nodes: loadedNodes, edges: loadedEdges } = await loadBookData(book.file_path);
    nodes.value = loadedNodes;
    edges.value = loadedEdges;
    currentBook.value = book;
    currentView.value = 'editor';

    nextTick(() => {
      aiPanelRef.value?.switchBook(book.id);
    });

    await new Promise(resolve => setTimeout(resolve, 100));
    autoLayout();

    nextTick(() => {
      skipAutoSave = false;
    });
  } catch (error) {
    console.error('Error opening book:', error);
    showToastMessage('打开书籍失败');
    skipAutoSave = false;
  } finally {
    isLoading.value = false;
  }
};

const saveBook = async () => {
  if (!currentBook.value) return;

  isLoading.value = true;
  try {
    await saveBookData(currentBook.value.file_path, nodes.value, edges.value);

    showSaveSuccess.value = true;
    setTimeout(() => {
      showSaveSuccess.value = false;
    }, 2000);
  } catch (error) {
    console.error('Error saving book:', error);
    showToastMessage('保存失败');
  } finally {
    isLoading.value = false;
  }
};

const backToBookshelf = () => {
  currentView.value = 'bookshelf';
  currentBook.value = null;
  nodes.value = [];
  edges.value = [];
  selectedNode.value = null;
  selectedEdge.value = null;
  showAiPanel.value = false;
};

watch(isAiStreaming, async (streaming, wasStreaming) => {
  if (wasStreaming && !streaming && currentBook.value && currentView.value === 'editor') {
    skipAutoSave = true;
    try {
      const { nodes: loadedNodes, edges: loadedEdges } = await loadBookData(currentBook.value.file_path);
      nodes.value = loadedNodes;
      edges.value = loadedEdges;
      selectedNode.value = null;
      await new Promise(resolve => setTimeout(resolve, 100));
      autoLayout();
    } catch (error) {
      console.error('Error reloading outline after AI:', error);
    } finally {
      nextTick(() => {
        skipAutoSave = false;
      });
    }
  }
});

watch(
  [() => nodes.value, () => edges.value],
  async (newValues) => {
    if (skipAutoSave || isLoading.value || !currentBook.value) return;
    await debouncedSaveBook(newValues[0], newValues[1]);
  },
  { deep: true }
);

const autoLayout = () => {
  skipAutoSave = true;
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'TB',
    align: 'UL',
    nodesep: 100,
    ranksep: 150,
  });

  g.setDefaultEdgeLabel(() => ({}));

  nodes.value.forEach(node => {
    g.setNode(node.id, { width: 280, height: 280 });
  });

  edges.value.forEach(edge => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const newNodes = nodes.value.map(node => {
    const nodeWithPosition = g.node(node.id);
    return {
      ...node,
      position: {
        x: Math.round(nodeWithPosition.x - 140),
        y: Math.round(nodeWithPosition.y - 140),
      },
    };
  });

  nodes.value = [...newNodes];

  nextTick(() => {
    skipAutoSave = false;
  });
};

const debounce = (func: Function, delay: number) => {
  let timeoutId: any;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

const debouncedSaveBook = debounce(async (nodes: Node[], edges: Edge[]) => {
  if (!currentBook.value) return;

  try {
    const safeEdges = normalizeEdges(edges);
    await saveBookData(currentBook.value.file_path, nodes, safeEdges);
  } catch (error) {
    console.error('Error saving book:', error);
  }
}, 1000);
</script>

<style scoped>
.editor-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-color);
}

.editor-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 24px;
  background: var(--card-bg);
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
  z-index: 40;
}

.btn-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #f3f4f6;
  color: var(--text-secondary);
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  transition: var(--transition);
}

.btn-back:hover {
  background: #e5e7eb;
  color: var(--text-primary);
}

.editor-title {
  flex: 1;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #f3f4f6;
  color: var(--text-secondary);
  transition: var(--transition);
}

.btn-icon:hover {
  background: #e5e7eb;
  color: var(--primary);
}

.btn-icon-active {
  background: rgba(79, 70, 229, 0.1);
  color: var(--primary);
}

.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.toolbar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 12px;
  background: var(--card-bg);
  border-right: 1px solid #e5e7eb;
  flex-shrink: 0;
  z-index: 30;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #f3f4f6;
  border-radius: 10px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  transition: var(--transition);
  white-space: nowrap;
}

.toolbar-btn:hover {
  background: #e5e7eb;
  color: var(--text-primary);
  transform: translateX(2px);
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.toolbar-btn-primary {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
}

.toolbar-btn-primary:hover {
  background: var(--primary-hover);
  color: #fff;
  transform: translateX(2px);
}

.toolbar-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 4px 0;
}

.canvas-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.vue-flow-container {
  width: 100%;
  height: 100%;
}

.canvas-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-secondary);
  font-size: 16px;
  pointer-events: none;
}

.ai-working-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.ai-working-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.ai-working-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: ai-spin 0.8s linear infinite;
}

@keyframes ai-spin {
  to { transform: rotate(360deg); }
}

.ai-working-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.ai-working-sub {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
}

.toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  z-index: 9999;
  box-shadow: var(--shadow-lg);
}

.toast-error {
  background: var(--danger);
  color: #fff;
}

.toast-success {
  background: #10b981;
  color: #fff;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-12px);
}

.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  z-index: 9999;
  color: var(--text-secondary);
  font-size: 14px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e5e7eb;
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

:deep(.custom-controls) {
  left: 1rem !important;
  bottom: 1rem !important;
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 12px !important;
  box-shadow: var(--shadow-md) !important;
  padding: 0.5rem !important;
  gap: 0.25rem !important;
}

:deep(.custom-controls .vue-flow__controls-button) {
  background: #f9fafb !important;
  border: 1px solid #e5e7eb !important;
  color: var(--text-secondary) !important;
  border-radius: 8px !important;
  margin-bottom: 0.25rem !important;
  box-shadow: none !important;
  transition: var(--transition) !important;
}

:deep(.custom-controls .vue-flow__controls-button:hover) {
  background: #f3f4f6 !important;
  border-color: #d1d5db !important;
}

:deep(.custom-controls .vue-flow__controls-button svg) {
  fill: var(--text-secondary) !important;
}

:deep(.custom-minimap) {
  right: 1rem !important;
  bottom: 1rem !important;
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid #e5e7eb !important;
  border-radius: 12px !important;
  box-shadow: var(--shadow-md) !important;
}

:deep(.vue-flow__edge-path) {
  stroke: #9ca3af;
  stroke-width: 2;
}

:deep(.vue-flow__edge.selected path) {
  stroke: var(--primary);
  stroke-width: 3;
}

:deep(.vue-flow__node.selected) {
  z-index: 10;
}

:deep(.vue-flow__node) {
  transition: none !important;
}

:deep(.vue-flow__background) {
  opacity: 0.5;
}

:deep(.vue-flow__pane) {
  cursor: grab;
}

:deep(.vue-flow__pane.dragging) {
  cursor: grabbing;
}

:deep(.vue-flow__node-plotNode) {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  min-width: 260px !important;
  max-width: 260px !important;
  width: 260px !important;
  height: auto !important;
  box-sizing: border-box !important;
  overflow: visible !important;
  transition: none !important;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

:deep(.vue-flow__node-plotNode > div) {
  width: 100% !important;
  height: 100% !important;
  box-sizing: border-box !important;
  padding: 24px !important;
  transition: box-shadow 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
}

:deep(.vue-flow__node-plotNode > div:hover) {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
}
</style>
