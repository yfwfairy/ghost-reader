import { createContext } from 'react'
import { translate } from '@shared/i18n'
import type { Locale } from '@shared/types'

type TranslateFn = (key: string, ...args: (string | number)[]) => string

export interface I18nValue {
  t: TranslateFn
  locale: Locale
}

export const I18nContext = createContext<I18nValue>({
  t: (key, ...args) => translate('en', key, ...args),
  locale: 'en',
})
