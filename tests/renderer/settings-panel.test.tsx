import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsPanel } from '../../src/renderer/src/components/settings/SettingsPanel'

describe('SettingsPanel', () => {
  const defaultConfig = {
    fontSize: 16,
    lineHeight: 1.8,
    fontFamily: 'Newsreader' as const,
    glassIntensity: 85,
    colorTheme: 'obsidian' as const,
    appearance: 'dark' as const,
    appearanceFollowSystem: false,
    currentBookId: null as string | null,
    alwaysOnTop: false,
    language: 'en' as const,
  }

  it('renders three navigation tabs: Appearance, Language, Shortcuts', () => {
    render(
      <SettingsPanel config={defaultConfig} onSave={vi.fn()} onClose={vi.fn()} />,
    )

    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getByText('Language')).toBeInTheDocument()
    expect(screen.getByText('Shortcuts')).toBeInTheDocument()
  })

  it('does not render Font Size, Line Height, or Save button', () => {
    render(
      <SettingsPanel config={defaultConfig} onSave={vi.fn()} onClose={vi.fn()} />,
    )

    expect(screen.queryByLabelText('Font Size')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Line Height')).not.toBeInTheDocument()
    expect(screen.queryByText('Save')).not.toBeInTheDocument()
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument()
  })

  it('renders three language rows and highlights the current language', () => {
    render(
      <SettingsPanel config={defaultConfig} onSave={vi.fn()} onClose={vi.fn()} />,
    )

    // 每行都有当前语言名和原生名
    const langRows = document.querySelectorAll('.settings-lang-row')
    expect(langRows).toHaveLength(3)

    // 英文行同时显示 "English" 在 current 和 native
    expect(screen.getAllByText('English')).toHaveLength(2)
    expect(screen.getByText('简体中文')).toBeInTheDocument()
    expect(screen.getByText('繁體中文')).toBeInTheDocument()

    // 当前选中英文
    const activeRow = document.querySelector('.settings-lang-row--active')
    expect(activeRow).toBeTruthy()
    expect(activeRow?.querySelector('.settings-lang-row__native')?.textContent).toBe('English')
  })

  it('calls onSave immediately when selecting a language', () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()

    render(
      <SettingsPanel config={defaultConfig} onSave={onSave} onClose={onClose} />,
    )

    // 点击简体中文 — 立即保存
    fireEvent.click(screen.getByText('简体中文').closest('button')!)
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ language: 'zh' }))
  })

  it('closes without extra save when clicking the backdrop', () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()

    const { container } = render(
      <SettingsPanel config={defaultConfig} onSave={onSave} onClose={onClose} />,
    )

    const backdrop = container.querySelector('.settings-backdrop')!
    fireEvent.click(backdrop)

    expect(onSave).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
