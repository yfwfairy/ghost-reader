import { createContext, useCallback, useContext, type ReactNode } from 'react'
import { translate } from '@shared/i18n'
import type { Locale } from '@shared/types'
import { useConfig } from './useConfig'

type TranslateFn = (key: string, ...args: (string | number)[]) => string

interface I18nValue {
  t: TranslateFn
  locale: Locale
}

const I18nContext = createContext<I18nValue>({
  t: (key, ...args) => translate('en', key, ...args),
  locale: 'en',
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const { config } = useConfig()
  const locale: Locale = config?.language ?? 'en'

  const t: TranslateFn = useCallback(
    (key, ...args) => translate(locale, key, ...args),
    [locale],
  )

  return <I18nContext.Provider value={{ t, locale }}>{children}</I18nContext.Provider>
}

export function useTranslation(): I18nValue {
  return useContext(I18nContext)
}
