import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { MoreMenu } from '../../src/renderer/src/components/reader/MoreMenu'

vi.mock('../../src/renderer/src/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('MoreMenu', () => {
  const defaultProps = {
    autoScrollEnabled: false,
    autoScrollSpeed: 3,
    autoScrollPaused: false,
    pauseOnHover: false,
    onEnabledChange: vi.fn(),
    onSpeedChange: vi.fn(),
    onPauseOnHoverChange: vi.fn(),
    onUsageGuide: vi.fn(),
  }

  let slot: HTMLDivElement

  beforeEach(() => {
    slot = document.createElement('div')
    slot.id = 'more-menu-slot'
    document.body.appendChild(slot)
  })

  afterEach(() => {
    document.body.removeChild(slot)
  })

  it('renders the more_vert trigger button', () => {
    render(<MoreMenu {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument()
  })

  it('opens popover on click and shows auto-scroll toggle and usage guide', () => {
    render(<MoreMenu {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    expect(screen.getByText('more.autoScroll')).toBeInTheDocument()
    expect(screen.getByText('more.usageGuide')).toBeInTheDocument()
  })

  it('toggles auto-scroll via inline switch', () => {
    const onEnabledChange = vi.fn()
    render(<MoreMenu {...defaultProps} onEnabledChange={onEnabledChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    const switches = screen.getAllByRole('switch')
    fireEvent.click(switches[0])
    expect(onEnabledChange).toHaveBeenCalledWith(true)
  })

  it('shows speed tags and pause-on-hover when auto-scroll is enabled', () => {
    render(<MoreMenu {...defaultProps} autoScrollEnabled={true} />)
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    expect(screen.getByText('autoScroll.speed')).toBeInTheDocument()
    expect(screen.getByText('autoScroll.speed.2')).toBeInTheDocument()
    expect(screen.getByText('autoScroll.speed.3')).toBeInTheDocument()
    expect(screen.getByText('autoScroll.speed.4')).toBeInTheDocument()
    expect(screen.getByText('autoScroll.pauseOnHover')).toBeInTheDocument()
  })

  it('calls onSpeedChange when a speed tag is clicked', () => {
    const onSpeedChange = vi.fn()
    render(<MoreMenu {...defaultProps} autoScrollEnabled={true} onSpeedChange={onSpeedChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    fireEvent.click(screen.getByText('autoScroll.speed.4'))
    expect(onSpeedChange).toHaveBeenCalledWith(4)
  })

  it('calls onUsageGuide and closes menu when usage guide is clicked', () => {
    const onUsageGuide = vi.fn()
    render(<MoreMenu {...defaultProps} onUsageGuide={onUsageGuide} />)
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    fireEvent.click(screen.getByText('more.usageGuide'))
    expect(onUsageGuide).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('more.usageGuide')).not.toBeInTheDocument()
  })

  it('shows indicator dot when autoScrollEnabled is true', () => {
    render(<MoreMenu {...defaultProps} autoScrollEnabled={true} />)
    expect(slot.querySelector('.more-menu__indicator')).toBeInTheDocument()
  })

  it('closes menu when clicking the backdrop', () => {
    render(<MoreMenu {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    expect(screen.getByText('more.usageGuide')).toBeInTheDocument()
    const backdrop = document.querySelector('.more-menu__backdrop')!
    fireEvent.mouseDown(backdrop)
    expect(screen.queryByText('more.usageGuide')).not.toBeInTheDocument()
  })
})
