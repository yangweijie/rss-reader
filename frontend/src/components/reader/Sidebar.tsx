/* eslint-disable react-hooks/set-state-in-effect -- 关闭浮层/重置输入属于弹层协调逻辑 */
import { useEffect, useRef, useState } from 'react'
import {
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Download,
  EllipsisVertical,
  FolderPlus,
  Infinity as InfinityIcon,
  ListFilter,
  Moon,
  PanelLeftClose,
  Plus,
  Sun,
  Tag as TagIcon,
  Upload,
  X,
} from 'lucide-react'
import Logo from '@/components/Logo'
import { Checkbox, MenuItem, MenuPanel, FeedIcon } from '@/components/reader/blocks'
import { cn } from '@/lib/utils'
import type { Category, Feed, Tag, View } from '@/types'

type AddMenuMode = 'list' | 'folder'

export interface SidebarProps {
  view: View
  categories: Category[]
  tags: Tag[]
  feeds: Feed[]
  feedsByCategory: Map<number, Feed[]>
  uncategorizedFeeds: Feed[]
  unreadAll: number
  tagsOpen: boolean
  expandedCats: Record<number, boolean>
  feedsUnreadOnly: boolean
  popupEpoch: number
  isMobile: boolean

  onSelectView: (v: View) => void
  onToggleTagsOpen: () => void
  onToggleCat: (id: number) => void
  onToggleFeedsUnread: () => void
  onCategoryCtx: (category: Category, e: React.MouseEvent) => void
  onTagCtx: (tag: Tag, e: React.MouseEvent) => void
  onFeedCtx: (feed: Feed, e: React.MouseEvent) => void
  onFeedsHeaderCtx: (e: React.MouseEvent) => void
  onOpenAddFeed: () => void
  onCreateCategory: (name: string) => void
  onImport: () => void
  onExport: () => void
  onToggleTheme: () => void
  dark: boolean
  onLogout: () => void
  /** 桌面端收起侧边栏(由外层控制) */
  onCollapse: () => void
  /** 移动端抽屉关闭 */
  onClose?: () => void
}

export default function Sidebar(props: SidebarProps) {
  const {
    view,
    categories,
    tags,
    feedsByCategory,
    uncategorizedFeeds,
    unreadAll,
    tagsOpen,
    expandedCats,
    feedsUnreadOnly,
    popupEpoch,
    isMobile,
    onSelectView,
    onToggleTagsOpen,
    onToggleCat,
    onToggleFeedsUnread,
    onCategoryCtx,
    onTagCtx,
    onFeedCtx,
    onFeedsHeaderCtx,
    onOpenAddFeed,
    onCreateCategory,
    onImport,
    onExport,
    onToggleTheme,
    dark,
    onLogout,
    onCollapse,
    onClose,
  } = props

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [addMenuMode, setAddMenuMode] = useState<AddMenuMode>('list')
  const [subMenuOpen, setSubMenuOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const addMenuInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (addMenuOpen && addMenuMode === 'folder') addMenuInputRef.current?.focus()
  }, [addMenuOpen, addMenuMode])

  // 收起右侧阅读区弹窗(单一弹窗规则)
  useEffect(() => {
    setUserMenuOpen(false)
    setAddMenuOpen(false)
    setSubMenuOpen(false)
    setAddMenuMode('list')
    setNewFolderName('')
  }, [popupEpoch])

  const closeOwnMenus = () => {
    setUserMenuOpen(false)
    setAddMenuOpen(false)
    setSubMenuOpen(false)
    setAddMenuMode('list')
    setNewFolderName('')
  }

  const submitFolder = () => {
    const v = newFolderName.trim()
    if (!v) return
    onCreateCategory(v)
    setNewFolderName('')
    setAddMenuOpen(false)
    setAddMenuMode('list')
  }

  const catUnread = (catId: number) =>
    (feedsByCategory.get(catId) ?? []).reduce((sum, f) => sum + (f.unread_count || 0), 0)

  const visibleFeeds = (list: Feed[]) =>
    feedsUnreadOnly ? list.filter((f) => (f.unread_count || 0) > 0) : list

  return (
    <aside
      className={cn('flex h-full w-[320px] shrink-0 flex-col bg-muted p-3', isMobile && 'w-[300px]')}
      onClick={closeOwnMenus}
    >
      <div className="flex items-center justify-between">
        <Logo size={36} />
        <div className="flex items-center gap-0.5 text-muted-foreground">
          {isMobile ? (
            <button
              title="关闭"
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-accent"
            >
              <X size={20} />
            </button>
          ) : (
            <button
              title="隐藏侧边栏"
              onClick={onCollapse}
              className="rounded-lg p-2 hover:bg-accent"
            >
              <PanelLeftClose size={20} />
            </button>
          )}
          <button
            title={dark ? '切换到浅色模式' : '切换到深色模式'}
            onClick={(e) => {
              e.stopPropagation()
              onToggleTheme()
            }}
            className="rounded-lg p-2 hover:bg-accent"
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="relative">
            <button
              title="账号"
              onClick={(e) => {
                e.stopPropagation()
                setUserMenuOpen((v) => !v)
                setAddMenuOpen(false)
                setSubMenuOpen(false)
              }}
              className="rounded-lg p-2 hover:bg-accent"
            >
              <CircleUserRound size={20} />
            </button>
            {userMenuOpen && (
              <MenuPanel className="w-[180px]">
                <div className="border-b border-border px-4 py-2.5">
                  <p className="text-sm font-medium text-foreground">QiReader</p>
                  <p className="text-xs text-soft">已登录</p>
                </div>
                <MenuItem label="退出登录" onClick={onLogout} />
              </MenuPanel>
            )}
          </div>
        </div>
      </div>

      <nav className="mt-4 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pb-1">
        <SidebarRow
          active={view.kind === 'all'}
          icon={<InfinityIcon size={18} />}
          label="全部"
          count={unreadAll}
          onClick={() => onSelectView({ kind: 'all' })}
        />
        <SidebarRow
          active={view.kind === 'starred'}
          icon={<Bookmark size={18} />}
          label="稍后阅读"
          onClick={() => onSelectView({ kind: 'starred' })}
        />
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleTagsOpen()
          }}
          className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-[13px] text-muted-foreground hover:bg-accent"
        >
          <ChevronDown size={16} className={cn(!tagsOpen && '-rotate-90')} />
          标签
        </button>
        {tagsOpen && (
          <>
            {tags.length === 0 && (
              <div className="flex h-9 items-center rounded-lg px-8 text-[13px] text-muted-foreground">
                暂无标签
              </div>
            )}
            {tags.map((tag) => (
              <div
                key={tag.id}
                onClick={() => onSelectView({ kind: 'tag', id: tag.id })}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  closeOwnMenus()
                  onTagCtx(tag, e)
                }}
                className={cn(
                  'flex h-[38px] w-full cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 pl-6 text-left text-[15px] text-foreground',
                  view.kind === 'tag' && view.id === tag.id ? 'bg-primary/10' : 'hover:bg-accent',
                )}
              >
                <TagIcon size={15} className="shrink-0 text-muted-foreground" />
                <span className="truncate">{tag.name}</span>
                {!!tag.article_count && (
                  <span className="ml-auto text-[13px] text-soft">{tag.article_count}</span>
                )}
              </div>
            ))}
          </>
        )}

        <div className="mt-2 flex h-9 items-center px-2.5">
          <span
            className="text-[13px] text-muted-foreground"
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              closeOwnMenus()
              onFeedsHeaderCtx(e)
            }}
          >
            订阅源
          </span>
          <div className="ml-auto flex items-center gap-0.5 text-muted-foreground">
            <div className="relative">
              <button
                title="添加订阅源 / 新建分类"
                onClick={(e) => {
                  e.stopPropagation()
                  setAddMenuOpen((v) => !v)
                  setSubMenuOpen(false)
                  setUserMenuOpen(false)
                  setAddMenuMode('list')
                }}
                className="rounded-lg p-1.5 hover:bg-accent"
              >
                <Plus size={16} />
              </button>
              {addMenuOpen && (
                <MenuPanel className="w-[220px]">
                  {addMenuMode === 'list' ? (
                    <>
                      <MenuItem
                        icon={Plus}
                        label="添加订阅源"
                        onClick={() => {
                          setAddMenuOpen(false)
                          onOpenAddFeed()
                        }}
                      />
                      <MenuItem
                        icon={FolderPlus}
                        label="新建分类"
                        onClick={(e) => {
                          e.stopPropagation()
                          setAddMenuMode('folder')
                        }}
                      />
                    </>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <input
                        ref={addMenuInputRef}
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitFolder()
                          if (e.key === 'Escape') {
                            setNewFolderName('')
                            setAddMenuMode('list')
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="分类名称"
                        className="h-9 min-w-0 flex-1 rounded-lg border-2 border-primary bg-card px-2.5 text-sm text-foreground outline-none placeholder:text-soft"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          submitFolder()
                        }}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-primary hover:bg-primary/10"
                      >
                        <Check size={16} />
                      </button>
                    </div>
                  )}
                </MenuPanel>
              )}
            </div>
            <div className="relative">
              <button
                title="订阅源选项"
                onClick={(e) => {
                  e.stopPropagation()
                  setSubMenuOpen((v) => !v)
                  setAddMenuOpen(false)
                  setUserMenuOpen(false)
                }}
                className="rounded-lg p-1.5 hover:bg-accent"
              >
                <EllipsisVertical size={16} />
              </button>
              {subMenuOpen && (
                <MenuPanel className="w-[200px]">
                  <MenuItem
                    icon={Upload}
                    label="导入 OPML..."
                    onClick={() => {
                      setSubMenuOpen(false)
                      onImport()
                    }}
                  />
                  <MenuItem
                    icon={Download}
                    label="导出 OPML..."
                    onClick={() => {
                      setSubMenuOpen(false)
                      onExport()
                    }}
                  />
                  <div className="my-1 border-t border-border" />
                  <MenuItem
                    label="只显示有未读"
                    icon={ListFilter}
                    trailing={<Checkbox checked={feedsUnreadOnly} />}
                    onClick={() => {
                      onToggleFeedsUnread()
                      setSubMenuOpen(false)
                    }}
                  />
                </MenuPanel>
              )}
            </div>
          </div>
        </div>

        {categories.map((cat) => {
          const open = expandedCats[cat.id] !== false
          const unread = catUnread(cat.id)
          const list = visibleFeeds(feedsByCategory.get(cat.id) ?? [])
          return (
            <div key={cat.id}>
              <div
                className={cn(
                  'flex h-[38px] w-full items-center gap-1 rounded-lg px-2.5',
                  view.kind === 'category' && view.id === cat.id ? 'bg-primary/10' : 'hover:bg-accent',
                )}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  closeOwnMenus()
                  onCategoryCtx(cat, e)
                }}
              >
                <button
                  className="rounded p-0.5 text-muted-foreground hover:bg-background/60"
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleCat(cat.id)
                  }}
                >
                  <ChevronRight size={16} className={cn('transition-transform', open && 'rotate-90')} />
                </button>
                <button
                  onClick={() => onSelectView({ kind: 'category', id: cat.id })}
                  className="flex min-w-0 flex-1 cursor-pointer select-none items-center gap-2 text-left text-[15px] text-foreground"
                >
                  <span className="truncate">{cat.label}</span>
                  {unread > 0 && <span className="ml-auto text-[13px] text-soft">{unread}</span>}
                </button>
              </div>
              {open && (
                <>
                  {list.map((feed) => (
                    <FeedRow
                      key={feed.id}
                      feed={feed}
                      active={view.kind === 'feed' && view.id === feed.id}
                      onClick={() => onSelectView({ kind: 'feed', id: feed.id })}
                      onCtx={(e) => {
                        closeOwnMenus()
                        onFeedCtx(feed, e)
                      }}
                    />
                  ))}
                  {list.length === 0 && (
                    <div className="flex h-8 items-center rounded-lg pl-9 pr-2.5 text-[13px] text-soft">
                      {feedsUnreadOnly ? '没有未读' : '暂无订阅源'}
                    </div>
                  )}
                </>
              )}
            </div>
          )
        })}

        {uncategorizedFeeds.length > 0 && (
          <div>
            <div
              className={cn(
                'flex h-[38px] w-full items-center gap-1 rounded-lg px-2.5',
                view.kind === 'category' && view.id === 0 ? 'bg-primary/10' : 'hover:bg-accent',
              )}
            >
              <button
                className="rounded p-0.5 text-muted-foreground hover:bg-background/60"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleCat(0)
                }}
              >
                <ChevronRight size={16} className={cn('transition-transform', expandedCats[0] !== false && 'rotate-90')} />
              </button>
              <button
                onClick={() => onSelectView({ kind: 'category', id: 0 })}
                className="flex min-w-0 flex-1 cursor-pointer select-none items-center gap-2 text-left text-[15px] text-foreground"
              >
                <span className="truncate">未分类</span>
                <span className="ml-auto text-[13px] text-soft">
                  {uncategorizedFeeds.reduce((s, f) => s + (f.unread_count || 0), 0) || ''}
                </span>
              </button>
            </div>
            {expandedCats[0] !== false &&
              visibleFeeds(uncategorizedFeeds).map((feed) => (
                <FeedRow
                  key={feed.id}
                  feed={feed}
                  active={view.kind === 'feed' && view.id === feed.id}
                  onClick={() => onSelectView({ kind: 'feed', id: feed.id })}
                  onCtx={(e) => {
                    closeOwnMenus()
                    onFeedCtx(feed, e)
                  }}
                />
              ))}
          </div>
        )}
      </nav>
    </aside>
  )
}

function SidebarRow({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active?: boolean
  icon?: React.ReactNode
  label: string
  count?: number
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-[38px] w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[15px] text-foreground',
        active ? 'bg-primary/10' : 'hover:bg-accent',
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className="ml-auto text-[13px] text-soft">{count}</span>
      )}
    </button>
  )
}

function FeedRow({
  feed,
  active,
  onClick,
  onCtx,
}: {
  feed: Feed
  active: boolean
  onClick: () => void
  onCtx: (e: React.MouseEvent) => void
}) {
  return (
    <div
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onCtx(e)
      }}
      className={cn(
        'flex h-9 cursor-pointer select-none items-center gap-2 rounded-lg py-0 pl-8 pr-2.5 text-sm text-foreground',
        active ? 'bg-primary/10' : 'hover:bg-accent',
      )}
    >
      <FeedIcon feed={feed} size={16} />
      <span className="truncate">{feed.title}</span>
      {!!feed.unread_count && (
        <span className="ml-auto text-[13px] text-soft">{feed.unread_count}</span>
      )}
    </div>
  )
}

