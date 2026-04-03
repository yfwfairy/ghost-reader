import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/src/App'

describe('App reader shell', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('keeps a visible reader shell while reader data is still loading', () => {
    window.history.replaceState({}, '', '/?mode=reader')
    const setReaderMode = vi.fn()
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        getConfig: vi.fn(() => new Promise(() => {})),
        getAllBooks: vi.fn().mockResolvedValue([]),
        getProgress: vi.fn(),
        readTxtFile: vi.fn(),
        saveProgress: vi.fn(),
        setReaderMode,
      },
    })

    render(<App />)

    expect(screen.getByText('Reading Lens')).toBeInTheDocument()
    expect(screen.getByText('Preparing reader...')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Hide reader' }))
    expect(setReaderMode).toHaveBeenCalledWith('hidden')
  })
})
