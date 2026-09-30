/* eslint-disable react-hooks/set-state-in-effect -- 切换文章时重置翻译/弹层状态 */
import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Languages,
  Plus,
  Share,
  Tag,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { ToolbarButton, FeedIcon } from '@/components/reader/blocks'
import { cn } from '@/lib/utils'
import { ensureTranslate } from '@/lib/translate'
import type { Article, Tag as TagType } from '@/types'

export interface ArticleDetailProps {
  article: Article
  hasPrev: boolean
  hasNext: boolean
  allTags: TagType[]
  /** 文章已打标签(懒加载,可能尚未获取) */
  articleTags?: TagType[]
  isMobile: boolean
  popupEpoch: number

  onClose: () => void
  onPrev: () => void
  onNext: () => void
  onOpenOriginal: () => void
  onToggleStar: () => void
  onToggleRead: () => void
  onShare: () => void
  onEnsureArticleTags: () => void
  onToggleTag: (tag: TagType) => void
  onCreateTag: (name: string) => void
}

export default function ArticleDetail(props: ArticleDetailProps) {
  const { article, isMobile } = props
  const [tagOpen, setTagOpen] = useState(false)
  const [translated, setTranslated] = useState(false)
  const [translating, setTranslating] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // 切换文章时重置翻译状态
  useEffect(() => {
    setTranslated(false)
    setTranslating(false)
    setTagOpen(false)
  }, [article.id])

  // 单一弹窗规则:侧栏/列表弹窗打开时关闭本面板的弹出层
  useEffect(() => {
    setTagOpen(false)
  }, [props.popupEpoch])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTagOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 翻译:translate.js 扫描 DOM 改写文本节点,须在渲染完成后执行
  useEffect(() => {
    if (!translated) return
    try {
      const t = (window as unknown as { translate?: { execute?: () => void } }).translate
      t?.execute?.()
    } catch {
      /* 忽略 */
    }
  }, [translated])

  const handleTranslate = async () => {
    if (translated) {
      setTranslated(false)
      return
    }
    if (translating) return
    setTranslating(true)
    try {
      await ensureTranslate()
      setTranslated(true)
      toast.success('翻译完成')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '翻译服务加载失败')
    } finally {
      setTranslating(false)
    }
  }

  // 正文里的链接统一新标签页打开
  const onContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const anchor = target.closest('a')
    if (anchor?.href) {
      e.preventDefault()
      window.open(anchor.href, '_blank', 'noopener')
    }
  }

  const articleTagIds = new Set((props.articleTags ?? article.tags ?? []).map((t) => t.id))

  return (
    <section className="relative flex h-full min-w-0 flex-1 flex-col bg-background">
      <div
        className="flex h-14 shrink-0 items-center gap-1 px-3"
        onClick={() => setTagOpen(false)}
      >
        <div className="flex items-center gap-1">
          {isMobile && (
            <ToolbarButton title="返回列表" onClick={props.onClose}>
              <X size={20} />
            </ToolbarButton>
          )}
          <ToolbarButton title="上一篇文章" onClick={props.onPrev} disabled={!props.hasPrev}>
            <ChevronUp size={20} />
          </ToolbarButton>
          <ToolbarButton title="下一篇文章" onClick={props.onNext} disabled={!props.hasNext}>
            <ChevronDown size={20} />
          </ToolbarButton>
          <ToolbarButton title="打开原文" onClick={props.onOpenOriginal}>
            <ArrowUpRight size={20} />
          </ToolbarButton>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <ToolbarButton title="稍后阅读" active={!!article.favorite} onClick={props.onToggleStar}>
            <Bookmark size={20} fill={article.favorite ? 'currentColor' : 'none'} />
          </ToolbarButton>
          <div className="relative">
            <ToolbarButton
              title="标签"
              active={tagOpen}
              onClick={(e) => {
                e.stopPropagation()
                props.onEnsureArticleTags()
                setTagOpen((v) => !v)
              }}
            >
              <Tag size={20} />
            </ToolbarButton>
            {tagOpen && (
              <div className="absolute top-full right-0 z-50 mt-1">
                <TagPanel
                  articleTagIds={articleTagIds}
                  allTags={props.allTags}
                  onToggle={props.onToggleTag}
                  onCreate={props.onCreateTag}
                  onClose={() => setTagOpen(false)}
                />
              </div>
            )}
          </div>
          <ToolbarButton
            title={article.read ? '标记为未读' : '标记为已读'}
            active={!article.read}
            onClick={props.onToggleRead}
          >
            <Circle size={20} />
          </ToolbarButton>
          <ToolbarButton title="分享" onClick={props.onShare}>
            <Share size={20} />
          </ToolbarButton>
          <ToolbarButton
            title={translated ? '恢复原文' : '翻译'}
            active={translated}
            onClick={() => void handleTranslate()}
          >
            <Languages size={20} className={cn(translating && 'animate-pulse')} />
          </ToolbarButton>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <article className="mx-auto w-full max-w-[50rem] px-6 pt-6 pb-24 md:px-12">
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <FeedIcon feed={article.feed} size={20} />
            <span className="font-medium text-foreground">{article.feed_name || article.feed?.title || '未知来源'}</span>
            {translated && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">已翻译</span>
            )}
          </div>
          <h1 className="font-display text-[28px] leading-snug font-bold text-foreground md:text-[32px]">
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary hover:underline"
            >
              {article.title}
            </a>
          </h1>
          <div className="mt-2 flex items-center gap-4 text-[13.5px] text-soft">
            {article.author && <span>{article.author}</span>}
            {article.published_at && <span>{fmtDateTime(article.published_at)}</span>}
          </div>
          <div
            key={translated ? 'translated' : 'original'}
            ref={contentRef}
            className="article-content mt-8 text-[17px] text-foreground/90"
            onClick={onContentClick}
            dangerouslySetInnerHTML={{ __html: article.content || article.excerpt || '<p>暂无内容</p>' }}
          />
          {translated && (
            <div className="mt-8 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              本文已使用 translate.js 自动翻译,点击翻译按钮可恢复原文。
            </div>
          )}
        </article>
      </div>
    </section>
  )
}

function fmtDateTime(dateStr: string) {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString()
}

/* ---------- 标签面板(收藏/打标签,沿用参考设计) ---------- */

function TagPanel({
  articleTagIds,
  allTags,
  onToggle,
  onCreate,
  onClose,
}: {
  articleTagIds: Set<number>
  allTags: TagType[]
  onToggle: (tag: TagType) => void
  onCreate: (name: string) => void
  onClose: () => void
}) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (creating) inputRef.current?.focus()
  }, [creating])

  const submit = () => {
    const v = name.trim()
    if (!v) return
    onCreate(v)
    setName('')
    setCreating(false)
  }

  return (
    <div
      className="flex h-[320px] w-[300px] flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <button onClick={onClose} className="-ml-1 rounded p-1 text-foreground hover:bg-hover">
          <X size={16} />
        </button>
        <span className="text-[15px] font-bold text-foreground">标签</span>
      </div>
      <p className="px-4 pb-2 text-[13px] text-muted-foreground">通过标签管理你收藏的文章。</p>
      <div className="min-h-0 flex-1 overflow-y-auto px-2">
        {allTags.length === 0 && !creating && (
          <p className="px-2 pt-6 text-center text-[13px] text-soft">暂无标签</p>
        )}
        {allTags.map((tag) => (
          <button
            key={tag.id}
            onClick={() => onToggle(tag)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-foreground hover:bg-hover"
          >
            <MiniCheckbox checked={articleTagIds.has(tag.id)} />
            <span className="truncate">{tag.name}</span>
          </button>
        ))}
      </div>
      <div className="border-t border-border p-3">
        {creating ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
                if (e.key === 'Escape') {
                  setCreating(false)
                  setName('')
                }
              }}
              placeholder="标签"
              className="h-10 min-w-0 flex-1 rounded-lg border-2 border-primary bg-card px-3 text-sm text-foreground outline-none placeholder:text-soft"
            />
            <button
              onClick={submit}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-primary hover:bg-primary/10"
            >
              <Check size={18} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="flex w-full items-center justify-between rounded-lg px-2 py-2.5 text-left text-[13px] text-foreground hover:bg-hover"
          >
            创建标签
            <Plus size={16} className="text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  )
}

function MiniCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card',
      )}
    >
      {checked && <Check size={12} strokeWidth={3} />}
    </span>
  )
}
