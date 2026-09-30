import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { addFeed, discoverFeeds } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Article, DiscoveredFeed } from '@/types'

/* ---------- 确认对话框 ---------- */

export interface ConfirmState {
  message: string
  onConfirm: () => void
}

export function ConfirmDialog({
  state,
  onClose,
}: {
  state: ConfirmState | null
  onClose: () => void
}) {
  return (
    <AlertDialog open={!!state} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认操作</AlertDialogTitle>
          <AlertDialogDescription>{state?.message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={() => {
              state?.onConfirm()
              onClose()
            }}
          >
            确认
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/* ---------- 重命名(分类/标签) ---------- */

export interface RenameTarget {
  type: 'category' | 'tag'
  id: number
  name: string
}

export function RenameDialog({
  target,
  onSubmit,
  onClose,
}: {
  target: RenameTarget | null
  onSubmit: (target: RenameTarget, name: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const open = !!target
  const current = open ? target : null

  // 每次打开时用目标名称初始化输入框
  const [lastId, setLastId] = useState<number | null>(null)
  if (current && current.id !== lastId) {
    setLastId(current.id)
    setName(current.name)
  }
  if (!current && lastId !== null) setLastId(null)

  const submit = () => {
    const v = name.trim()
    if (!v || !current) return
    onSubmit(current, v)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{current?.type === 'category' ? '重命名分类' : '重命名标签'}</DialogTitle>
        </DialogHeader>
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={submit}>确定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------- 添加订阅源(发现 + 直接订阅) ---------- */

export function AddFeedDialog({
  open,
  onAdded,
  onClose,
}: {
  open: boolean
  onAdded: () => void
  onClose: () => void
}) {
  const [url, setUrl] = useState('')
  const [discovering, setDiscovering] = useState(false)
  const [adding, setAdding] = useState(false)
  const [results, setResults] = useState<DiscoveredFeed[] | null>(null)

  const reset = () => {
    setUrl('')
    setResults(null)
    setDiscovering(false)
    setAdding(false)
  }

  const discover = async () => {
    const v = url.trim()
    if (!v) return
    setDiscovering(true)
    try {
      const data = await discoverFeeds(v)
      if (!data.feeds.length) toast.warning('未发现订阅源')
      setResults(data.feeds)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '发现失败')
    } finally {
      setDiscovering(false)
    }
  }

  const subscribe = async (feedUrl: string) => {
    setAdding(true)
    try {
      await addFeed(feedUrl)
      toast.success('订阅成功')
      reset()
      onAdded()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '订阅失败')
    } finally {
      setAdding(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset()
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加订阅源</DialogTitle>
          <DialogDescription>输入 RSS 链接直接订阅,或输入网站地址自动发现订阅源。</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void discover()}
            placeholder="https://example.com"
          />
          <Button variant="outline" onClick={() => void discover()} disabled={discovering || !url.trim()}>
            {discovering ? '发现中...' : '发现'}
          </Button>
        </div>
        {results && results.length > 0 && (
          <div className="max-h-52 space-y-2 overflow-y-auto">
            {results.map((feed) => (
              <div key={feed.url} className="flex items-center justify-between gap-3 rounded-lg bg-muted p-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">{feed.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{feed.url}</div>
                </div>
                <Button size="sm" disabled={adding} onClick={() => void subscribe(feed.url)}>
                  订阅
                </Button>
              </div>
            ))}
          </div>
        )}
        {results && results.length === 0 && (
          <p className="text-sm text-soft">未发现订阅源,可直接输入 RSS 链接订阅。</p>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset()
              onClose()
            }}
          >
            取消
          </Button>
          <Button onClick={() => void subscribe(url.trim())} disabled={adding || !url.trim()}>
            直接订阅
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------- OPML 导入(拖拽 + 选择文件) ---------- */

export function ImportDialog({
  open,
  onImported,
  onClose,
}: {
  open: boolean
  onImported: () => void
  onClose: () => void
}) {
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setDragOver(false)
    setUploading(false)
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const upload = async (file: File) => {
    setUploading(true)
    setResult(null)
    const { importOpml } = await import('@/lib/api')
    try {
      const data = await importOpml(file)
      setResult({ ok: true, text: `成功导入 ${data.imported} 个订阅源` })
      onImported()
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : '导入失败' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset()
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>导入订阅源</DialogTitle>
          <DialogDescription>选择或拖入 OPML 文件,导入你的订阅列表。</DialogDescription>
        </DialogHeader>
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            setDragOver(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files[0]
            if (file) void upload(file)
          }}
          onClick={() => fileRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors',
            dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
          )}
        >
          <Upload size={26} className="text-muted-foreground" />
          <p className="text-sm text-foreground">点击选择或拖拽 OPML 文件到此处</p>
          <input
            ref={fileRef}
            type="file"
            accept=".opml,.xml,text/xml"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void upload(file)
            }}
          />
        </div>
        {uploading && <p className="text-center text-sm text-muted-foreground">正在导入...</p>}
        {result && (
          <p className={cn('text-center text-sm', result.ok ? 'text-green-600' : 'text-destructive')}>
            {result.text}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------- 快捷键帮助 ---------- */

const SHORTCUTS: Array<[string, string]> = [
  ['↑ / ↓', '上一篇 / 下一篇文章'],
  ['M', '标记已读 / 未读'],
  ['S', '稍后阅读 / 取消'],
  ['F', '聚焦搜索框'],
  ['?', '显示快捷键帮助'],
]

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>键盘快捷键</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          {SHORTCUTS.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between">
              <kbd className="rounded-md border border-border bg-muted px-2 py-0.5 font-mono text-xs">{key}</kbd>
              <span className="text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------- 分享(不支持 Web Share API 时的备用弹窗) ---------- */

export function ShareDialog({
  article,
  onClose,
}: {
  article: Article | null
  onClose: () => void
}) {
  if (!article) return null
  const url = article.link

  const items: Array<[string, string, () => void]> = [
    [
      '🔗',
      '复制链接',
      () => {
        void navigator.clipboard
          .writeText(url)
          .catch(() => {
            const ta = document.createElement('textarea')
            ta.value = url
            document.body.appendChild(ta)
            ta.select()
            document.execCommand('copy')
            ta.remove()
          })
          .finally(() => toast.success('链接已复制到剪贴板'))
      },
    ],
    [
      '𝕏',
      'Twitter',
      () =>
        window.open(
          'https://twitter.com/intent/tweet?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(article.title),
          '_blank',
          'width=600,height=400',
        ),
    ],
    [
      '📱',
      '微博',
      () =>
        window.open(
          'https://service.weibo.com/share/share.php?url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(article.title),
          '_blank',
          'width=600,height=400',
        ),
    ],
    [
      '✉️',
      '邮件',
      () => {
        window.location.href = 'mailto:?subject=' + encodeURIComponent(article.title) + '&body=' + encodeURIComponent(url)
      },
    ],
  ]

  return (
    <Dialog open={!!article} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>分享文章</DialogTitle>
          <DialogDescription className="truncate">{article.title}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-3">
          {items.map(([icon, label, action]) => (
            <button
              key={label}
              onClick={() => {
                action()
                onClose()
              }}
              className="flex flex-col items-center gap-1 rounded-lg p-3 hover:bg-hover"
            >
              <span className="text-2xl">{icon}</span>
              <span className="text-xs text-foreground">{label}</span>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
