<template>
  <div
    class="rounded-xl relative"
    :class="{
      'volume-node': data.type === 'volume',
      'act-node': data.type === 'act',
      'scene-node': data.type === 'scene',
      'selected-volume': selected && data.type === 'volume',
      'selected-act': selected && data.type === 'act',
      'selected-scene': selected && data.type === 'scene'
    }"
  >
    <Handle
      v-if="data.type !== 'volume'"
      type="target"
      :position="Position.Top"
    />

    <div class="node-header">
      <div
        class="node-icon"
        :class="{
          'icon-volume': data.type === 'volume',
          'icon-act': data.type === 'act',
          'icon-scene': data.type === 'scene'
        }"
      >
        <span v-if="data.type === 'volume'" class="text-xl">📚</span>
        <span v-else-if="data.type === 'act'" class="text-xl">🎭</span>
        <span v-else-if="data.type === 'scene'" class="text-xl">🎬</span>
      </div>
      <div class="node-title-wrapper">
        <h3 class="node-title">{{ data.title }}</h3>
        <span v-if="data.type === 'volume'" class="node-subtitle subtitle-volume">第 {{ (data as VolumeNodeData).volume_number }} 卷</span>
        <span v-else-if="data.type === 'act'" class="node-subtitle subtitle-act">
          第 {{ (data as ActNodeData).act_number }} 幕
          <span v-if="(data as ActNodeData).volume_id" class="parent-link"> · 所属卷: {{ getVolumeTitle((data as ActNodeData).volume_id!) }}</span>
        </span>
        <span v-else-if="data.type === 'scene' && (data as SceneNodeData).act_id" class="node-subtitle subtitle-scene">所属幕: {{ getActTitle((data as SceneNodeData).act_id!) }}</span>
      </div>
    </div>

    <div class="divider" :class="{ 'divider-volume': data.type === 'volume', 'divider-act': data.type === 'act', 'divider-scene': data.type === 'scene' }"></div>

    <div v-if="data.description" class="description-section">
      <div class="section-label">
        <span>📝</span>
        <span>描述</span>
      </div>
      <p class="content-text">{{ data.description }}</p>
    </div>

    <div class="change-section">
      <div class="section-label">
        <span>🔄</span>
        <span>转变</span>
      </div>
      <div class="change-items">
        <div class="change-item">
          <span class="change-label">之前:</span>
          <span class="change-value">{{ data.change_before || '-' }}</span>
        </div>
        <div class="change-item">
          <span class="change-label">之后:</span>
          <span class="change-value">{{ data.change_after || '-' }}</span>
        </div>
      </div>
    </div>

    <div v-if="data.type === 'volume'" class="content-section">
      <div class="section-label">
        <span>📝</span>
        <span>卷概要</span>
      </div>
      <p class="content-text">
        {{ (data as VolumeNodeData).summary || '暂无概要' }}
      </p>
    </div>

    <div v-else-if="data.type === 'act'" class="content-section">
      <div class="section-label">
        <span>⚔️</span>
        <span>核心冲突</span>
      </div>
      <p class="content-text">
        {{ (data as ActNodeData).conflict || '暂无冲突描述' }}
      </p>
    </div>

    <div v-else-if="data.type === 'scene'" class="content-section">
      <div class="scene-info">
        <div class="scene-location-row">
          <div class="section-label">
            <span>📍</span>
            <span>地点</span>
          </div>
          <span class="location-text">{{ (data as SceneNodeData).location || '未知地点' }}</span>
        </div>

        <div v-if="(data as SceneNodeData).characters && (data as SceneNodeData).characters.length > 0" class="scene-characters">
          <div class="scene-characters-row">
            <div class="section-label">
              <span>👥</span>
              <span>人物</span>
            </div>
            <div class="characters-list">
              <span v-for="char in (data as SceneNodeData).characters" :key="char" class="character-tag">
                {{ char }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Handle
      v-if="data.type !== 'scene'"
      type="source"
      :position="Position.Bottom"
    />
  </div>
</template>

<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core';
import { inject } from 'vue';

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

interface Props {
  id: string;
  data: VolumeNodeData | ActNodeData | SceneNodeData;
  selected: boolean;
}

const props = defineProps<Props>();

const getNodeTitle = inject<(id: string) => string>('getNodeTitle', () => '未知');

const getVolumeTitle = (volumeId: string) => {
  return getNodeTitle(volumeId);
};

const getActTitle = (actId: string) => {
  return getNodeTitle(actId);
};
</script>

<style scoped>
.volume-node,
.act-node,
.scene-node {
  padding: 20px;
  border-radius: 12px;
  background: #ffffff;
  border: 2px solid #e5e7eb;
  transition: box-shadow 0.2s ease;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.volume-node {
  border-color: #f59e0b;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.04) 0%, #ffffff 100%);
}

.act-node {
  border-color: #8b5cf6;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.04) 0%, #ffffff 100%);
}

.scene-node {
  border-color: #06b6d4;
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.04) 0%, #ffffff 100%);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.node-icon {
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-volume {
  background: rgba(245, 158, 11, 0.1);
  border: 2px solid rgba(245, 158, 11, 0.3);
}

.icon-act {
  background: rgba(139, 92, 246, 0.1);
  border: 2px solid rgba(139, 92, 246, 0.3);
}

.icon-scene {
  background: rgba(6, 182, 212, 0.1);
  border: 2px solid rgba(6, 182, 212, 0.3);
}

.node-title-wrapper {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.node-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1f2937;
  line-height: 1.3;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.node-subtitle {
  font-size: 0.75rem;
  font-weight: 500;
  margin-top: 2px;
}

.subtitle-volume {
  color: #d97706;
}

.subtitle-act {
  color: #7c3aed;
}

.parent-link {
  color: #9ca3af;
  font-size: 0.7rem;
  margin-left: 4px;
}

.subtitle-scene {
  color: #0891b2;
}

.divider {
  height: 2px;
  margin-bottom: 16px;
  border-radius: 1px;
}

.divider-volume {
  background: linear-gradient(90deg, transparent 0%, #f59e0b 50%, transparent 100%);
}

.divider-act {
  background: linear-gradient(90deg, transparent 0%, #8b5cf6 50%, transparent 100%);
}

.divider-scene {
  background: linear-gradient(90deg, transparent 0%, #06b6d4 50%, transparent 100%);
}

.description-section {
  margin-bottom: 16px;
}

.change-section {
  margin-bottom: 16px;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 8px;
}

.change-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.change-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.change-label {
  font-size: 0.75rem;
  color: #9ca3af;
  width: 36px;
  flex-shrink: 0;
}

.change-value {
  font-size: 0.875rem;
  color: #374151;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content-section {
  margin-bottom: 12px;
}

.content-text {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-align: left;
}

.scene-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.scene-location-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.scene-location-row .section-label {
  margin-bottom: 0;
  flex-shrink: 0;
  min-width: 60px;
}

.location-text {
  font-size: 0.875rem;
  color: #374151;
  margin-top: 0;
  margin-left: 0;
}

.scene-characters {
  margin-top: 0;
}

.scene-characters-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.scene-characters-row .section-label {
  margin-bottom: 0;
  flex-shrink: 0;
  min-width: 60px;
}

.characters-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-left: 0;
}

.character-tag {
  font-size: 0.75rem;
  padding: 3px 10px;
  border-radius: 6px;
  background: rgba(79, 70, 229, 0.08);
  color: var(--primary, #4f46e5);
  border: 1px solid rgba(79, 70, 229, 0.2);
  font-weight: 500;
}

:deep(.vue-flow__handle) {
  width: 12px !important;
  height: 12px !important;
  background: #fff !important;
  border: 2px solid var(--primary, #4f46e5) !important;
  border-radius: 50% !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15) !important;
  cursor: crosshair !important;
  z-index: 9999 !important;
  transition: none !important;
}

:deep(.vue-flow__handle:hover) {
  width: 14px !important;
  height: 14px !important;
  border-color: var(--primary, #4f46e5) !important;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15) !important;
}

:deep(.vue-flow__handle[data-handle-position="top"]) {
  top: -6px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
}

:deep(.vue-flow__handle[data-handle-position="bottom"]) {
  bottom: -6px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
}

.selected-volume {
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.3), 0 4px 12px rgba(245, 158, 11, 0.15);
}

.selected-act {
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.3), 0 4px 12px rgba(139, 92, 246, 0.15);
}

.selected-scene {
  box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.3), 0 4px 12px rgba(6, 182, 212, 0.15);
}
</style>
