import type { LucideIcon } from 'lucide-react'
import { Rss } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/* 搜索关键字高亮 */
export function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-mark px-0.5 text-foreground">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

export function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      role="checkbox"
      aria-checked={checked}
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-card',
      )}
    >
      {checked && (
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3}>
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}

export function MenuItem({
  icon: Icon,
  label,
  onClick,
  trailing,
}: {
  icon?: LucideIcon
  label: string
  onClick?: (e: React.MouseEvent) => void
  trailing?: ReactNode
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground hover:bg-hover"
    >
      <span className="flex-1">{label}</span>
      {trailing}
      {Icon && <Icon size={16} className="text-muted-foreground" />}
    </button>
  )
}

export function MenuPanel({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: (e: React.MouseEvent) => void
}) {
  return (
    <div
      role="menu"
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(e)
      }}
      className={cn(
        'absolute top-full right-0 z-50 mt-1 min-w-[220px] overflow-hidden rounded-xl border border-border bg-popover py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CtxRow({
  label,
  icon: Icon,
  onClick,
  checkbox,
  chevron,
  danger,
}: {
  label: string
  icon?: LucideIcon
  onClick?: () => void
  checkbox?: boolean
  chevron?: boolean
  danger?: boolean
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-hover',
        danger ? 'text-destructive' : 'text-foreground',
      )}
    >
      {checkbox !== undefined && <Checkbox checked={checkbox} />}
      {chevron && (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <span className="flex-1">{label}</span>
      {Icon && <Icon size={16} className={danger ? 'text-destructive' : 'text-muted-foreground'} />}
    </button>
  )
}

export function ToolbarButton({
  active,
  title,
  onClick,
  children,
  disabled,
}: {
  active?: boolean
  title: string
  onClick?: (e: React.MouseEvent) => void
  children: ReactNode
  disabled?: boolean
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative rounded-lg p-2 disabled:pointer-events-none disabled:opacity-40',
        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-hover',
      )}
    >
      {children}
    </button>
  )
}

/* 订阅源图标:有 icon 用图,否则 RSS 占位 */
export function FeedIcon({ feed, size = 16 }: { feed?: { icon?: string | null } | null; size?: number }) {
  if (feed?.icon) {
    return (
      <img
        src={feed.icon}
        alt=""
        referrerPolicy="no-referrer"
        className="shrink-0 rounded"
        style={{ width: size, height: size }}
      />
    )
  }
  return <Rss size={size} className="shrink-0 text-muted-foreground" />
}
