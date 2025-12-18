/**
 * 图片导出工具
 * 处理Canvas裁剪、导出和下载逻辑
 */

import type { CropArea, Point, CropResult } from '../types'
import { useCanvasDPI } from '../composables/useCanvasDPI'

/**
 * 导出裁剪区域为图片
 */
export async function exportCroppedImage(
  imageSrc: string,
  cropArea: CropArea,
  originalWidth: number,
  originalHeight: number
): Promise<CropResult> {
  return new Promise((resolve, reject) => {
    // 创建临时Canvas
    const tempCanvas = document.createElement('canvas')
    const ctx = tempCanvas.getContext('2d')

    if (!ctx) {
      reject(new Error('无法创建Canvas上下文'))
      return
    }

    // 创建图片对象
    const img = new Image()
    img.crossOrigin = 'anonymous' // 避免跨域问题

    img.onload = () => {
      // 计算裁剪尺寸和位置
      const { topLeft, bottomRight } = cropArea
      const cropX = Math.round(topLeft.x)
      const cropY = Math.round(topLeft.y)
      const cropWidth = Math.round(bottomRight.x - topLeft.x)
      const cropHeight = Math.round(bottomRight.y - topLeft.y)

      // 验证裁剪区域有效性
      if (cropWidth <= 0 || cropHeight <= 0) {
        reject(new Error('裁剪区域无效'))
        return
      }

      // 设置Canvas尺寸为裁剪尺寸
      tempCanvas.width = cropWidth
      tempCanvas.height = cropHeight

      // 应用高DPI优化
      const dpr = Math.max(1, window.devicePixelRatio || 1)
      if (dpr > 1) {
        tempCanvas.width = cropWidth * dpr
        tempCanvas.height = cropHeight * dpr
        ctx.scale(dpr, dpr)
      }

      // 绘制裁剪区域
      ctx.drawImage(
        img,
        cropX, cropY,        // 源图像的起始位置
        cropWidth, cropHeight, // 源图像的裁剪尺寸
        0, 0,                // 目标Canvas的起始位置
        cropWidth, cropHeight // 目标Canvas的尺寸
      )

      // 转换为Blob和DataURL
      tempCanvas.toBlob(
        (blob) => {
          if (blob) {
            const dataUrl = tempCanvas.toDataURL('image/png')
            resolve({
              canvas: tempCanvas,
              dataUrl,
              blob,
              width: cropWidth,
              height: cropHeight,
            })
          } else {
            reject(new Error('无法生成图像数据'))
          }
        },
        'image/png',
        1.0 // 最高质量
      )
    }

    img.onerror = () => {
      reject(new Error('图片加载失败'))
    }

    img.src = imageSrc
  })
}

/**
 * 下载图片文件
 */
export function downloadImage(
  dataUrl: string,
  filename: string = `cropped-${Date.now()}.png`
): void {
  // 创建下载链接
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename

  // 添加到DOM并触发点击
  document.body.appendChild(link)
  link.click()

  // 清理
  document.body.removeChild(link)
}

/**
 * 创建图片Blob URL
 */
export function createObjectURL(blob: Blob): string {
  return URL.createObjectURL(blob)
}

/**
 * 释放Blob URL
 */
export function revokeObjectURL(url: string): void {
  URL.revokeObjectURL(url)
}

/**
 * 验证图片尺寸
 */
export function validateImageSize(
  width: number,
  height: number,
  maxWidth: number = 4096,
  maxHeight: number = 4096
): { valid: boolean; reason?: string } {
  if (width <= 0 || height <= 0) {
    return { valid: false, reason: '图片尺寸无效' }
  }

  if (width > maxWidth || height > maxHeight) {
    return {
      valid: false,
      reason: `图片尺寸过大 (${width}×${height})，最大支持 ${maxWidth}×${maxHeight}`
    }
  }

  return { valid: true }
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

/**
 * 计算裁剪区域的像素面积
 */
export function calculateCropArea(
  topLeft: Point,
  bottomRight: Point
): number {
  const width = Math.abs(bottomRight.x - topLeft.x)
  const height = Math.abs(bottomRight.y - topLeft.y)
  return width * height
}

/**
 * 创建裁剪预览缩略图
 */
export async function createThumbnail(
  imageSrc: string,
  cropArea: CropArea,
  maxWidth: number = 200
): Promise<string> {
  const result = await exportCroppedImage(
    imageSrc,
    cropArea,
    0,
    0
  )

  const img = new Image()
  img.src = result.dataUrl

  return new Promise((resolve) => {
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio

      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      resolve(canvas.toDataURL('image/png', 0.8))
    }
  })
}

/**
 * 批量导出多个裁剪区域
 */
export async function batchExport(
  imageSrc: string,
  areas: CropArea[],
  originalWidth: number,
  originalHeight: number
): Promise<CropResult[]> {
  const results: CropResult[] = []

  for (const area of areas) {
    try {
      const result = await exportCroppedImage(
        imageSrc,
        area,
        originalWidth,
        originalHeight
      )
      results.push(result)
    } catch (error) {
      console.warn('跳过无效的裁剪区域:', area, error)
    }
  }

  return results
}

/**
 * 检查裁剪区域是否在图片边界内
 */
export function isCropAreaValid(
  area: CropArea,
  imageWidth: number,
  imageHeight: number
): { valid: boolean; issues: string[] } {
  const issues: string[] = []
  const { topLeft, bottomRight } = area

  // 检查坐标是否为正数
  if (topLeft.x < 0 || topLeft.y < 0) {
    issues.push('左上角坐标不能为负数')
  }
  if (bottomRight.x < 0 || bottomRight.y < 0) {
    issues.push('右下角坐标不能为负数')
  }

  // 检查是否超出边界
  if (bottomRight.x > imageWidth) {
    issues.push(`右下角X坐标(${bottomRight.x})超出图片宽度(${imageWidth})`)
  }
  if (bottomRight.y > imageHeight) {
    issues.push(`右下角Y坐标(${bottomRight.y})超出图片高度(${imageHeight})`)
  }

  // 检查是否有面积
  const width = bottomRight.x - topLeft.x
  const height = bottomRight.y - topLeft.y
  if (width <= 0 || height <= 0) {
    issues.push('裁剪区域必须有正面积')
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

/**
 * 生成导出文件名
 */
export function generateFilename(
  originalName: string = 'image',
  suffix: string = 'cropped',
  timestamp: boolean = true
): string {
  const baseName = originalName.replace(/\.[^/.]+$/, '') // 移除扩展名
  const timePart = timestamp ? `-${Date.now()}` : ''
  return `${baseName}-${suffix}${timePart}.png`
}

/**
 * 检查浏览器是否支持Canvas导出
 */
export function checkCanvasSupport(): {
  supported: boolean
  formats: string[]
} {
  const canvas = document.createElement('canvas')
  const formats: string[] = []

  if (!canvas.toDataURL) {
    return { supported: false, formats: [] }
  }

  // 测试常用格式
  const testFormats = ['image/png', 'image/jpeg', 'image/webp']
  for (const format of testFormats) {
    try {
      const dataUrl = canvas.toDataURL(format)
      if (dataUrl && dataUrl.startsWith(`data:${format}`)) {
        formats.push(format)
      }
    } catch (e) {
      // 格式不支持
    }
  }

  return {
    supported: formats.length > 0,
    formats,
  }
}