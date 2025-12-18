/**
 * 图片裁剪工具 - 类型定义
 */

/**
 * 坐标点类型
 */
export interface Point {
  x: number
  y: number
}

/**
 * 锚点状态枚举
 */
export enum AnchorStatus {
  NONE = 'none', // 未设置
  FIRST = 'first', // 已设置第一个锚点（左上角）
  BOTH = 'both', // 已设置两个锚点
}

/**
 * 锚点类型
 */
export interface Anchor {
  id: 'first' | 'second'
  point: Point
  isActive: boolean
}

/**
 * 裁剪区域信息
 */
export interface CropArea {
  topLeft: Point
  bottomRight: Point
}

/**
 * 鼠标事件状态
 */
export interface MouseState {
  isMouseDown: boolean
  startPos: Point
  currentPos: Point
  mode: 'idle' | 'setting' | 'dragging'
  draggingAnchor: 'first' | 'second' | null
}

/**
 * Canvas配置选项
 */
export interface CanvasOptions {
  width: number
  height: number
  devicePixelRatio: number
}

/**
 * 图片信息
 */
export interface ImageInfo {
  src: string
  width: number
  height: number
  naturalWidth: number
  naturalHeight: number
}

/**
 * 裁剪结果
 */
export interface CropResult {
  canvas: HTMLCanvasElement
  dataUrl: string
  blob: Blob
  width: number
  height: number
}

/**
 * 键盘快捷键配置
 */
export interface KeyboardShortcuts {
  cancel: string[] // ESC 等取消操作
  confirm: string[] // Enter 等确认操作
  reset: string[] // R 等重置操作
  undo: string[] // Ctrl+Z 等撤销操作
}

/**
 * 状态历史记录（用于撤销功能）
 */
export interface StateHistory {
  anchors: {
    first: Point | null
    second: Point | null
  }
  timestamp: number
}

/**
 * UI状态
 */
export interface UIState {
  showCoordinates: boolean
  showPreview: boolean
  isProcessing: boolean
  errorMessage: string | null
  successMessage: string | null
}

/**
 * 拖拽调整时的边界限制
 */
export interface DragBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/**
 * 坐标转换选项
 */
export interface CoordinateTransform {
  scale: number
  offsetX: number
  offsetY: number
}
