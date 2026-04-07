import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsPanel } from '../../src/renderer/src/components/settings/SettingsPanel'

describe('SettingsPanel', () => {
  it('submits updated typography values for the single-window reader', async () => {
    const updateConfig = vi.fn().mockResolvedValue(undefined)

    render(
      <SettingsPanel
        config={{
          fontSize: 16,
          lineHeight: 1.8,
          currentBookId: null,
          alwaysOnTop: false,
        }}
        onSave={updateConfig}
        onClose={vi.fn()}
      />,
    )

    expect(screen.queryByText('Hidden Surface')).not.toBeInTheDocument()
    expect(screen.queryByText('Reading Surface')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Font Size'), { target: { value: '20' } })
    fireEvent.change(screen.getByLabelText('Line Height'), { target: { value: '2.1' } })
    fireEvent.click(screen.getByText('Save'))

    expect(updateConfig).toHaveBeenCalledWith(expect.objectContaining({ fontSize: 20, lineHeight: 2.1 }))
  })
})
