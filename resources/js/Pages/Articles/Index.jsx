import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import DashboardLayout from '@/components/Layout/DashboardLayout';
import Sidebar from '@/components/Layout/Sidebar';
import { Button } from '@/components/ui/button';
import ArticleList from '@/components/Article/ArticleList';
import ArticleContent from '@/components/Article/ArticleContent';
import { RefreshCw, Loader2, Menu, Search, X } from 'lucide-react';

export default function ArticleIndex({ articles: initialArticles, filters, allTags, subscriptions }) {
    const { props } = usePage();
    const [articles, setArticles] = useState(initialArticles.data || []);
    const [currentPage, setCurrentPage] = useState(initialArticles.current_page || 1);
    const [lastPage, setLastPage] = useState(initialArticles.last_page || 1);
    const [total, setTotal] = useState(initialArticles.total || 0);
    const [loading, setLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // 搜索状态
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [isSearching, setIsSearching] = useState(false);
    const searchInputRef = useRef(null);
    
    // 计算页面标题
    const pageTitle = useMemo(() => {
        const { feed_id, tag_id, filter, search } = filters;
        
        if (search) {
            return `搜索: ${search}`;
        }
        
        if (filter === 'unread') {
            return '未读文章';
        }
        
        if (filter === 'read') {
            return '已读文章';
        }
        
        if (filter === 'favorite') {
            return '稍后阅读';
        }
        
        if (feed_id) {
            const subscription = subscriptions?.find(s => s.id === parseInt(feed_id));
            return subscription?.title || '文章';
        }
        
        if (tag_id) {
            const tag = allTags?.find(t => t.id === parseInt(tag_id));
            return tag?.name ? `${tag.name} 标签` : '文章';
        }
        
        return '全部文章';
    }, [filters, subscriptions, allTags]);
    
    // 侧边栏状态
    const [sidebarMode, setSidebarMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth < 768 ? 'hidden' : 'normal';
        }
        return 'normal';
    });

    const currentSubscription = subscriptions?.find(s => s.id === filters.subscription);
    const hasError = currentSubscription?.error_message && !currentSubscription.error_message.trim().startsWith('已刷新订阅源');

    const loadMore = useCallback(() => {
        if (loading || currentPage >= lastPage) return;
        
        setLoading(true);
        const nextPage = currentPage + 1;
        
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                params.set(key, value);
            }
        });
        params.set('page', nextPage);
        
        router.get(`/articles?${params.toString()}`, {}, {
            preserveState: true,
            preserveScroll: true,
            only: ['articles'],
            onSuccess: (page) => {
                const newArticles = page.props.articles.data || [];
                // 去重：过滤掉已存在的文章
                setArticles(prev => {
                    const existingIds = new Set(prev.map(a => a.id));
                    const uniqueNewArticles = newArticles.filter(a => !existingIds.has(a.id));
                    return [...prev, ...uniqueNewArticles];
                });
                setCurrentPage(page.props.articles.current_page);
                setLastPage(page.props.articles.last_page);
                setTotal(page.props.articles.total);
                setLoading(false);
            },
            onError: () => setLoading(false)
        });
    }, [loading, currentPage, lastPage, filters]);

    const listRef = useRef(null);
    const hasScrolledRef = useRef(false);
    
    useEffect(() => {
        if (!listRef.current) return;
        
        const handleScroll = () => {
            if (listRef.current && listRef.current.scrollTop > 50) {
                hasScrolledRef.current = true;
            }
        };
        
        listRef.current.addEventListener('scroll', handleScroll);
        
        const observer = new IntersectionObserver(
            (entries) => {
                const container = listRef.current;
                const isNearBottom = container && 
                    (container.scrollHeight - container.scrollTop - container.clientHeight) < 300;
                
                if (entries[0].isIntersecting && !loading && currentPage < lastPage && 
                    (hasScrolledRef.current || isNearBottom)) {
                    loadMore();
                }
            },
            { root: listRef.current, threshold: 0.1 }
        );
        
        const sentinel = document.getElementById('scroll-sentinel');
        if (sentinel) observer.observe(sentinel);
        
        return () => {
            observer.disconnect();
            if (listRef.current) {
                listRef.current.removeEventListener('scroll', handleScroll);
            }
        };
    }, [loadMore, loading, currentPage, lastPage]);

    const prevFiltersRef = useRef(filters);
    const prevDataVersionRef = useRef(null);
    
    useEffect(() => {
        const filtersChanged = 
            prevFiltersRef.current.filter !== filters.filter ||
            prevFiltersRef.current.search !== filters.search ||
            prevFiltersRef.current.subscription !== filters.subscription;
        
        // 计算数据版本：使用长度 + 首个ID + 最后ID 作为版本标识
        const dataLength = initialArticles.data?.length ?? 0;
        const firstId = initialArticles.data?.[0]?.id ?? null;
        const lastId = initialArticles.data?.[dataLength - 1]?.id ?? null;
        const dataVersion = `${dataLength}-${firstId}-${lastId}`;
        const dataChanged = prevDataVersionRef.current !== dataVersion;
        
        if (filtersChanged || dataChanged) {
            setArticles(initialArticles.data || []);
            setCurrentPage(initialArticles.current_page || 1);
            setLastPage(initialArticles.last_page || 1);
            setTotal(initialArticles.total || 0);
            if (filtersChanged) {
                setSelectedIds(new Set());
                setSearchQuery(filters.search || '');
                setSelectedArticle(null);
            }
            prevFiltersRef.current = filters;
            prevDataVersionRef.current = dataVersion;
        }
    }, [initialArticles, filters]);

    useEffect(() => {
        const checkMobile = () => {
            if (window.innerWidth < 768 && sidebarMode === 'normal') {
                setSidebarMode('hidden');
            }
        };
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [sidebarMode]);

    // 侧边栏切换
    const handleHideSidebar = () => setSidebarMode('hidden');
    const handleOpenDrawer = () => setSidebarMode('drawer');
    const handleRestoreSidebar = () => setSidebarMode('normal');

    // 搜索功能
    const handleSearch = useCallback((e) => {
        e?.preventDefault();
        setIsSearching(true);
        
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (key !== 'search' && value !== null && value !== undefined) {
                params.set(key, value);
            }
        });
        
        if (searchQuery.trim()) {
            params.set('search', searchQuery.trim());
        }
        
        router.get(`/articles?${params.toString()}`, {}, {
            preserveState: true,
            onFinish: () => setIsSearching(false)
        });
    }, [filters, searchQuery]);

    const handleClearSearch = () => {
        setSearchQuery('');
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (key !== 'search' && value !== null && value !== undefined) {
                params.set(key, value);
            }
        });
        router.get(`/articles?${params.toString()}`, {}, { preserveState: true });
    };

    // 键盘快捷键
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Cmd/Ctrl + K 聚焦搜索框
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            // Escape 清除搜索
            if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
                if (searchQuery) {
                    handleClearSearch();
                }
                searchInputRef.current?.blur();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [searchQuery]);

    const handleRefreshAll = () => {
        setIsRefreshing(true);
        router.post('/subscriptions/refresh-all', {}, {
            preserveScroll: true,
            onSuccess: () => {
                setIsRefreshing(false);
                router.reload({ only: ['subscriptions', 'articles'] });
            },
            onError: () => setIsRefreshing(false)
        });
    };

    const handleSelectAll = (checked) => {
        setSelectedIds(checked ? new Set(articles.map(a => a.id)) : new Set());
    };

    const handleSelectOne = (id, checked) => {
        const newSelected = new Set(selectedIds);
        checked ? newSelected.add(id) : newSelected.delete(id);
        setSelectedIds(newSelected);
    };

const handleArticleClick = (article) => {
    setSelectedArticle(article);
    if (!article.read) {
        fetch(`/articles/${article.id}/read`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || ''
            }
        }).then(() => {
            setArticles(prev => prev.map(a => 
                a.id === article.id ? { ...a, read: true } : a
            ));
        }).catch(err => console.error('Failed to mark as read:', err));
    }
};

    const handleMarkAsFavorite = async (id) => {
        try {
            const response = await fetch(`/articles/${id}/favorite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
            });
            if (response.ok) {
                setArticles(prev => prev.map(a =>
                    a.id === id ? { ...a, favorite: !a.favorite } : a
                ));
                if (selectedArticle?.id === id) {
                    setSelectedArticle(prev => ({ ...prev, favorite: !prev.favorite }));
                }
            }
        } catch (err) {
            console.error('Failed to mark as favorite:', err);
        }
    };

    const handleRefreshArticle = async (articleId) => {
        try {
            const response = await fetch(`/articles/${articleId}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
            });
            if (response.ok) {
                const data = await response.json();
                const updatedArticle = { ...data.article };
                setArticles(prev => prev.map(a =>
                    a.id === articleId ? { ...a, ...updatedArticle } : a
                ));
                if (selectedArticle?.id === articleId) {
                    setSelectedArticle(prev => ({ ...prev, ...updatedArticle }));
                }
                return updatedArticle;
            }
            return null;
        } catch (err) {
            console.error('Failed to refresh article:', err);
            return null;
        }
    };

    const handleBatchMarkAsRead = async () => {
        if (selectedIds.size === 0) return;
        try {
            const response = await fetch('/articles/batch-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({ ids: Array.from(selectedIds) }),
            });
            if (response.ok) {
                setArticles(prev => prev.map(a => 
                    selectedIds.has(a.id) ? { ...a, read: true } : a
                ));
                setSelectedIds(new Set());
            }
        } catch (err) {
            console.error('Failed to batch mark as read:', err);
        }
    };

    const handleFilterChange = (filter) => {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (key !== 'filter' && value !== null && value !== undefined) {
                params.set(key, value);
            }
        });
        params.set('filter', filter);
        router.get(`/articles?${params.toString()}`, { preserveState: true });
    };

    const currentPath = window.location.pathname + window.location.search;

    return (
        <DashboardLayout sidebarMode={sidebarMode} onHideSidebar={handleHideSidebar}>
            <Head title={pageTitle} />
            
            {/* 抽屉模式 */}
            {sidebarMode === 'drawer' && (
                <>
                    <div className="fixed inset-0 bg-black/30 z-40" onClick={handleRestoreSidebar} />
                    <div className="fixed top-[60px] left-0 bottom-0 z-50 animate-slide-in-left">
                        <div className="w-64 h-full bg-white dark:bg-gray-800 shadow-xl border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-end">
                                <button
                                    onClick={handleRestoreSidebar}
                                    className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    title="切换为三栏模式"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                    </svg>
                                </button>
                            </div>
                            <Sidebar
                                subscriptions={props.subscriptions || []}
                                categories={props.categories || []}
                                tags={props.tags || []}
                                currentPath={currentPath}
                                showToggle={false}
                            />
                        </div>
                    </div>
                </>
            )}
            
            <div className="flex h-[calc(100vh-60px)]">
                {/* 中栏 */}
                <div className="w-[420px] border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-800">
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {sidebarMode === 'hidden' && (
                                    <button
                                        onClick={handleOpenDrawer}
                                        className="p-1.5 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        title="展开侧边栏"
                                    >
                                        <Menu className="h-5 w-5" />
                                    </button>
                                )}
                                <h2 className="text-lg font-semibold">
                                    {filters.search ? '搜索结果' : '文章'}
                                    <span className="text-sm font-normal text-gray-400 ml-2">
                                        ({articles.length}/{total})
                                    </span>
                                </h2>
                            </div>
                            {!filters.tag_id && (
                                <Button variant="ghost" size="sm" onClick={handleRefreshAll} disabled={isRefreshing}>
                                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                </Button>
                            )}
                        </div>
                        
                        {/* 搜索框 */}
                        <form onSubmit={handleSearch} className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="搜索标题、内容... (⌘K)"
                                className="w-full pl-9 pr-9 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-[#861DD4] focus:border-transparent"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={handleClearSearch}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                                >
                                    <X className="h-4 w-4 text-gray-400" />
                                </button>
                            )}
                        </form>
                        
                        <div className="flex items-center gap-1 flex-wrap">
                            {['all', 'unread', 'read', 'favorite'].map(f => (
                                <Button
                                    key={f}
                                    variant={filters.filter === f ? 'default' : 'ghost'}
                                    size="sm"
                                    onClick={() => handleFilterChange(f)}
                                >
                                    {{all:'全部',unread:'未读',read:'已读',favorite:'收藏'}[f]}
                                </Button>
                            ))}
                        </div>
                        
                        {selectedIds.size > 0 && (
                            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <span className="text-sm">已选 {selectedIds.size} 篇</span>
                                <Button size="sm" variant="outline" onClick={handleBatchMarkAsRead}>标记已读</Button>
                                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>取消</Button>
                            </div>
                        )}
                    </div>
                    
                    <div ref={listRef} className="flex-1 overflow-y-auto">
                        {articles.length > 0 ? (
                            <>
                                <ArticleList
                                    articles={articles}
                                    selectedIds={selectedIds}
                                    selectedArticleId={selectedArticle?.id}
                                    onSelectOne={handleSelectOne}
                                    onSelectAll={handleSelectAll}
                                    onArticleClick={handleArticleClick}
                                    onFavorite={handleMarkAsFavorite}
                                    allTags={allTags}
                                    searchQuery={filters.search}
                                    onRefresh={handleRefreshArticle}
                                />
                                <div id="scroll-sentinel" className="h-4" />
                                {loading && (
                                    <div className="flex items-center justify-center py-4 text-gray-400">
                                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                        <span className="text-sm">加载更多...</span>
                                    </div>
                                )}
                                {!loading && currentPage >= lastPage && (
                                    <div className="text-center py-4 text-gray-400 text-sm">
                                        已加载全部 {articles.length} 篇文章
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8">
                                {hasError ? (
                                    <div className="w-full max-w-md">
                                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                                            <div className="flex items-start gap-3">
                                                <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                                </svg>
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                                                        此订阅源有问题。请检查并在必要时重新订阅。
                                                    </p>
                                                    <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded inline-block mb-2">
                                                        {currentSubscription.error_message}
                                                    </div>
                                                    <button
                                                        onClick={() => window.open(currentSubscription.url, '_blank')}
                                                        className="text-[#861DD4] hover:underline text-sm"
                                                    >
                                                        查看源代码
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <Search className="h-12 w-12 mb-4 text-gray-300" />
                                        <p>{filters.search ? '没有找到匹配的文章' : '没有找到文章'}</p>
                                        {filters.search && (
                                            <button
                                                onClick={handleClearSearch}
                                                className="mt-2 text-[#861DD4] hover:underline text-sm"
                                            >
                                                清除搜索
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* 右栏 */}
                <div className="flex-1 bg-gray-50 dark:bg-gray-900">
                    {selectedArticle ? (
                        <ArticleContent
                            article={selectedArticle}
                            onFavorite={() => handleMarkAsFavorite(selectedArticle.id)}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">
                                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                                </svg>
                                <p>选择一篇文章查看内容</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            <style>{`
                @keyframes slide-in-left {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-in-left {
                    animation: slide-in-left 0.2s ease-out forwards;
                }
            `}</style>
        </DashboardLayout>
    );
}
