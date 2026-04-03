import { useEffect, useState } from 'react'
import type { AppConfig } from '@shared/types'

type SettingsPanelProps = {
  config: AppConfig
  onSave: (patch: Partial<AppConfig>) => Promise<unknown>
  onClose: () => void
}

export function SettingsPanel({ config, onSave, onClose }: SettingsPanelProps) {
  const [draft, setDraft] = useState(config)

  useEffect(() => {
    setDraft(config)
  }, [config])

  return (
    <div
      className="settings-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section className="settings-panel">
        <h2>Reader Settings</h2>
        <label className="settings-field">
          <span>Font Size</span>
          <input
            aria-label="Font Size"
            type="number"
            value={draft.fontSize}
            onChange={(event) => {
              setDraft({ ...draft, fontSize: Number(event.target.value) })
            }}
          />
        </label>
        <label className="settings-field">
          <span>Reading Opacity</span>
          <input
            aria-label="Reading Opacity"
            type="range"
            min="0.5"
            max="1"
            step="0.05"
            value={draft.readingOpacity}
            onChange={(event) => {
              setDraft({ ...draft, readingOpacity: Number(event.target.value) })
            }}
          />
        </label>
        <div className="settings-actions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={() => void onSave(draft)}>Save</button>
        </div>
      </section>
    </div>
  )
}
