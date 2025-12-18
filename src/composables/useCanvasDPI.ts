/**
 * Canvas高DPI屏幕适配工具
 * 处理不同设备的devicePixelRatio，确保裁剪精度准确
 */

import { ref, onMounted, onUnmounted } from 'vue'
import type { Ref } from 'vue'

/**
 * Canvas DPI适配器
 */
export interface DPIAdapter {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  dpr: number
  logicalWidth: number
  logicalHeight: number
  actualWidth: number
  actualHeight: number
}

/**
 * 创建Canvas并适配DPI
 */
export function useCanvasDPI(
  canvasRef: Ref<HTMLCanvasElement | null>,
  width: number,
  height: number,
) {
  const dpr = ref(window.devicePixelRatio || 1)
  const adapter = ref<DPIAdapter | null>(null)

  /**
   * 初始化Canvas，设置正确的尺寸和DPI
   */
  const initCanvas = (): DPIAdapter | null => {
    const canvas = canvasRef.value
    if (!canvas) return null

    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: false,
    })

    if (!ctx) {
      console.error('无法获取Canvas 2D上下文')
      return null
    }

    // 设置逻辑尺寸（CSS尺寸）
    const logicalWidth = width
    const logicalHeight = height

    // 计算实际尺寸（考虑DPI）
    const actualWidth = Math.round(logicalWidth * dpr.value)
    const actualHeight = Math.round(logicalHeight * dpr.value)

    // 设置CSS样式尺寸
    canvas.style.width = `${logicalWidth}px`
    canvas.style.height = `${logicalHeight}px`

    // 设置实际像素尺寸
    canvas.width = actualWidth
    canvas.height = actualHeight

    // 重置变换矩阵，确保1:1映射
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr.value, dpr.value)

    const newAdapter: DPIAdapter = {
      canvas,
      ctx,
      dpr: dpr.value,
      logicalWidth,
      logicalHeight,
      actualWidth,
      actualHeight,
    }

    adapter.value = newAdapter
    return newAdapter
  }

  /**
   * 清除Canvas
   */
  const clearCanvas = () => {
    if (adapter.value) {
      const { ctx, logicalWidth, logicalHeight } = adapter.value
      ctx.clearRect(0, 0, logicalWidth, logicalHeight)
    }
  }

  /**
   * 解析CSS变量或直接返回颜色值
   */
  const resolveColor = (color: string): string => {
    if (color.startsWith('var(--')) {
      const varName = color.slice(4, -1) // 移除 'var(' 和 ')'
      return getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
    }
    return color
  }

  /**
   * 转换hex颜色为rgba字符串（带透明度）
   */
  const hexToRgba = (hex: string, alpha: number): string => {
    // 移除前面的 #
    hex = hex.replace('#', '')

    // 处理3位hex（#abc -> #aabbcc）
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('')
    }

    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)

    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  /**
   * 从Canvas坐标转换为图片坐标
   * 考虑缩放和偏移
   */
  const canvasToImageCoords = (
    canvasX: number,
    canvasY: number,
    scaleX: number,
    scaleY: number,
    offsetX: number,
    offsetY: number,
  ): { x: number; y: number } => {
    // 反向应用变换：先减偏移，再除比例
    return {
      x: (canvasX - offsetX) / scaleX,
      y: (canvasY - offsetY) / scaleY,
    }
  }

  /**
   * 从图片坐标转换为Canvas坐标
   */
  const imageToCanvasCoords = (
    imageX: number,
    imageY: number,
    scaleX: number,
    scaleY: number,
    offsetX: number,
    offsetY: number,
  ): { x: number; y: number } => {
    return {
      x: imageX * scaleX + offsetX,
      y: imageY * scaleY + offsetY,
    }
  }

  /**
   * 获取鼠标在Canvas上的相对坐标
   */
  const getMousePosition = (
    event: MouseEvent,
    canvas: HTMLCanvasElement,
  ): { x: number; y: number } => {
    const rect = canvas.getBoundingClientRect()

    // 考虑CSS transform等可能影响位置的因素
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    return { x, y }
  }

  /**
   * 绘制带抗锯齿的线条
   */
  const drawSmoothLine = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    lineWidth: number = 1,
  ) => {
    ctx.beginPath()
    ctx.moveTo(x1 + 0.5, y1 + 0.5) // 避免抗锯齿导致的模糊
    ctx.lineTo(x2 + 0.5, y2 + 0.5)
    ctx.lineWidth = lineWidth
    ctx.stroke()
  }

  /**
   * 绘制虚线矩形
   */
  const drawDashedRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    lineWidth: number = 2,
    dashArray: number[] = [5, 5],
  ) => {
    ctx.save()
    ctx.strokeStyle = resolveColor(color)
    ctx.lineWidth = lineWidth
    ctx.setLineDash(dashArray)
    ctx.strokeRect(x + 0.5, y + 0.5, width, height)
    ctx.restore()
  }

  /**
   * 绘制半透明覆盖层
   */
  const drawOverlay = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
  ) => {
    ctx.save()
    ctx.fillStyle = resolveColor(color)

    // 绘制外边框矩形（覆盖整个Canvas）
    ctx.fillRect(0, 0, adapter.value!.logicalWidth, adapter.value!.logicalHeight)

    // 清除中间区域（挖空效果）
    ctx.clearRect(x, y, width, height)
    ctx.restore()
  }

  /**
   * 绘制锚点（实心圆点 + 发光效果）
   */
  const drawAnchor = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    size: number = 12,
    glow: boolean = true,
  ) => {
    ctx.save()

    const resolvedColor = resolveColor(color)

    if (glow) {
      // 外层发光
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2)

      // 转换为rgba带透明度
      let colorStart = resolvedColor
      let colorEnd = resolvedColor

      if (resolvedColor.startsWith('#')) {
        colorStart = hexToRgba(resolvedColor, 0.5)
        colorEnd = hexToRgba(resolvedColor, 0)
      } else if (resolvedColor.startsWith('rgb(')) {
        colorStart = resolvedColor.replace('rgb(', 'rgba(').replace(')', ', 0.5)')
        colorEnd = resolvedColor.replace('rgb(', 'rgba(').replace(')', ', 0)')
      }

      gradient.addColorStop(0, colorStart)
      gradient.addColorStop(1, colorEnd)

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, size * 2, 0, Math.PI * 2)
      ctx.fill()
    }

    // 实心圆点
    ctx.fillStyle = resolvedColor
    ctx.beginPath()
    ctx.arc(x, y, size / 2, 0, Math.PI * 2)
    ctx.fill()

    // 白色边框增强对比度
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, size / 2, 0, Math.PI * 2)
    ctx.stroke()

    ctx.restore()
  }

  /**
   * 监听窗口大小变化，重新初始化
   */
  const handleResize = () => {
    const newDPR = window.devicePixelRatio || 1
    if (newDPR !== dpr.value) {
      dpr.value = newDPR
      // 重新初始化需要外部处理
    }
  }

  onMounted(() => {
    if (canvasRef.value) {
      initCanvas()
    }
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })

  return {
    dpr,
    adapter,
    initCanvas,
    clearCanvas,
    canvasToImageCoords,
    imageToCanvasCoords,
    getMousePosition,
    drawSmoothLine,
    drawDashedRect,
    drawOverlay,
    drawAnchor,
    resolveColor,
    hexToRgba,
  }
}
