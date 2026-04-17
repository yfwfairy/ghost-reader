import { useEffect, useRef } from 'react'
import type { AppConfig } from '@shared/types'
import type { ReaderActions } from '../components/reader/ReaderPage'

type KeyboardShortcutsConfig = {
  /** 仅在阅读器页面启用快捷键 */
  enabled: boolean
  immersive: boolean
  setImmersive: (updater: (prev: boolean) => boolean) => void
  readerActionsRef: React.RefObject<ReaderActions | null>
  onBack: () => void
  fontSize: number
  updateConfig: (patch: Partial<AppConfig>) => void
}

const MIN_FONT_SIZE = 10
const MAX_FONT_SIZE = 30

/**
 * 阅读器页面键盘快捷键
 *
 * ESC 由各 overlay 组件（SettingsPanel、ReaderLayout）自行处理，
 * 此 hook 仅在无 overlay 打开时处理 ESC 退出沉浸模式。
 */
export function useKeyboardShortcuts({
  enabled,
  immersive,
  setImmersive,
  readerActionsRef,
  onBack,
  fontSize,
  updateConfig,
}: KeyboardShortcutsConfig) {
  // 用 ref 持有可变值，避免 effect 频繁重注册
  const immersiveRef = useRef(immersive)
  const fontSizeRef = useRef(fontSize)
  const onBackRef = useRef(onBack)
  const updateConfigRef = useRef(updateConfig)

  useEffect(() => { immersiveRef.current = immersive }, [immersive])
  useEffect(() => { fontSizeRef.current = fontSize }, [fontSize])
  useEffect(() => { onBackRef.current = onBack }, [onBack])
  useEffect(() => { updateConfigRef.current = updateConfig }, [updateConfig])

  useEffect(() => {
    if (!enabled) return

    function handler(e: KeyboardEvent) {
      // 输入元素中不拦截快捷键
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const mod = e.metaKey || e.ctrlKey

      switch (e.key) {
        case 'PageDown':
          e.preventDefault()
          readerActionsRef.current?.scrollLine('down')
          break

        case 'PageUp':
          e.preventDefault()
          readerActionsRef.current?.scrollLine('up')
          break

        case 'ArrowLeft':
          if (!mod) {
            readerActionsRef.current?.chapterPrev()
          }
          break

        case 'ArrowRight':
          if (!mod) {
            readerActionsRef.current?.chapterNext()
          }
          break

        case 'f':
        case 'F':
          // Cmd/Ctrl+F 切换全屏/沉浸模式
          if (mod) {
            e.preventDefault()
            setImmersive((prev) => !prev)
          }
          break

        case 'Escape':
          // ESC 退出沉浸模式（仅当无 overlay 拦截时到达此处）
          if (immersiveRef.current) {
            setImmersive(() => false)
          }
          break

        case 'b':
        case 'B':
          // Cmd/Ctrl+B 返回书架
          if (mod) {
            e.preventDefault()
            onBackRef.current()
          }
          break

        case '=':
        case '+':
          // Cmd/Ctrl+= 字号增大
          if (mod) {
            e.preventDefault()
            const currentSize = fontSizeRef.current
            if (currentSize < MAX_FONT_SIZE) {
              updateConfigRef.current({ fontSize: Math.min(MAX_FONT_SIZE, currentSize + 1) })
            }
          }
          break

        case '-':
          // Cmd/Ctrl+- 字号减小
          if (mod) {
            e.preventDefault()
            const currentSize = fontSizeRef.current
            if (currentSize > MIN_FONT_SIZE) {
              updateConfigRef.current({ fontSize: Math.max(MIN_FONT_SIZE, currentSize - 1) })
            }
          }
          break
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [enabled, setImmersive, readerActionsRef])
}
