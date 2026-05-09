import { act, renderHook } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutoScroll } from '../../src/renderer/src/hooks/useAutoScroll'

// ---------------------------------------------------------------------------
// RAF mock helpers
// ---------------------------------------------------------------------------

let rafCallbacks: Array<(time: number) => void> = []
let rafIdCounter = 0

function setupRafMock() {
  rafCallbacks = []
  rafIdCounter = 0

  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((cb: (time: number) => void) => {
      const id = ++rafIdCounter
      rafCallbacks.push(cb)
      return id
    }),
  )

  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => {
      // 找到对应 id 的 callback 并移除（简单实现：此处不追踪 id→cb 映射，
      // 因为测试只关心 RAF 是否被调度，不需要精确取消）
      void id
    }),
  )
}

/** 触发所有待执行的 RAF 回调（模拟一帧） */
function flushRaf(time = 0) {
  const pending = [...rafCallbacks]
  rafCallbacks = []
  for (const cb of pending) {
    cb(time)
  }
}

/** 触发 n 帧 */
function flushFrames(n: number, startTime = 0) {
  for (let i = 0; i < n; i++) {
    flushRaf(startTime + i * 16)
  }
}

// ---------------------------------------------------------------------------
// 构建 scrollRef mock
// ---------------------------------------------------------------------------

function makeScrollRef(opts: { scrollTop?: number; scrollHeight?: number; clientHeight?: number } = {}) {
  const el = {
    scrollTop: opts.scrollTop ?? 0,
    scrollHeight: opts.scrollHeight ?? 1000,
    clientHeight: opts.clientHeight ?? 500,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
  return { current: el }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useAutoScroll', () => {
  beforeEach(() => {
    setupRafMock()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // 1. disabled 时不启动 RAF
  // -------------------------------------------------------------------------
  it('disabled 时不调用 requestAnimationFrame', () => {
    const scrollRef = makeScrollRef()
    renderHook(() =>
      useAutoScroll({
        enabled: false,
        speed: 3,
        pauseOnHover: false,
        scrollRef: scrollRef as unknown as React.RefObject<HTMLElement | null>,
        onChapterEnd: vi.fn(),
      }),
    )

    expect(requestAnimationFrame).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // 2. enabled 时启动 RAF 循环
  // -------------------------------------------------------------------------
  it('enabled 时启动 RAF 循环', () => {
    const scrollRef = makeScrollRef()
    renderHook(() =>
      useAutoScroll({
        enabled: true,
        speed: 3,
        pauseOnHover: false,
        scrollRef: scrollRef as unknown as React.RefObject<HTMLElement | null>,
        onChapterEnd: vi.fn(),
      }),
    )

    // 至少注册了一个 RAF 回调
    expect(requestAnimationFrame).toHaveBeenCalledTimes(1)

    // 触发一帧，循环应继续注册下一帧
    act(() => {
      flushRaf()
    })

    expect(requestAnimationFrame).toHaveBeenCalledTimes(2)
  })

  // -------------------------------------------------------------------------
  // 3. 按 speed 增加 scrollTop
  // -------------------------------------------------------------------------
  it('speed=1 时每帧增加 0.3px', () => {
    const scrollRef = makeScrollRef({ scrollTop: 0, scrollHeight: 1000, clientHeight: 500 })
    renderHook(() =>
      useAutoScroll({
        enabled: true,
        speed: 1,
        pauseOnHover: false,
        scrollRef: scrollRef as unknown as React.RefObject<HTMLElement | null>,
        onChapterEnd: vi.fn(),
      }),
    )

    act(() => flushRaf())
    expect(scrollRef.current.scrollTop).toBeCloseTo(0.3)
  })

  it('speed=3 时每帧增加 1.0px', () => {
    const scrollRef = makeScrollRef({ scrollTop: 0, scrollHeight: 1000, clientHeight: 500 })
    renderHook(() =>
      useAutoScroll({
        enabled: true,
        speed: 3,
        pauseOnHover: false,
        scrollRef: scrollRef as unknown as React.RefObject<HTMLElement | null>,
        onChapterEnd: vi.fn(),
      }),
    )

    act(() => flushRaf())
    expect(scrollRef.current.scrollTop).toBeCloseTo(1.0)
  })

  it('speed=5 时每帧增加 3.0px', () => {
    const scrollRef = makeScrollRef({ scrollTop: 0, scrollHeight: 1000, clientHeight: 500 })
    renderHook(() =>
      useAutoScroll({
        enabled: true,
        speed: 5,
        pauseOnHover: false,
        scrollRef: scrollRef as unknown as React.RefObject<HTMLElement | null>,
        onChapterEnd: vi.fn(),
      }),
    )

    act(() => flushRaf())
    expect(scrollRef.current.scrollTop).toBeCloseTo(3.0)
  })

  // -------------------------------------------------------------------------
  // 4. 到达底部时调用 onChapterEnd（且只调用一次）
  // -------------------------------------------------------------------------
  it('滚动到底部时调用 onChapterEnd，且只触发一次', () => {
    const onChapterEnd = vi.fn()
    // scrollTop 已接近底部：scrollHeight(100) - clientHeight(50) - 1 = 49
    // 再走一帧 speed=3 → +1px → scrollTop=50 >= 49 → 触发
    const scrollRef = makeScrollRef({ scrollTop: 48, scrollHeight: 100, clientHeight: 50 })

    renderHook(() =>
      useAutoScroll({
        enabled: true,
        speed: 3,
        pauseOnHover: false,
        scrollRef: scrollRef as unknown as React.RefObject<HTMLElement | null>,
        onChapterEnd,
      }),
    )

    act(() => flushRaf()) // 第 1 帧：scrollTop → 49，刚好等于阈值(49)，触发
    expect(onChapterEnd).toHaveBeenCalledTimes(1)

    act(() => flushRaf()) // 第 2 帧：仍在底部，不应再次触发
    expect(onChapterEnd).toHaveBeenCalledTimes(1)
  })

  // -------------------------------------------------------------------------
  // 5. toggle 暂停与恢复
  // -------------------------------------------------------------------------
  it('toggle 切换暂停状态', () => {
    const scrollRef = makeScrollRef({ scrollTop: 0, scrollHeight: 1000, clientHeight: 500 })
    const { result } = renderHook(() =>
      useAutoScroll({
        enabled: true,
        speed: 3,
        pauseOnHover: false,
        scrollRef: scrollRef as unknown as React.RefObject<HTMLElement | null>,
        onChapterEnd: vi.fn(),
      }),
    )

    // 初始未暂停
    expect(result.current.paused).toBe(false)

    // toggle → 暂停
    act(() => result.current.toggle())
    expect(result.current.paused).toBe(true)

    // 暂停时滚动不增加
    act(() => flushRaf())
    expect(scrollRef.current.scrollTop).toBe(0)

    // toggle → 恢复
    act(() => result.current.toggle())
    expect(result.current.paused).toBe(false)

    // 恢复后继续滚动
    act(() => flushRaf())
    expect(scrollRef.current.scrollTop).toBeCloseTo(1.0)
  })

  // -------------------------------------------------------------------------
  // 6. pause / resume 方法
  // -------------------------------------------------------------------------
  it('pause() 暂停滚动，resume() 恢复滚动', () => {
    const scrollRef = makeScrollRef({ scrollTop: 0, scrollHeight: 1000, clientHeight: 500 })
    const { result } = renderHook(() =>
      useAutoScroll({
        enabled: true,
        speed: 3,
        pauseOnHover: false,
        scrollRef: scrollRef as unknown as React.RefObject<HTMLElement | null>,
        onChapterEnd: vi.fn(),
      }),
    )

    act(() => result.current.pause())
    expect(result.current.paused).toBe(true)

    act(() => flushRaf())
    expect(scrollRef.current.scrollTop).toBe(0)

    act(() => result.current.resume())
    expect(result.current.paused).toBe(false)

    act(() => flushRaf())
    expect(scrollRef.current.scrollTop).toBeCloseTo(1.0)
  })

  // -------------------------------------------------------------------------
  // 7. enabled 切回 false → 停止 RAF，scrollTop 不再增加
  // -------------------------------------------------------------------------
  it('enabled 切回 false 后停止滚动', () => {
    const scrollRef = makeScrollRef({ scrollTop: 0, scrollHeight: 1000, clientHeight: 500 })
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useAutoScroll({
          enabled,
          speed: 3,
          pauseOnHover: false,
          scrollRef: scrollRef as unknown as React.RefObject<HTMLElement | null>,
          onChapterEnd: vi.fn(),
        }),
      { initialProps: { enabled: true } },
    )

    act(() => flushRaf())
    expect(scrollRef.current.scrollTop).toBeCloseTo(1.0)

    // 禁用
    rerender({ enabled: false })

    const scrollTopAfterDisable = scrollRef.current.scrollTop
    act(() => flushRaf()) // 任何残留 RAF 不应再增加
    expect(scrollRef.current.scrollTop).toBe(scrollTopAfterDisable)
  })

  // -------------------------------------------------------------------------
  // 8. enabled 切回 true → 重置 paused=false
  // -------------------------------------------------------------------------
  it('enabled 切回 true 时重置 paused 为 false', () => {
    const scrollRef = makeScrollRef({ scrollTop: 0, scrollHeight: 1000, clientHeight: 500 })
    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useAutoScroll({
          enabled,
          speed: 3,
          pauseOnHover: false,
          scrollRef: scrollRef as unknown as React.RefObject<HTMLElement | null>,
          onChapterEnd: vi.fn(),
        }),
      { initialProps: { enabled: true } },
    )

    act(() => result.current.pause())
    expect(result.current.paused).toBe(true)

    rerender({ enabled: false })
    rerender({ enabled: true })
    expect(result.current.paused).toBe(false)
  })

  // -------------------------------------------------------------------------
  // 9. speed 变更立即生效
  // -------------------------------------------------------------------------
  it('speed 变更后立即生效', () => {
    const scrollRef = makeScrollRef({ scrollTop: 0, scrollHeight: 1000, clientHeight: 500 })
    const { rerender } = renderHook(
      ({ speed }: { speed: number }) =>
        useAutoScroll({
          enabled: true,
          speed,
          pauseOnHover: false,
          scrollRef: scrollRef as unknown as React.RefObject<HTMLElement | null>,
          onChapterEnd: vi.fn(),
        }),
      { initialProps: { speed: 1 } },
    )

    act(() => flushRaf())
    expect(scrollRef.current.scrollTop).toBeCloseTo(0.3)

    // 变更速度
    rerender({ speed: 5 })

    act(() => flushRaf())
    // 此帧使用 speed=5 → +3.0
    expect(scrollRef.current.scrollTop).toBeCloseTo(0.3 + 3.0)
  })

  // -------------------------------------------------------------------------
  // 10. pauseOnHover: mouseenter 暂停，mouseleave 恢复
  // -------------------------------------------------------------------------
  it('pauseOnHover=true 时注册鼠标悬停监听', () => {
    const scrollRef = makeScrollRef()
    renderHook(() =>
      useAutoScroll({
        enabled: true,
        speed: 3,
        pauseOnHover: true,
        scrollRef: scrollRef as unknown as React.RefObject<HTMLElement | null>,
        onChapterEnd: vi.fn(),
      }),
    )

    expect(scrollRef.current.addEventListener).toHaveBeenCalledWith('mouseenter', expect.any(Function))
    expect(scrollRef.current.addEventListener).toHaveBeenCalledWith('mouseleave', expect.any(Function))
  })

  it('pauseOnHover=true: mouseenter 暂停滚动，mouseleave 恢复', () => {
    const scrollRef = makeScrollRef({ scrollTop: 0, scrollHeight: 1000, clientHeight: 500 })
    renderHook(() =>
      useAutoScroll({
        enabled: true,
        speed: 3,
        pauseOnHover: true,
        scrollRef: scrollRef as unknown as React.RefObject<HTMLElement | null>,
        onChapterEnd: vi.fn(),
      }),
    )

    // 取出已注册的 mouseenter / mouseleave 回调
    const addListenerCalls = (scrollRef.current.addEventListener as ReturnType<typeof vi.fn>).mock.calls
    const mouseenterCb = addListenerCalls.find((args: string[]) => args[0] === 'mouseenter')?.[1] as () => void
    const mouseleaveCb = addListenerCalls.find((args: string[]) => args[0] === 'mouseleave')?.[1] as () => void

    // mouseenter → 鼠标悬停暂停
    act(() => mouseenterCb())
    act(() => flushRaf())
    expect(scrollRef.current.scrollTop).toBe(0) // 暂停，不滚动

    // mouseleave → 恢复
    act(() => mouseleaveCb())
    act(() => flushRaf())
    expect(scrollRef.current.scrollTop).toBeCloseTo(1.0)
  })

  // -------------------------------------------------------------------------
  // 11. resume() 重置 chapterEndFired，允许再次触发 onChapterEnd
  // -------------------------------------------------------------------------
  it('resume() 重置 chapterEnd 标志，可再次触发', () => {
    const onChapterEnd = vi.fn()
    const scrollRef = makeScrollRef({ scrollTop: 48, scrollHeight: 100, clientHeight: 50 })

    const { result } = renderHook(() =>
      useAutoScroll({
        enabled: true,
        speed: 3,
        pauseOnHover: false,
        scrollRef: scrollRef as unknown as React.RefObject<HTMLElement | null>,
        onChapterEnd,
      }),
    )

    // 第一次到达底部
    act(() => flushRaf())
    expect(onChapterEnd).toHaveBeenCalledTimes(1)

    // 手动 resume（模拟用户翻页后回到此章）
    act(() => result.current.resume())

    // 还在底部，下一帧应再次触发
    act(() => flushRaf())
    expect(onChapterEnd).toHaveBeenCalledTimes(2)
  })

  // -------------------------------------------------------------------------
  // 12. onChapterEnd 引用变更立即生效（不需要重新注册 effect）
  // -------------------------------------------------------------------------
  it('onChapterEnd 引用更新后调用最新版本', () => {
    const onChapterEnd1 = vi.fn()
    const onChapterEnd2 = vi.fn()
    const scrollRef = makeScrollRef({ scrollTop: 48, scrollHeight: 100, clientHeight: 50 })

    const { rerender } = renderHook(
      ({ onChapterEnd }: { onChapterEnd: () => void }) =>
        useAutoScroll({
          enabled: true,
          speed: 3,
          pauseOnHover: false,
          scrollRef: scrollRef as unknown as React.RefObject<HTMLElement | null>,
          onChapterEnd,
        }),
      { initialProps: { onChapterEnd: onChapterEnd1 } },
    )

    // 更新回调
    rerender({ onChapterEnd: onChapterEnd2 })

    act(() => flushRaf())
    expect(onChapterEnd1).not.toHaveBeenCalled()
    expect(onChapterEnd2).toHaveBeenCalledTimes(1)
  })

  // -------------------------------------------------------------------------
  // 13. 多帧累积滚动正确
  // -------------------------------------------------------------------------
  it('多帧累积：10 帧后 scrollTop 约等于 10 * delta', () => {
    const scrollRef = makeScrollRef({ scrollTop: 0, scrollHeight: 2000, clientHeight: 500 })
    renderHook(() =>
      useAutoScroll({
        enabled: true,
        speed: 2, // delta = 0.6
        pauseOnHover: false,
        scrollRef: scrollRef as unknown as React.RefObject<HTMLElement | null>,
        onChapterEnd: vi.fn(),
      }),
    )

    act(() => flushFrames(10))
    expect(scrollRef.current.scrollTop).toBeCloseTo(6.0, 1)
  })
})
