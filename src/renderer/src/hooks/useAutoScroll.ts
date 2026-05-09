import { useCallback, useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// 速度映射表（单位：px/帧）
// ---------------------------------------------------------------------------
const SPEED_MAP: Record<number, number> = {
  1: 0.3, // 极慢
  2: 0.6, // 慢
  3: 1.0, // 中（默认）
  4: 1.8, // 快
  5: 3.0, // 极快
}

// ---------------------------------------------------------------------------
// 类型定义
// ---------------------------------------------------------------------------
export type UseAutoScrollOptions = {
  enabled: boolean
  speed: number // 1-5
  pauseOnHover: boolean
  scrollRef: React.RefObject<HTMLElement | null>
  onChapterEnd: () => void
}

export type UseAutoScrollReturn = {
  paused: boolean
  pause: () => void
  resume: () => void
  toggle: () => void
}

// ---------------------------------------------------------------------------
// Hook 实现
// ---------------------------------------------------------------------------
export function useAutoScroll(options: UseAutoScrollOptions): UseAutoScrollReturn {
  const { enabled, speed, pauseOnHover, scrollRef, onChapterEnd } = options

  // paused 是 React state，用于驱动 UI 渲染
  const [paused, setPaused] = useState(false)

  // 用 ref 持有"运行时"状态，避免 RAF 回调闭包过期
  const pausedRef = useRef(false)
  const chapterEndFiredRef = useRef(false)
  const speedRef = useRef(speed)
  const onChapterEndRef = useRef(onChapterEnd)
  const scrollRefRef = useRef(scrollRef)
  const hoverPausedRef = useRef(false) // mouseenter/mouseleave 触发的悬停暂停
  const rafIdRef = useRef<number | null>(null)
  const enabledRef = useRef(enabled) // 让 tick 闭包能感知 enabled 最新值

  // 同步最新 speed 和 onChapterEnd 到 ref，使 RAF 回调始终读到最新值
  useEffect(() => {
    speedRef.current = speed
  }, [speed])

  useEffect(() => {
    onChapterEndRef.current = onChapterEnd
  }, [onChapterEnd])

  useEffect(() => {
    scrollRefRef.current = scrollRef
  }, [scrollRef])

  // -------------------------------------------------------------------------
  // 公开方法
  // -------------------------------------------------------------------------
  const pause = useCallback(() => {
    pausedRef.current = true
    setPaused(true)
  }, [])

  const resume = useCallback(() => {
    pausedRef.current = false
    chapterEndFiredRef.current = false // 重置章节结束标志
    setPaused(false)
  }, [])

  const toggle = useCallback(() => {
    if (pausedRef.current) {
      resume()
    } else {
      pause()
    }
  }, [pause, resume])

  // -------------------------------------------------------------------------
  // RAF 滚动循环
  // -------------------------------------------------------------------------
  useEffect(() => {
    enabledRef.current = enabled

    if (!enabled) {
      // 禁用时取消任何已排队的 RAF
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
      return
    }

    // enabled=true 时重置状态
    pausedRef.current = false
    setPaused(false)
    chapterEndFiredRef.current = false

    let cachedEl: HTMLElement | null = null

    const tick = () => {
      // 若 enabled 已切回 false，停止循环（应对 cancelAnimationFrame mock 失效的情况）
      if (!enabledRef.current) return

      if (!cachedEl || !cachedEl.isConnected) {
        cachedEl = scrollRefRef.current?.current
          || document.querySelector<HTMLElement>('.txt-renderer')
          || document.querySelector<HTMLElement>('.epub-container')
      }
      if (cachedEl) {
        const isHoverPaused = hoverPausedRef.current
        const isManualPaused = pausedRef.current

        if (!isManualPaused && !isHoverPaused) {
          const delta = SPEED_MAP[speedRef.current] ?? 1.0
          cachedEl.scrollTop += delta

          // 检测是否到达底部（阈值：scrollHeight - clientHeight - 1）
          const atBottom = cachedEl.scrollTop >= cachedEl.scrollHeight - cachedEl.clientHeight - 1
          if (atBottom && !chapterEndFiredRef.current) {
            chapterEndFiredRef.current = true
            onChapterEndRef.current()
          }
        }
      }

      // 继续下一帧
      rafIdRef.current = requestAnimationFrame(tick)
    }

    rafIdRef.current = requestAnimationFrame(tick)

    return () => {
      enabledRef.current = false
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [enabled])

  // -------------------------------------------------------------------------
  // pauseOnHover：鼠标悬停监听
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!enabled || !pauseOnHover) return

    const el = scrollRefRef.current?.current
      || document.querySelector<HTMLElement>('.txt-renderer')
      || document.querySelector<HTMLElement>('.epub-container')
    if (!el) return

    const handleMouseEnter = () => {
      hoverPausedRef.current = true
    }
    const handleMouseLeave = () => {
      hoverPausedRef.current = false
    }

    el.addEventListener('mouseenter', handleMouseEnter)
    el.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      el.removeEventListener('mouseenter', handleMouseEnter)
      el.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [enabled, pauseOnHover])

  return { paused, pause, resume, toggle }
}
