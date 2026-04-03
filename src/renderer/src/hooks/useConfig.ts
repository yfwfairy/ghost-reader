import { useEffect, useState } from 'react'
import { DEFAULT_APP_CONFIG } from '@shared/constants'
import type { AppConfig } from '@shared/types'

export function useConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null)

  useEffect(() => {
    void window.api.getConfig().then(setConfig)
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
