import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from '../../src/renderer/src/App'

describe('App reader shell', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('renders a quiet reader shell in reader mode', () => {
    window.history.replaceState({}, '', '/?mode=reader')

    render(<App />)

    expect(screen.getByText('Reading Lens')).toBeInTheDocument()
    expect(screen.getByText('A suspended reading surface for long-form focus.')).toBeInTheDocument()
  })
})
