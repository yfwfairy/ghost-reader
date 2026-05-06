import { useState, useEffect } from 'react'
import { lerpColor } from '@shared/constants'
import { useTranslation } from '../../hooks/useTranslation'

type CustomThemePanelProps = {
  bg: string
  text: string
  onBgChange: (hex: string) => void
  onTextChange: (hex: string) => void
  previewFontSize?: number
  previewBrightness?: number
  previewOpacity?: number
  previewMargin?: number
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/

function isValidHex(value: string): boolean {
  return HEX_RE.test(value)
}

export function CustomThemePanel({ bg, text, onBgChange, onTextChange, previewFontSize, previewBrightness, previewOpacity, previewMargin }: CustomThemePanelProps) {
  const { t } = useTranslation()
  const [bgInput, setBgInput] = useState(bg)
  const [textInput, setTextInput] = useState(text)

  useEffect(() => { setBgInput(bg) }, [bg])
  useEffect(() => { setTextInput(text) }, [text])

  const accent = lerpColor(bg, text, 0.4)
  const eyeDropperSupported = typeof window !== 'undefined' && 'EyeDropper' in window

  async function pickColor(setter: (hex: string) => void) {
    try {
      const dropper = new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper()
      const result = await dropper.open()
      setter(result.sRGBHex)
    } catch {
      // 用户按 Esc 取消取色
    }
  }

  function handleBgInputBlur() {
    if (isValidHex(bgInput)) {
      onBgChange(bgInput)
    } else {
      setBgInput(bg)
    }
  }

  function handleTextInputBlur() {
    if (isValidHex(textInput)) {
      onTextChange(textInput)
    } else {
      setTextInput(text)
    }
  }

  function handleBgInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleBgInputBlur()
  }

  function handleTextInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleTextInputBlur()
  }

  return (
    <div className="custom-theme-panel">
      {/* 实时预览 */}
      <div
        className="custom-theme-panel__preview"
        style={{
          backgroundColor: bg,
          filter: previewBrightness != null ? `brightness(${previewBrightness / 100})` : undefined,
          opacity: previewOpacity != null ? previewOpacity / 100 : undefined,
          padding: previewMargin != null ? `12px ${previewMargin}px` : 12,
        }}
      >
        <div style={{ color: text, fontSize: previewFontSize ?? 13, fontWeight: 500, marginBottom: 2 }}>
          {t('appearance.customPanel.preview')}
        </div>
        <div style={{ color: accent, fontSize: previewFontSize != null ? Math.max(previewFontSize - 2, 10) : 11 }}>
          宇宙洪荒 · The quick brown fox jumps over the lazy dog.
        </div>
      </div>

      {/* 背景色 + 文字色同行 */}
      <div className="custom-theme-panel__colors">
        {/* 背景色 */}
        <div className="custom-theme-panel__color-field">
          <div className="custom-theme-panel__color-label">{t('appearance.customPanel.bg')}</div>
          <div className="custom-theme-panel__color-row">
            <label className="custom-theme-panel__color-swatch">
              <input
                type="color"
                value={bg}
                onChange={(e) => onBgChange(e.target.value)}
                className="custom-theme-panel__color-input-native"
              />
              <span style={{ backgroundColor: bg }} />
            </label>
            <input
              className="custom-theme-panel__hex-input"
              value={bgInput}
              onChange={(e) => setBgInput(e.target.value)}
              onBlur={handleBgInputBlur}
              onKeyDown={handleBgInputKeyDown}
              spellCheck={false}
            />
            {eyeDropperSupported && (
              <button
                type="button"
                className="custom-theme-panel__pick-btn"
                onClick={() => void pickColor(onBgChange)}
                title={t('appearance.customPanel.pickColor')}
              >
                <span className="material-symbols-outlined">colorize</span>
              </button>
            )}
          </div>
        </div>

        {/* 文字色 */}
        <div className="custom-theme-panel__color-field">
          <div className="custom-theme-panel__color-label">{t('appearance.customPanel.text')}</div>
          <div className="custom-theme-panel__color-row">
            <label className="custom-theme-panel__color-swatch">
              <input
                type="color"
                value={text}
                onChange={(e) => onTextChange(e.target.value)}
                className="custom-theme-panel__color-input-native"
              />
              <span style={{ backgroundColor: text }} />
            </label>
            <input
              className="custom-theme-panel__hex-input"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onBlur={handleTextInputBlur}
              onKeyDown={handleTextInputKeyDown}
              spellCheck={false}
            />
            {eyeDropperSupported && (
              <button
                type="button"
                className="custom-theme-panel__pick-btn"
                onClick={() => void pickColor(onTextChange)}
                title={t('appearance.customPanel.pickColor')}
              >
                <span className="material-symbols-outlined">colorize</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
