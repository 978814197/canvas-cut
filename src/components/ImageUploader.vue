<template>
  <div class="image-uploader">
    <!-- 上传区域 -->
    <div
      v-if="!imageSrc"
      class="upload-area"
      :class="{ 'drag-over': isDragOver, 'hover': isHover }"
      @click="handleClick"
      @dragenter="handleDragEnter"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @mouseenter="isHover = true"
      @mouseleave="isHover = false"
    >
      <div class="upload-content">
        <div class="upload-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </div>
        <h3 class="upload-title">上传图片</h3>
        <p class="upload-subtitle">点击选择或拖拽图片到此处</p>
        <p class="upload-hint">支持 PNG, JPG, WebP 格式</p>
      </div>

      <!-- 隐藏的文件输入 -->
      <input
        ref="fileInput"
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        @change="handleFileSelect"
        style="display: none"
      />
    </div>

    <!-- 图片预览和操作区域 -->
    <div v-else class="image-preview-area">
      <div class="preview-header">
        <span class="filename">{{ fileName }}</span>
        <button class="btn btn-secondary" @click="clearImage" title="更换图片">
          更换图片
        </button>
      </div>
      <div class="preview-info">
        <span>尺寸: {{ imageWidth }} × {{ imageHeight }} 像素</span>
        <span v-if="fileSize" class="file-size">大小: {{ formatFileSize(fileSize) }}</span>
      </div>
    </div>

    <!-- 错误提示 -->
    <transition name="fade">
      <div v-if="errorMessage" class="error-message">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {{ errorMessage }}
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'image-loaded', payload: { src: string; width: number; height: number; file: File }): void
  (e: 'image-cleared'): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const imageSrc = ref<string>('')
const fileName = ref<string>('')
const imageWidth = ref<number>(0)
const imageHeight = ref<number>(0)
const fileSize = ref<number>(0)
const errorMessage = ref<string>('')

const isDragOver = ref<boolean>(false)
const isHover = ref<boolean>(false)

/**
 * 处理点击上传区域
 */
const handleClick = () => {
  fileInput.value?.click()
}

/**
 * 处理文件选择（点击）
 */
const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    processFile(input.files[0])
  }
}

/**
 * 处理拖拽进入
 */
const handleDragEnter = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = true
}

/**
 * 处理拖拽悬停
 */
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'copy'
  isDragOver.value = true
}

/**
 * 处理拖拽离开
 */
const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  // 检查是否真的离开了上传区域
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const isInBounds =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom

  if (!isInBounds) {
    isDragOver.value = false
  }
}

/**
 * 处理拖拽放下
 */
const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false

  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    const file = files[0]
    if (file.type.startsWith('image/')) {
      processFile(file)
    } else {
      showErrorMessage('请拖拽图片文件')
    }
  }
}

/**
 * 处理图片文件
 */
const processFile = (file: File) => {
  if (!file.type.startsWith('image/')) {
    showErrorMessage('请选择图片文件')
    return
  }

  // 验证文件大小 (10MB限制)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    showErrorMessage('图片文件过大，请选择10MB以内的图片')
    return
  }

  // 重置错误
  errorMessage.value = ''

  // 读取文件为Data URL
  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      // 限制最大尺寸
      const maxDimension = 4096
      if (img.width > maxDimension || img.height > maxDimension) {
        showErrorMessage(`图片尺寸过大 (${img.width}×${img.height})，请选择小于 ${maxDimension}px 的图片`)
        return
      }

      imageSrc.value = e.target!.result as string
      fileName.value = file.name
      imageWidth.value = img.width
      imageHeight.value = img.height
      fileSize.value = file.size

      emit('image-loaded', {
        src: imageSrc.value,
        width: img.width,
        height: img.height,
        file,
      })
    }

    img.onerror = () => {
      showErrorMessage('图片加载失败，请检查文件是否损坏')
    }

    img.src = e.target!.result as string
  }

  reader.onerror = () => {
    showErrorMessage('文件读取失败')
  }

  reader.readAsDataURL(file)
}

/**
 * 清除已选图片
 */
const clearImage = () => {
  imageSrc.value = ''
  fileName.value = ''
  imageWidth.value = 0
  imageHeight.value = 0
  fileSize.value = 0
  errorMessage.value = ''

  // 重置文件输入
  if (fileInput.value) {
    fileInput.value.value = ''
  }

  emit('image-cleared')
}

/**
 * 显示错误消息
 */
const showErrorMessage = (message: string) => {
  errorMessage.value = message
  setTimeout(() => {
    errorMessage.value = ''
  }, 3000)
}

/**
 * 格式化文件大小
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

defineExpose({
  clearImage,
})
</script>

<style scoped>
.image-uploader {
  width: 100%;
}

/* 上传区域 */
.upload-area {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 2px dashed var(--color-primary);
  border-radius: var(--border-radius-lg);
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-medium);
  position: relative;
  overflow: hidden;
}

.upload-area::before {
  content: '';
  position: absolute;
  inset: 0;
  background: transparent;
  transition: background var(--transition-medium);
}

.upload-area.hover::before,
.upload-area:hover::before {
  background: var(--hover-overlay);
}

.upload-area.drag-over {
  border-color: var(--color-primary-dark);
  background: var(--color-primary-light);
  transform: scale(1.02);
  box-shadow: var(--shadow-medium);
}

.upload-content {
  position: relative;
  z-index: 1;
}

.upload-icon {
  color: var(--color-primary-dark);
  margin-bottom: 1rem;
  transition: transform var(--transition-medium);
}

.upload-area:hover .upload-icon {
  transform: translateY(-4px);
}

.upload-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.upload-subtitle {
  color: var(--color-text-light);
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
}

.upload-hint {
  color: var(--color-primary-dark);
  font-size: 0.85rem;
  opacity: 0.8;
  font-weight: 500;
}

/* 图片预览区域 */
.image-preview-area {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius-lg);
  padding: 1.5rem;
  box-shadow: var(--shadow-soft);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.filename {
  font-weight: 600;
  color: var(--color-text);
  font-size: 1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.preview-info {
  display: flex;
  gap: 1.5rem;
  color: var(--color-text-light);
  font-size: 0.9rem;
  flex-wrap: wrap;
}

.file-size {
  color: var(--color-primary-dark);
}

/* 错误消息 */
.error-message {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid rgba(231, 76, 60, 0.3);
  border-radius: var(--border-radius-sm);
  color: #c0392b;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.error-message svg {
  flex-shrink: 0;
}

/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition-medium), transform var(--transition-medium);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .upload-area {
    padding: 2rem 1rem;
  }

  .preview-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .preview-info {
    flex-direction: column;
    gap: 0.5rem;
  }

  .upload-title {
    font-size: 1.1rem;
  }

  .upload-subtitle {
    font-size: 0.9rem;
  }

  .upload-hint {
    font-size: 0.8rem;
  }
}

/* 点击反馈 */
.upload-area:active {
  transform: scale(0.98);
}

/* 无障碍视觉反馈 */
.upload-area:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 2px;
}

/* 文件拖拽时的视觉变化 */
.drag-over .upload-icon {
  animation: bounce 0.6s ease infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}
</style>