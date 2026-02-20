import { memo, useState, useEffect, useRef, useMemo } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import FeedList from '@/components/Feed/FeedList';
import { Bookmark, Tag as TagIcon, Plus, Settings, FolderPlus, Upload, Download, PanelLeftClose, Trash2, Edit2 } from 'lucide-react';

export default function Sidebar({ 
    subscriptions, 
    categories, 
    tags, 
    currentPath, 
    showToggle = false,
    onToggle,
    onClose = () => {} 
}) {
    const { auth } = usePage().props;
    const [tagsExpanded, setTagsExpanded] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('tagsExpanded');
            return saved ? JSON.parse(saved) : true;
        }
        return true;
    });
    const [expandedFolders, setExpandedFolders] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('expandedFolders');
            return saved ? new Set(JSON.parse(saved)) : new Set();
        }
        return new Set();
    });
    const [contextMenu, setContextMenu] = useState(null);
    const contextMenuRef = useRef(null);
    
    const [opmlImportDialogOpen, setOpmlImportDialogOpen] = useState(false);
    const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
    const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [editTagDialogOpen, setEditTagDialogOpen] = useState(false);
    const [editTagData, setEditTagData] = useState({ id: null, name: '', color: '' });
    
    // 持久化文件夹展开状态
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('expandedFolders', JSON.stringify([...expandedFolders]));
        }
    }, [expandedFolders]);
    
    // 持久化标签展开状态
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('tagsExpanded', JSON.stringify(tagsExpanded));
        }
    }, [tagsExpanded]);

    const buildFeedTree = useMemo(() => {
        const categoryMap = new Map();
        const rootItems = [];
        
        if (categories) {
            categories.forEach(cat => {
                categoryMap.set(cat.id, {
                    id: `category-${cat.id}`,
                    name: cat.label,
                    isFolder: true,
                    children: [],
                    unreadCount: 0,
                    parentId: cat.parent_id ? `category-${cat.parent_id}` : null,
                    categoryId: cat.id,
                });
            });
        }
        
        if (subscriptions) {
            subscriptions.forEach(sub => {
                const item = {
                    id: `subscription-${sub.id}`,
                    name: sub.title,
                    isFolder: false,
                    icon: sub.icon,
                    unreadCount: sub.unread_count || 0,
                    url: sub.url,
                    subscriptionId: sub.id,
                    categoryId: sub.category_id,
                };
                
                if (sub.category_id && categoryMap.has(sub.category_id)) {
                    const category = categoryMap.get(sub.category_id);
                    category.children.push(item);
                    category.unreadCount += item.unreadCount;
                } else {
                    rootItems.push(item);
                }
            });
        }
        
        categoryMap.forEach(category => {
            if (category.parentId) {
                const parentCatId = parseInt(category.parentId.replace('category-', ''));
                const parentCategory = categoryMap.get(parentCatId);
                if (parentCategory) {
                    parentCategory.children.push(category);
                    parentCategory.unreadCount += category.unreadCount;
                }
            } else {
                rootItems.push(category);
            }
        });
        
        // 排序：文件夹在前，无分类订阅源在后
        rootItems.sort((a, b) => {
            if (a.isFolder && !b.isFolder) return -1;
            if (!a.isFolder && b.isFolder) return 1;
            return 0;
        });
        
        return rootItems;
    }, [subscriptions, categories]);

    const handleCreateFolder = () => {
        if (newFolderName.trim()) {
            router.post('/categories', {
                label: newFolderName,
            }, {
                onSuccess: () => {
                    setNewFolderDialogOpen(false);
                    setNewFolderName('');
                    router.reload({ only: ['categories'] });
                },
                onError: (errors) => {
                    console.error('创建文件夹失败:', errors);
                },
            });
        }
    };

    const isPath = (path) => currentPath === path;

    const handleFeedSelect = (item) => {
        if (!item.isFolder) {
            const url = `/articles?feed_id=${item.subscriptionId}`;
            router.visit(url);
        }
    };

    const handleContextMenu = (e, tag) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            tag
        });
    };

    const handleCloseContextMenu = () => {
        setContextMenu(null);
    };

    const handleEditTag = () => {
        if (contextMenu?.tag) {
            setEditTagData({
                id: contextMenu.tag.id,
                name: contextMenu.tag.name,
                color: contextMenu.tag.color
            });
            setEditTagDialogOpen(true);
        }
        handleCloseContextMenu();
    };

    const handleUpdateTag = (e) => {
        e.preventDefault();
        router.put(`/tags/${editTagData.id}`, editTagData, {
            onSuccess: () => {
                setEditTagDialogOpen(false);
                router.reload({ only: ['tags'] });
            },
        });
    };

    const handleDeleteTag = (tagId) => {
        if (confirm('确定要删除这个标签吗？')) {
            router.delete(`/tags/${tagId}`);
        }
        handleCloseContextMenu();
    };

    // 点击其他地方关闭右键菜单
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) {
                handleCloseContextMenu();
            }
        };

        if (contextMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [contextMenu]);

    return (
        <>
            <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto h-[calc(100vh-60px)]">
                <nav className="p-3 space-y-1">
                    {/* 顶部按钮区域 */}
                    <div className="flex items-center justify-end mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                        {/* 隐藏侧边栏按钮 */}
                        {showToggle && (
                            <button
                                onClick={onToggle}
                                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mr-2"
                                title="隐藏侧边栏"
                            >
                                <PanelLeftClose className="h-5 w-5" />
                            </button>
                        )}
                        
                        {/* 用户按钮 */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full shrink-0 p-0">
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="text-xs">{auth.user.name?.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium">{auth.user.name}</p>
                                        <p className="text-xs text-gray-500">{auth.user.email}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link href="/profile">个人资料</Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href={route('logout')} method="post" as="button">
                                        退出登录
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <Link
                        href="/articles"
                        className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors ${
                            isPath('/articles')
                                ? 'bg-[#861DD4]/10 text-[#861DD4]'
                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <span className="font-medium">全部文章</span>
                        </div>
                    </Link>

                    <Link
                        href="/articles?filter=favorite"
                        className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors ${
                            isPath('/articles?filter=favorite')
                                ? 'bg-[#861DD4]/10 text-[#861DD4]'
                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <Bookmark className="h-5 w-5" />
                            <span className="font-medium">稍后阅读</span>
                        </div>
                    </Link>

                    <div className="my-2 border-t border-gray-200 dark:border-gray-700" />

                    <button
                        onClick={() => setTagsExpanded(!tagsExpanded)}
                        className="flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                    >
                        <span>标签</span>
                        <svg 
                            className={`w-4 h-4 text-gray-400 transition-transform ${tagsExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {tagsExpanded && (
                        <div className="ml-2 space-y-1">
                            {tags && tags.map((tag) => (
                                <div key={tag.id} className="relative">
                                    <Link
                                        href={`/articles?tag_id=${tag.id}`}
                                        onContextMenu={(e) => handleContextMenu(e, tag)}
                                        className={`flex items-center justify-between w-full gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                                            currentPath.includes(`tag_id=${tag.id}`)
                                                ? 'bg-[#861DD4]/10 text-[#861DD4]'
                                                : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <svg 
                                                className="h-4 w-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                                style={{ color: tag.color }}
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                            </svg>
                                            <span className="text-sm truncate">{tag.name}</span>
                                        </div>
                                        {tag.articles_count > 0 && (
                                            <Badge variant="secondary" className="text-xs">
                                                {tag.articles_count}
                                            </Badge>
                                        )}
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="my-2 border-t border-gray-200 dark:border-gray-700" />

                    <div className="flex items-center justify-between px-3 py-2 h-8">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            订阅源
                        </span>
                        <div className="flex items-center gap-1 h-full">
                            <button
                                onClick={() => setNewFolderDialogOpen(true)}
                                className="flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                title="新建文件夹"
                            >
                                <FolderPlus className="h-4 w-4" />
                            </button>
                            <Link
                                href="/subscriptions/create"
                                className="flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                title="新建订阅源"
                            >
                                <Plus className="h-4 w-4" />
                            </Link>
                            <div className="relative">
                                <button
                                    onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
                                    className="flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                                    title="订阅源设置"
                                >
                                    <Settings className="h-4 w-4" />
                                </button>
                                {settingsMenuOpen && (
                                    <div 
                                        className="absolute right-0 top-full mt-1 z-50 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1"
                                        onMouseLeave={() => setSettingsMenuOpen(false)}
                                    >
                                        <div
                                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                            onClick={() => {
                                                setOpmlImportDialogOpen(true);
                                                setSettingsMenuOpen(false);
                                            }}
                                        >
                                            <Upload className="h-4 w-4" />
                                            导入 OPML
                                        </div>
                                        <div
                                            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                                            onClick={() => {
                                                window.location.href = '/subscriptions/export-opml';
                                                setSettingsMenuOpen(false);
                                            }}
                                        >
                                            <Download className="h-4 w-4" />
                                            导出 OPML
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <FeedList
                        items={buildFeedTree}
                        expandedFolders={expandedFolders}
                        onToggleFolder={(id) => setExpandedFolders(prev => {
                            const next = new Set(prev);
                            next.has(id) ? next.delete(id) : next.add(id);
                            return next;
                        })}
                        onSelect={handleFeedSelect}
                        selectedId={currentPath.includes('feed_id=') ? `subscription-${currentPath.split('feed_id=')[1].split('&')[0]}` : null}
                        key={`${subscriptions?.length}-${categories?.length}`}
                    />
                </nav>
            </aside>

            <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>新建文件夹</DialogTitle>
                        <DialogDescription>
                            创建一个新的分类文件夹来组织订阅源
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <label htmlFor="folder-name" className="text-sm font-medium">
                            文件夹名称
                        </label>
                        <input
                            id="folder-name"
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            className="mt-1.5 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#861DD4]"
                            placeholder="输入文件夹名称"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNewFolderDialogOpen(false)}>
                            取消
                        </Button>
                        <Button onClick={handleCreateFolder}>创建</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={opmlImportDialogOpen} onOpenChange={setOpmlImportDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>导入 OPML 文件</DialogTitle>
                        <DialogDescription>选择一个 OPML 文件来导入订阅源</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <label className="block text-sm font-medium mb-2">选择 OPML 文件</label>
                        <input
                            type="file"
                            accept=".opml,.xml"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                            onChange={(e) => {
                                if (e.target.files[0]) {
                                    const formData = new FormData();
                                    formData.append('opml', e.target.files[0]);
                                    router.post('/subscriptions/import-opml', formData, {
                                        onSuccess: () => setOpmlImportDialogOpen(false),
                                    });
                                }
                            }}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpmlImportDialogOpen(false)}>取消</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 编辑标签对话框 */}
            <Dialog open={editTagDialogOpen} onOpenChange={setEditTagDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>编辑标签</DialogTitle>
                        <DialogDescription>修改标签的名称和颜色</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateTag} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-medium">标签名称</label>
                            <input
                                type="text"
                                value={editTagData.name}
                                onChange={(e) => setEditTagData({ ...editTagData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-sm font-medium">标签颜色</label>
                            <div className="flex gap-2">
                                <input
                                    type="color"
                                    value={editTagData.color}
                                    onChange={(e) => setEditTagData({ ...editTagData, color: e.target.value })}
                                    className="w-16 h-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={editTagData.color}
                                    onChange={(e) => setEditTagData({ ...editTagData, color: e.target.value })}
                                    placeholder="#000000"
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setEditTagDialogOpen(false)}>取消</Button>
                            <Button type="submit">保存</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* 右键菜单 */}
            {contextMenu && (
                <div
                    ref={contextMenuRef}
                    className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <button
                        onClick={handleEditTag}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                        <Edit2 className="h-4 w-4" />
                        编辑标签
                    </button>
                    <button
                        onClick={() => handleDeleteTag(contextMenu.tag.id)}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                    >
                        <Trash2 className="h-4 w-4" />
                        删除标签
                    </button>
                </div>
            )}
        </>
    );
}
