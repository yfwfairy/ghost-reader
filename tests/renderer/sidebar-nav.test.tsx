import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SidebarNav } from '../../src/renderer/src/components/bookshelf/SidebarNav'

describe('SidebarNav', () => {
  it('delegates settings opening instead of rendering the settings panel itself', () => {
    const onChangeView = vi.fn()
    const onOpenSettings = vi.fn()

    render(<SidebarNav activeView="library" onChangeView={onChangeView} onOpenSettings={onOpenSettings} />)

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))

    expect(onOpenSettings).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Reader Settings')).not.toBeInTheDocument()
  })

  it('keeps navigation interactions focused on view changes', () => {
    const onChangeView = vi.fn()

    render(<SidebarNav activeView="library" onChangeView={onChangeView} onOpenSettings={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Open recent view' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open library view' }))

    expect(onChangeView).toHaveBeenNthCalledWith(1, 'recent')
    expect(onChangeView).toHaveBeenNthCalledWith(2, 'library')
  })
})
