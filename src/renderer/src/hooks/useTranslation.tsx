import { useContext } from 'react'
import type { I18nValue } from './i18n-context'
import { I18nContext } from './i18n-context'

export function useTranslation(): I18nValue {
  return useContext(I18nContext)
}
