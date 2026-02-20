import { useState } from 'react';
import { memo } from 'react';
import { ChevronRight, Folder, FolderOpen, Rss, MoreHorizontal, RefreshCw, Edit2, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ContextMenu } from '@/components/ui/context-menu';
import { router } from '@inertiajs/react';

function FeedItem({
    item,
    level = 0,
    isSelected = false,
    isExpanded = false,
    onToggle,
    onSelect,
    children,
}) {
    const [contextMenu, setContextMenu] = useState(null);
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState('');

    const isFolder = item.isFolder || item.is_folder;
    const hasChildren = isFolder && item.children && item.children.length > 0;

    const handleContextMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY });
    };

    const handleClick = () => {
        if (isFolder) {
            onToggle?.();
        } else {
            onSelect?.(item);
        }
    };

    const handleRename = () => {
        if (isFolder) {
            setIsRenaming(true);
            setNewName(item.name || item.title);
        }
        setContextMenu(null);
    };

    const handleRenameSubmit = () => {
        if (newName.trim()) {
            const categoryId = item.id.replace('category-', '');
            router.patch(`/categories/${categoryId}`, {
                label: newName.trim()
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsRenaming(false);
                    router.reload({ only: ['categories', 'subscriptions'] });
                }
            });
        }
    };

    const handleDelete = () => {
        if (isFolder) {
            const categoryId = item.id.replace('category-', '');
            if (confirm('确定要删除此文件夹吗？')) {
                router.delete(`/categories/${categoryId}`, {
                    preserveScroll: true,
                });
            }
        }
        setContextMenu(null);
    };

    const handleAddSubscription = () => {
        if (isFolder) {
            const categoryId = item.id.replace('category-', '');
            router.get('/subscriptions/create', { category_id: categoryId });
        }
        setContextMenu(null);
    };

    const handleRefresh = () => {
        if (!isFolder && item.subscriptionId) {
            router.post(`/subscriptions/${item.subscriptionId}/refresh`, {}, {
                preserveScroll: true,
                onSuccess: () => {
                    router.reload({ only: ['subscriptions', 'articles'] });
                }
            });
        }
        setContextMenu(null);
    };

    const handleUnsubscribe = () => {
        if (!isFolder && item.subscriptionId && confirm(`确定取消订阅"${item.name || item.title}"吗？`)) {
            router.delete(`/subscriptions/${item.subscriptionId}`, {
                preserveScroll: true,
                onSuccess: () => {
                    router.reload({ only: ['subscriptions', 'articles'] });
                }
            });
        }
        setContextMenu(null);
    };

    const folderIcon = isFolder ? (
        isExpanded ? (
            <FolderOpen className="w-4 h-4 text-[#861DD4]" />
        ) : (
            <Folder className="w-4 h-4 text-[#861DD4]" />
        )
    ) : (
        item.icon ? (
            <img
                src={item.icon}
                alt=""
                className="w-4 h-4 rounded"
                referrerPolicy="no-referrer"
                onError={(e) => {
                    // 如果加载失败，显示默认 RSS 图标
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<svg class="w-4 h-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>';
                }}
            />
        ) : (
            // 直接使用默认 RSS 图标
            <Rss className="w-4 h-4 text-gray-400" />
        )
    );

    const contextMenuItems = isFolder ? [
        {
            label: '添加订阅源',
            icon: <Plus className="w-4 h-4" />,
            onClick: handleAddSubscription,
        },
        {
            label: '重命名',
            icon: <Edit2 className="w-4 h-4" />,
            onClick: handleRename,
        },
        {
            label: '删除文件夹',
            icon: <Trash2 className="w-4 h-4" />,
            onClick: handleDelete,
            danger: true,
        },
    ] : [
        {
            label: '编辑订阅源',
            icon: <Edit2 className="w-4 h-4" />,
            onClick: () => {
                if (item.subscriptionId) {
                    router.visit(`/subscriptions/${item.subscriptionId}/edit`);
                }
                setContextMenu(null);
            },
        },
        {
            label: '刷新',
            icon: <RefreshCw className="w-4 h-4" />,
            onClick: handleRefresh,
        },
        {
            label: '取消订阅',
            icon: <Trash2 className="w-4 h-4" />,
            onClick: handleUnsubscribe,
            danger: true,
        },
    ];

    return (
        <div className="select-none">
            {isRenaming ? (
                <div className="px-2 py-1.5" style={{ paddingLeft: `${level * 12 + 8}px` }}>
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onBlur={handleRenameSubmit}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSubmit();
                            if (e.key === 'Escape') setIsRenaming(false);
                        }}
                        className="w-full px-2 py-1 text-sm border border-[#861DD4] rounded focus:outline-none focus:ring-1 focus:ring-[#861DD4]"
                        autoFocus
                    />
                </div>
            ) : (
                <div
                    className={cn(
                        'group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors',
                        'hover:bg-gray-100 dark:hover:bg-gray-700',
                        isSelected && !isFolder && 'bg-[#861DD4]/10 text-[#861DD4]',
                        isFolder && 'font-medium'
                    )}
                    style={{ paddingLeft: `${level * 12 + 8}px` }}
                    onClick={handleClick}
                    onContextMenu={handleContextMenu}
                >
                    {isFolder && (
                        <div className="flex-shrink-0">
                            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                    )}

                    {!isFolder && <div className="w-4" />}

                    <div className="flex-shrink-0">
                        {folderIcon}
                    </div>

                    <span className="flex-1 truncate text-sm">
                        {item.name || item.title}
                    </span>

                    {!isFolder && item.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-[#861DD4] text-white rounded-full">
                            {item.unreadCount > 99 ? '99+' : item.unreadCount}
                        </span>
                    )}

                    <button
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-opacity"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleContextMenu(e);
                        }}
                    >
                        <MoreHorizontal className="w-4 h-4 text-gray-400" />
                    </button>
                </div>
            )}

            {/* 子元素 - 通过 children 传递 */}
            {isFolder && hasChildren && isExpanded && (
                <div className="overflow-hidden">
                    {children}
                </div>
            )}

            {/* 右键菜单 */}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={contextMenuItems}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
}

const MemoizedFeedItem = memo(FeedItem);

export default MemoizedFeedItem;
