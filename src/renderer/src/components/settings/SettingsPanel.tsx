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
        <div className="settings-panel__header">
          <div>
            <p className="settings-panel__eyebrow">Ghost Reader</p>
            <h2>Reader Settings</h2>
            <p className="settings-panel__summary">Tune the reader typography without breaking its calmness.</p>
          </div>
          <button className="settings-panel__close" onClick={onClose} aria-label="Close settings">
            ×
          </button>
        </div>

        <div className="settings-panel__section">
          <label className="settings-field">
            <span>Font Size</span>
            <div className="settings-field__control">
              <input
                aria-label="Font Size"
                type="number"
                value={draft.fontSize}
                onChange={(event) => {
                  setDraft({ ...draft, fontSize: Number(event.target.value) })
                }}
              />
              <strong>{draft.fontSize}px</strong>
            </div>
          </label>
          <label className="settings-field">
            <span>Line Height</span>
            <div className="settings-field__control settings-field__control--range">
              <input
                aria-label="Line Height"
                type="range"
                min="1.2"
                max="2.4"
                step="0.1"
                value={draft.lineHeight}
                onChange={(event) => {
                  setDraft({ ...draft, lineHeight: Number(event.target.value) })
                }}
              />
              <strong>{draft.lineHeight.toFixed(1)}</strong>
            </div>
          </label>
        </div>
        <div className="settings-actions">
          <button className="settings-actions__secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="settings-actions__primary" onClick={() => void onSave(draft)}>
            Save
          </button>
        </div>
      </section>
    </div>
  )
}
