// 统一 API 客户端:自动携带 token 头,归一化后端两种响应信封,
// 登录态失效时清除 token 并跳转登录页。

export const TOKEN_KEY = 'token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

function redirectToLogin() {
  clearToken()
  window.location.href = '/auth/login'
}

export class ApiError extends Error {
  code: number | string
  /** think-jump error 附带的跳转地址 */
  url?: string

  constructor(msg: string, code: number | string, url?: string) {
    super(msg)
    this.code = code
    this.url = url
  }
}

type Envelope<T> = {
  code: number | string
  msg?: string
  data?: T
  url?: string
}

function isSuccess(code: number | string | undefined) {
  return code === 0 || code === 'success'
}

interface RequestOptions {
  method?: string
  /** 已序列化为对象的 JSON body */
  body?: unknown
}

/** 请求并返回信封中的 data(可能为 null) */
export async function api<T = null>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
  }
  const token = getToken()
  if (token) headers.token = token
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  let res: Response
  try {
    res = await fetch(path, {
      method: options.method ?? (options.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError('网络错误,请稍后重试', -1)
  }

  let envelope: Envelope<T>
  try {
    envelope = (await res.json()) as Envelope<T>
  } catch {
    throw new ApiError(`请求失败(${res.status})`, -1)
  }

  if (!isSuccess(envelope.code)) {
    // 未登录:中间件返回 { code:1, url:"/auth/login" }
    if (envelope.url === '/auth/login' || res.status === 401) redirectToLogin()
    throw new ApiError(envelope.msg || '操作失败', envelope.code, envelope.url)
  }
  return (envelope.data ?? null) as T
}

/* ---------------- 具体接口封装 ---------------- */

import type { Article, Category, DiscoveredFeed, Feed, Tag, User } from '@/types'

export interface Paged<T> {
  list: T[]
  total: number
  page: number
  page_size: number
}

export interface ArticleListQuery {
  page?: number
  page_size?: number
  keyword?: string
  unread?: boolean
}

const qs = (params: Record<string, string | number | undefined>) => {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') sp.append(k, String(v))
  })
  const s = sp.toString()
  return s ? `?${s}` : ''
}

/* 认证 */
export const login = (name: string, password: string) =>
  api<{ token: string; user: User }>('/api/auth/login', {
    body: { name, password },
  })

export const logout = () => api('/api/auth/logout', { body: {} })

/* 分类 */
export const getCategories = () => api<{ list: Category[] }>('/api/categories')
export const addCategory = (name: string) =>
  api('/api/categories/add', { body: { name } })
export const editCategory = (category_id: number, name: string) =>
  api('/api/categories/edit', { body: { category_id, name } })
export const deleteCategory = (category_id: number) =>
  api('/api/categories/del', { body: { category_id } })
export const pinCategory = (category_id: number) =>
  api('/api/categories/pin', { body: { category_id, is_pinned: 1 } })

/* 订阅源 */
export const getFeeds = () =>
  api<Paged<Feed>>('/api/feeds?page_size=99999').then((d) => d.list)
export const discoverFeeds = (url: string) =>
  api<{ feeds: DiscoveredFeed[] }>('/api/feed/discover', { body: { url } })
export const addFeed = (url: string) =>
  api<{ feed: Feed }>('/api/feed/add', { body: { url } })
export const moveFeed = (feed_id: number, category_id: number) =>
  api('/api/feed/edit', { body: { feed_id, category_id } })
export const deleteFeed = (feed_id: number) =>
  api('/api/feed/del', { body: { feed_id } })
export const refreshFeeds = (feed_id: number | null) =>
  api<{ job_id: string | number }>('/api/feed/refresh', { body: { feed_id } })

/* OPML 导入导出(fetch 直传,不走 JSON) */
export async function exportOpml() {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers.token = token
  const res = await fetch('/api/feed/export', { headers })
  if (!res.ok) throw new ApiError('导出失败', -1)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'qireader-subscriptions.opml'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function importOpml(file: File): Promise<{ imported: number }> {
  const headers: Record<string, string> = { 'X-Requested-With': 'XMLHttpRequest' }
  const token = getToken()
  if (token) headers.token = token
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/feed/import', { method: 'POST', headers, body: form })
  const data = (await res.json()) as Envelope<{ imported: number }>
  if (!isSuccess(data.code)) throw new ApiError(data.msg || '导入失败', data.code)
  return data.data ?? { imported: 0 }
}

/* 标签 */
export const getTags = () => api<{ list: Tag[] }>('/api/tags')
export const addTag = (name: string) => api<{ tag: Tag }>('/api/tag/add', { body: { name } })
export const editTag = (tag_id: number, name: string) =>
  api('/api/tag/edit', { body: { tag_id, name } })
export const deleteTag = (tag_id: number) => api('/api/tag/del', { body: { tag_id } })

/* 文章 */
export function getArticles(
  view: 'all' | 'starred' | { tag: number } | { feed: number } | { category: number },
  query: ArticleListQuery,
) {
  const params = {
    page: query.page,
    page_size: query.page_size,
    keyword: query.keyword,
    unread: query.unread ? 1 : undefined,
  }
  let path: string
  if (view === 'all') path = '/api/articles/all'
  else if (view === 'starred') path = '/api/articles/stars'
  else if ('tag' in view) path = `/api/articles/by-tag${qs({ tag_id: view.tag })}`
  else if ('feed' in view) path = `/api/articles/by-feed${qs({ feed_id: view.feed })}`
  else path = `/api/articles/by-category${qs({ category_id: view.category })}`
  // by-feed 等路径可能已带 query,需按情况用 ? 或 & 拼接
  return api<Paged<Article>>(path + (path.includes('?') ? '&' : '?') + qs(params))
}

export const getArticleInfo = (id: number) =>
  api<{ article: Article }>(`/api/articles/info${qs({ id })}`)

export const markRead = (article_id: number) =>
  api('/api/articles/read', { body: { article_id } })
export const markUnread = (article_id: number) =>
  api('/api/articles/unread', { body: { article_id } })
export const starArticle = (article_id: number) =>
  api('/api/articles/star', { body: { article_id } })
export const unstarArticle = (article_id: number) =>
  api('/api/articles/unstar', { body: { article_id } })
export const readAbove = (article_id: number) =>
  api('/api/articles/read-above', { body: { article_id } })
export const addArticleTag = (article_id: number, tag_id: number) =>
  api('/api/articles/add-tag', { body: { article_id, tag_id } })
export const removeArticleTag = (article_id: number, tag_id: number) =>
  api('/api/articles/remove-tag', { body: { article_id, tag_id } })
