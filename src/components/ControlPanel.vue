<template>
  <div class="control-panel">
    <!-- 主操作区域 -->
    <div class="control-actions" v-if="hasImage">
      <!-- 裁剪操作 -->
      <button v-if="cropReady" class="btn crop-btn" @click="handleCrop" :disabled="isProcessing">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <path d="M23 4v6h-6M1 20v-6h6M23 14v6h-6M1 10V4h6" />
        </svg>
        <span>{{ isProcessing ? '裁剪中...' : '导出裁剪' }}</span>
      </button>

      <button
        v-else
        class="btn btn-secondary"
        :disabled="!hasFirstAnchor"
        @click="handleCancelSelect"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        取消选择
      </button>

      <!-- 重置和撤销 -->
      <button class="btn btn-secondary" @click="handleReset" :disabled="!hasAnchors">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" />
          <path d="M3 3v9h9" />
        </svg>
        重置
      </button>

      <button class="btn btn-secondary" @click="handleUndo" :disabled="!canUndo">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M3 7v6h6M21 17a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74" />
        </svg>
        撤销
      </button>
    </div>

    <!-- 坐标显示开关 -->
    <div class="toggle-container" v-if="hasImage">
      <label class="toggle-switch">
        <input
          type="checkbox"
          :checked="showCoordinates"
          @change="$emit('update:show-coordinates', ($event.target as HTMLInputElement).checked)"
        />
        <span class="toggle-slider"></span>
        <span class="toggle-label">显示坐标</span>
      </label>
    </div>

    <!-- 提示信息 -->
    <div class="info-box" v-if="hasImage && !cropReady">
      <div class="info-content">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span>{{ infoText }}</span>
      </div>
      <div class="shortcuts">
        <span v-for="(desc, index) in shortcutDescriptions" :key="index" class="shortcut-tag">
          {{ desc }}
        </span>
      </div>
    </div>

    <!-- 成功消息 -->
    <div v-if="successMessage" class="message success fade-in">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {{ successMessage }}
    </div>

    <!-- 错误消息 -->
    <div v-if="errorMessage" class="message error fade-in">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { createShortcutTooltip } from '../composables/useKeyboard'
import type { AnchorStatus } from '../types'

const props = defineProps<{
  hasImage?: boolean
  cropReady?: boolean
  hasFirstAnchor?: boolean
  hasAnchors?: boolean
  anchorStatus?: AnchorStatus
  isProcessing?: boolean
  showCoordinates?: boolean
  canUndo?: boolean
  successMessage?: string
  errorMessage?: string
}>()

const emit = defineEmits<{
  (e: 'crop'): void
  (e: 'reset'): void
  (e: 'undo'): void
  (e: 'cancel-select'): void
  (e: 'update:show-coordinates', value: boolean): void
}>()

// 计算属性
const infoText = computed(() => {
  if (!props.hasImage) return ''
  if (!props.hasFirstAnchor) return '点击图片设置裁剪区域的左上角点'
  if (!props.cropReady) return '再次点击设置右下角点，或直接拖动调整'
  return '点击"导出裁剪"按钮保存图片'
})

// 键盘快捷键描述
const shortcutDescriptions = computed(() => {
  const descriptions: string[] = []

  if (props.hasImage) {
    if (!props.cropReady) {
      descriptions.push(createShortcutTooltip('cancel'))
    }
    if (props.hasAnchors) {
      descriptions.push(createShortcutTooltip('confirm'))
      descriptions.push(createShortcutTooltip('reset'))
      descriptions.push(createShortcutTooltip('undo'))
    }
  }

  return descriptions.slice(0, 3) // 最多显示3个，避免拥挤
})

// 方法
const handleCrop = () => {
  emit('crop')
}

const handleReset = () => {
  emit('reset')
}

const handleUndo = () => {
  emit('undo')
}

const handleCancelSelect = () => {
  emit('cancel-select')
}
</script>

<style scoped>
.control-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

/* 主操作按钮区域 */
.control-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  padding: 0.85rem 1.5rem;
  border-radius: var(--border-radius-md);
  border: none;
  cursor: pointer;
  transition: all var(--transition-medium);
  background: var(--color-primary);
  color: var(--color-dark);
  font-size: 0.95rem;
  box-shadow: var(--shadow-soft);
  min-height: 44px; /* 触摸友好 */
}

.btn:hover {
  background: var(--color-primary-dark);
  transform: translateY(-2px);
  box-shadow: var(--shadow-medium);
}

.btn:active {
  transform: translateY(0);
  box-shadow: var(--shadow-soft);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  background: var(--color-primary);
}

.btn svg {
  width: 18px;
  height: 18px;
}

/* 特殊按钮样式 */
.btn.crop-btn {
  background: var(--color-dark);
  color: white;
  font-weight: 700;
}

.btn.crop-btn:hover {
  background: #1a3a30;
  transform: translateY(-2px) scale(1.02);
}

/* 次要按钮 */
.btn-secondary {
  background: white;
  color: var(--color-text);
  border: 2px solid var(--color-primary);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-primary-light);
  color: var(--color-dark);
}

/* 开关容器 */
.toggle-container {
  display: flex;
  justify-content: center;
}

.toggle-switch {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  user-select: none;
}

.toggle-switch input {
  display: none;
}

.toggle-slider {
  width: 48px;
  height: 24px;
  background: rgba(168, 230, 207, 0.3);
  border-radius: 24px;
  position: relative;
  transition: all var(--transition-medium);
  border: 2px solid var(--color-primary);
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 2px;
  top: 50%;
  transform: translateY(-50%);
  background: white;
  border-radius: 50%;
  transition: all var(--transition-medium);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-switch input:checked + .toggle-slider {
  background: var(--color-primary);
}

.toggle-switch input:checked + .toggle-slider::before {
  left: calc(100% - 20px);
  background: var(--color-dark);
}

.toggle-label {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.9rem;
}

/* 信息提示框 */
.info-box {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius-md);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.info-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-light);
  font-size: 0.9rem;
  line-height: 1.4;
}

.info-content svg {
  flex-shrink: 0;
  color: var(--color-primary-dark);
}

/* 快捷键标签 */
.shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.shortcut-tag {
  background: rgba(168, 230, 207, 0.15);
  color: var(--color-dark);
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
  border: 1px solid rgba(168, 230, 207, 0.3);
}

/* 消息提示 */
.message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: var(--border-radius-md);
  font-weight: 600;
  font-size: 0.9rem;
  align-items: center;
  justify-content: center;
}

.message svg {
  flex-shrink: 0;
}

.message.success {
  background: rgba(168, 230, 207, 0.15);
  border: 1px solid rgba(168, 230, 207, 0.4);
  color: var(--color-dark);
}

.message.error {
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid rgba(231, 76, 60, 0.3);
  color: #c0392b;
}

/* 动画 */
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation: slideDown 0.3s ease forwards;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .control-actions {
    gap: 0.5rem;
  }

  .btn {
    padding: 0.75rem 1rem;
    font-size: 0.85rem;
    min-height: 40px;
  }

  .btn svg {
    width: 16px;
    height: 16px;
  }

  .info-box {
    padding: 0.75rem;
  }

  .info-content {
    font-size: 0.85rem;
  }

  .shortcuts {
    gap: 0.35rem;
  }

  .shortcut-tag {
    font-size: 0.7rem;
    padding: 0.2rem 0.4rem;
  }
}

/* 点击反馈 */
.btn:active {
  transform: scale(0.98);
}

/* 禁用状态下的视觉提示 */
.btn:disabled:hover {
  transform: none;
  background: var(--color-primary);
}

.btn:disabled svg {
  opacity: 0.6;
}

/* 悬停时的图标颜色变化 */
.btn:hover svg {
  stroke: currentColor;
}

/* 紧急按钮的特殊状态 */
.btn.crop-btn:disabled {
  background: #95a5a6;
  color: white;
}

/* 微交互 - 按钮呼吸效果 */
.btn.crop-btn:not(:disabled) {
  animation: buttonPulse 3s ease-in-out infinite;
}

@keyframes buttonPulse {
  0%,
  100% {
    box-shadow: var(--shadow-soft);
  }
  50% {
    box-shadow: 0 4px 20px rgba(45, 90, 74, 0.25);
  }
}

/* 无障碍增强 */
.btn:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}

.toggle-switch:focus-within .toggle-slider {
  box-shadow: var(--focus-ring);
}
</style>
