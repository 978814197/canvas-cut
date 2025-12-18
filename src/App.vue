<template>
  <div id="app-container">
    <!-- 头部 -->
    <header class="app-header">
      <div class="header-content">
        <h1 class="app-title">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          图片裁剪大师
        </h1>
        <p class="app-subtitle">清新淡绿 • 专业裁剪 • 精准到像素</p>
      </div>
      <div class="theme-indicator"></div>
    </header>

    <!-- 主要内容区 -->
    <main class="app-main">
      <!-- 步骤1：图片上传 -->
      <section v-if="!imageInfo" class="section card fade-in">
        <h2 class="section-title">第一步：上传图片</h2>
        <ImageUploader @image-loaded="handleImageLoaded" @image-cleared="handleImageCleared" />
      </section>

      <!-- 步骤2：裁剪操作区 -->
      <template v-else>
        <!-- Canvas裁剪区域 -->
        <section class="section card fade-in">
          <h2 class="section-title">第二步：设置裁剪区域</h2>
          <CropperCanvas
            ref="cropperRef"
            :image-src="imageInfo.src"
            :image-width="imageInfo.width"
            :image-height="imageInfo.height"
            :show-coordinates="showCoordinates"
            @coordinates-change="handleCoordinatesChange"
            @crop-ready="handleCropReady"
            @update:anchor-status="currentAnchorStatus = $event"
          />
        </section>

        <!-- 控制面板 -->
        <section class="section control-section fade-in">
          <ControlPanel
            :has-image="!!imageInfo"
            :crop-ready="cropReady"
            :has-first-anchor="hasFirstAnchor"
            :has-anchors="hasAnchors"
            :anchor-status="currentAnchorStatus"
            :is-processing="isProcessing"
            :show-coordinates="showCoordinates"
            :can-undo="canUndo"
            :success-message="successMessage"
            :error-message="errorMessage"
            @crop="handleCrop"
            @reset="handleReset"
            @undo="handleUndo"
            @cancel-select="handleCancelSelect"
            @update:show-coordinates="showCoordinates = $event"
          />
        </section>

        <!-- 预览和导出结果区域 -->
        <section v-if="cropResult" class="section card fade-in">
          <h2 class="section-title">第三步：导出结果</h2>
          <div class="result-container">
            <div class="result-preview">
              <h3>裁剪预览</h3>
              <div class="preview-image">
                <img :src="cropResult.dataUrl" alt="裁剪结果" />
              </div>
              <div class="result-info">
                <span>尺寸: {{ cropResult.width }} × {{ cropResult.height }} 像素</span>
                <span>格式: PNG</span>
              </div>
            </div>
            <div class="result-actions">
              <button class="btn download-btn" @click="handleDownload">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                下载图片
              </button>
              <button class="btn btn-secondary" @click="handleNewCrop">新的裁剪</button>
            </div>
          </div>
        </section>
      </template>
    </main>

    <!-- 页脚 -->
    <footer class="app-footer">
      <p>快捷键: ESC 取消 | Enter 确认 | R 重置 | Ctrl+Z 撤销</p>
      <p class="love-message">Made with ✨ and 绿色心情</p>
    </footer>

    <!-- 全局加载遮罩 -->
    <transition name="fade">
      <div v-if="isProcessing" class="loading-overlay">
        <div class="loading-spinner"></div>
        <span>处理中...</span>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Ref } from 'vue'
import ImageUploader from './components/ImageUploader.vue'
import CropperCanvas from './components/CropperCanvas.vue'
import ControlPanel from './components/ControlPanel.vue'
import { useKeyboard } from './composables/useKeyboard'
import {
  exportCroppedImage,
  downloadImage,
  generateFilename,
  isCropAreaValid,
} from './utils/imageExport'
import { AnchorStatus } from './types'
import type { ImageInfo, CropArea, Point, CropResult } from './types'

// 状态 management
const imageInfo: Ref<ImageInfo | null> = ref(null)
const cropArea: Ref<CropArea | null> = ref(null)
const cropResult: Ref<CropResult | null> = ref(null)
const cropperRef = ref<InstanceType<typeof CropperCanvas> | null>(null)

// UI状态
const isProcessing = ref(false)
const showCoordinates = ref(true)
const currentAnchorStatus = ref<AnchorStatus>(AnchorStatus.NONE)
const successMessage = ref('')
const errorMessage = ref('')

// 坐标历史（用于撤销）
const coordinatesHistory = ref<Array<{ first: Point | null; second: Point | null }>>([])

// 计算属性
const cropReady = computed(() => cropArea.value !== null)
const hasFirstAnchor = computed(() => currentAnchorStatus.value !== AnchorStatus.NONE)
const hasAnchors = computed(
  () => cropArea.value !== null || currentAnchorStatus.value === AnchorStatus.FIRST,
)
const canUndo = computed(() => coordinatesHistory.value.length > 1)

// 键盘快捷键处理
useKeyboard({
  onConfirm: () => cropReady.value && !isProcessing.value && handleCrop(),
  onCancel: () => hasFirstAnchor.value && handleCancelSelect(),
  onReset: () => hasAnchors.value && handleReset(),
  onUndo: () => canUndo.value && handleUndo(),
})

// 事件处理
const handleImageLoaded = (info: { src: string; width: number; height: number; file: File }) => {
  imageInfo.value = { ...info, naturalWidth: info.width, naturalHeight: info.height }
  resetAll()
  showMessage('图片加载成功', 'success')
}

const handleImageCleared = () => resetAll()

const handleCoordinatesChange = (coords: { first: Point | null; second: Point | null }) => {
  if (coords.first || coords.second) {
    const last = coordinatesHistory.value[coordinatesHistory.value.length - 1]
    if (!last || last.first !== coords.first || last.second !== coords.second) {
      coordinatesHistory.value.push({ ...coords })
    }
  }
  cropArea.value =
    coords.first && coords.second ? { topLeft: coords.first, bottomRight: coords.second } : null
}

const handleCropReady = (area: CropArea) => {
  cropArea.value = area
  coordinatesHistory.value = coordinatesHistory.value.slice(-1)
}

const handleCrop = async () => {
  if (!imageInfo.value || !cropArea.value) {
    showMessage('请先设置完整的裁剪区域', 'error')
    return
  }

  const validation = isCropAreaValid(cropArea.value, imageInfo.value.width, imageInfo.value.height)
  if (!validation.valid) {
    showMessage(`裁剪区域无效: ${validation.issues[0]}`, 'error')
    return
  }

  try {
    isProcessing.value = true
    clearMessages()
    const result = await exportCroppedImage(imageInfo.value.src, cropArea.value)
    cropResult.value = result
    showMessage('裁剪成功！可以下载图片了', 'success')
  } catch (error) {
    showMessage(`裁剪失败: ${error instanceof Error ? error.message : '未知错误'}`, 'error')
  } finally {
    isProcessing.value = false
  }
}

const handleDownload = () => {
  if (!cropResult.value || !imageInfo.value) return
  try {
    const filename = generateFilename(imageInfo.value.src.split('/').pop() || 'image', 'cropped')
    downloadImage(cropResult.value.dataUrl, filename)
    showMessage('图片下载已开始', 'success')
  } catch {
    showMessage('下载失败，请手动保存图片', 'error')
  }
}

const handleReset = () => {
  resetAll()
  cropperRef.value?.resetCrop()
  showMessage('已重置所有状态', 'success')
}

const handleUndo = () => {
  if (coordinatesHistory.value.length > 1) {
    coordinatesHistory.value.pop()
    cropArea.value = null
    cropResult.value = null
    cropperRef.value?.resetCrop()
    showMessage('已撤销上一步操作', 'success')
  }
}

const handleCancelSelect = () => {
  cropperRef.value?.resetCrop()
  cropArea.value = null
  cropResult.value = null
  coordinatesHistory.value = []
  currentAnchorStatus.value = AnchorStatus.NONE
  showMessage('已取消当前选择', 'success')
}

const handleNewCrop = () => {
  if (imageInfo.value) {
    resetAll()
    cropperRef.value?.resetCrop()
    setTimeout(() => {
      const canvasContainer = document.querySelector('.cropper-canvas')
      canvasContainer?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }
}

// 辅助函数
const resetAll = () => {
  cropArea.value = null
  cropResult.value = null
  coordinatesHistory.value = []
  currentAnchorStatus.value = AnchorStatus.NONE
  clearMessages()
}

const showMessage = (message: string, type: 'success' | 'error') => {
  clearMessages()
  if (type === 'success') {
    setTimeout(() => (successMessage.value = message), 0)
    setTimeout(() => (successMessage.value = ''), 3000)
  } else {
    setTimeout(() => (errorMessage.value = message), 0)
    setTimeout(() => (errorMessage.value = ''), 5000)
  }
}

const clearMessages = () => {
  successMessage.value = ''
  errorMessage.value = ''
}

// 生命周期
onMounted(() => {
  if (!document.createElement('canvas').getContext) {
    alert('您的浏览器不支持Canvas，请升级浏览器')
  }
})
</script>

<style>
@import './assets/theme.css';
</style>

<style scoped>
#app-container {
  min-height: 100vh;
  background: var(--bg-primary);
  display: flex;
  flex-direction: column;
}

.app-header {
  background: linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%);
  padding: 2rem 1rem;
  text-align: center;
  position: relative;
  overflow: hidden;
  box-shadow: var(--shadow-medium);
  color: var(--color-dark);
}

.app-header::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url('data:image/svg+xml,<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(45,90,74,0.1)" stroke-width="1"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)" /></svg>');
  opacity: 0.3;
}

.header-content {
  position: relative;
  z-index: 1;
}

.app-title {
  font-size: 2.5rem;
  font-weight: 800;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.app-subtitle {
  font-size: 1rem;
  opacity: 0.9;
  font-weight: 500;
}

.theme-indicator {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 32px;
  height: 32px;
  background: white;
  border-radius: 50%;
  border: 3px solid var(--color-dark);
  box-shadow: 0 4px 12px rgba(45, 90, 74, 0.2);
  animation: breathe 4s ease-in-out infinite;
}

@keyframes breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.app-main {
  flex: 1;
  padding: 2rem 1rem;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: 2rem;
  box-shadow: var(--shadow-soft);
  transition: all var(--transition-medium);
}

.section:hover {
  box-shadow: var(--shadow-medium);
  transform: translateY(-2px);
}

.section-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-title::before {
  content: '';
  width: 4px;
  height: 24px;
  background: var(--color-primary-dark);
  border-radius: 2px;
}

.control-section {
  background: transparent;
  box-shadow: none;
  padding: 0;
}

.control-section:hover {
  transform: none;
  box-shadow: none;
}

.result-container {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 2rem;
  align-items: start;
}

.result-preview h3 {
  font-size: 1rem;
  color: var(--color-text-light);
  margin-bottom: 1rem;
  font-weight: 600;
}

.preview-image {
  background: var(--bg-secondary);
  border-radius: var(--border-radius-md);
  padding: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 150px;
  border: 2px dashed var(--color-primary);
}

.preview-image img {
  max-width: 100%;
  height: auto;
  border-radius: var(--border-radius-sm);
  box-shadow: var(--shadow-soft);
}

.result-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--glass-bg);
  border-radius: var(--border-radius-md);
  font-size: 0.85rem;
  color: var(--color-text-light);
}

.result-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: sticky;
  top: 2rem;
}

.download-btn {
  background: var(--color-dark);
  color: white;
  padding: 1rem;
  font-size: 1rem;
  font-weight: 700;
}

.download-btn:hover {
  background: #1a3a30;
  transform: translateY(-2px) scale(1.02);
}

.app-footer {
  background: var(--bg-secondary);
  padding: 1.5rem;
  text-align: center;
  color: var(--color-text-light);
  font-size: 0.9rem;
  margin-top: auto;
  border-top: 1px solid var(--glass-border);
}

.love-message {
  margin-top: 0.5rem;
  font-weight: 600;
  color: var(--color-text);
}

.loading-overlay {
  position: fixed;
  inset: 0;
  background: rgba(240, 249, 244, 0.9);
  backdrop-filter: blur(5px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  z-index: 1000;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid var(--color-primary);
  border-top-color: var(--color-dark);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.fade-in {
  animation: fadeInUp 0.6s ease-out forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .app-title {
    font-size: 1.8rem;
    flex-direction: column;
    gap: 0.5rem;
  }
  .app-subtitle {
    font-size: 0.9rem;
  }
  .app-main {
    padding: 1rem 0.5rem;
    gap: 1rem;
  }
  .section {
    padding: 1.5rem 1rem;
  }
  .section-title {
    font-size: 1.1rem;
  }
  .result-container {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  .result-actions {
    position: static;
  }
  .theme-indicator {
    width: 20px;
    height: 20px;
    top: 0.5rem;
    right: 0.5rem;
  }
  .app-header {
    padding: 1.5rem 0.75rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

*:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}
</style>
