<template>
  <div class="editor-panel" :style="{ width: panelWidth + 'px' }">
    <div class="resize-handle" @mousedown="startResize"></div>
    <div class="editor-header">
      <h2 class="header-title">
        <Pencil :size="18" />
        节点编辑
      </h2>
      <div class="header-actions">
        <button
          class="locate-btn"
          @click="$emit('locate')"
          title="定位到该节点"
        >
          <Crosshair :size="18" />
        </button>
        <button
          class="close-btn"
          @click="$emit('close')"
          title="关闭编辑器"
        >
          <X :size="18" />
        </button>
      </div>
    </div>

    <form @submit.prevent class="editor-form">
      <div class="form-group">
        <label class="form-label">标题</label>
        <input
          type="text"
          class="form-input"
          v-model="nodeData.title"
          placeholder="输入节点标题..."
        />
      </div>

      <div class="form-group">
        <label class="form-label">类型</label>
        <div class="type-selector">
          <button
            v-for="t in typeOptions"
            :key="t.value"
            type="button"
            class="type-btn"
            :class="{ active: nodeData.type === t.value }"
            @click="nodeData.type = t.value"
          >
            <span class="type-icon">{{ t.icon }}</span>
            <span class="type-label">{{ t.label }}</span>
          </button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">描述</label>
        <textarea
          class="form-textarea"
          rows="3"
          v-model="nodeData.description"
          placeholder="节点的整体描述..."
        ></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">转变前</label>
        <textarea
          class="form-textarea"
          rows="2"
          v-model="nodeData.change_before"
          placeholder="转变前的状态..."
        ></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">转变后</label>
        <textarea
          class="form-textarea"
          rows="2"
          v-model="nodeData.change_after"
          placeholder="转变后的状态..."
        ></textarea>
      </div>

      <template v-if="nodeData.type === 'volume'">
        <div class="form-group">
          <label class="form-label">卷次</label>
          <input
            type="number"
            class="form-input"
            v-model.number="(nodeData as VolumeNodeData).volume_number"
            min="1"
            placeholder="卷次（如：1、2、3...）"
          />
        </div>

        <div class="form-group">
          <label class="form-label">卷概要</label>
          <textarea
            class="form-textarea"
            rows="4"
            v-model="(nodeData as VolumeNodeData).summary"
            placeholder="本卷的总体目标..."
          ></textarea>
        </div>
      </template>

      <template v-if="nodeData.type === 'act'">
        <div class="form-group">
          <label class="form-label">所属卷</label>
          <select
            class="form-input"
            :value="(nodeData as ActNodeData).volume_id"
            @change="handleVolumeChange($event)"
          >
            <option value="">-- 请选择所属卷 --</option>
            <option
              v-for="node in volumeNodes"
              :key="node.id"
              :value="node.id"
            >
              第 {{ (node.data as VolumeNodeData).volume_number }} 卷 - {{ node.data.title }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">幕次</label>
          <div class="act-number-selector">
            <button
              v-for="n in [1, 2, 3]"
              :key="n"
              type="button"
              class="act-number-btn"
              :class="{ active: (nodeData as ActNodeData).act_number === n }"
              @click="(nodeData as ActNodeData).act_number = n as 1 | 2 | 3"
            >
              第 {{ n }} 幕
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">核心冲突</label>
          <textarea
            class="form-textarea"
            rows="3"
            v-model="(nodeData as ActNodeData).conflict"
            placeholder="本幕的核心冲突..."
          ></textarea>
        </div>
      </template>

      <template v-if="nodeData.type === 'scene'">
        <div class="form-group">
          <label class="form-label">所属幕</label>
          <select
            class="form-input"
            :value="(nodeData as SceneNodeData).act_id"
            @change="handleActChange($event)"
          >
            <option value="">-- 请选择所属幕 --</option>
            <option
              v-for="node in actNodes"
              :key="node.id"
              :value="node.id"
            >
              第 {{ (node.data as ActNodeData).act_number }} 幕 - {{ node.data.title }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">地点</label>
          <input
            type="text"
            class="form-input"
            v-model="(nodeData as SceneNodeData).location"
            placeholder="场景发生地点..."
          />
        </div>

        <div class="form-group">
          <label class="form-label">人物</label>

          <div v-if="(nodeData as SceneNodeData).characters.length > 0" class="tags-container">
            <span
              v-for="char in (nodeData as SceneNodeData).characters"
              :key="char"
              class="tag-badge"
            >
              {{ char }}
              <button
                type="button"
                class="tag-remove"
                @click="removeCharacter(char)"
                title="删除此人物"
              >
                <X :size="12" />
              </button>
            </span>
          </div>

          <div class="tag-input-wrapper">
            <input
              type="text"
              class="form-input"
              v-model="newCharacter"
              @keyup.enter="addCharacter"
              placeholder="输入人物名后按回车添加..."
            />
          </div>
        </div>
      </template>

      <div class="delete-section">
        <button
          type="button"
          class="delete-btn"
          @click="deleteNode"
        >
          <Trash2 :size="16" />
          <span>删除节点</span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Node } from '@vue-flow/core';
import { Pencil, X, Trash2, Crosshair } from 'lucide-vue-next';

interface BasePlotNodeData {
  title: string;
  type: 'volume' | 'act' | 'scene';
  description: string;
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

const props = defineProps<{
  nodeData: BasePlotNodeData | VolumeNodeData | ActNodeData | SceneNodeData;
  allNodes: Node[];
  currentNodeId?: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'delete'): void;
  (e: 'locate'): void;
  (e: 'updateParent', parentId: string, parentType: 'volume' | 'act'): void;
}>();

const newCharacter = ref('');

const MIN_WIDTH = 320;
const MAX_WIDTH = 640;
const panelWidth = ref(400);

function startResize(e: MouseEvent) {
  e.preventDefault();
  const startX = e.clientX;
  const startWidth = panelWidth.value;

  function onMouseMove(ev: MouseEvent) {
    const delta = startX - ev.clientX;
    panelWidth.value = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

const typeOptions = [
  { value: 'volume' as const, label: '卷', icon: '📚' },
  { value: 'act' as const, label: '幕', icon: '🎭' },
  { value: 'scene' as const, label: '场景', icon: '🎬' },
];

const volumeNodes = computed(() => {
  return props.allNodes.filter(node => node.data.type === 'volume');
});

const actNodes = computed(() => {
  return props.allNodes.filter(node => node.data.type === 'act');
});

const handleVolumeChange = (event: Event) => {
  const select = event.target as HTMLSelectElement;
  const volumeId = select.value;

  (props.nodeData as ActNodeData).volume_id = volumeId || undefined;

  if (props.currentNodeId) {
    emit('updateParent', volumeId, 'volume');
  }
};

const handleActChange = (event: Event) => {
  const select = event.target as HTMLSelectElement;
  const actId = select.value;

  (props.nodeData as SceneNodeData).act_id = actId || undefined;

  if (props.currentNodeId) {
    emit('updateParent', actId, 'act');
  }
};

const addCharacter = () => {
  if (newCharacter.value.trim() && props.nodeData.type === 'scene') {
    const sceneData = props.nodeData as SceneNodeData;
    if (!sceneData.characters.includes(newCharacter.value.trim())) {
      sceneData.characters.push(newCharacter.value.trim());
      newCharacter.value = '';
    }
  }
};

const removeCharacter = (char: string) => {
  if (props.nodeData.type === 'scene') {
    const sceneData = props.nodeData as SceneNodeData;
    sceneData.characters = sceneData.characters.filter(c => c !== char);
  }
};

const deleteNode = () => {
  emit('delete');
};
</script>

<style scoped>
.editor-panel {
  position: fixed;
  right: 0;
  top: 0;
  height: 100vh;
  min-width: 320px;
  max-width: 640px;
  background: var(--card-bg);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
  border-left: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 9999;
}

.resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  z-index: 1;
}

.resize-handle:hover,
.resize-handle:active {
  background: rgba(79, 70, 229, 0.15);
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: var(--card-bg);
  flex-shrink: 0;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.locate-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  transition: var(--transition);
}

.locate-btn:hover {
  background: #eff6ff;
  color: var(--primary);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary);
  transition: var(--transition);
}

.close-btn:hover {
  background: #f3f4f6;
  color: var(--text-primary);
}

.editor-form {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  overflow-y: auto;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
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

.form-input::placeholder {
  color: #9ca3af;
}

.form-input:hover {
  border-color: #d1d5db;
}

.form-input:focus {
  border-color: var(--primary);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.form-textarea {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.6;
  resize: vertical;
  min-height: 60px;
  transition: var(--transition);
  outline: none;
  background: #fafafa;
  box-sizing: border-box;
}

.form-textarea::placeholder {
  color: #9ca3af;
}

.form-textarea:hover {
  border-color: #d1d5db;
}

.form-textarea:focus {
  border-color: var(--primary);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.type-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 12px 8px;
  background: #fafafa;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  color: var(--text-secondary);
  transition: var(--transition);
}

.type-btn:hover {
  border-color: #d1d5db;
  background: #f3f4f6;
  color: var(--text-primary);
}

.type-btn.active {
  background: rgba(79, 70, 229, 0.06);
  border-color: var(--primary);
  color: var(--text-primary);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
}

.type-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.type-label {
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.act-number-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.act-number-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  background: #fafafa;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  color: var(--text-secondary);
  font-size: 0.875rem;
  font-weight: 600;
  transition: var(--transition);
}

.act-number-btn:hover {
  border-color: #d1d5db;
  background: #f3f4f6;
  color: var(--text-primary);
}

.act-number-btn.active {
  background: rgba(79, 70, 229, 0.06);
  border-color: var(--primary);
  color: var(--text-primary);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
  background: #fafafa;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  min-height: 44px;
}

.tag-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 9999px;
  background: rgba(79, 70, 229, 0.08);
  color: var(--primary);
  border: 1px solid rgba(79, 70, 229, 0.2);
  transition: var(--transition);
  white-space: nowrap;
}

.tag-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.tag-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: transparent;
  color: var(--text-secondary);
  transition: var(--transition);
  padding: 0;
}

.tag-remove:hover {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
}

.tag-input-wrapper {
  position: relative;
}

.delete-section {
  margin-top: 8px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px 16px;
  background: rgba(239, 68, 68, 0.06);
  border: 2px solid rgba(239, 68, 68, 0.2);
  border-radius: 10px;
  color: var(--danger);
  font-size: 14px;
  font-weight: 600;
  transition: var(--transition);
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.4);
  transform: translateY(-1px);
}
</style>
