import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsPanel } from '../../src/renderer/src/components/settings/SettingsPanel'

describe('SettingsPanel', () => {
  it('submits updated opacity and font size values', async () => {
    const updateConfig = vi.fn().mockResolvedValue(undefined)

    render(
      <SettingsPanel
        config={{
          hiddenOpacity: 0.1,
          readingOpacity: 0.85,
          fadeDelayMs: 1000,
          fadeDurationMs: 300,
          fontSize: 16,
          lineHeight: 1.8,
          activationShortcut: 'CommandOrControl+Shift+R',
          currentBookId: null,
          readerBounds: null,
        }}
        onSave={updateConfig}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByText('Hidden Surface')).toBeInTheDocument()
    expect(screen.getByText('Reading Surface')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Font Size'), { target: { value: '20' } })
    fireEvent.click(screen.getByText('Save'))

    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ fontSize: 20 }))
  })
})
