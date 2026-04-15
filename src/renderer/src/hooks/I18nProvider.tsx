import { useCallback, type ReactNode } from 'react'
import { translate } from '@shared/i18n'
import type { Locale } from '@shared/types'
import { useConfig } from './useConfig'
import { I18nContext } from './i18n-context'

export function I18nProvider({ children }: { children: ReactNode }) {
  const { config } = useConfig()
  const locale: Locale = config?.language ?? 'en'

  const t = useCallback(
    (key: string, ...args: (string | number)[]) => translate(locale, key, ...args),
    [locale],
  )

  return <I18nContext.Provider value={{ t, locale }}>{children}</I18nContext.Provider>
}
