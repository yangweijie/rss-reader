/* eslint-disable react-hooks/set-state-in-effect -- 列表随视图/筛选变化而加载,属于数据加载副作用 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast, Toaster } from 'sonner'
import {
  ArrowUpRight,
  Bookmark,
  Check,
  CheckCheck,
  Circle,
  Download,
  FolderPlus,
  Import,
  ListFilter,
  Plus,
  RefreshCw,
  Tag as TagIcon,
  Trash2,
} from 'lucide-react'
import Sidebar from '@/components/reader/Sidebar'
import ArticleList from '@/components/reader/ArticleList'
import ArticleDetail from '@/components/reader/ArticleDetail'
import {
  AddFeedDialog,
  ConfirmDialog,
  ImportDialog,
  RenameDialog,
  ShareDialog,
  ShortcutsDialog,
  type ConfirmState,
  type RenameTarget,
} from '@/components/reader/modals'
import { Checkbox, CtxRow } from '@/components/reader/blocks'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  addArticleTag,
  addCategory,
  addTag,
  clearToken,
  deleteCategory,
  deleteFeed,
  deleteTag,
  editCategory,
  editTag,
  exportOpml,
  getArticles,
  getArticleInfo,
  getCategories,
  getFeeds,
  getTags,
  logout as logoutApi,
  markRead,
  markUnread,
  moveFeed,
  pinCategory,
  readAbove,
  refreshFeeds,
  removeArticleTag,
  starArticle,
  unstarArticle,
} from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Article, Category, Feed, Tag, View } from '@/types'

type CtxMenu =
  | { kind: 'article'; article: Article; x: number; y: number }
  | { kind: 'feed'; feed: Feed; x: number; y: number }
  | { kind: 'tag'; tag: Tag; x: number; y: number }
  | { kind: 'category'; category: Category; x: number; y: number }
  | { kind: 'feeds-header'; x: number; y: number }
  | null

const PAGE_SIZE = 20
const REFRESH_THRESHOLD = 30_000

export default function Reader() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()

  /* ---------- 状态 ---------- */
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [view, setView] = useState<View>({ kind: 'all' })
  const [articles, setArticles] = useState<Article[]>([])
  const [total, setTotal] = useState(0)
  /** 触底加载已取不到新数据(后端返回重叠页),视为到底 */
  const [endReached, setEndReached] = useState(false)
  const [keyword, setKeyword] = useState('')
  /** 搜索框即时值,防抖后同步到 keyword 触发查询 */
  const [keywordInput, setKeywordInput] = useState('')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [feedsUnreadOnly, setFeedsUnreadOnly] = useState(false)
  const [selected, setSelected] = useState<Article | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [expandedCats, setExpandedCats] = useState<Record<number, boolean>>({})
  const [tagsOpen, setTagsOpen] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [dark, setDark] = useState(() =>
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false,
  )
  const [popupEpoch, setPopupEpoch] = useState(0)

  // 右键菜单(子视图:文章标签 / 订阅源移动)
  const [ctxMenu, setCtxMenu] = useState<CtxMenu>(null)
  const [ctxView, setCtxView] = useState<'main' | 'tags' | 'move'>('main')
  const [ctxTagCreating, setCtxTagCreating] = useState(false)
  const [ctxTagName, setCtxTagName] = useState('')
  const ctxInputRef = useRef<HTMLInputElement>(null)

  // 弹窗
  const [addFeedOpen, setAddFeedOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [shareArticle, setShareArticle] = useState<Article | null>(null)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)

  const loadingRef = useRef(false)
  const pageRef = useRef(1)
  // 请求代数:每次加载使之前的在途响应作废,防止切频道后旧响应追加进来
  const fetchEpochRef = useRef(0)
  const lastHiddenRef = useRef(0)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const searchTimerRef = useRef<number | null>(null)

  const hasOpenDialog =
    addFeedOpen ||
    importOpen ||
    !!renameTarget ||
    shortcutsOpen ||
    !!shareArticle ||
    !!confirmState ||
    mobileSidebarOpen

  /* ---------- 派生数据 ---------- */

  const feedsByCategory = useMemo(() => {
    const map = new Map<number, Feed[]>()
    feeds.forEach((f) => {
      if (f.category_id && f.category_id !== 0) {
        const list = map.get(f.category_id) ?? []
        list.push(f)
        map.set(f.category_id, list)
      }
    })
    return map
  }, [feeds])

  const uncategorizedFeeds = useMemo(
    () => feeds.filter((f) => !f.category_id || f.category_id === 0),
    [feeds],
  )

  const unreadAll = useMemo(() => feeds.reduce((sum, f) => sum + (f.unread_count || 0), 0), [feeds])

  const viewTitle = useMemo(() => {
    if (view.kind === 'all') return '全部订阅源'
    if (view.kind === 'starred') return '稍后阅读'
    if (view.kind === 'tag') return tags.find((t) => t.id === view.id)?.name ?? '标签'
    if (view.kind === 'feed') return feeds.find((f) => f.id === view.id)?.title ?? '订阅源'
    if (view.id === 0) return '未分类'
    return categories.find((c) => c.id === view.id)?.label ?? '分类'
  }, [view, tags, feeds, categories])

  const selectedTags = selected?.tags

  /** 是否还有更多可加载:未到底且已加载条数少于总数 */
  const hasMore = !endReached && articles.length < total

  /* ---------- 数据加载 ---------- */

  const viewToParam = (v: View) =>
    v.kind === 'all'
      ? ('all' as const)
      : v.kind === 'starred'
        ? ('starred' as const)
        : v.kind === 'tag'
          ? ({ tag: v.id } as const)
          : v.kind === 'feed'
            ? ({ feed: v.id } as const)
            : ({ category: v.id } as const)

  const fetchPage = async (p: number, append: boolean) => {
    // 触底加载防重复;重载(切频道/搜索)必须能压过在途的追加请求
    if (append && loadingRef.current) return
    const epoch = ++fetchEpochRef.current
    loadingRef.current = true
    setListLoading(!append)
    try {
      const data = await getArticles(viewToParam(view), {
        page: p,
        page_size: unreadOnly ? 500 : PAGE_SIZE,
        keyword: keyword.trim() || undefined,
        unread: unreadOnly || undefined,
      })
      // 期间已发起更新的请求,丢弃本次结果
      if (epoch !== fetchEpochRef.current) return
      pageRef.current = p
      setTotal(data.total)
      if (!append) {
        setEndReached(false)
        setArticles(data.list)
        return
      }
      // 追加时按 id 去重:offset 分页在刷新任务插入新文章时可能返回重叠页,
      // 重复 id 会产生重复 React key,进而导致列表 DOM 清理失效、旧数据残留
      const seen = new Set(articles.map((a) => a.id))
      const fresh = data.list.filter((a) => !seen.has(a.id))
      // 本次一条新数据都没追加到,视为已到底,不再继续加载
      setEndReached(fresh.length === 0)
      setArticles((prev) => (fresh.length === 0 ? prev : [...prev, ...fresh]))
    } catch (e) {
      if (epoch === fetchEpochRef.current) {
        toast.error(e instanceof Error ? e.message : '加载文章失败')
      }
    } finally {
      if (epoch === fetchEpochRef.current) {
        loadingRef.current = false
        setListLoading(false)
      }
    }
  }

  // 视图/筛选/搜索变化时重载列表
  useEffect(() => {
    void fetchPage(1, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, keyword, unreadOnly])

  const loadCategories = async () => {
    try {
      const data = await getCategories()
      setCategories(data.list)
    } catch {
      /* 401 已由 api 层处理 */
    }
  }
  const loadTags = async () => {
    try {
      const data = await getTags()
      setTags(data.list)
    } catch {
      /* ignore */
    }
  }
  const loadFeeds = async () => {
    try {
      setFeeds(await getFeeds())
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void (async () => {
      await Promise.all([loadCategories(), loadTags(), loadFeeds()])
    })()
  }, [])

  /* ---------- 视图与文章操作 ---------- */

  const switchView = (v: View) => {
    // 取消未生效的搜索防抖,避免旧关键词落到新频道上
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
      searchTimerRef.current = null
    }
    setView(v)
    setKeyword('')
    setKeywordInput('')
    // 只看未读跨频道保持(与参考设计一致),由用户手动关闭
    setSelected(null)
    setMobileSidebarOpen(false)
  }

  /** 搜索防抖:停顿 300ms 才真正查询;清空立即生效 */
  const onKeywordChange = (kw: string) => {
    setKeywordInput(kw)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    if (kw.trim() === '') {
      searchTimerRef.current = null
      setKeyword('')
      return
    }
    searchTimerRef.current = window.setTimeout(() => {
      searchTimerRef.current = null
      setKeyword(kw.trim())
    }, 300)
  }

  const selectArticle = (article: Article) => {
    setSelected(article)
    if (!article.read) {
      setArticles((prev) =>
        prev.map((a) => (a.id === article.id ? { ...a, read: 1 } : a)),
      )
      setSelected((prev) => (prev && prev.id === article.id ? { ...prev, read: 1 } : prev))
      adjustFeedUnread(article.feed_id, -1)
      void markRead(article.id).catch(() => {})
    }
  }

  const adjustFeedUnread = (feedId: number, delta: number) => {
    setFeeds((prev) =>
      prev.map((f) =>
        f.id === feedId
          ? { ...f, unread_count: Math.max(0, (f.unread_count || 0) + delta) }
          : f,
      ),
    )
  }

  const navigateArticle = (dir: -1 | 1) => {
    // 未选中时 ↓ 选中第一篇(与旧版一致)
    const idx = selected ? articles.findIndex((a) => a.id === selected.id) : -1
    const next = articles[idx + dir]
    if (next) selectArticle(next)
    else toast(dir === -1 ? '已经是第一篇了' : '已经是最后一篇了')
  }

  const toggleRead = (article: Article) => {
    const wasRead = !!article.read
    const patch = { read: wasRead ? 0 : 1 }
    setArticles((prev) => prev.map((a) => (a.id === article.id ? { ...a, ...patch } : a)))
    setSelected((prev) => (prev && prev.id === article.id ? { ...prev, ...patch } : prev))
    adjustFeedUnread(article.feed_id, wasRead ? 1 : -1)
    const req = wasRead ? markUnread(article.id) : markRead(article.id)
    void req
      .then(() => toast.success(wasRead ? '已标记为未读' : '已标记为已读'))
      .catch((e) => toast.error(e instanceof Error ? e.message : '操作失败'))
  }

  const toggleStar = (article: Article) => {
    const wasFav = !!article.favorite
    const patch = { favorite: wasFav ? 0 : 1 }
    setArticles((prev) => prev.map((a) => (a.id === article.id ? { ...a, ...patch } : a)))
    setSelected((prev) => (prev && prev.id === article.id ? { ...prev, ...patch } : prev))
    const req = wasFav ? unstarArticle(article.id) : starArticle(article.id)
    void req
      .then(() => toast.success(wasFav ? '已从稍后阅读移除' : '已添加到稍后阅读'))
      .catch((e) => toast.error(e instanceof Error ? e.message : '操作失败'))
  }

  const markAllRead = () => {
    const anchor = selected ?? articles[articles.length - 1]
    if (!anchor) {
      toast.info('没有文章')
      return
    }
    void readAbove(anchor.id)
      .then(() => {
        setArticles((prev) => prev.map((a) => ({ ...a, read: 1 })))
        setSelected((prev) => (prev ? { ...prev, read: 1 } : prev))
        setFeeds((prev) => prev.map((f) => ({ ...f, unread_count: 0 })))
        toast.success(`已将 ${total} 篇文章标记为已读`)
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : '操作失败'))
  }

  const markAboveRead = (article: Article) => {
    const index = articles.findIndex((a) => a.id === article.id)
    if (index < 0) return
    // 同步计算本次将标记为已读的各订阅源未读减量
    const counts = new Map<number, number>()
    articles.forEach((a, i) => {
      if (i <= index && !a.read) counts.set(a.feed_id, (counts.get(a.feed_id) ?? 0) + 1)
    })
    void readAbove(article.id)
      .then(() => {
        setArticles((prev) => prev.map((a, i) => (i <= index ? { ...a, read: 1 } : a)))
        setSelected((prev) => (prev && prev.id === article.id ? { ...prev, read: 1 } : prev))
        counts.forEach((n, feedId) => adjustFeedUnread(feedId, -n))
        toast.success('已标记以上为已读')
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : '操作失败'))
  }

  const refresh = () => {
    const feedId = view.kind === 'feed' ? view.id : null
    void refreshFeeds(feedId)
      .then(() => toast.success('刷新任务已提交'))
      .catch((e) => toast.error(e instanceof Error ? e.message : '刷新失败'))
    void fetchPage(1, false)
    void loadFeeds()
  }

  const loadMore = () => {
    if (loadingRef.current || !hasMore) return
    void fetchPage(pageRef.current + 1, true)
  }

  /* ---------- 标签操作 ---------- */

  const createTag = (name: string, assignTo?: Article) => {
    void addTag(name)
      .then(async (data) => {
        await loadTags()
        toast.success(`已创建标签「${name}」`)
        const newTag = data?.tag
        if (assignTo && newTag) {
          await addArticleTag(assignTo.id, newTag.id).catch(() =>
            toast.warning('标签已创建,但添加到文章失败'),
          )
          setSelected((prev) =>
            prev && prev.id === assignTo.id
              ? { ...prev, tags: [...(prev.tags ?? []), newTag] }
              : prev,
          )
        }
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : '创建标签失败'))
  }

  const toggleArticleTag = (article: Article, tag: Tag) => {
    const has = (article.tags ?? []).some((t) => t.id === tag.id)
    const req = has ? removeArticleTag(article.id, tag.id) : addArticleTag(article.id, tag.id)
    void req
      .then(() => {
        setArticles((prev) =>
          prev.map((a) =>
            a.id === article.id
              ? {
                  ...a,
                  tags: has
                    ? (a.tags ?? []).filter((t) => t.id !== tag.id)
                    : [...(a.tags ?? []), tag],
                }
              : a,
          ),
        )
        setSelected((prev) =>
          prev && prev.id === article.id
            ? {
                ...prev,
                tags: has
                  ? (prev.tags ?? []).filter((t) => t.id !== tag.id)
                  : [...(prev.tags ?? []), tag],
              }
            : prev,
        )
        toast.success(has ? `已移除标签「${tag.name}」` : `已添加标签「${tag.name}」`)
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : '操作失败'))
  }

  const ensureArticleTags = () => {
    if (!selected) return
    void getArticleInfo(selected.id)
      .then((data) => {
        if (data?.article) {
          setSelected((prev) => (prev && prev.id === data.article.id ? { ...prev, tags: data.article.tags } : prev))
        }
      })
      .catch(() => {})
  }

  const removeTag = (tag: Tag) => {
    setConfirmState({
      message: `确定删除标签「${tag.name}」?`,
      onConfirm: () => {
        void deleteTag(tag.id)
          .then(async () => {
            await loadTags()
            toast.success(`已删除标签「${tag.name}」`)
            if (view.kind === 'tag' && view.id === tag.id) switchView({ kind: 'all' })
          })
          .catch((e) => toast.error(e instanceof Error ? e.message : '删除失败'))
      },
    })
  }

  /* ---------- 分类操作 ---------- */

  const createCategory = (name: string) => {
    void addCategory(name)
      .then(async () => {
        await loadCategories()
        toast.success(`已创建分类「${name}」`)
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : '创建分类失败'))
  }

  const pinCategoryAction = (category: Category) => {
    void pinCategory(category.id)
      .then(async () => {
        await loadCategories()
        toast.success(`已置顶「${category.label}」`)
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : '操作失败'))
  }

  const removeCategory = (category: Category) => {
    setConfirmState({
      message: `确定删除分类「${category.label}」?分类下的订阅源将被移至未分类。`,
      onConfirm: () => {
        void deleteCategory(category.id)
          .then(async () => {
            await Promise.all([loadCategories(), loadFeeds()])
            toast.success(`已删除分类「${category.label}」`)
            if (view.kind === 'category' && view.id === category.id) switchView({ kind: 'all' })
          })
          .catch((e) => toast.error(e instanceof Error ? e.message : '删除失败'))
      },
    })
  }

  /* ---------- 订阅源操作 ---------- */

  const unsubscribeFeed = (feed: Feed) => {
    setConfirmState({
      message: `确定退订「${feed.title}」?所有相关文章将被删除。`,
      onConfirm: () => {
        void deleteFeed(feed.id)
          .then(async () => {
            await loadFeeds()
            toast.success(`已退订「${feed.title}」`)
            if (view.kind === 'feed' && view.id === feed.id) switchView({ kind: 'all' })
          })
          .catch((e) => toast.error(e instanceof Error ? e.message : '退订失败'))
      },
    })
  }

  const moveFeedTo = (feed: Feed, categoryId: number) => {
    void moveFeed(feed.id, categoryId)
      .then(async () => {
        await loadFeeds()
        setCtxMenu(null)
        toast.success(categoryId === 0 ? '已移动到未分类' : '移动成功')
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : '移动失败'))
  }

  const refreshSingleFeed = (feed: Feed) => {
    void refreshFeeds(feed.id)
      .then(() => toast.success('刷新任务已加入队列'))
      .catch((e) => toast.error(e instanceof Error ? e.message : '刷新失败'))
  }

  const doExport = () => {
    void exportOpml()
      .then(() => toast.success('订阅列表已导出为 OPML'))
      .catch((e) => toast.error(e instanceof Error ? e.message : '导出失败'))
  }

  /* ---------- 分享 / 登出 ---------- */

  const share = () => {
    if (!selected) return
    if (navigator.share) {
      navigator.share({
        title: selected.title,
        text: (selected.excerpt || selected.title).slice(0, 100),
        url: selected.link,
      }).catch(() => {})
    } else {
      setShareArticle(selected)
    }
  }

  const logout = () => {
    setConfirmState({
      message: '确定退出登录?',
      onConfirm: () => {
        // JWT 注销失败不阻塞本地退出
        void logoutApi().catch(() => {})
        clearToken()
        navigate('/auth/login', { replace: true })
      },
    })
  }

  /* ---------- 主题 ---------- */

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  /* ---------- 右键菜单 ---------- */

  const openCtx = (menu: NonNullable<CtxMenu>) => {
    setCtxMenu(menu)
    setCtxView('main')
    setCtxTagCreating(false)
    setCtxTagName('')
    setPopupEpoch((e) => e + 1)
  }

  useEffect(() => {
    if (!ctxMenu) return
    const close = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-ctx-menu]')) return
      setCtxMenu(null)
      setCtxView('main')
    }
    window.addEventListener('click', close)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [ctxMenu])

  useEffect(() => {
    if (ctxTagCreating) ctxInputRef.current?.focus()
  }, [ctxTagCreating])

  /* ---------- 键盘快捷键 ---------- */

  // handler 存 ref:监听只挂一次,每次渲染后刷新引用以取最新闭包
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {})

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        hasOpenDialog ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          navigateArticle(-1)
          break
        case 'ArrowDown':
          e.preventDefault()
          navigateArticle(1)
          break
        case 'm':
        case 'M':
          e.preventDefault()
          if (selected) toggleRead(selected)
          break
        case 's':
        case 'S':
          e.preventDefault()
          if (selected) toggleStar(selected)
          break
        case 'f':
        case 'F':
          e.preventDefault()
          searchRef.current?.focus()
          break
        case '?':
          e.preventDefault()
          setShortcutsOpen(true)
          break
      }
    }
    keyHandlerRef.current = onKey
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandlerRef.current(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* ---------- 页面可见时自动刷新(30 秒阈值) ---------- */

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        const hiddenFor = Date.now() - lastHiddenRef.current
        if (hiddenFor > REFRESH_THRESHOLD) {
          void fetchPage(1, false)
          void loadFeeds()
        }
        lastHiddenRef.current = Date.now()
      } else {
        lastHiddenRef.current = Date.now()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, keyword, unreadOnly])

  /* ---------- 右键菜单渲染 ---------- */

  const ctxSubmenuHeader = (title: string, onBack: () => void) => (
    <div className="flex items-center gap-1 px-3 pt-1.5 pb-1">
      <button onClick={onBack} className="-ml-1 rounded p-1 text-foreground hover:bg-hover">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M19 12H5m0 0l7 7m-7-7l7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <span className="text-[15px] font-bold text-foreground">{title}</span>
    </div>
  )

  const submitCtxTag = () => {
    const v = ctxTagName.trim()
    if (!v || ctxMenu?.kind !== 'article') return
    createTag(v, ctxMenu.article)
    setCtxTagName('')
    setCtxTagCreating(false)
  }

  const renderCtxMenu = () => {
    if (!ctxMenu) return null
    // 文章菜单的勾选状态从 articles 里现查,避免用开菜单时的过期快照
    const ctxArticle =
      ctxMenu.kind === 'article'
        ? (articles.find((a) => a.id === ctxMenu.article.id) ?? ctxMenu.article)
        : null
    return (
      <div
        data-ctx-menu
        role="menu"
        className="fixed z-[100] w-[240px] overflow-hidden rounded-xl border border-border bg-popover py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.15)]"
        style={{
          left: Math.min(ctxMenu.x, window.innerWidth - 260),
          top: Math.min(ctxMenu.y, window.innerHeight - 320),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {ctxMenu.kind === 'article' && ctxArticle &&
          (ctxView === 'main' ? (
            <div key="main" className="qi-slide-left">
              <CtxRow
                label="在新页面打开原文"
                icon={ArrowUpRight}
                onClick={() => {
                  setCtxMenu(null)
                  if (ctxArticle.link) window.open(ctxArticle.link, '_blank', 'noopener')
                }}
              />
              <CtxRow
                label={ctxArticle.read ? '标记为未读' : '标记为已读'}
                icon={Circle}
                onClick={() => {
                  toggleRead(ctxArticle)
                  setCtxMenu(null)
                }}
              />
              <CtxRow
                label={ctxArticle.favorite ? '取消稍后阅读' : '稍后阅读'}
                icon={Bookmark}
                checkbox={!!ctxArticle.favorite}
                onClick={() => {
                  toggleStar(ctxArticle)
                  setCtxMenu(null)
                }}
              />
              <CtxRow label="标签" icon={TagIcon} chevron onClick={() => setCtxView('tags')} />
              <div className="my-1 border-t border-border" />
              <CtxRow
                label="标记以上为已读"
                icon={CheckCheck}
                onClick={() => {
                  markAboveRead(ctxArticle)
                  setCtxMenu(null)
                }}
              />
            </div>
          ) : (
            <div key="tags" className="qi-slide-right">
              {ctxSubmenuHeader('标签', () => setCtxView('main'))}
              <div className="max-h-[220px] overflow-y-auto px-1 pb-1">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    role="menuitemcheckbox"
                    aria-checked={(ctxArticle.tags ?? []).some((t) => t.id === tag.id)}
                    onClick={() => {
                      toggleArticleTag(ctxArticle, tag)
                      setCtxMenu(null)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground hover:bg-hover"
                  >
                    <Checkbox checked={(ctxArticle.tags ?? []).some((t) => t.id === tag.id)} />
                    <span className="flex-1 truncate">{tag.name}</span>
                  </button>
                ))}
                {tags.length === 0 && (
                  <p className="px-4 py-2 text-[13px] text-soft">暂无标签</p>
                )}
              </div>
              <div className="border-t border-border p-2">
                {ctxTagCreating ? (
                  <div className="flex items-center gap-2 px-1 py-1">
                    <input
                      ref={ctxInputRef}
                      value={ctxTagName}
                      onChange={(e) => setCtxTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitCtxTag()
                        if (e.key === 'Escape') {
                          setCtxTagCreating(false)
                          setCtxTagName('')
                        }
                      }}
                      placeholder="标签"
                      className="h-9 min-w-0 flex-1 rounded-lg border-2 border-primary bg-card px-2.5 text-sm text-foreground outline-none placeholder:text-soft"
                    />
                    <button
                      onClick={submitCtxTag}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-primary hover:bg-primary/10"
                    >
                      <Check size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setCtxTagCreating(true)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[13px] text-foreground hover:bg-hover"
                  >
                    创建标签并添加
                    <Plus size={16} className="text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          ))}

        {ctxMenu.kind === 'feed' &&
          (ctxView === 'main' ? (
            <div key="main" className="qi-slide-left">
              <CtxRow label="移动到" chevron onClick={() => setCtxView('move')} />
              <CtxRow label="刷新此源" icon={RefreshCw} onClick={() => {
                refreshSingleFeed(ctxMenu.feed)
                setCtxMenu(null)
              }} />
              <CtxRow
                label="退订"
                icon={Trash2}
                danger
                onClick={() => {
                  unsubscribeFeed(ctxMenu.feed)
                  setCtxMenu(null)
                }}
              />
            </div>
          ) : (
            <div key="move" className="qi-slide-right">
              {ctxSubmenuHeader('移动到', () => setCtxView('main'))}
              <div className="max-h-[240px] overflow-y-auto px-1 pb-1">
                <button
                  onClick={() => moveFeedTo(ctxMenu.feed, 0)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground hover:bg-hover"
                >
                  <FolderPlus size={15} className="text-muted-foreground" />
                  <span className="flex-1">未分类</span>
                  {(!ctxMenu.feed.category_id || ctxMenu.feed.category_id === 0) && (
                    <Check size={14} className="text-primary" />
                  )}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => moveFeedTo(ctxMenu.feed, cat.id)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground hover:bg-hover"
                  >
                    <FolderPlus size={15} className="text-muted-foreground" />
                    <span className="flex-1 truncate">{cat.label}</span>
                    {ctxMenu.feed.category_id === cat.id && <Check size={14} className="text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          ))}

        {ctxMenu.kind === 'tag' && (
          <>
            <CtxRow
              label="重命名..."
              onClick={() => {
                setRenameTarget({ type: 'tag', id: ctxMenu.tag.id, name: ctxMenu.tag.name })
                setCtxMenu(null)
                setTagsOpen(true)
              }}
            />
            <CtxRow label="删除" icon={Trash2} danger onClick={() => removeTag(ctxMenu.tag)} />
          </>
        )}

        {ctxMenu.kind === 'category' && (
          <>
            <CtxRow
              label="置顶"
              icon={Check}
              onClick={() => {
                pinCategoryAction(ctxMenu.category)
                setCtxMenu(null)
              }}
            />
            <CtxRow
              label="重命名..."
              onClick={() => {
                setRenameTarget({ type: 'category', id: ctxMenu.category.id, name: ctxMenu.category.label })
                setCtxMenu(null)
              }}
            />
            <CtxRow label="删除" icon={Trash2} danger onClick={() => removeCategory(ctxMenu.category)} />
          </>
        )}

        {ctxMenu.kind === 'feeds-header' && (
          <>
            <CtxRow
              label="导入 OPML..."
              icon={Import}
              onClick={() => {
                setCtxMenu(null)
                setImportOpen(true)
              }}
            />
            <CtxRow
              label="导出 OPML..."
              icon={Download}
              onClick={() => {
                setCtxMenu(null)
                doExport()
              }}
            />
            <div className="my-1 border-t border-border" />
            <CtxRow
              label="只显示有未读"
              icon={ListFilter}
              checkbox={feedsUnreadOnly}
              onClick={() => {
                setFeedsUnreadOnly((v) => !v)
                setCtxMenu(null)
              }}
            />
          </>
        )}
      </div>
    )
  }

  /* ---------- 渲染 ---------- */

  const detailHasPrev = selected ? articles.findIndex((a) => a.id === selected.id) > 0 : false
  const detailHasNext = selected
    ? articles.findIndex((a) => a.id === selected.id) < articles.length - 1
    : false

  const sidebarNode = (
    <Sidebar
      view={view}
      categories={categories}
      tags={tags}
      feeds={feeds}
      feedsByCategory={feedsByCategory}
      uncategorizedFeeds={uncategorizedFeeds}
      unreadAll={unreadAll}
      tagsOpen={tagsOpen}
      expandedCats={expandedCats}
      feedsUnreadOnly={feedsUnreadOnly}
      popupEpoch={popupEpoch}
      isMobile={isMobile}
      onSelectView={switchView}
      onToggleTagsOpen={() => setTagsOpen((v) => !v)}
      onToggleCat={(id) => setExpandedCats((prev) => ({ ...prev, [id]: prev[id] === false }))}
      onToggleFeedsUnread={() => setFeedsUnreadOnly((v) => !v)}
      onCategoryCtx={(category, e) => openCtx({ kind: 'category', category, x: e.clientX, y: e.clientY })}
      onTagCtx={(tag, e) => openCtx({ kind: 'tag', tag, x: e.clientX, y: e.clientY })}
      onFeedCtx={(feed, e) => openCtx({ kind: 'feed', feed, x: e.clientX, y: e.clientY })}
      onFeedsHeaderCtx={(e) => openCtx({ kind: 'feeds-header', x: e.clientX, y: e.clientY })}
      onOpenAddFeed={() => setAddFeedOpen(true)}
      onCreateCategory={createCategory}
      onImport={() => setImportOpen(true)}
      onExport={doExport}
      onToggleTheme={toggleTheme}
      dark={dark}
      onLogout={logout}
      onCollapse={() => setSidebarCollapsed(true)}
      onClose={() => setMobileSidebarOpen(false)}
    />
  )

  return (
    <div
      className="flex h-[100dvh] overflow-hidden bg-background text-foreground"
      onContextMenu={() => {
        // 右键空白处关闭自定义菜单,保留原生菜单
        setCtxMenu(null)
        setCtxView('main')
      }}
    >
      <Toaster position="top-center" richColors />

      {/* 侧边栏:桌面固定,移动端抽屉 */}
      {!isMobile && !sidebarCollapsed && <div className="shrink-0">{sidebarNode}</div>}
      {isMobile && mobileSidebarOpen && (
        <>
          <div className="fixed inset-0 z-[90] bg-black/40" onClick={() => setMobileSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-[95]">{sidebarNode}</div>
        </>
      )}

      {/* 文章列表(移动端占满,选中文章时隐藏) */}
      <div className={cn('min-w-0 flex-1 md:flex-none', isMobile && selected && 'hidden')}>
        <ArticleList
          title={viewTitle}
          viewKey={`${view.kind}:${'id' in view ? view.id : ''}:${keyword}:${unreadOnly ? 1 : 0}`}
          count={total}
          articles={articles}
          hasMore={hasMore}
          selectedId={selected?.id ?? null}
          loading={listLoading}
          keyword={keywordInput}
          unreadOnly={unreadOnly}
          sidebarCollapsed={sidebarCollapsed}
          isMobile={isMobile}
          query={keyword}
          onKeywordChange={onKeywordChange}
          onToggleUnreadOnly={() => setUnreadOnly((v) => !v)}
          onMarkAllRead={markAllRead}
          onRefresh={refresh}
          onSelect={selectArticle}
          onToggleStar={toggleStar}
          onToggleRead={toggleRead}
          onArticleCtx={(article, e) => {
            openCtx({ kind: 'article', article, x: e.clientX, y: e.clientY })
            // 预取文章现有标签,保证菜单里的勾选状态准确
            void getArticleInfo(article.id)
              .then((data) => {
                if (data?.article) {
                  const tags = data.article.tags
                  setArticles((prev) => prev.map((a) => (a.id === article.id ? { ...a, tags } : a)))
                  setSelected((prev) => (prev && prev.id === article.id ? { ...prev, tags } : prev))
                }
              })
              .catch(() => {})
          }}
          onLoadMore={loadMore}
          onOpenSidebar={() => setMobileSidebarOpen(true)}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          searchRef={searchRef}
        />
      </div>

      {/* 阅读区:桌面第三栏,移动端全屏覆盖 */}
      {selected ? (
        <div
          className={cn(
            'min-w-0 flex-1',
            isMobile && 'fixed inset-0 z-[80] bg-background',
          )}
        >
          <ArticleDetail
            article={selected}
            hasPrev={detailHasPrev}
            hasNext={detailHasNext}
            allTags={tags}
            articleTags={selectedTags}
            isMobile={isMobile}
            popupEpoch={popupEpoch}
            onClose={() => setSelected(null)}
            onPrev={() => navigateArticle(-1)}
            onNext={() => navigateArticle(1)}
            onOpenOriginal={() => selected.link && window.open(selected.link, '_blank', 'noopener')}
            onToggleStar={() => toggleStar(selected)}
            onToggleRead={() => toggleRead(selected)}
            onShare={share}
            onEnsureArticleTags={ensureArticleTags}
            onToggleTag={(tag) => toggleArticleTag(selected, tag)}
            onCreateTag={(name) => createTag(name, selected)}
          />
        </div>
      ) : (
        !isMobile && (
          <section className="min-w-0 flex-1">
            <div className="flex h-full items-center">
              <p className="ml-[max(0px,calc(50vw-920px))] pl-6 text-[15px] text-soft">无选中项</p>
            </div>
          </section>
        )
      )}

      {/* 移动端底部导航 */}
      {isMobile && (
        <nav className="fixed inset-x-0 bottom-0 z-[70] flex h-16 items-stretch border-t border-border bg-card/95 backdrop-blur">
          {(
            [
              ['all', '全部', null],
              ['starred', '稍后', null],
              ['tags', '标签', null],
              ['feeds', '订阅', null],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setSelected(null)
                if (key === 'all') switchView({ kind: 'all' })
                else if (key === 'starred') switchView({ kind: 'starred' })
                else if (key === 'tags') {
                  setTagsOpen(true)
                  setMobileSidebarOpen(true)
                } else {
                  setMobileSidebarOpen(true)
                }
              }}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]',
                (key === 'all' && view.kind === 'all') || (key === 'starred' && view.kind === 'starred')
                  ? 'text-primary'
                  : 'text-muted-foreground',
              )}
            >
              {key === 'all' && <InfinityGlyph />}
              {key === 'starred' && <Bookmark size={20} />}
              {key === 'tags' && <TagIcon size={20} />}
              {key === 'feeds' && <RssGlyph />}
              {label}
            </button>
          ))}
        </nav>
      )}

      {/* 右键菜单 */}
      {renderCtxMenu()}

      {/* 弹窗 */}
      <AddFeedDialog
        open={addFeedOpen}
        onAdded={() => {
          void loadFeeds()
        }}
        onClose={() => setAddFeedOpen(false)}
      />
      <ImportDialog
        open={importOpen}
        onImported={() => {
          void loadFeeds()
        }}
        onClose={() => setImportOpen(false)}
      />
      <RenameDialog
        key={renameTarget ? `${renameTarget.type}:${renameTarget.id}` : 'none'}
        target={renameTarget}
        onSubmit={(target, name) => {
          if (target.type === 'category') {
            void editCategory(target.id, name)
              .then(loadCategories)
              .then(() => toast.success('已重命名'))
              .catch((e) => toast.error(e instanceof Error ? e.message : '重命名失败'))
          } else {
            void editTag(target.id, name)
              .then(loadTags)
              .then(() => toast.success('已重命名'))
              .catch((e) => toast.error(e instanceof Error ? e.message : '重命名失败'))
          }
        }}
        onClose={() => setRenameTarget(null)}
      />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ShareDialog article={shareArticle} onClose={() => setShareArticle(null)} />
      <ConfirmDialog state={confirmState} onClose={() => setConfirmState(null)} />
    </div>
  )
}

function InfinityGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function RssGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16" strokeLinecap="round" />
      <circle cx="5" cy="19" r="1" fill="currentColor" />
    </svg>
  )
}
