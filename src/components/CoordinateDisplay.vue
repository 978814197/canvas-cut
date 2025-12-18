<template>
  <div class="coordinate-display" v-if="position">
    <div class="coordinate-box glass">
      <div class="coord-row">
        <span class="coord-label">X:</span>
        <span class="coord-value">{{ Math.round(position.x) }}</span>
      </div>
      <div class="coord-row">
        <span class="coord-label">Y:</span>
        <span class="coord-value">{{ Math.round(position.y) }}</span>
      </div>
      <div v-if="anchorStatus === 'first'" class="status-indicator">
        <span class="dot first"></span>
        <span class="status-text">已设置起点</span>
      </div>
      <div v-else-if="anchorStatus === 'both'" class="status-indicator">
        <span class="dot both"></span>
        <span class="status-text">裁剪区域就绪</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Point } from '../types'
import type { AnchorStatus } from '../types'

defineProps<{
  position: Point
  anchorStatus?: AnchorStatus
}>()
</script>

<style scoped>
.coordinate-display {
  pointer-events: none;
  user-select: none;
}

.coordinate-box {
  padding: 0.75rem 1rem;
  border-radius: var(--border-radius-md);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 120px;
  white-space: nowrap;
}

.coord-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 0.85rem;
}

.coord-label {
  color: var(--color-text-light);
  font-weight: 500;
  opacity: 0.8;
}

.coord-value {
  color: var(--color-text);
  font-weight: 700;
  letter-spacing: 0.5px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.25rem;
  padding-top: 0.25rem;
  border-top: 1px solid var(--glass-border);
  font-size: 0.75rem;
  color: var(--color-text-light);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.dot.first {
  background: var(--color-primary-dark);
  box-shadow: 0 0 8px var(--color-primary-dark);
}

.dot.both {
  background: var(--color-dark);
  box-shadow: 0 0 8px var(--color-dark);
  animation: pulse 2s ease-in-out infinite;
}

.status-text {
  font-weight: 600;
  letter-spacing: 0.3px;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

/* 细腻的边框效果 */
.coordinate-box {
  border: 1px solid var(--coord-border);
  background: var(--coord-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 4px 16px rgba(45, 90, 74, 0.15);
}

/* 微光动画 */
@keyframes subtleGlow {
  0%, 100% {
    box-shadow: 0 4px 16px rgba(45, 90, 74, 0.15);
  }
  50% {
    box-shadow: 0 6px 20px rgba(45, 90, 74, 0.25);
  }
}

.coordinate-box {
  animation: subtleGlow 4s ease-in-out infinite;
}

/* 优化小屏幕显示 */
@media (max-width: 480px) {
  .coordinate-box {
    min-width: 100px;
    padding: 0.5rem 0.75rem;
  }

  .coord-row {
    font-size: 0.75rem;
  }

  .status-indicator {
    font-size: 0.7rem;
  }
}

/* 高对比度模式支持 */
@media (prefers-contrast: high) {
  .coord-label {
    color: var(--color-text);
    opacity: 1;
  }

  .coordinate-box {
    border: 2px solid var(--color-dark);
    background: rgba(255, 255, 255, 0.95);
  }
}
</style>