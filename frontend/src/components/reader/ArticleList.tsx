import { useEffect, useRef } from 'react'
import {
  Bookmark,
  CheckCheck,
  Circle,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { Highlight, ToolbarButton } from '@/components/reader/blocks'
import { cn } from '@/lib/utils'
import type { Article } from '@/types'

export interface ArticleListProps {
  title: string
  /** 视图标识:变化时重置滚动位置 */
  viewKey: string
  count: number
  articles: Article[]
  /** 是否还有更多可加载(到底后显示"没有更多文章了") */
  hasMore: boolean
  selectedId: number | null
  loading: boolean
  keyword: string
  unreadOnly: boolean
  sidebarCollapsed: boolean
  isMobile: boolean
  query: string

  onKeywordChange: (kw: string) => void
  onToggleUnreadOnly: () => void
  onMarkAllRead: () => void
  onRefresh: () => void
  onSelect: (article: Article) => void
  onToggleStar: (article: Article) => void
  onToggleRead: (article: Article) => void
  onArticleCtx: (article: Article, e: React.MouseEvent) => void
  onLoadMore: () => void
  onOpenSidebar: () => void
  onToggleCollapse: () => void
  searchRef: React.RefObject<HTMLInputElement | null>
}

export default function ArticleList(props: ArticleListProps) {
  const {
    title,
    viewKey,
    count,
    articles,
    hasMore,
    selectedId,
    loading,
    keyword,
    unreadOnly,
    sidebarCollapsed,
    isMobile,
    query,
    onKeywordChange,
    onToggleUnreadOnly,
    onMarkAllRead,
    onRefresh,
    onSelect,
    onToggleStar,
    onToggleRead,
    onArticleCtx,
    onLoadMore,
    onOpenSidebar,
    onToggleCollapse,
    searchRef,
  } = props

  const scrollRef = useRef<HTMLDivElement>(null)

  // 切换视图/筛选/搜索后回到顶部
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [viewKey])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    // 距底部 100px 触发加载(移植旧版 onArticleListScroll)
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) onLoadMore()
  }

  const emptyText = keyword.trim()
    ? `没有找到与「${keyword.trim()}」相关的文章`
    : unreadOnly
      ? '没有未读文章'
      : viewEmptyText(title)

  return (
    <section className="flex h-full min-h-0 w-full shrink-0 flex-col border-border md:w-[400px] md:border-r">
      {/* 标题栏 */}
      <div className="flex h-14 shrink-0 items-center gap-1 border-b border-border px-3">
        <button
          title={isMobile ? '打开侧边栏' : sidebarCollapsed ? '显示侧边栏' : '隐藏侧边栏'}
          onClick={isMobile ? onOpenSidebar : onToggleCollapse}
          className="-ml-1 rounded-lg p-2 text-muted-foreground hover:bg-hover"
        >
          {isMobile ? (
            <Menu size={20} />
          ) : sidebarCollapsed ? (
            <PanelLeftOpen size={20} />
          ) : (
            <PanelLeftClose size={20} />
          )}
        </button>
        <h4 className="truncate font-display text-[22px] font-bold text-foreground">{title}</h4>
        <span className="shrink-0 text-[15px] text-soft">{count}</span>
        <div className="ml-auto flex items-center gap-0.5 text-muted-foreground">
          <ToolbarButton title={unreadOnly ? '显示全部文章' : '只看未读'} active={unreadOnly} onClick={onToggleUnreadOnly}>
            <ListFilterIcon />
          </ToolbarButton>
          <ToolbarButton title="全部已读" onClick={onMarkAllRead}>
            <CheckCheck size={20} />
          </ToolbarButton>
          <ToolbarButton title="刷新订阅" onClick={onRefresh}>
            <RefreshCw size={20} />
          </ToolbarButton>
        </div>
      </div>

      {/* 搜索 */}
      <div className="relative mx-3 mt-2 shrink-0">
        <Search size={15} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={searchRef}
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onKeywordChange('')}
          placeholder="搜索文章标题与内容"
          className="h-9 w-full rounded-lg border border-transparent bg-muted pr-7 pl-8 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-card"
        />
        {keyword && (
          <button
            title="清除搜索"
            onClick={() => onKeywordChange('')}
            className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* 文章列表 */}
      <div ref={scrollRef} onScroll={handleScroll} className="mt-2 min-h-0 flex-1 overflow-y-auto">
        {loading && articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <RefreshCw size={22} className="animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">加载中...</p>
          </div>
        ) : articles.length === 0 ? (
          <div className="pt-14 text-center text-[15px] text-soft">{emptyText}</div>
        ) : (
          articles.map((article, index) => (
            <ArticleListItem
              key={article.id}
              article={article}
              selected={selectedId === article.id}
              query={query}
              onSelect={() => onSelect(article)}
              onToggleStar={() => onToggleStar(article)}
              onToggleRead={() => onToggleRead(article)}
              onCtx={(e) => {
                e.preventDefault()
                onArticleCtx(article, e)
              }}
              idx={index}
            />
          ))
        )}
        {!loading && hasMore && (
          <div className="flex justify-center p-4">
            <RefreshCw size={16} className="animate-spin text-soft" />
          </div>
        )}
        {!loading && articles.length > 0 && !hasMore && (
          <div className="py-4 text-center text-[13px] text-soft">没有更多文章了</div>
        )}
        {/* 移动端底部导航占位 */}
        <div className="h-16 md:hidden" />
      </div>
    </section>
  )
}

function viewEmptyText(title: string) {
  if (title === '稍后阅读') return '暂无稍后阅读文章'
  return '无文章'
}

function ListFilterIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 6h18M7 12h10M10 18h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArticleListItem({
  article,
  selected,
  query,
  onSelect,
  onToggleStar,
  onToggleRead,
  onCtx,
  idx,
}: {
  article: Article
  selected: boolean
  query: string
  onSelect: () => void
  onToggleStar: () => void
  onToggleRead: () => void
  onCtx: (e: React.MouseEvent) => void
  idx: number
}) {
  void idx
  return (
    <div
      onClick={onSelect}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onCtx(e)
      }}
      className={cn(
        'group relative cursor-pointer border-b border-border px-4 py-3',
        selected ? 'bg-primary/10' : 'hover:bg-hover',
      )}
    >
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {!article.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
        <span className="truncate">{article.feed_name || article.feed?.title || '未知来源'}</span>
        <span className="ml-auto shrink-0 text-soft">{fmtTime(article.published_at)}</span>
      </div>
      <div className="flex gap-2.5">
        <div className="min-w-0 flex-1">
          <h3 className={cn('line-clamp-2 text-base leading-snug font-bold', article.read ? 'text-muted-foreground' : 'text-foreground')}>
            <Highlight text={article.title} query={query} />
          </h3>
          <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-muted-foreground">
            <Highlight text={article.excerpt} query={query} />
          </p>
        </div>
      </div>
      <button
        title={article.favorite ? '取消稍后阅读' : '稍后阅读'}
        onClick={(e) => {
          e.stopPropagation()
          onToggleStar()
        }}
        className={cn(
          'absolute right-1.5 bottom-1.5 rounded p-1',
          article.favorite ? 'text-primary opacity-100' : 'text-soft opacity-0 group-hover:opacity-100',
        )}
      >
        <Bookmark size={14} fill={article.favorite ? 'currentColor' : 'none'} />
      </button>
      {!!article.read && (
        <button
          title="标记为未读"
          onClick={(e) => {
            e.stopPropagation()
            onToggleRead()
          }}
          className="absolute top-1.5 right-1.5 rounded p-1 text-soft opacity-0 group-hover:opacity-100"
        >
          <Circle size={13} />
        </button>
      )}
    </div>
  )
}

function fmtTime(dateStr: string | null | undefined) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前'
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前'
  if (diff < 604800) return Math.floor(diff / 86400) + '天前'
  return date.toLocaleDateString()
}
