// translate.js 按需加载(旧版为 CDN <script> 全局引入,这里改为首次点击翻译时加载)
let loading: Promise<void> | null = null

interface TranslateJs {
  setUseVersion2?: () => void
  language?: { setLocal?: (lang: string) => void }
  execute?: () => void
}

export function ensureTranslate(): Promise<void> {
  const w = window as unknown as { translate?: TranslateJs }
  if (w.translate) return Promise.resolve()
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://res.zvo.cn/translate/translate.js'
      script.onload = () => {
        try {
          w.translate?.setUseVersion2?.()
          w.translate?.language?.setLocal?.('chinese_simplified')
        } catch {
          /* 配置失败不阻塞使用 */
        }
        resolve()
      }
      script.onerror = () => {
        loading = null
        script.remove()
        reject(new Error('翻译服务加载失败,请检查网络'))
      }
      document.head.appendChild(script)
    })
  }
  return loading
}
