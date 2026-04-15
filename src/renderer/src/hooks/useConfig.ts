import { useEffect, useState } from 'react'
import { DEFAULT_APP_CONFIG } from '@shared/constants'
import type { AppConfig } from '@shared/types'

export function useConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null)

  useEffect(() => {
    let active = true

    void window.api.getConfig().then((next) => {
      if (active) {
        setConfig(next)
      }
    })

    const unsubscribe = window.api.onConfigChanged((next) => {
      if (active) {
        setConfig(next)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  async function updateConfig(patch: Partial<AppConfig>) {
    const next = await window.api.setConfig(patch)
    setConfig(next)
    return next
  }

  return {
    config,
    fallbackConfig: { ...DEFAULT_APP_CONFIG },
    loading: config === null,
    updateConfig,
  }
}
