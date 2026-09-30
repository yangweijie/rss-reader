// QiReader 领域类型(与 ThinkPHP 后端接口一一对应)

export interface User {
  id: number
  name: string
}

export interface Category {
  id: number
  label: string
  parent_id: number | null
  order: number
  feed_count?: number
  unread_count?: number
}

export interface Tag {
  id: number
  name: string
  color?: string | null
  article_count?: number
}

export interface Feed {
  id: number
  category_id: number | null
  url: string
  title: string
  icon?: string | null
  unread_count: number
  error_message?: string | null
  last_error_at?: string | null
  article_count?: number
}

export interface Article {
  id: number
  feed_id: number
  guid: string
  title: string
  content: string
  excerpt: string
  link: string
  author?: string | null
  published_at: string | null
  read: number
  favorite: number
  /** 模型追加属性 */
  feed_name?: string
  /** withJoin 附带 */
  feed?: { id: number; title: string; icon?: string | null }
  /** /api/articles/info 返回的文章已打标签 */
  tags?: Tag[]
}

export type View =
  | { kind: 'all' }
  | { kind: 'starred' }
  | { kind: 'category'; id: number }
  | { kind: 'feed'; id: number }
  | { kind: 'tag'; id: number }

/** 接口发现到的候选订阅源 */
export interface DiscoveredFeed {
  title: string
  url: string
}
