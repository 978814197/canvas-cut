/**
 * 键盘快捷键组合函数
 * 支持ESC取消，Enter确认，R重置，Ctrl+Z撤销等
 */

import { onMounted, onUnmounted, ref } from 'vue'
import type { KeyboardShortcuts } from '../types'

/**
 * 默认快捷键配置
 */
const DEFAULT_SHORTCUTS: KeyboardShortcuts = {
  cancel: ['Escape', 'Esc'],
  confirm: ['Enter'],
  reset: ['KeyR', 'r'],
  undo: ['Control+Z', 'Meta+Z'], // Ctrl+Z 或 Cmd+Z
}

/**
 * 键盘事件处理器
 */
export interface KeyboardHandler {
  onConfirm: () => void
  onCancel: () => void
  onReset: () => void
  onUndo: () => void
  onKeyDown?: (event: KeyboardEvent) => void
}

/**
 * 使用键盘快捷键Hook
 */
export function useKeyboard(
  handler: KeyboardHandler,
  shortcuts: KeyboardShortcuts = DEFAULT_SHORTCUTS,
) {
  const pressedKeys = ref<Set<string>>(new Set())

  /**
   * 检查按键组合是否匹配
   */
  const isKeyComboMatch = (event: KeyboardEvent, combo: string): boolean => {
    // 处理组合键：Control+Z, Meta+Z 等
    if (combo.includes('+')) {
      const parts = combo.split('+')
      const modifier = parts[0] // Control 或 Meta
      const key = parts[1] || ''

      const modifiers = {
        Control: event.ctrlKey || event.metaKey, // 支持Windows和Mac
        Meta: event.metaKey || event.ctrlKey,
        Shift: event.shiftKey,
        Alt: event.altKey,
      }

      // 检查修饰键
      if (!modifiers[modifier as keyof typeof modifiers]) {
        return false
      }

      // 检查主键
      return event.code === key || event.key?.toLowerCase() === key.toLowerCase()
    }

    // 单按键
    return (
      event.code === combo ||
      event.key === combo ||
      event.key?.toLowerCase() === combo.toLowerCase()
    )
  }

  /**
   * 处理按键按下
   */
  const handleKeyDown = (event: KeyboardEvent) => {
    // 记录按下的键
    const keyId = event.ctrlKey || event.metaKey ? `Control+${event.code}` : event.code

    pressedKeys.value.add(keyId)

    // 调用外部handler的onKeyDown
    if (handler.onKeyDown) {
      handler.onKeyDown(event)
    }

    // 检查取消快捷键
    if (shortcuts.cancel.some((combo) => isKeyComboMatch(event, combo))) {
      event.preventDefault()
      handler.onCancel()
      return
    }

    // 检查确认快捷键
    if (shortcuts.confirm.some((combo) => isKeyComboMatch(event, combo))) {
      event.preventDefault()
      handler.onConfirm()
      return
    }

    // 检查重置快捷键
    if (shortcuts.reset.some((combo) => isKeyComboMatch(event, combo))) {
      event.preventDefault()
      handler.onReset()
      return
    }

    // 检查撤销快捷键
    if (shortcuts.undo.some((combo) => isKeyComboMatch(event, combo))) {
      event.preventDefault()
      handler.onUndo()
      return
    }
  }

  /**
   * 处理按键释放
   */
  const handleKeyUp = (event: KeyboardEvent) => {
    const keyId = event.ctrlKey || event.metaKey ? `Control+${event.code}` : event.code
    pressedKeys.value.delete(keyId)
  }

  /**
   * 检查特定按键是否被按下
   */
  const isKeyPressed = (key: string): boolean => {
    return pressedKeys.value.has(key)
  }

  /**
   * 检查是否按住了Ctrl/Meta键
   */
  const isModifierPressed = (): boolean => {
    return (
      isKeyPressed('ControlLeft') ||
      isKeyPressed('ControlRight') ||
      isKeyPressed('MetaLeft') ||
      isKeyPressed('MetaRight')
    )
  }

  /**
   * 格式化按键显示
   */
  const formatKeyDisplay = (combo: string): string => {
    if (combo.includes('+')) {
      const parts = combo.split('+')
      const modifier = parts[0] === 'Control' ? 'Ctrl' : parts[0]
      const key = parts[1] || ''
      return `${modifier} + ${key.replace('Key', '')}`
    }

    if (combo.startsWith('Key')) {
      return combo.replace('Key', '').toUpperCase()
    }

    if (combo === 'Escape') return 'ESC'
    if (combo === 'Enter') return 'Enter'

    return combo
  }

  /**
   * 获取所有激活的快捷键描述
   */
  const getShortcutDescriptions = () => {
    const descriptions: string[] = []

    // 取消
    const cancelKeys = shortcuts.cancel.map(formatKeyDisplay).join(' / ')
    descriptions.push(`取消: ${cancelKeys}`)

    // 确认
    const confirmKeys = shortcuts.confirm.map(formatKeyDisplay).join(' / ')
    descriptions.push(`确认: ${confirmKeys}`)

    // 重置
    const resetKeys = shortcuts.reset.map(formatKeyDisplay).join(' / ')
    descriptions.push(`重置: ${resetKeys}`)

    // 撤销
    const undoKeys = shortcuts.undo.map(formatKeyDisplay).join(' / ')
    descriptions.push(`撤销: ${undoKeys}`)

    return descriptions
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    window.removeEventListener('keyup', handleKeyUp)
  })

  return {
    pressedKeys,
    isKeyPressed,
    isModifierPressed,
    formatKeyDisplay,
    getShortcutDescriptions,
  }
}

/**
 * 创建快捷键提示文本
 */
export function createShortcutTooltip(
  action: 'cancel' | 'confirm' | 'reset' | 'undo',
  shortcuts: KeyboardShortcuts = DEFAULT_SHORTCUTS,
): string {
  const keys = shortcuts[action]
  const displayKeys = keys
    .map((key) => {
      if (key.includes('+')) {
        const parts = key.split('+')
        const modifier = parts[0] === 'Control' ? 'Ctrl' : parts[0]
        const k = (parts[1] || '').replace('Key', '')
        return `${modifier}+${k}`
      }
      return key === 'Escape' ? 'ESC' : key
    })
    .join(' 或 ')

  const actionNames = {
    cancel: '取消',
    confirm: '确认',
    reset: '重置',
    undo: '撤销',
  }

  return `${actionNames[action]} (${displayKeys})`
}
