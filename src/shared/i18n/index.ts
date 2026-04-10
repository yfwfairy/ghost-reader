import type { Locale } from '../types'
import en from './en'
import zh from './zh'
import zhTW from './zh-TW'

const locales: Record<string, Record<string, string>> = {
  en,
  zh,
  'zh-TW': zhTW,
}

/**
 * 根据 locale 和 key 获取翻译文本，支持 {0}, {1} 位置参数替换
 */
export function translate(
  locale: Locale,
  key: string,
  ...args: (string | number)[]
): string {
  const dict = locales[locale] ?? locales.en
  let value = dict[key] ?? locales.en[key] ?? key
  for (let i = 0; i < args.length; i++) {
    value = value.replace(`{${i}}`, String(args[i]))
  }
  return value
}
