<template>
  <div class="cropper-canvas" v-if="imageSrc">
    <!-- Canvas 容器 -->
    <div class="canvas-container" ref="containerRef">
      <canvas
        ref="canvasRef"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseLeave"
      ></canvas>

      <!-- 坐标显示 -->
      <CoordinateDisplay
        v-if="showCoordinates && mousePosition"
        :position="mousePosition"
        :anchor-status="anchorStatus"
        class="coordinate-overlay"
      />

      <!-- 锚点状态指示器 -->
      <div class="anchor-status" v-if="anchorStatus !== 'none'">
        <span class="status-badge" :class="anchorStatus">
          {{ statusText }}
        </span>
      </div>
    </div>

    <!-- 提示信息 -->
    <div class="canvas-hints" v-if="!cropReady">
      <div class="hint-item" v-if="anchorStatus === 'none'">
        <span class="hint-number">1</span>
        <span class="hint-text">点击图片左上角设置起始点</span>
      </div>
      <div class="hint-item" v-else-if="anchorStatus === 'first'">
        <span class="hint-number">2</span>
        <span class="hint-text">点击图片右下角设置结束点</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import CoordinateDisplay from './CoordinateDisplay.vue'
import { useCanvasDPI } from '../composables/useCanvasDPI'
import { AnchorStatus } from '../types'
import type { Point, CropArea, MouseState, ImageInfo } from '../types'

const props = defineProps<{
  imageSrc: string
  imageWidth: number
  imageHeight: number
  showCoordinates?: boolean
}>()

const emit = defineEmits<{
  (e: 'coordinates-change', coords: { first: Point | null; second: Point | null }): void
  (e: 'crop-ready', area: CropArea): void
  (e: 'update:anchor-status', status: AnchorStatus): void
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

// 状态
const anchorStatus = ref<AnchorStatus>(AnchorStatus.NONE)
const firstAnchor = ref<Point | null>(null)
const secondAnchor = ref<Point | null>(null)
const mousePosition = ref<Point | null>(null)
const imageInfo = ref<ImageInfo | null>(null)

// 显示控制
const showCoordinates = ref(props.showCoordinates ?? true)

// 鼠标状态
const mouseState = ref<MouseState>({
  isMouseDown: false,
  startPos: { x: 0, y: 0 },
  currentPos: { x: 0, y: 0 },
  mode: 'idle',
  draggingAnchor: null,
})

// 加载状态
const imageLoaded = ref(false)

// 图片缓存（解决闪烁和黑屏问题）
const imgCache = ref<HTMLImageElement | null>(null)

// Canvas DPI适配
const {
  adapter,
  initCanvas,
  clearCanvas,
  drawDashedRect,
  drawOverlay,
  drawAnchor,
  getMousePosition,
  canvasToImageCoords,
  imageToCanvasCoords,
  resolveColor,
} = useCanvasDPI(canvasRef, 800, 600) // 初始尺寸，会被动态调整

// 计算属性
const cropReady = computed(() => {
  return firstAnchor.value !== null && secondAnchor.value !== null
})

const statusText = computed(() => {
  switch (anchorStatus.value) {
    case AnchorStatus.NONE:
      return '等待设置起点'
    case AnchorStatus.FIRST:
      return '等待设置终点'
    case AnchorStatus.BOTH:
      return '裁剪区域已设定'
    default:
      return ''
  }
})

const canvasSize = computed(() => {
  if (!imageInfo.value) return { width: 800, height: 600 }

  const maxWidth = 800
  const maxHeight = 600
  const ratio = Math.min(maxWidth / imageInfo.value.width, maxHeight / imageInfo.value.height, 1)

  return {
    width: Math.round(imageInfo.value.width * ratio),
    height: Math.round(imageInfo.value.height * ratio),
  }
})

const drawScale = computed(() => {
  if (!imageInfo.value) return 1
  return canvasSize.value.width / imageInfo.value.width
})

const offset = computed(() => {
  if (!imageInfo.value) return { x: 0, y: 0 }

  // 居中显示
  return {
    x: (canvasSize.value.width - imageInfo.value.width * drawScale.value) / 2,
    y: (canvasSize.value.height - imageInfo.value.height * drawScale.value) / 2,
  }
})

// 监听属性变化
watch(
  () => props.imageSrc,
  async (newSrc) => {
    if (newSrc) {
      await loadImage(newSrc)
    }
  },
  { immediate: true },
)

watch(canvasSize, async (newSize) => {
  if (canvasRef.value && adapter.value) {
    // 重新初始化Canvas尺寸
    const canvas = canvasRef.value
    const dpr = adapter.value.dpr

    canvas.style.width = `${newSize.width}px`
    canvas.style.height = `${newSize.height}px`
    canvas.width = Math.round(newSize.width * dpr)
    canvas.height = Math.round(newSize.height * dpr)

    const ctx = canvas.getContext('2d')!
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)

    // 重绘
    if (imageLoaded.value) {
      drawAll()
    }
  }
})

watch(
  [firstAnchor, secondAnchor],
  () => {
    emit('coordinates-change', {
      first: firstAnchor.value,
      second: secondAnchor.value,
    })

    if (cropReady.value && firstAnchor.value && secondAnchor.value) {
      emit('crop-ready', {
        topLeft: firstAnchor.value,
        bottomRight: secondAnchor.value,
      })
    }
  },
  { deep: true },
)

watch(anchorStatus, (newStatus) => {
  emit('update:anchor-status', newStatus)
})

/**
 * 加载图片
 */
async function loadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      // 缓存加载好的图片对象，避免重复加载
      imgCache.value = img

      imageInfo.value = {
        src,
        width: img.width,
        height: img.height,
        naturalWidth: img.width,
        naturalHeight: img.height,
      }
      imageLoaded.value = true

      // 初始化Canvas
      if (canvasRef.value) {
        nextTickToDraw()
      }

      resolve()
    }

    img.onerror = () => {
      reject(new Error('图片加载失败'))
    }

    img.src = src
  })
}

/**
 * Vue nextTick 的替代 - 确保DOM更新后绘制
 */
function nextTickToDraw(): void {
  // 使用 setTimeout 0 等待DOM更新
  setTimeout(() => {
    if (canvasRef.value && !adapter.value) {
      initCanvas()
    }
    drawAll()
  }, 0)
}

/**
 * 绘制所有元素
 */
function drawAll(): void {
  if (!adapter.value || !imageInfo.value) return

  const { ctx } = adapter.value

  // 清空画布
  clearCanvas()

  // 绘制图片背景
  drawImage(ctx)

  // 绘制裁剪区域预览
  if (firstAnchor.value && secondAnchor.value) {
    drawCropOverlay(ctx)
  } else if (firstAnchor.value) {
    drawAnchor(ctx, firstAnchor.value.x, firstAnchor.value.y, 'var(--color-dark)', 12, true)
  }

  // 绘制虚拟线（只有一个点时）
  if (firstAnchor.value && !secondAnchor.value && mousePosition.value) {
    const converted = canvasToImageCoords(
      mousePosition.value.x,
      mousePosition.value.y,
      drawScale.value,
      drawScale.value,
      offset.value.x,
      offset.value.y,
    )

    if (converted.x > 0 && converted.y > 0) {
      // 转换为Canvas坐标
      const x1 = firstAnchor.value.x * drawScale.value + offset.value.x
      const y1 = firstAnchor.value.y * drawScale.value + offset.value.y
      const x2 = converted.x * drawScale.value + offset.value.x
      const y2 = converted.y * drawScale.value + offset.value.y

      const width = Math.abs(x2 - x1)
      const height = Math.abs(y2 - y1)
      const minX = Math.min(x1, x2)
      const minY = Math.min(y1, y2)

      // 绘制虚线矩形框 - 使用 drawDashedRect 函数
      drawDashedRect(ctx, minX, minY, width, height, 'var(--color-primary)', 1.5)

      // 绘制临时终点锚点
      const canvasPos = imageToCanvasCoords(
        converted.x,
        converted.y,
        drawScale.value,
        drawScale.value,
        offset.value.x,
        offset.value.y,
      )
      drawAnchor(ctx, canvasPos.x, canvasPos.y, 'var(--color-primary)', 10, false)
    }
  }
}

/**
 * 绘制图片
 */
function drawImage(ctx: CanvasRenderingContext2D): void {
  if (!imageInfo.value || !imgCache.value) return

  const { width, height } = canvasSize.value

  // 直接使用缓存的图片对象，无需再次加载
  ctx.drawImage(imgCache.value, offset.value.x, offset.value.y, width, height)
}

/**
 * 绘制裁剪区域预览
 */
function drawCropOverlay(ctx: CanvasRenderingContext2D): void {
  if (!firstAnchor.value || !secondAnchor.value) return

  const scale = drawScale.value
  const ox = offset.value.x
  const oy = offset.value.y

  // 转换为Canvas坐标
  const x1 = firstAnchor.value.x * scale + ox
  const y1 = firstAnchor.value.y * scale + oy
  const x2 = secondAnchor.value.x * scale + ox
  const y2 = secondAnchor.value.y * scale + oy

  const width = Math.abs(x2 - x1)
  const height = Math.abs(y2 - y1)
  const minX = Math.min(x1, x2)
  const minY = Math.min(y1, y2)

  // 绘制半透明覆盖层
  const overlayColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--overlay-light')
    .trim()
  drawOverlay(ctx, minX, minY, width, height, overlayColor)

  // 绘制虚线边框
  drawDashedRect(ctx, minX, minY, width, height, 'var(--color-primary)', 2)

  // 绘制裁剪框的四个角的小方块
  const cornerSize = 6
  const corners = [
    { x: minX, y: minY }, // 左上
    { x: minX + width, y: minY }, // 右上
    { x: minX, y: minY + height }, // 左下
    { x: minX + width, y: minY + height }, // 右下
  ]

  if (adapter.value) {
    ctx.save()
    ctx.fillStyle = resolveColor('var(--color-dark)')
    corners.forEach((corner) => {
      ctx.fillRect(corner.x - cornerSize / 2, corner.y - cornerSize / 2, cornerSize, cornerSize)
    })
    ctx.restore()
  }

  // 绘制锚点
  drawAnchor(ctx, x1, y1, 'var(--color-dark)', 12, true)
  drawAnchor(ctx, x2, y2, 'var(--color-dark)', 12, true)
}

/**
 * 处理鼠标按下
 */
function handleMouseDown(event: MouseEvent): void {
  if (!adapter.value || !imageLoaded.value) return

  const pos = getMousePosition(event, adapter.value.canvas)
  const converted = canvasToImageCoords(
    pos.x,
    pos.y,
    drawScale.value,
    drawScale.value,
    offset.value.x,
    offset.value.y,
  )

  // 检查是否点击了已存在的锚点（用于拖拽调整）
  const hitTestThreshold = 12 / drawScale.value // 12px 的命中测试范围

  if (firstAnchor.value && secondAnchor.value) {
    // 检查是否点击到第一个锚点附近
    if (
      Math.abs(converted.x - firstAnchor.value.x) < hitTestThreshold &&
      Math.abs(converted.y - firstAnchor.value.y) < hitTestThreshold
    ) {
      mouseState.value.isMouseDown = true
      mouseState.value.mode = 'dragging'
      mouseState.value.draggingAnchor = 'first'
      mouseState.value.startPos = converted
      return
    }

    // 检查是否点击到第二个锚点附近
    if (
      Math.abs(converted.x - secondAnchor.value.x) < hitTestThreshold &&
      Math.abs(converted.y - secondAnchor.value.y) < hitTestThreshold
    ) {
      mouseState.value.isMouseDown = true
      mouseState.value.mode = 'dragging'
      mouseState.value.draggingAnchor = 'second'
      mouseState.value.startPos = converted
      return
    }
  }

  // 设置新锚点
  mouseState.value.isMouseDown = true
  mouseState.value.mode = 'setting'
  mouseState.value.startPos = converted

  if (anchorStatus.value === AnchorStatus.NONE) {
    // 设置第一个锚点
    firstAnchor.value = { x: Math.round(converted.x), y: Math.round(converted.y) }
    anchorStatus.value = AnchorStatus.FIRST
  } else if (anchorStatus.value === AnchorStatus.FIRST) {
    // 设置第二个锚点
    secondAnchor.value = { x: Math.round(converted.x), y: Math.round(converted.y) }
    anchorStatus.value = AnchorStatus.BOTH
  }
}

/**
 * 处理鼠标移动
 */
function handleMouseMove(event: MouseEvent): void {
  if (!adapter.value) return

  const pos = getMousePosition(event, adapter.value.canvas)
  const converted = canvasToImageCoords(
    pos.x,
    pos.y,
    drawScale.value,
    drawScale.value,
    offset.value.x,
    offset.value.y,
  )

  // 更新鼠标位置（用于坐标显示和虚线预览）
  mousePosition.value = { x: pos.x, y: pos.y }

  // 处理拖拽调整
  if (mouseState.value.isMouseDown && mouseState.value.mode === 'dragging') {
    const anchor = mouseState.value.draggingAnchor
    if (!imageInfo.value) return
    if (anchor === 'first' && firstAnchor.value) {
      firstAnchor.value = {
        x: Math.max(0, Math.min(imageInfo.value.width, Math.round(converted.x))),
        y: Math.max(0, Math.min(imageInfo.value.height, Math.round(converted.y))),
      }
    } else if (anchor === 'second' && secondAnchor.value) {
      secondAnchor.value = {
        x: Math.max(0, Math.min(imageInfo.value.width, Math.round(converted.x))),
        y: Math.max(0, Math.min(imageInfo.value.height, Math.round(converted.y))),
      }
    }

    // 重绘以显示更新后的位置
    drawAll()
  } else if (mouseState.value.isMouseDown && mouseState.value.mode === 'setting') {
    // 用于绘制动态线框（如果需要）
    if (firstAnchor.value && !secondAnchor.value) {
      drawAll()
    }
  } else if (!mouseState.value.isMouseDown) {
    // 只是移动鼠标，更新预览显示
    if (firstAnchor.value && !secondAnchor.value && mousePosition.value) {
      drawAll()
    }
  }
}

/**
 * 处理鼠标释放
 */
function handleMouseUp(): void {
  // 检查是否设置了第二个点，如果是则完成裁剪区域设置
  if (secondAnchor.value) {
    // 确保左上角小于右下角
    const x1 = Math.min(firstAnchor.value!.x, secondAnchor.value.x)
    const y1 = Math.min(firstAnchor.value!.y, secondAnchor.value.y)
    const x2 = Math.max(firstAnchor.value!.x, secondAnchor.value.x)
    const y2 = Math.max(firstAnchor.value!.y, secondAnchor.value.y)

    firstAnchor.value = { x: x1, y: y1 }
    secondAnchor.value = { x: x2, y: y2 }
  }

  mouseState.value.isMouseDown = false
  mouseState.value.mode = 'idle'
  mouseState.value.draggingAnchor = null
}

/**
 * 处理鼠标离开
 */
function handleMouseLeave(): void {
  if (mouseState.value.isMouseDown) {
    handleMouseUp()
  }
  mousePosition.value = null
}

/**
 * 重置裁剪状态
 */
function resetCrop(): void {
  firstAnchor.value = null
  secondAnchor.value = null
  anchorStatus.value = AnchorStatus.NONE
  mouseState.value = {
    isMouseDown: false,
    startPos: { x: 0, y: 0 },
    currentPos: { x: 0, y: 0 },
    mode: 'idle',
    draggingAnchor: null,
  }
  drawAll()
}

/**
 * 获取裁剪区域数据（外部调用）
 */
function getCropData(): { area: CropArea; scale: number; offset: Point } | null {
  if (!firstAnchor.value || !secondAnchor.value) return null

  return {
    area: {
      topLeft: { ...firstAnchor.value },
      bottomRight: { ...secondAnchor.value },
    },
    scale: drawScale.value,
    offset: { ...offset.value },
  }
}

// 暴露方法给父组件
defineExpose({
  resetCrop,
  getCropData,
})
</script>

<style scoped>
.cropper-canvas {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.canvas-container {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #fafafa;
  border-radius: var(--border-radius-lg);
  overflow: hidden;
  min-height: 300px;
}

canvas {
  cursor: crosshair;
  max-width: 100%;
  height: auto;
  display: block;
  background: white;
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-soft);
}

/* 坐标显示覆盖层 */
.coordinate-overlay {
  position: absolute;
  top: 1rem;
  right: 1rem;
  pointer-events: none;
}

/* 锚点状态指示器 */
.anchor-status {
  position: absolute;
  top: 1rem;
  left: 1rem;
  pointer-events: none;
}

.status-badge {
  padding: 0.4rem 0.8rem;
  border-radius: var(--border-radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: var(--shadow-soft);
}

.status-badge.none {
  background: rgba(168, 230, 207, 0.85);
  color: var(--color-text);
}

.status-badge.first {
  background: rgba(168, 230, 207, 0.9);
  color: var(--color-dark);
}

.status-badge.both {
  background: var(--color-primary);
  color: white;
}

/* 提示信息 */
.canvas-hints {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.5rem;
}

.hint-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--glass-bg);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius-sm);
  font-size: 0.85rem;
}

.hint-number {
  background: var(--color-primary-dark);
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.75rem;
}

.hint-text {
  color: var(--color-text);
}

/* 高DPI屏幕优化 */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  canvas {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
  }
}

/* 响应式调整 */
@media (max-width: 768px) {
  .canvas-container {
    min-height: 250px;
  }

  .coordinate-overlay,
  .anchor-status {
    font-size: 0.8rem;
  }

  .canvas-hints {
    flex-direction: column;
    gap: 0.5rem;
  }
}

/* 交互反馈 */
canvas:active {
  cursor: grabbing;
}

/* 拖拽调整时的光标 */
.dragging-first,
.dragging-second {
  cursor: grab;
}

.canvas-container.dragging {
  cursor: grabbing;
}

/* 加载状态 */
.loading {
  opacity: 0.6;
  pointer-events: none;
}

/* 动画 */
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

.status-badge.both {
  animation: pulse 2s ease-in-out infinite;
}
</style>
